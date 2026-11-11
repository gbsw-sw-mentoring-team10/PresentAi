import os
import subprocess
import sys

from faster_whisper import WhisperModel

_model = None


# CPU 스레드 수를 정한다. Apple Silicon은 효율 코어까지 쓰면 오히려 3배 가까이 느려져서 성능 코어 수만 쓴다.
# WHISPER_CPU_THREADS 환경변수로 직접 지정할 수도 있다.
def cpu_thread_count() -> int:
    override = os.getenv("WHISPER_CPU_THREADS", "").strip()
    if override.isdigit() and int(override) > 0:
        return int(override)
    if sys.platform == "darwin":
        try:
            out = subprocess.run(
                ["sysctl", "-n", "hw.perflevel0.physicalcpu"],
                capture_output=True, text=True, check=True, timeout=2,
            ).stdout.strip()
            if out.isdigit() and int(out) > 0:
                return int(out)
        except (OSError, subprocess.SubprocessError):
            pass
    return os.cpu_count() or 4


# 모델은 처음 호출할 때 한 번만 로드해서 재사용한다 (요청마다 로드하지 않기 위함)
def get_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel(
            "small",
            device="cpu",
            compute_type="int8",  # CPU에서 빠르고 메모리를 덜 쓰는 양자화
            cpu_threads=cpu_thread_count(),
        )
    return _model


# 음성 파일 -> 텍스트 변환 함수
# 반환 형식: {"text": 전체 텍스트, "chunks": [{"timestamp": [시작, 끝], "text": 구간 텍스트}]}
def transcribe_audio(audio_path: str) -> dict:
    segments, _ = get_model().transcribe(
        audio_path,
        language="ko",
        task="transcribe",
        beam_size=1,  # 기존(transformers) 기본값과 같은 greedy 디코딩
    )

    chunks = [
        {"timestamp": [round(seg.start, 2), round(seg.end, 2)], "text": seg.text}
        for seg in segments  # segments는 제너레이터라 순회하는 시점에 실제로 변환한다
    ]
    return {"text": "".join(c["text"] for c in chunks), "chunks": chunks}
