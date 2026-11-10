import pytest
from fastapi.testclient import TestClient

from main import app
from routers.mock_api import common


@pytest.fixture
def client(monkeypatch):
    # mock API의 인위적인 대기 시간을 없애 테스트를 빠르게 한다.
    monkeypatch.setattr(common.time, "sleep", lambda seconds: None)
    with TestClient(app) as client:
        yield client


@pytest.mark.parametrize(
    ("data", "files", "expected_keys", "missing_keys"),
    [
        ({"prompt": "대본"}, None, {"revised_script"}, {"slides"}),
        (None, {"file": ("a.pdf", b"x", "application/pdf")}, {"slides"}, {"revised_script"}),
        (
            {"prompt": "대본"},
            {"file": ("a.pdf", b"x", "application/pdf")},
            {"slides", "revised_script"},
            set(),
        ),
    ],
)
def test_mock_upload_matches_input_combination(
    client, data, files, expected_keys, missing_keys
):
    response = client.post(
        "/mock/upload/?title=예시&perpose=체험", data=data, files=files
    )
    assert response.status_code == 200
    body = response.json()
    assert {"score", "feedback", "strengths", "improvements"} <= body.keys()
    assert expected_keys <= body.keys()
    assert not missing_keys & body.keys()


def test_mock_upload_without_input_is_rejected(client):
    response = client.post("/mock/upload/?title=예시&perpose=체험")
    assert response.status_code == 400


def test_mock_speech_and_pronunciation_share_samples(client):
    audio = {"file": ("a.wav", b"x", "audio/wav")}
    speech = client.post("/mock/speech/", files=audio).json()
    assert {"text", "chunks", "silence", "speech_rate", "speech_rate_score"} <= speech.keys()
    pronunciation = client.post(
        "/mock/pronunciation/", data={"reference_text": speech["text"]}, files=audio
    ).json()
    assert pronunciation["reference_word_count"] == len(speech["text"].split())
    assert {"scores", "segments", "words"} <= pronunciation.keys()
