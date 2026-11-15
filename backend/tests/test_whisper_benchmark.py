import pytest
from fastapi.testclient import TestClient

import benchmark_app
from main import app as main_app
from services import whisper_benchmark as bench


def test_repetition_ratio_flags_looping_text():
    assert bench.repetition_ratio("a b c d e f g h") == 0.0
    assert bench.repetition_ratio("a b c " * 10) > 0.8
    assert bench.repetition_ratio("짧다") == 0.0


def test_summary_reports_ratio_to_audio_and_hides_nothing_by_default():
    result = bench.summarize("faster-whisper", {}, "안녕하세요", seconds=10.0, load_seconds=2.0, duration=40.0)
    assert result["ratio_to_audio"] == 0.25 and result["chars"] == 5 and result["seconds"] == 10.0


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(bench, "prepare", lambda path: (path, 30.0))
    monkeypatch.setattr(bench, "cleanup", lambda path: None)
    return TestClient(benchmark_app.app)


def post(client, **data):
    return client.post("/whisper", data=data, files={"file": ("a.wav", b"x", "audio/wav")})


def test_faster_engine_receives_its_settings(client, monkeypatch):
    seen = {}

    def fake(wav, duration, **kwargs):
        seen.update(kwargs)
        return bench.summarize("faster-whisper", kwargs, "텍스트", 3.0, 0.0, duration)

    monkeypatch.setattr(bench, "run_faster", fake)
    response = post(client, engine="faster", beam_size="2", vad_filter="true")
    assert response.status_code == 200
    assert seen == {"beam_size": 2, "compute_type": "int8", "vad_filter": True}
    assert response.json()["text"] == "텍스트"


def test_transformers_defaults_match_the_previous_implementation(client, monkeypatch):
    seen = {}

    def fake(wav, duration, **kwargs):
        seen.update(kwargs)
        return bench.summarize("transformers", kwargs, "텍스트", 9.0, 0.0, duration)

    monkeypatch.setattr(bench, "run_transformers", fake)
    assert post(client, engine="transformers", include_text="false").json().get("text") is None
    assert seen["chunk_length_s"] == 30 and seen["stride_s"] == 5 and seen["dtype"] == "float32"
    assert seen["int8"] is False and seen["timestamps"] is True


def test_missing_packages_are_reported_clearly(client, monkeypatch):
    def missing(*args, **kwargs):
        raise ModuleNotFoundError("No module named 'torch'", name="torch")

    monkeypatch.setattr(bench, "run_transformers", missing)
    response = post(client, engine="transformers")
    assert response.status_code == 503 and "torch" in response.json()["detail"]


def test_only_one_measurement_runs_at_a_time(client):
    assert benchmark_app._busy.acquire(blocking=False)
    try:
        assert post(client, engine="faster").status_code == 409
    finally:
        benchmark_app._busy.release()


def test_unknown_engine_is_rejected(client):
    assert post(client, engine="openai").status_code == 422


def test_the_production_app_does_not_expose_the_benchmark():
    assert TestClient(main_app).post("/whisper").status_code == 404


def fake_stt(text="안녕하세요 발표입니다", seconds=40.0):
    return bench.summarize("transformers", {}, text, seconds, 0.0, 100.0)


@pytest.fixture
def pipeline_client(monkeypatch):
    monkeypatch.setattr(bench, "prepare", lambda path: (path, 100.0))
    monkeypatch.setattr(bench.os, "remove", lambda path: None)
    return TestClient(benchmark_app.app)


def test_original_pipeline_reports_each_step_and_sends_azure_the_whole_audio(pipeline_client, monkeypatch):
    seen = {}
    monkeypatch.setattr(bench, "run_transformers", lambda *args, **kwargs: seen.update(whisper=kwargs) or fake_stt())

    def azure(path, reference_text, *args, **kwargs):
        seen["azure"] = {"reference": reference_text, "kwargs": kwargs}
        return {"scores": {"pronunciation": 88.0}}

    monkeypatch.setattr(bench, "assess_pronunciation", azure)
    body = pipeline_client.post("/pipeline/original", files={"file": ("a.wav", b"x", "audio/wav")}).json()
    assert body["whisper"]["engine"] == "transformers" and body["whisper"]["seconds"] == 40.0
    assert body["azure"]["mode"] == "single" and body["azure"]["scores"]["pronunciation"] == 88.0
    assert body["total_seconds"] == round(40.0 + body["azure"]["seconds"], 1)
    assert "text" not in body["whisper"] and body["whisper"]["text_preview"].startswith("안녕")
    # 이전 구현과 같은 설정이고, Azure에는 chunks 없이(통째로) 보낸다
    assert seen["whisper"]["chunk_length_s"] == 30 and seen["whisper"]["dtype"] == "float32"
    assert seen["azure"] == {"reference": "안녕하세요 발표입니다", "kwargs": {}}


def test_original_pipeline_can_use_faster_whisper_for_comparison(pipeline_client, monkeypatch):
    monkeypatch.setattr(bench, "run_faster", lambda *args, **kwargs: fake_stt(seconds=10.0))
    monkeypatch.setattr(bench, "assess_pronunciation", lambda *args, **kwargs: {"scores": {}})
    response = pipeline_client.post(
        "/pipeline/original", data={"whisper": "faster"}, files={"file": ("a.wav", b"x", "audio/wav")}
    )
    assert response.status_code == 200 and response.json()["whisper"]["seconds"] == 10.0


def test_original_pipeline_skips_azure_when_nothing_was_recognized(pipeline_client, monkeypatch):
    monkeypatch.setattr(bench, "run_transformers", lambda *args, **kwargs: fake_stt(text="  "))
    monkeypatch.setattr(bench, "assess_pronunciation", lambda *a, **k: pytest.fail("Azure를 부르면 안 된다"))
    body = pipeline_client.post("/pipeline/original", files={"file": ("a.wav", b"x", "audio/wav")}).json()
    assert body["azure"] is None and body["total_seconds"] == 40.0


def test_original_pipeline_reports_azure_failures(pipeline_client, monkeypatch):
    monkeypatch.setattr(bench, "run_transformers", lambda *args, **kwargs: fake_stt())

    def fail(*args, **kwargs):
        raise RuntimeError("Azure 음성 서비스 오류: boom")

    monkeypatch.setattr(bench, "assess_pronunciation", fail)
    response = pipeline_client.post("/pipeline/original", files={"file": ("a.wav", b"x", "audio/wav")})
    assert response.status_code == 502 and "Azure" in response.json()["detail"]
