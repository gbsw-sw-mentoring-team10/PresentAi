from fastapi import APIRouter, File, Form, UploadFile
import time
import random

from services.speech_rate import get_speech_rate_score


router = APIRouter()

# 실제 /pronunciation/ 응답과 같은 형식:
# mode, recognized_text, reference_word_count, scores, segments, words, reference_source,
# silence, speech_rate(분당 글자 수), speech_rate_score(325 기준 0~100점)
# 각 샘플은 테스트 음성을 실제 파이프라인(whisper-small)에 통과시킨 결과(text, chunks, silence, speech_rate)를 바탕으로 한다
SAMPLES = [
    # 중간에 4초 쉼이 있는 음성
    {
        "text": " 안녕하세요. 지금부터 발표 연습을 시작하겠습니다. 오늘의 주제는 인공지능입니다. 다시 이어서 말씀드리겠습니다. 인공지능은 우리 생활을 빠르게 바꾸고 있습니다.",
        "chunks": [
            {"timestamp": [0.0, 10.08], "text": " 안녕하세요. 지금부터 발표 연습을 시작하겠습니다. 오늘의 주제는 인공지능입니다."},
            {"timestamp": [10.08, 15.28], "text": " 다시 이어서 말씀드리겠습니다. 인공지능은 우리 생활을 빠르게 바꾸고 있습니다."}
        ],
        "silence": {
            "duration": 15.33,
            "noise_floor_db": -100.0,
            "threshold_db": -92.0,
            "pauses": [
                {"start": 6.11, "end": 10.06, "duration": 3.95}
            ]
        },
        "speech_rate": 353.3
    },
    # 쉼이 없는 음성 (pauses가 빈 리스트)
    {
        "text": " 안녕하세요 지금부터 프레젠트 ai 발표 연습을 시작하겠습니다 오늘 발표 주제는 인공지능을 활용한 발표 피드백 서비스입니다",
        "chunks": [
            {"timestamp": [0.0, 5.18], "text": " 안녕하세요 지금부터 프레젠트 ai 발표 연습을 시작하겠습니다"},
            {"timestamp": [5.18, 9.62], "text": " 오늘 발표 주제는 인공지능을 활용한 발표 피드백 서비스입니다"}
        ],
        "silence": {
            "duration": 9.67,
            "noise_floor_db": -37.0,
            "threshold_db": -29.0,
            "pauses": []
        },
        "speech_rate": 328.9
    },
    # 분당 약 300자로 말한 음성
    {
        "text": " 안녕하세요 지금부터 발표 연습을 시작하겠습니다 오늘은 인공지능이 우리 생활에 미치는 영향에 대해 말씀드리겠습니다 먼저 인공지능이 무엇인지 간단히 살펴보겠습니다 인공지능은 사람이 하던 일을 컴퓨터가 대신 할 수 있도록 만든 기술입니다 최근에는 글을 쓰고 그림을 그리고 음성을 알아 듣는 일까지 빠르게 발전하고 있습니다. 이러한 변화는 우리가 일하고 공부하는 방식을 크게 바꾸고 있습니다. 지금까지 발표를 들어주셔서 감사합니다.",
        "chunks": [
            {"timestamp": [0.0, 27.0], "text": " 안녕하세요 지금부터 발표 연습을 시작하겠습니다 오늘은 인공지능이 우리 생활에 미치는 영향에 대해 말씀드리겠습니다 먼저 인공지능이 무엇인지 간단히 살펴보겠습니다 인공지능은 사람이 하던 일을 컴퓨터가 대신 할 수 있도록 만든 기술입니다 최근에는 글을 쓰고 그림을 그리고 음성을 알아 듣는 일까지 빠르게 발전하고 있습니다."},
            {"timestamp": [27.0, 32.0], "text": " 이러한 변화는 우리가 일하고 공부하는 방식을 크게 바꾸고 있습니다."},
            {"timestamp": [32.0, 36.0], "text": " 지금까지 발표를 들어주셔서 감사합니다."}
        ],
        "silence": {
            "duration": 36.28,
            "noise_floor_db": -37.0,
            "threshold_db": -29.0,
            "pauses": []
        },
        "speech_rate": 299.3
    },
    # 분당 약 325자로 말한 음성
    {
        "text": " 안녕하세요 지금부터 발표 연습을 시작하겠습니다 오늘은 인공지능이 우리 생활에 미치는 영향에 대해 말씀드리겠습니다 먼저 인공지능이 무엇인지 간단히 살펴보겠습니다 인공지능은 사람이 하던 일을 컴퓨터가 대신 할 수 있도록 만든 기술입니다 최근에는 글을 쓰고 그림을 그리고 음성을 알아 듣는 일까지 빠르게 발전하고 있습니다. 이러한 변화는 우리가 일하고 공부하는 방식을 크게 바꾸고 있습니다. 지금까지 발표를 들어주셔서 감사합니다.",
        "chunks": [
            {"timestamp": [0.0, 25.18], "text": " 안녕하세요 지금부터 발표 연습을 시작하겠습니다 오늘은 인공지능이 우리 생활에 미치는 영향에 대해 말씀드리겠습니다 먼저 인공지능이 무엇인지 간단히 살펴보겠습니다 인공지능은 사람이 하던 일을 컴퓨터가 대신 할 수 있도록 만든 기술입니다 최근에는 글을 쓰고 그림을 그리고 음성을 알아 듣는 일까지 빠르게 발전하고 있습니다."},
            {"timestamp": [25.18, 30.26], "text": " 이러한 변화는 우리가 일하고 공부하는 방식을 크게 바꾸고 있습니다."},
            {"timestamp": [30.26, 33.42], "text": " 지금까지 발표를 들어주셔서 감사합니다."}
        ],
        "silence": {
            "duration": 33.5,
            "noise_floor_db": -36.4,
            "threshold_db": -28.4,
            "pauses": []
        },
        "speech_rate": 324.2
    }
]


# 샘플의 chunks를 Azure 발음 평가 응답 형식(segments, words)으로 바꾼다
def to_response(sample: dict, reference_source: str = "whisper") -> dict:
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
        "reference_source": reference_source,
        "silence": sample["silence"],
        "speech_rate": sample["speech_rate"],
        "speech_rate_score": get_speech_rate_score(sample["speech_rate"]),
    }


@router.post("/")
def create_pronunciation_feedback(reference_text: str | None = Form(None), file: UploadFile = File(...)):
    print("발음 평가를 처리합니다")
    time.sleep(3)
    reference_source = "user" if (reference_text or "").strip() else "whisper"
    return to_response(random.choice(SAMPLES), reference_source)
