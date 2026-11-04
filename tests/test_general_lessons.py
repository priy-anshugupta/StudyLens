from unittest.mock import AsyncMock
import pytest
from fastapi.testclient import TestClient
import backend.main as service
from backend.general import TextbookLesson, Topic, Question, Feedback, Evidence, LessonDraft, LessonTopicDraft, LessonQuestionDraft, resolve_lesson
from backend.general import VisualPlan, VisualNode, VisualLink, VisualStep, VisualDraft, VisualLinkDraft, VisualStepDraft, resolve_visual, source_passages, validate_visual

SOURCE='Plants use sunlight to turn carbon dioxide and water into glucose. Oxygen is released during photosynthesis. Chlorophyll absorbs light energy in leaves.'

def generated(subject='Science',title='Photosynthesis'):
    return LessonDraft(title=title,subject=subject,supported=True,blocks=[LessonTopicDraft(
        title='How plants make food',text=SOURCE,source_id=0,key_points=['Sunlight provides energy','Oxygen is released'],
        teach_prompt='Explain how a plant uses light to make food.',visual='none',questions=[
            LessonQuestionDraft(prompt='What gas is released?',choices=['Oxygen','Nitrogen','Helium'],correct_index=0,explanation='The source says oxygen is released.',source_id=1),
            LessonQuestionDraft(prompt='What absorbs light?',choices=['Glucose','Chlorophyll','Oxygen'],correct_index=1,explanation='Chlorophyll absorbs light energy.',source_id=2)])])

@pytest.fixture
def client(monkeypatch):
    service.sessions.clear();service.rates.clear()
    monkeypatch.setattr(service,'generate',AsyncMock(return_value=generated()))
    with TestClient(service.app) as c:yield c

def build(c):
    response=c.post('/api/lessons',json={'source':SOURCE})
    assert response.status_code==200,response.text
    return response.json()

def test_science_uses_its_own_content_and_hides_keys(client):
    lesson=build(client)
    assert lesson['general'] and lesson['subject']=='Science'
    assert lesson['blocks'][0]['visual']=='none'
    assert 'fraction' not in str(lesson).lower()
    question=lesson['blocks'][0]['questions'][0]
    assert set(question)=={'id','question','choices'}

def test_grading_is_idempotent_and_summary_is_actual(client):
    lesson=build(client);url=f"/api/lessons/{lesson['id']}"
    payload={'question_id':'b1-q1','choice_index':0,'submission_id':'test-attempt-1'}
    assert client.post(url+'/attempts',json=payload).json()['correct']
    assert client.post(url+'/attempts',json=payload).json()['correct']
    assert client.get(url+'/summary').json()['total']==1
    payload['choice_index']=1
    assert client.post(url+'/attempts',json=payload).status_code==409

def test_other_sessions_cannot_grade_or_read_a_lesson(client):
    lesson=build(client)
    with TestClient(service.app) as other:
        assert other.get(f"/api/lessons/{lesson['id']}/summary").status_code==404
        assert other.post(f"/api/lessons/{lesson['id']}/attempts",json={'question_id':'b1-q1','choice_index':0,'submission_id':'test-attempt-2'}).status_code==404

def test_source_citation_and_answer_bounds_are_enforced(client,monkeypatch):
    content=generated();content.blocks[0].questions[0].source_id=99
    monkeypatch.setattr(service,'generate',AsyncMock(return_value=content))
    assert client.post('/api/lessons',json={'source':SOURCE}).status_code==422
    content=generated();content.blocks[0].questions[0].correct_index=3
    monkeypatch.setattr(service,'generate',AsyncMock(return_value=content))
    assert client.post('/api/lessons',json={'source':SOURCE}).status_code==422

def test_dynamic_teach_back_checks_learner_quotes(client,monkeypatch):
    lesson=build(client)
    text='Sunlight provides energy and oxygen is released.'
    rows=[Evidence(criterion='Sunlight provides energy',status='supported',quote='Sunlight provides energy',feedback='You explained the energy source.'),Evidence(criterion='Oxygen is released',status='supported',quote='oxygen is released',feedback='You mentioned the gas released.')]
    monkeypatch.setattr(service,'generate',AsyncMock(return_value=Feedback(rows=rows)))
    url=f"/api/lessons/{lesson['id']}/teach-back"
    assert client.post(url,json={'block_id':'b1','text':text}).status_code==200
    rows[0].quote='I said something different'
    assert client.post(url,json={'block_id':'b1','text':text}).status_code==422

@pytest.mark.parametrize('subject',['History','Geography','Mathematics','Literature'])
def test_subject_is_not_restricted_to_science_or_fractions(client,monkeypatch,subject):
    monkeypatch.setattr(service,'generate',AsyncMock(return_value=generated(subject,subject+' reading')))
    assert build(client)['subject']==subject

