import pytest
from fastapi.testclient import TestClient

from main import app
from routers import speech
from services import speech_analysis as sa


def pause(start, end):
    return {"start": start, "end": end, "duration": round(end - start, 2)}


def test_short_audio_is_not_cut():
    assert sa.plan_cuts(30, [pause(10, 11)], workers=4, min_seconds=20) == []


def test_cuts_land_in_the_pauses_nearest_to_even_split_points():
    pauses = [pause(48, 49), pause(101, 102), pause(149, 150), pause(10, 10.5)]
    cuts = sa.plan_cuts(200, pauses, workers=4, min_seconds=20)
    assert cuts == [48.5, 101.5, 149.5]


def test_cuts_fall_back_to_even_split_points_when_no_pause_is_near():
    assert sa.plan_cuts(200, [], workers=4, min_seconds=20) == [50, 100, 150]
    # 잡음 때문에 쉼이 멀리서만 잡혀도 단어 중간 대신 균등 지점을 쓴다
    assert sa.plan_cuts(200, [pause(5, 6)], workers=4, min_seconds=20) == [50, 100, 150]


def test_cuts_are_strictly_increasing():
    cuts = sa.plan_cuts(200, [pause(95, 96)], workers=4, min_seconds=20)
    assert cuts == sorted(cuts) and len(set(cuts)) == len(cuts)


def segment(start, text, accuracy=90):
    return {
        "Offset": int(start * 10_000_000),
        "Duration": 10_000_000,
        "NBest": [
            {
                "Display": text,
                "PronunciationAssessment": {"AccuracyScore": accuracy, "FluencyScore": 80, "CompletenessScore": 100, "PronScore": accuracy},
                "Words": [
                    {"Word": text, "Offset": int(start * 10_000_000), "Duration": 10_000_000,
                     "PronunciationAssessment": {"AccuracyScore": accuracy, "ErrorType": "None"}}
                ],
            }
        ],
    }


@pytest.fixture
def fake_audio(monkeypatch):
    monkeypatch.setattr(
        sa, "detect_pauses",
        lambda path, min_pause=0.5: {"duration": 10.0, "noise_floor_db": -50, "threshold_db": -42,
                                      "pauses": [pause(4, 4.3), pause(6, 7)]},
    )
    monkeypatch.setattr(sa, "to_wav", lambda path: path)
    monkeypatch.setattr(sa.os, "remove", lambda path: None)
    monkeypatch.setattr(sa, "wav_duration", lambda path: 10.0)


def test_response_contains_text_chunks_rate_and_free_mode_pronunciation(fake_audio, monkeypatch):
    seen = {}

    def recognize(wav_path, reference_text, language):
        seen["reference"] = reference_text
        return [segment(1, "안녕하세요"), segment(5, "발표입니다")]

    monkeypatch.setattr(sa, "recognize_segments", recognize)
    result = sa.analyze_speech("a.wav")
    assert seen["reference"] == ""  # 기준 문장 없이 Azure가 직접 인식한다
    assert result["text"] == "안녕하세요 발표입니다"
    assert result["chunks"][0] == {"timestamp": [1.0, 2.0], "text": "안녕하세요"}
    assert result["pronunciation"]["mode"] == "free"
    assert result["pronunciation"]["scores"]["completeness"] is None
    # 0.5초 미만의 쉼(4~4.3)은 응답에서 빠지고 6~7초 쉼만 남는다
    assert [p["duration"] for p in result["silence"]["pauses"]] == [1.0]
    assert result["speech_rate"] > 0 and 0 <= result["speech_rate_score"] <= 100


def test_silent_audio_returns_empty_text_without_dividing_by_zero(fake_audio, monkeypatch):
    monkeypatch.setattr(sa, "recognize_segments", lambda *args: [])
    result = sa.analyze_speech("a.wav")
    assert result["text"] == "" and result["chunks"] == []
    assert result["speech_rate"] == 0.0


def test_long_audio_is_recognized_in_parallel_pieces(fake_audio, monkeypatch):
    monkeypatch.setattr(sa, "wav_duration", lambda path: 100.0)
    monkeypatch.setattr(
        sa, "detect_pauses",
        lambda path, min_pause=0.5: {"duration": 100.0, "noise_floor_db": -50, "threshold_db": -42,
                                      "pauses": [pause(24, 25), pause(49, 50), pause(74, 75)]},
    )
    received = {}

    def parallel(wav_path, groups, language):
        received["groups"] = groups
        return [segment(1, "하나"), segment(60, "둘")]

    monkeypatch.setattr(sa, "recognize_in_parallel", parallel)
    result = sa.analyze_speech("a.wav")
    assert [(g["start"], g["end"], g["text"]) for g in received["groups"]] == [
        (0.0, 24.5, ""), (24.5, 49.5, ""), (49.5, 74.5, ""), (74.5, None, ""),
    ]
    assert result["text"] == "하나 둘"


