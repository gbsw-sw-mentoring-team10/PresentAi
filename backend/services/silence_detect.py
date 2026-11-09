import subprocess

import numpy as np

SAMPLE_RATE = 16000
FRAME_LENGTH = 1024  # 64ms
HOP_LENGTH = 256     # 16ms


# 어떤 형식이든 ffmpeg로 16kHz 모노로 디코딩해서 읽는다
def load_audio(audio_path: str) -> np.ndarray:
    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", audio_path, "-f", "f32le", "-ac", "1", "-ar", str(SAMPLE_RATE), "-"],
        capture_output=True,
        check=True,
    )
    return np.frombuffer(out.stdout, dtype=np.float32)


# 16ms 간격으로 음량(RMS)을 dB로 계산한다
def frame_db(y: np.ndarray) -> np.ndarray:
    padded = np.pad(y.astype(np.float64), FRAME_LENGTH // 2)  # 프레임이 해당 시각을 중심으로 오도록 양끝을 채움
    cumsum = np.concatenate([[0.0], np.cumsum(padded ** 2)])
    starts = np.arange(1 + len(y) // HOP_LENGTH) * HOP_LENGTH
    rms = np.sqrt((cumsum[starts + FRAME_LENGTH] - cumsum[starts]) / FRAME_LENGTH)
    return 20 * np.log10(np.maximum(rms, 1e-5))


# 음성 파일에서 말 사이의 쉼(무음 구간)을 찾는 함수
# 소음 수준에 맞춰 기준을 정하므로 배경 소음이 있어도 동작한다
def detect_pauses(audio_path: str, min_pause: float = 0.5, margin_db: float = 8.0) -> dict:
    y = load_audio(audio_path)
    duration = len(y) / SAMPLE_RATE
    db = frame_db(y)

    # 가장 조용한 10% 구간의 음량을 소음 바닥으로 보고, 그보다 margin_db 위를 무음 기준으로 한다
    noise_floor = float(np.percentile(db, 10))
    threshold = noise_floor + margin_db
    is_silent = db < threshold

    # 무음이 시작되는 프레임과 끝나는 프레임을 찾는다
    edges = np.diff(np.concatenate([[0], is_silent.astype(int), [0]]))
    starts = np.where(edges == 1)[0]
    ends = np.where(edges == -1)[0]

    frame_step = HOP_LENGTH / SAMPLE_RATE
    result = []
    for s, e in zip(starts, ends):
        start = s * frame_step
        end = duration if e == len(db) else e * frame_step
        # 녹음 맨 앞과 맨 뒤의 무음은 말 사이의 쉼이 아니므로 제외한다
        if start < frame_step or end >= duration - frame_step:
            continue
        if end - start >= min_pause:
            result.append({"start": round(float(start), 2), "end": round(float(end), 2), "duration": round(float(end - start), 2)})

    return {
        "duration": round(duration, 2),
        "noise_floor_db": round(noise_floor, 1),
        "threshold_db": round(threshold, 1),
        "pauses": result,
    }
