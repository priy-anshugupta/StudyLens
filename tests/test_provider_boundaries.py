"""Contract tests use mocked providers; no keys or network calls are consumed."""
import io
import wave
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi.testclient import TestClient
from PIL import Image

import backend.main as service

SOURCE = 'Equivalent fractions name the same amount of the same whole. One half equals two quarters: 1/2 = 2/4.'

@pytest.fixture
def client(monkeypatch):
    service.sessions.clear()
    service.rates.clear()
    monkeypatch.setattr(service, 'settings', lambda: {'OPENAI_API_KEY':'test-only-not-a-key','GNANI_API_KEY':'test-only-not-a-key','MAX_AI_CALLS':'250'})
    monkeypatch.setattr(service, 'calls', 0)
    with TestClient(service.app) as c:
        yield c

def png():
    result = io.BytesIO()
    Image.new('RGB', (100, 100), 'white').save(result, 'PNG')
    return result.getvalue()

def wav():
    output = io.BytesIO()
    with wave.open(output, 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(16000)
        audio.writeframes(b'\x00\x00' * 8000)
    return output.getvalue()

def test_import_review_generate_and_source_ownership(client, monkeypatch):
    generated = AsyncMock(side_effect=[
        service.Extraction(source=SOURCE, supported=True),
        service.GeneratedLesson(title='The same amount', supported=True, blocks=[service.Block(id='s1', title='Equivalent fractions', text=SOURCE, concept='equivalence', source_quote=SOURCE)]),
    ])
    monkeypatch.setattr(service, 'generate', generated)
    imported = client.post('/api/documents', files={'image':('page.png',png(),'image/png')})
    assert imported.status_code == 200
    document = imported.json()
    with TestClient(service.app) as other_session:
        assert other_session.post('/api/lessons/fractions', json=document).status_code == 404
    lesson = client.post('/api/lessons/fractions', json=document)
    assert lesson.status_code == 200
    assert lesson.json()['sample'] is False
    assert lesson.json()['blocks'][0]['source_quote'] == SOURCE

def test_unreadable_image_does_not_call_provider(client, monkeypatch):
    generated = AsyncMock()
    monkeypatch.setattr(service, 'generate', generated)
    assert client.post('/api/documents', files={'image':('page.png', b'not an image', 'image/png')}).status_code == 422
    generated.assert_not_called()

def test_invented_source_citation_is_rejected(client, monkeypatch):
    monkeypatch.setattr(service, 'generate', AsyncMock(return_value=service.GeneratedLesson(title='Wrong citation', supported=True, blocks=[service.Block(id='s1',title='Example',text='Some text',concept='equivalence',source_quote='Words that are absent from the source')])) )
    assert client.post('/api/lessons/fractions',json={'source':SOURCE}).status_code == 422

def test_unsupported_material_does_not_become_a_fractions_lesson(client, monkeypatch):
    monkeypatch.setattr(service,'generate',AsyncMock(return_value=service.GeneratedLesson(title='',supported=False,blocks=[])))
    assert client.post('/api/lessons/fractions',json={'source':'A page entirely about the history of architecture.'}).status_code == 422

def test_teach_back_uses_current_concept_and_checks_quotes(client, monkeypatch):
    text = 'Add the numerators and keep the same denominator. The pieces have the same size.'
    rows = [service.RubricRow(criterion=k,status='supported',quote=quote,feedback='A specific follow-up.') for k, quote in [('Equal-sized pieces','same size'),('Add the numerators','Add the numerators'),('Keep the denominator','keep the same denominator')]]
    mocked = AsyncMock(return_value=service.Feedback(rows=rows))
    monkeypatch.setattr(service,'generate',mocked)
    response = client.post('/api/teach-back',json={'text':text,'source':SOURCE,'concept':'addition'})
    assert response.status_code == 200
    assert 'Add the numerators' in mocked.call_args.args[1]
    rows[0].quote = 'a made-up learner statement'
    assert client.post('/api/teach-back',json={'text':text,'source':SOURCE,'concept':'addition'}).status_code == 422

def test_invalid_scene_returns_validation_error_not_server_error(client):
    response=client.post('/api/scenes/action',json={'text':'show this','source':SOURCE,'scene':{'a':{'n':4,'d':3},'b':None,'representation':'bars'}})
    assert response.status_code == 422

def test_speech_adapters_preserve_audio_contracts(client, monkeypatch):
    requests=[]
    def handler(request):
        requests.append(request)
        if '/stt/' in request.url.path:
            assert b'filename="recording.wav"' in request.content
            return httpx.Response(200,json={'transcript':'one half'})
        return httpx.Response(200,content=wav(),headers={'content-type':'audio/wav'})
    original = httpx.AsyncClient
    monkeypatch.setattr(service.httpx,'AsyncClient',lambda **kwargs:original(transport=httpx.MockTransport(handler),**kwargs))
    transcript=client.post('/api/speech/transcribe',files={'audio':('recording.wav',wav(),'audio/wav')},data={'language':'en-IN'})
    assert transcript.status_code == 200
    assert transcript.json()['transcript'] == 'one half'
    speech=client.post('/api/speech/synthesize',json={'text':'One half equals two quarters.','language':'en-IN'})
    assert speech.status_code == 200
    assert speech.json()['content_type']=='audio/wav'
    assert requests[0].headers['X-API-Key-ID']=='test-only-not-a-key'

def test_invalid_recording_does_not_reach_provider(client):
    assert client.post('/api/speech/transcribe',files={'audio':('recording.wav',b'not wav','audio/wav')}).status_code == 422

def test_provider_errors_do_not_leak_upstream_body(client, monkeypatch):
    original=httpx.AsyncClient
    transport=httpx.MockTransport(lambda _:httpx.Response(403,text='secret diagnostic with an account identifier'))
    monkeypatch.setattr(service.httpx,'AsyncClient',lambda **kwargs:original(transport=transport,**kwargs))
    response=client.post('/api/speech/synthesize',json={'text':'One half.'})
    assert response.status_code == 502
    assert 'secret diagnostic' not in response.text

def test_speech_honors_global_request_budget(client, monkeypatch):
    monkeypatch.setattr(service,'calls',250)
    assert client.post('/api/speech/synthesize',json={'text':'One half.'}).status_code == 429
