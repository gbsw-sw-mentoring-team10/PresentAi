import random

from fastapi import APIRouter, File, UploadFile

from routers.mock_api.common import load_samples, simulate_latency
from services.speech_rate import get_speech_rate_score


router = APIRouter()

# 실제 /speech/ 응답과 같은 형식: text, chunks, silence, speech_rate(분당 글자 수), speech_rate_score(325 기준 0~100점)
# 각 샘플은 테스트 음성을 실제 파이프라인(whisper-small)에 통과시킨 결과이며 data/speech_samples.json에 있다
# (쉼이 있는 음성, 쉼이 없는 음성, 분당 약 300자, 분당 약 325자 순서)
SAMPLES = load_samples("speech_samples")


@router.post("/")
def create_speech_feedback(file: UploadFile = File(...)):
    simulate_latency(3, "음성 파일을 처리합니다")
    sample = random.choice(SAMPLES)
    return {**sample, "speech_rate_score": get_speech_rate_score(sample["speech_rate"])}
