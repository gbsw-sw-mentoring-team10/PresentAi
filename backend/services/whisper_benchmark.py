"""Whisper 구현(faster-whisper, transformers)의 속도와 결과를 같은 음성으로 비교하는 측정용 코드.

서비스 코드에서는 쓰지 않는다. benchmark_app.py(별도 앱)에서만 불러온다.
무거운 의존성(torch, transformers)은 해당 엔진을 쓸 때만 불러온다.
"""
import os
import time
import wave

from services.pronunciation_assess import assess_pronunciation, to_wav
from services.stt_whisper import cpu_thread_count

_models: dict = {}  # 설정별로 모델을 한 번만 로드해 재사용한다


def audio_seconds(wav_path: str) -> float:
    with wave.open(wav_path, "rb") as source:
        return source.getnframes() / source.getframerate()


# 같은 3단어 묶음이 얼마나 반복되는지(0~1). 노래·잡음에서 모델이 같은 말을 되풀이하면 높아진다
def repetition_ratio(text: str) -> float:
    words = text.split()
    grams = [tuple(words[i : i + 3]) for i in range(len(words) - 2)]
    return round(1 - len(set(grams)) / len(grams), 3) if grams else 0.0


def summarize(engine: str, settings: dict, text: str, seconds: float, load_seconds: float, duration: float) -> dict:
    return {
        "engine": engine,
        "settings": settings,
        "audio_seconds": round(duration, 1),
        "load_seconds": round(load_seconds, 1),
        "seconds": round(seconds, 1),  # 모델 로딩을 뺀 변환 시간
        "ratio_to_audio": round(seconds / duration, 2) if duration else None,
        "chars": len(text),
        "repetition": repetition_ratio(text),
        "threads": cpu_thread_count(),
        "text": text,
    }


def run_faster(wav_path: str, duration: float, *, beam_size: int, compute_type: str, vad_filter: bool) -> dict:
    from faster_whisper import WhisperModel

    settings = {"beam_size": beam_size, "compute_type": compute_type, "vad_filter": vad_filter}
    key = ("faster", compute_type)
    load = 0.0
    if key not in _models:
        started = time.time()
        _models[key] = WhisperModel("small", device="cpu", compute_type=compute_type, cpu_threads=cpu_thread_count())
        load = time.time() - started
    started = time.time()
    segments, _ = _models[key].transcribe(wav_path, language="ko", beam_size=beam_size, vad_filter=vad_filter)
    text = "".join(segment.text for segment in segments)
    return summarize("faster-whisper", settings, text, time.time() - started, load, duration)


def run_transformers(
    wav_path: str, duration: float, *, chunk_length_s: int, stride_s: int, num_beams: int,
    dtype: str, int8: bool, timestamps: bool, batch_size: int,
) -> dict:
    import torch
    from transformers import pipeline

    settings = {
        "chunk_length_s": chunk_length_s, "stride_s": stride_s, "num_beams": num_beams,
        "dtype": dtype, "int8": int8, "timestamps": timestamps, "batch_size": batch_size,
    }
    key = ("transformers", dtype, int8, chunk_length_s, stride_s, batch_size)
    load = 0.0
    if key not in _models:
        torch.set_num_threads(cpu_thread_count())
        started = time.time()
        pipe = pipeline(
            "automatic-speech-recognition", model="openai/whisper-small", device=-1,
            dtype=getattr(torch, dtype), chunk_length_s=chunk_length_s,
            stride_length_s=(stride_s, stride_s), batch_size=batch_size,
        )
        if int8:  # faster-whisper의 int8과 맞추기 위한 동적 양자화
            pipe.model = torch.quantization.quantize_dynamic(pipe.model, {torch.nn.Linear}, dtype=torch.qint8)
        _models[key] = pipe
        load = time.time() - started
    started = time.time()
    out = _models[key](
        wav_path, return_timestamps=timestamps,
        generate_kwargs={"language": "ko", "task": "transcribe", "num_beams": num_beams},
    )
    return summarize("transformers", settings, out["text"], time.time() - started, load, duration)


def prepare(audio_path: str) -> tuple[str, float]:
    wav_path = to_wav(audio_path)
    return wav_path, audio_seconds(wav_path)


def cleanup(wav_path: str) -> None:
    os.remove(wav_path)


# 이전 구현과 같은 순서로 처리하고 단계별 시간을 돌려준다.
#  1) Whisper가 텍스트로 변환 (transformers 기본 설정 또는 faster-whisper)
#  2) 그 텍스트를 기준 문장으로 Azure에 음성 전체를 한 번에(통째로) 보내 발음 평가
def run_original_pipeline(audio_path: str, *, whisper: str = "transformers") -> dict:
    wav_path, duration = prepare(audio_path)
    try:
        if whisper == "transformers":
            stt = run_transformers(
                wav_path, duration, chunk_length_s=30, stride_s=5, num_beams=1,
                dtype="float32", int8=False, timestamps=True, batch_size=1,
            )
        else:
            stt = run_faster(wav_path, duration, beam_size=1, compute_type="int8", vad_filter=False)
    finally:
        os.remove(wav_path)

    azure = None
    text = stt["text"].strip()
    if text:
        started = time.time()
        # chunks를 주지 않으면 구간 분할 없이 음성 전체를 Azure에 한 번에 보낸다
        scores = assess_pronunciation(audio_path, text)["scores"]
        azure = {"mode": "single", "seconds": round(time.time() - started, 1), "scores": scores}

    whisper_seconds = stt["seconds"]
    azure_seconds = azure["seconds"] if azure else 0.0
    return {
        "audio_seconds": stt["audio_seconds"],
        "whisper": {k: v for k, v in stt.items() if k != "text"} | {"text_preview": text[:80]},
        "azure": azure,
        "total_seconds": round(whisper_seconds + azure_seconds, 1),  # 모델 로딩 제외
        "whisper_share": round(whisper_seconds / (whisper_seconds + azure_seconds), 2) if azure else 1.0,
    }
