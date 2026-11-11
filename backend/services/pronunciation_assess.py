import json
import logging
import os
import subprocess
import tempfile
import threading
import wave
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)

logger = logging.getLogger(__name__)

TICKS_PER_SECOND = 10_000_000  # Azure 시간 단위는 100ns

# 긴 음성은 구간으로 나눠 Azure에 동시에 보낸다 (Azure 대기는 네트워크 시간이라 CPU가 적은 서버에서도 빨라진다)
PARALLEL_WORKERS = max(1, int(os.getenv("PRONUNCIATION_PARALLEL_WORKERS", "4")))
MIN_GROUP_SECONDS = 20  # 구간 하나의 최소 길이. 이보다 짧게 나누면 오히려 손해라서 나누지 않는다


# Azure SDK가 안정적으로 읽는 WAV(16kHz, 모노, 16bit)로 ffmpeg 변환한다 (m4a, mp3 등도 처리하기 위함)
def to_wav(audio_path: str) -> str:
    wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    wav.close()
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", audio_path, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav.name],
            check=True,
            capture_output=True,
        )
    except Exception:
        os.remove(wav.name)
        raise
    return wav.name


# 구간별 결과(JSON)를 응답 형식으로 정리한다
def build_result(segments: list[dict], reference_text: str) -> dict:
    seg_list, words = [], []
    for seg in segments:
        best = seg["NBest"][0]
        score = best["PronunciationAssessment"]
        start = seg["Offset"] / TICKS_PER_SECOND
        end = start + seg["Duration"] / TICKS_PER_SECOND
        seg_list.append({
            "start": round(start, 2),
            "end": round(end, 2),
            "text": best["Display"],
            "accuracy": score["AccuracyScore"],
            "fluency": score["FluencyScore"],
            "completeness": score["CompletenessScore"],
            "pronunciation": score["PronScore"],
        })
        for w in best["Words"]:
            w_score = w.get("PronunciationAssessment", {})
            w_start = w["Offset"] / TICKS_PER_SECOND if "Offset" in w else None  # 말하지 않은 단어(누락)는 시간이 없다
            w_end = w_start + w["Duration"] / TICKS_PER_SECOND if w_start is not None else None
            words.append({
                "word": w["Word"],
                "start": round(w_start, 2) if w_start is not None else None,
                "end": round(w_end, 2) if w_end is not None else None,
                "accuracy": w_score.get("AccuracyScore"),
                "error_type": w_score.get("ErrorType"),
            })

    # 전체 점수는 구간 점수를 구간 길이로 가중평균한 값이다 (구간이 하나면 Azure 점수와 같다)
    total = sum(s["end"] - s["start"] for s in seg_list)

    def weighted(key: str):
        if total <= 0:
            return None
        return round(sum(s[key] * (s["end"] - s["start"]) for s in seg_list) / total, 1)

    scripted = bool(reference_text.strip())  # 기준 문장이 없으면 완성도는 의미가 없다

    return {
        "mode": "script" if scripted else "free",
        "recognized_text": " ".join(s["text"] for s in seg_list),
        "reference_word_count": len(reference_text.split()) if scripted else None,
        "scores": {
            "accuracy": weighted("accuracy"),
            "fluency": weighted("fluency"),
            "completeness": weighted("completeness") if scripted else None,
            "pronunciation": weighted("pronunciation"),
        },
        "segments": seg_list,
        "words": words,
    }


