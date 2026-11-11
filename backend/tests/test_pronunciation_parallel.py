import wave

import pytest
from fastapi.testclient import TestClient

from main import app
from routers.pronunciation import parse_chunks
from services import pronunciation_assess as pa
from services.pronunciation_assess import TICKS_PER_SECOND


def chunk(start, end, text="말"):
    return {"start": start, "end": end, "text": text}


def test_short_audio_is_not_split():
    assert pa.split_groups([chunk(0, 10), chunk(10, 30)], workers=4, min_seconds=20) == []


def test_long_audio_is_split_at_chunk_boundaries_without_gaps():
    chunks = [chunk(i * 10, i * 10 + 9, f"문장{i}") for i in range(12)]  # 0~119초
    groups = pa.split_groups(chunks, workers=4, min_seconds=20)
    assert len(groups) == 4
    assert groups[0]["start"] == 0.0 and groups[-1]["end"] is None
    for current, following in zip(groups, groups[1:]):
        assert current["end"] == following["start"]  # 소리가 빠지지 않는다
    joined = " ".join(group["text"] for group in groups)
    assert joined == " ".join(f"문장{i}" for i in range(12))  # 기준 문장 순서 유지


def test_worker_count_never_exceeds_audio_length_limit():
    chunks = [chunk(i * 10, i * 10 + 9) for i in range(6)]  # 약 59초
    assert len(pa.split_groups(chunks, workers=8, min_seconds=20)) == 2


def test_slice_wav_keeps_only_the_requested_seconds(tmp_path):
    source = tmp_path / "a.wav"
    with wave.open(str(source), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(16000)
        f.writeframes(b"\x01\x00" * 16000 * 10)  # 10초
    piece = pa.slice_wav(str(source), 2, 5)
    try:
        with wave.open(piece, "rb") as f:
            assert f.getnframes() == 16000 * 3
    finally:
        import os

        os.remove(piece)


def segment(offset_seconds, word="안녕"):
    return {
        "Offset": int(offset_seconds * TICKS_PER_SECOND),
        "Duration": TICKS_PER_SECOND,
        "NBest": [
            {
                "Display": word,
                "PronunciationAssessment": {"AccuracyScore": 90, "FluencyScore": 80, "CompletenessScore": 100, "PronScore": 85},
                "Words": [{"Word": word, "Offset": int(offset_seconds * TICKS_PER_SECOND), "Duration": TICKS_PER_SECOND,
                           "PronunciationAssessment": {"AccuracyScore": 90, "ErrorType": "None"}}],
            }
        ],
    }


def test_parallel_results_are_shifted_to_full_audio_time_and_ordered(monkeypatch):
    calls = []

    def fake_recognize(wav_path, reference_text, language):
        calls.append(reference_text)
        return [segment(1.0, reference_text)]  # 조각 안에서는 항상 1초 지점

    monkeypatch.setattr(pa, "recognize_segments", fake_recognize)
    monkeypatch.setattr(pa, "slice_wav", lambda path, start, end: path)
    monkeypatch.setattr(pa.os, "remove", lambda path: None)
    groups = [
        {"start": 0.0, "end": 30.0, "text": "첫째"},
        {"start": 30.0, "end": 60.0, "text": "둘째"},
        {"start": 60.0, "end": None, "text": "셋째"},
    ]
    segments = pa.recognize_in_parallel("full.wav", groups, "ko-KR")
    assert sorted(calls) == ["둘째", "셋째", "첫째"]
    result = pa.build_result(segments, "첫째 둘째 셋째")
    assert [w["word"] for w in result["words"]] == ["첫째", "둘째", "셋째"]
    assert [w["start"] for w in result["words"]] == [1.0, 31.0, 61.0]


def test_a_failed_piece_is_retried_once(monkeypatch):
    attempts = {"n": 0}

    def flaky(wav_path, reference_text, language):
        if reference_text == "둘째":
            attempts["n"] += 1
            if attempts["n"] == 1:
                raise RuntimeError("Azure 음성 서비스 오류: TooManyRequests")
        return [segment(0, reference_text)]

    monkeypatch.setattr(pa, "recognize_segments", flaky)
    monkeypatch.setattr(pa, "slice_wav", lambda path, start, end: path)
    monkeypatch.setattr(pa.os, "remove", lambda path: None)
    groups = [{"start": 0.0, "end": 30.0, "text": "첫째"}, {"start": 30.0, "end": None, "text": "둘째"}]
    segments = pa.recognize_in_parallel("full.wav", groups, "ko-KR")
    assert len(segments) == 2 and attempts["n"] == 2


@pytest.mark.parametrize(
    "raw",
    [None, "", "not json", '{"a": 1}', '[{"timestamp": [3, 1], "text": "역순"}]', '[{"text": "시간 없음"}]'],
)
def test_malformed_chunks_are_ignored(raw):
    assert parse_chunks(raw) is None


def test_valid_chunks_are_parsed():
    parsed = parse_chunks('[{"timestamp": [0.0, 2.5], "text": " 안녕 "}]')
    assert parsed == [{"start": 0.0, "end": 2.5, "text": " 안녕 "}]


def test_endpoint_passes_chunks_to_the_assessor(monkeypatch):
    from routers import pronunciation

    seen = {}
    monkeypatch.setattr(
        pronunciation, "assess_pronunciation",
        lambda path, text, chunks=None: seen.update(text=text, chunks=chunks) or {"scores": {}},
    )
    client = TestClient(app)
    response = client.post(
        "/pronunciation/",
        data={"reference_text": "안녕", "chunks": '[{"timestamp": [0, 1], "text": "안녕"}]'},
        files={"file": ("a.wav", b"x", "audio/wav")},
    )
    assert response.status_code == 200
    assert seen["chunks"] == [{"start": 0.0, "end": 1.0, "text": "안녕"}]


def test_segments_without_pronunciation_scores_do_not_crash_and_are_kept_as_text():
    scored = segment(0.0, "안녕")
    unscored = {
        "Offset": 5 * TICKS_PER_SECOND,
        "Duration": 2 * TICKS_PER_SECOND,
        "NBest": [{"Display": "노래 가사", "Words": [{"Word": "노래", "Offset": 5 * TICKS_PER_SECOND, "Duration": TICKS_PER_SECOND}]}],
    }
    empty = {"Offset": 8 * TICKS_PER_SECOND, "Duration": TICKS_PER_SECOND}  # NBest 자체가 없는 구간
    result = pa.build_result([scored, unscored, empty], "")
    assert result["recognized_text"] == "안녕 노래 가사"
    assert result["scores"]["accuracy"] == 90  # 점수가 있는 구간만으로 평균
    assert result["segments"][1]["accuracy"] is None
    assert result["words"][1]["accuracy"] is None and result["words"][1]["error_type"] is None


def test_when_no_segment_has_scores_the_scores_are_empty_but_the_text_survives():
    only_text = {"Offset": 0, "Duration": TICKS_PER_SECOND, "NBest": [{"Display": "음악"}]}
    result = pa.build_result([only_text], "")
    assert result["recognized_text"] == "음악"
    assert result["scores"] == {"accuracy": None, "fluency": None, "completeness": None, "pronunciation": None}