def use_analyzers(monkeypatch, **analyzers):
    monkeypatch.setattr(speech, "ANALYZERS", analyzers)


def test_endpoint_defaults_to_the_accurate_analysis(monkeypatch):
    use_analyzers(
        monkeypatch,
        accurate=lambda path: {"text": "정확", "pronunciation": {"scores": {}}},
        fast=lambda path: {"text": "빠름", "pronunciation": {"scores": {}}},
    )
    client = TestClient(app)
    files = {"file": ("a.wav", b"x", "audio/wav")}
    assert client.post("/speech/", files=files).json()["text"] == "정확"
    assert client.post("/speech/", data={"mode": "fast"}, files=files).json()["text"] == "빠름"


def test_endpoint_rejects_an_unknown_mode(monkeypatch):
    use_analyzers(monkeypatch, accurate=lambda path: {}, fast=lambda path: {})
    client = TestClient(app)
    response = client.post("/speech/", data={"mode": "turbo"}, files={"file": ("a.wav", b"x", "audio/wav")})
    assert response.status_code == 400


def test_accurate_mode_reports_a_server_without_whisper(monkeypatch):
    def missing(path):
        raise ModuleNotFoundError("faster_whisper")

    use_analyzers(monkeypatch, accurate=missing, fast=lambda path: {})
    client = TestClient(app)
    response = client.post("/speech/", files={"file": ("a.wav", b"x", "audio/wav")})
    assert response.status_code == 503 and "빠른 분석" in response.json()["detail"]


def test_endpoint_reports_azure_failures_as_bad_gateway(monkeypatch):
    def fail(path):
        raise RuntimeError("Azure 음성 서비스 오류: boom")

    use_analyzers(monkeypatch, accurate=fail, fast=fail)
    client = TestClient(app)
    response = client.post("/speech/", files={"file": ("a.wav", b"x", "audio/wav")})
    assert response.status_code == 502 and "Azure" in response.json()["detail"]


def test_accurate_analysis_scores_the_whisper_text_and_hides_completeness(monkeypatch):
    import sys
    import types

    whisper = types.SimpleNamespace(
        transcribe_audio=lambda path: {
            "text": " 안녕하세요 발표입니다",
            "chunks": [{"timestamp": [0.0, 2.0], "text": " 안녕하세요"}, {"timestamp": [2.0, 4.0], "text": " 발표입니다"}],
        }
    )
    monkeypatch.setitem(sys.modules, "services.stt_whisper", whisper)
    monkeypatch.setattr(
        sa, "detect_pauses",
        lambda path, min_pause=0.5: {"duration": 4.0, "noise_floor_db": -50, "threshold_db": -42, "pauses": []},
    )
    seen = {}

    def assess(path, reference_text, language, chunks=None):
        seen.update(reference=reference_text, chunks=chunks)
        return {"mode": "script", "recognized_text": reference_text,
                "scores": {"accuracy": 90.0, "completeness": 100.0, "pronunciation": 88.0}, "segments": [], "words": []}

    monkeypatch.setattr(sa, "assess_pronunciation", assess)
    result = sa.analyze_speech_accurate("a.wav")
    assert result["text"] == "안녕하세요 발표입니다"
    assert seen["reference"] == "안녕하세요 발표입니다"
    assert seen["chunks"][0] == {"start": 0.0, "end": 2.0, "text": " 안녕하세요"}
    assert result["pronunciation"]["scores"]["completeness"] is None
    assert result["chunks"][0]["timestamp"] == [0.0, 2.0]
    assert result["speech_rate"] > 0


def test_accurate_analysis_of_silence_skips_azure(monkeypatch):
    import sys
    import types

    monkeypatch.setitem(sys.modules, "services.stt_whisper", types.SimpleNamespace(transcribe_audio=lambda path: {"text": " ", "chunks": []}))
    monkeypatch.setattr(
        sa, "detect_pauses",
        lambda path, min_pause=0.5: {"duration": 4.0, "noise_floor_db": -50, "threshold_db": -42, "pauses": []},
    )
    monkeypatch.setattr(sa, "assess_pronunciation", lambda *args, **kwargs: pytest.fail("Azure를 부르면 안 된다"))
    result = sa.analyze_speech_accurate("a.wav")
    assert result["text"] == "" and result["speech_rate"] == 0.0