# 음성 인식 구간을 길이가 비슷한 묶음으로 나눈다. 구간 경계에서만 자르므로 말 중간이 잘리지 않는다
def split_groups(chunks: list[dict], workers: int = PARALLEL_WORKERS, min_seconds: float = MIN_GROUP_SECONDS) -> list[dict]:
    spoken = [c for c in chunks if c["text"].strip()]
    if not spoken:
        return []
    total = spoken[-1]["end"] - spoken[0]["start"]
    count = max(1, min(workers, int(total // min_seconds)))
    if count == 1:
        return []  # 짧은 음성은 나누지 않는다
    target = total / count
    groups, current, current_start = [], [], spoken[0]["start"]
    for chunk in spoken:
        current.append(chunk)
        if chunk["end"] - current_start >= target and len(groups) < count - 1:
            groups.append(current)
            current, current_start = [], chunk["end"]
    if current:
        groups.append(current)
    # 앞 구간의 끝은 다음 구간의 시작과 같게 해 소리가 빠지지 않게 한다 (마지막 구간은 끝까지)
    starts = [0.0] + [group[0]["start"] for group in groups[1:]]
    return [
        {
            "start": starts[index],
            "end": starts[index + 1] if index + 1 < len(groups) else None,
            "text": " ".join(chunk["text"].strip() for chunk in group),
        }
        for index, group in enumerate(groups)
    ]


# WAV(16kHz 모노 16bit)에서 [start, end) 초 구간만 잘라 새 파일로 만든다. end가 None이면 끝까지
def slice_wav(wav_path: str, start: float, end: float | None) -> str:
    out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    out.close()
    try:
        with wave.open(wav_path, "rb") as source:
            rate = source.getframerate()
            first = min(int(start * rate), source.getnframes())
            last = source.getnframes() if end is None else min(int(end * rate), source.getnframes())
            source.setpos(first)
            frames = source.readframes(max(0, last - first))
            with wave.open(out.name, "wb") as target:
                target.setparams(source.getparams())
                target.writeframes(frames)
    except Exception:
        os.remove(out.name)
        raise
    return out.name


# Azure에 음성 한 덩어리를 보내 구간별 결과(JSON) 목록을 받는다
def recognize_segments(wav_path: str, reference_text: str, language: str) -> list[dict]:
    # Azure SDK는 호출될 때 불러온다 (설치되지 않았거나 시스템 라이브러리가 없는 환경에서도 서버가 뜨도록)
    import azure.cognitiveservices.speech as speechsdk

    key = os.getenv("AZURE_SPEECH_KEY")
    region = os.getenv("AZURE_SPEECH_REGION")
    if not key or not region:
        raise RuntimeError("AZURE_SPEECH_KEY, AZURE_SPEECH_REGION 환경변수를 설정해 주세요.")

    speech_config = speechsdk.SpeechConfig(subscription=key, region=region)
    speech_config.speech_recognition_language = language
    pa_config = speechsdk.PronunciationAssessmentConfig(
        reference_text=reference_text,
        grading_system=speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
        granularity=speechsdk.PronunciationAssessmentGranularity.Word,
        enable_miscue=bool(reference_text),  # 빠뜨리거나 더한 단어도 표시 (기준 문장이 있을 때만)
    )
    recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config,
        audio_config=speechsdk.audio.AudioConfig(filename=wav_path),
    )
    pa_config.apply_to(recognizer)

    segments, errors = [], []
    done = threading.Event()

    def on_recognized(evt):
        if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech:
            segments.append(json.loads(evt.result.properties.get(speechsdk.PropertyId.SpeechServiceResponse_JsonResult)))

    def on_canceled(evt):
        details = evt.cancellation_details
        if details.reason == speechsdk.CancellationReason.Error:
            errors.append(details.error_details)
        done.set()

    recognizer.recognized.connect(on_recognized)
    recognizer.session_stopped.connect(lambda evt: done.set())
    recognizer.canceled.connect(on_canceled)

    # 긴 음성도 처리할 수 있도록 연속 인식을 쓴다 (짧은 인식은 약 30초까지만 처리)
    recognizer.start_continuous_recognition()
    done.wait(600)
    recognizer.stop_continuous_recognition()

    if errors:
        raise RuntimeError(f"Azure 음성 서비스 오류: {errors[0]}")
    return segments


# 잘라 낸 구간 기준의 시간(Offset)을 전체 음성 기준으로 되돌린다
def shift_segments(segments: list[dict], seconds: float) -> list[dict]:
    ticks = int(seconds * TICKS_PER_SECOND)
    for seg in segments:
        seg["Offset"] += ticks
        for best in seg.get("NBest", []):
            for word in best.get("Words", []):
                if "Offset" in word:
                    word["Offset"] += ticks
    return segments


# 구간마다 잘라서 동시에 평가한 뒤 순서대로 합친다. 실패한 구간은 한 번씩 순서대로 다시 시도한다
def recognize_in_parallel(wav_path: str, groups: list[dict], language: str) -> list[dict]:
    def work(group: dict) -> list[dict]:
        piece = slice_wav(wav_path, group["start"], group["end"])
        try:
            return shift_segments(recognize_segments(piece, group["text"], language), group["start"])
        finally:
            os.remove(piece)

    with ThreadPoolExecutor(max_workers=min(PARALLEL_WORKERS, len(groups))) as pool:
        futures = [pool.submit(work, group) for group in groups]
        outcomes = []
        for future in futures:
            try:
                outcomes.append(future.result())
            except RuntimeError as exc:
                outcomes.append(exc)
    merged = []
    for group, outcome in zip(groups, outcomes):
        if isinstance(outcome, RuntimeError):
            logger.warning("발음 평가 구간 재시도: %s", outcome)
            outcome = work(group)
        merged.extend(outcome)
    return merged


# 기준 문장(reference_text)과 비교해 발음을 평가하는 함수
# chunks(음성 인식 구간 목록)를 주면 긴 음성을 나눠 동시에 평가해 훨씬 빨라진다
def assess_pronunciation(audio_path: str, reference_text: str, language: str = "ko-KR", chunks: list[dict] | None = None) -> dict:
    wav_path = to_wav(audio_path)
    try:
        groups = split_groups(chunks) if chunks else []
        if len(groups) > 1:
            segments = recognize_in_parallel(wav_path, groups, language)
        else:
            segments = recognize_segments(wav_path, reference_text, language)
    finally:
        os.remove(wav_path)

    return build_result(segments, reference_text)
