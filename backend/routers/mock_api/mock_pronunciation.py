import random

from fastapi import APIRouter, File, Form, UploadFile

from routers.mock_api.common import simulate_latency
from routers.mock_api.mock_speech import SAMPLES


router = APIRouter()

# 실제 /pronunciation/ 응답과 같은 형식: mode, recognized_text, reference_word_count, scores, segments, words
# (Whisper 텍스트, 무음, 말하기 속도는 /speech/ 응답에 있다)
# 샘플의 chunks를 Azure 발음 평가 응답 형식(segments, words)으로 바꾼다
def to_response(sample: dict) -> dict:
    segments, words = [], []
    for i, chunk in enumerate(sample["chunks"]):
        start, end = chunk["timestamp"]
        text = chunk["text"].strip()
        base = 96 - (i * 3) % 9  # 구간마다 조금씩 다른 점수
        segments.append({
            "start": start,
            "end": end,
            "text": text,
            "accuracy": float(base),
            "fluency": float(base + 1),
            "completeness": 100.0,
            "pronunciation": float(base),
        })
        tokens = text.split()
        step = (end - start) / max(len(tokens), 1)
        for j, token in enumerate(tokens):
            weak = (i + j) % 11 == 10  # 일부 단어는 발음이 부정확한 것으로 표시
            words.append({
                "word": token,
                "start": round(start + step * j, 2),
                "end": round(start + step * (j + 1), 2),
                "accuracy": 62.0 if weak else float(base + (j % 4)),
                "error_type": "Mispronunciation" if weak else "None",
            })

    total = sum(s["end"] - s["start"] for s in segments)

    def weighted(key: str):
        return round(sum(s[key] * (s["end"] - s["start"]) for s in segments) / total, 1)

    return {
        "mode": "script",
        "recognized_text": " ".join(s["text"] for s in segments),
        "reference_word_count": len(sample["text"].split()),
        "scores": {
            "accuracy": weighted("accuracy"),
            "fluency": weighted("fluency"),
            "completeness": weighted("completeness"),
            "pronunciation": weighted("pronunciation"),
        },
        "segments": segments,
        "words": words,
    }


# reference_text와 텍스트가 같은 샘플을 찾는다 (/mock/speech 응답의 text를 그대로 보내면 같은 샘플이 선택된다)
def find_sample(reference_text: str) -> dict:
    for sample in SAMPLES:
        if sample["text"].strip() == reference_text.strip():
            return sample
    return random.choice(SAMPLES)


@router.post("/")
def create_pronunciation_feedback(reference_text: str = Form(...), file: UploadFile = File(...)):
    simulate_latency(3, "발음 평가를 처리합니다")
    return to_response(find_sample(reference_text))
