import json
import os
import subprocess
import tempfile
import threading
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)

TICKS_PER_SECOND = 10_000_000  # Azure 시간 단위는 100ns


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


# 기준 문장(reference_text)과 비교해 발음을 평가하는 함수
def assess_pronunciation(audio_path: str, reference_text: str, language: str = "ko-KR") -> dict:
    # Azure SDK는 호출될 때 불러온다 (설치되지 않았거나 시스템 라이브러리가 없는 환경에서도 서버가 뜨도록)
    import azure.cognitiveservices.speech as speechsdk

    key = os.getenv("AZURE_SPEECH_KEY")
    region = os.getenv("AZURE_SPEECH_REGION")
    if not key or not region:
        raise RuntimeError("AZURE_SPEECH_KEY, AZURE_SPEECH_REGION 환경변수를 설정해 주세요.")

    wav_path = to_wav(audio_path)
    try:
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
    finally:
        os.remove(wav_path)

    if errors:
        raise RuntimeError(f"Azure 음성 서비스 오류: {errors[0]}")

    return build_result(segments, reference_text)
