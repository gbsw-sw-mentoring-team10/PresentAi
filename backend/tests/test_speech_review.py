import pytest
from fastapi.testclient import TestClient
from google.genai import errors as genai_errors

from main import app
from routers import speech_review
from routers.mock_api import common

BODY = {
    "speech": {"text": "안녕하세요", "speech_rate": 300.0, "silence": {"pauses": []}},
    "pronunciation": {"scores": {"pronunciation": 80.0}, "words": []},
}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(common.time, "sleep", lambda seconds: None)
    with TestClient(app) as client:
        yield client


def test_review_passes_both_results_to_the_model(client, monkeypatch):
    seen = {}

    def fake(speech, pronunciation):
        seen.update(speech=speech, pronunciation=pronunciation)
        return {"summary": "좋아요", "strengths": [], "improvements": []}

    monkeypatch.setattr(speech_review, "generate_speech_review", fake)
    response = client.post("/speech-review/", json=BODY)
    assert response.status_code == 200
    assert response.json()["summary"] == "좋아요"
    assert seen["pronunciation"]["scores"]["pronunciation"] == 80.0
    assert seen["speech"]["text"] == "안녕하세요"


def test_review_requires_pronunciation_scores(client):
    response = client.post("/speech-review/", json={**BODY, "pronunciation": {"words": []}})
    assert response.status_code == 422


def test_review_rejects_oversized_input(client, monkeypatch):
    monkeypatch.setattr(speech_review, "MAX_INPUT_CHARS", 50)
    assert client.post("/speech-review/", json=BODY).status_code == 413


def test_model_failures_become_user_messages(client, monkeypatch):
    def overloaded(speech, pronunciation):
        raise genai_errors.ServerError(503, {"error": {"message": "high demand"}})

    monkeypatch.setattr(speech_review, "generate_speech_review", overloaded)
    response = client.post("/speech-review/", json=BODY)
    assert response.status_code == 503
    assert "사용량" in response.json()["detail"]


def test_mock_review_has_the_same_shape(client):
    response = client.post("/mock/speech-review/", json=BODY)
    assert response.status_code == 200
    assert set(response.json()) == {"summary", "strengths", "improvements"}
