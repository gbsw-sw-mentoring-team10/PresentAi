import os
import wave

from services.pronunciation_assess import (
    MIN_GROUP_SECONDS,
    PARALLEL_WORKERS,
    build_result,
    recognize_in_parallel,
    recognize_segments,
    to_wav,
)
from services.silence_detect import detect_pauses
from services.speech_rate import get_speech_rate, get_speech_rate_score

# 응답에 담는 쉼의 최소 길이. 나눌 위치를 찾을 때는 더 짧은 쉼도 쓴다
REPORT_MIN_PAUSE = 0.5
CUT_MIN_PAUSE = 0.2
CUT_WINDOW_SECONDS = 10  # 목표 지점 앞뒤 이 범위 안의 쉼에서만 자른다. 없으면 목표 지점에서 자른다


# 음성 길이(초)
def wav_duration(wav_path: str) -> float:
    with wave.open(wav_path, "rb") as source:
        return source.getnframes() / source.getframerate()


# 긴 음성을 workers개 안팎으로 나눌 위치를 고른다. 말 사이의 쉼(무음)에서 자르면 단어가 잘리지 않는다
def plan_cuts(total: float, pauses: list[dict], workers: int = PARALLEL_WORKERS, min_seconds: float = MIN_GROUP_SECONDS) -> list[float]:
    count = max(1, min(workers, int(total // min_seconds)))
    middles = [(pause["start"] + pause["end"]) / 2 for pause in pauses]
    cuts: list[float] = []
    for index in range(1, count):
        target = total * index / count
        near = [m for m in middles if abs(m - target) <= CUT_WINDOW_SECONDS and m > (cuts[-1] if cuts else 0) + 1]
        cuts.append(min(near, key=lambda m: abs(m - target)) if near else target)
    return cuts


# 기준 문장 없이 Azure가 음성을 직접 인식하고 발음까지 평가한다 (구간별 동시 호출)
# 응답: text, chunks, silence, speech_rate, speech_rate_score, pronunciation(/pronunciation/ 응답과 같은 형식)
def analyze_speech(audio_path: str, language: str = "ko-KR") -> dict:
    silence_info = detect_pauses(audio_path, min_pause=CUT_MIN_PAUSE)
    silence = {**silence_info, "pauses": [p for p in silence_info["pauses"] if p["duration"] >= REPORT_MIN_PAUSE]}

    wav_path = to_wav(audio_path)
    try:
        cuts = plan_cuts(wav_duration(wav_path), silence_info["pauses"])
        if cuts:
            starts = [0.0, *cuts]
            groups = [
                {"start": start, "end": starts[i + 1] if i + 1 < len(starts) else None, "text": ""}
                for i, start in enumerate(starts)
            ]
            segments = recognize_in_parallel(wav_path, groups, language)
        else:
            segments = recognize_segments(wav_path, "", language)
    finally:
        os.remove(wav_path)

    pronunciation = build_result(segments, "")
    text = pronunciation["recognized_text"].strip()
    speaking_time = silence["duration"] - sum(p["duration"] for p in silence["pauses"])
    speech_rate = get_speech_rate(text, silence) if text and speaking_time > 0 else 0.0
    return {
        "text": text,
        "chunks": [
            {"timestamp": [seg["start"], seg["end"]], "text": seg["text"]}
            for seg in pronunciation["segments"]
        ],
        "silence": silence,
        "speech_rate": speech_rate,
        "speech_rate_score": get_speech_rate_score(speech_rate),
        "pronunciation": pronunciation,
    }
