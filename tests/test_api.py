import io
import wave
from fastapi.testclient import TestClient
from backend.main import app, sessions

def test_health_does_not_return_keys():
    with TestClient(app) as c:
        response = c.get('/api/health')
        assert response.status_code == 200
        assert set(response.json()) == {'openai','gnani','status'}
        assert 'httponly' in response.headers['set-cookie'].lower()

def test_numeric_grading_and_invalid_input():
    with TestClient(app) as c:
        assert c.post('/api/practice/check', json={'question_id':'q1','response':'3/6'}).json()['correct']
        assert c.post('/api/practice/check', json={'question_id':'q1','response':'2/3'}).json()['correct'] is False
        assert c.post('/api/practice/check', json={'question_id':'q1','response':'1/0'}).status_code == 422

def test_origin_rejection():
    with TestClient(app) as c:
        response=c.post('/api/practice/check', headers={'origin':'https://unrelated.example'}, json={'question_id':'q1','response':'1/2'})
        assert response.status_code == 403

def test_session_deletion_removes_data():
    with TestClient(app) as c:
        c.get('/api/health')
        sid=c.cookies.get('pa_session')
        assert sid in sessions
        assert c.delete('/api/session').json()['deleted']
        assert sid not in sessions

def test_oversized_request_rejected_before_processing():
    with TestClient(app) as c:
        response=c.post('/api/lessons', content='{}', headers={'content-length':str(10*1024*1024),'content-type':'application/json'})
        assert response.status_code == 413