def test_selected_passage_must_belong_to_lesson(client):
    lesson=build(client)
    assert client.post(f"/api/lessons/{lesson['id']}/ask",json={'block_id':'b1','question':'Explain this','selection':'Unrelated invented selection'}).status_code==422

def test_invalid_draft_gets_one_validated_repair(client,monkeypatch):
    invalid=generated();invalid.blocks[0].questions[0].correct_index=3
    provider=AsyncMock(side_effect=[invalid,generated()])
    monkeypatch.setattr(service,'generate',provider)
    assert build(client)['subject']=='Science'
    assert provider.await_count==2

def visual_plan():
    return VisualDraft(title='Light helps plants make food',layout='process',nodes=[
        VisualNode(id='light',label='Sunlight',icon='sun'),VisualNode(id='plant',label='Plant',icon='leaf')],
        links=[VisualLinkDraft(start='light',end='plant',source_id=0)],steps=[
            VisualStepDraft(title='Light energy',explanation='Chlorophyll absorbs light.',node_ids=['light'],source_id=2),
            VisualStepDraft(title='Making food',explanation='Plants use sunlight to make glucose.',node_ids=['light','plant'],source_id=0)])

def test_visual_is_source_linked_and_cached_per_section(client,monkeypatch):
    lesson=build(client)
    provider=AsyncMock(return_value=visual_plan());monkeypatch.setattr(service,'generate',provider)
    url=f"/api/lessons/{lesson['id']}/visual"
    first=client.post(url,json={'block_id':'b1'})
    assert first.status_code==200,first.text
    assert first.json()['steps'][1]['node_ids']==['light','plant']
    assert client.post(url,json={'block_id':'b1'}).json()==first.json()
    assert provider.await_count==1
    assert client.post(url,json={'block_id':'absent'}).status_code==404
    with TestClient(service.app) as other:
        assert other.post(url,json={'block_id':'b1'}).status_code==404

@pytest.mark.parametrize('issue',['quotation','connection','unexplained','duplicate','link_quote'])
def test_visual_rejects_invalid_evidence_or_graph(client,monkeypatch,issue):
    lesson=build(client);plan=visual_plan()
    if issue=='quotation':plan.steps[0].source_id=99
    if issue=='connection':plan.links[0].end='missing'
    if issue=='unexplained':plan.steps[1].node_ids=['light']
    if issue=='duplicate':plan.nodes[1].id='light'
    if issue=='link_quote':plan.links[0].source_id=99
    provider=AsyncMock(return_value=plan);monkeypatch.setattr(service,'generate',provider)
    assert client.post(f"/api/lessons/{lesson['id']}/visual",json={'block_id':'b1'}).status_code==422
    assert provider.await_count==2

def test_visual_repairs_before_returning(client,monkeypatch):
    lesson=build(client);invalid=visual_plan();invalid.links[0].end='missing'
    provider=AsyncMock(side_effect=[invalid,visual_plan()]);monkeypatch.setattr(service,'generate',provider)
    assert client.post(f"/api/lessons/{lesson['id']}/visual",json={'block_id':'b1'}).status_code==200
    assert provider.await_count==2


def test_visual_source_ids_resolve_to_original_page_not_rewritten_text():
    passages=source_passages(SOURCE)
    plan=resolve_visual(visual_plan(),passages)
    assert plan.links[0].source_quote==passages[0]
    assert plan.steps[0].source_quote==passages[2]
    validate_visual(plan,SOURCE)
    plan.steps[0].source_quote='Rewritten quotation'
    with pytest.raises(Exception):validate_visual(plan,SOURCE)


def test_lesson_references_attach_original_words_with_unusual_whitespace(client,monkeypatch):
    source='First original passage with punctuation:  x = 2.\n\nSecond original passage — with Unicode.\nThird original passage about learning.'
    result=generated();result.blocks[0].source_id=1
    monkeypatch.setattr(service,'generate',AsyncMock(return_value=result))
    response=client.post('/api/lessons',json={'source':source})
    assert response.status_code==200,response.text
    lesson=response.json()
    assert lesson['blocks'][0]['source_quote']=='Second original passage — with Unicode.'
    for block in lesson['blocks']:
        assert block['source_quote'] in source
    attempt=client.post(f"/api/lessons/{lesson['id']}/attempts",json={'question_id':'b1-q1','choice_index':0,'submission_id':'source-reference-regression'})
    assert attempt.json()['source_quote']=='Second original passage — with Unicode.'

def test_lesson_missing_block_reference_is_rejected(client,monkeypatch):
    result=generated();result.blocks[0].source_id=99
    provider=AsyncMock(return_value=result);monkeypatch.setattr(service,'generate',provider)
    assert client.post('/api/lessons',json={'source':SOURCE}).status_code==422
    assert provider.await_count==2
