import random
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from routers.mock_api.common import load_samples, simulate_latency

router = APIRouter()

# 입력 조합별 mock 샘플과 지연 시간(초). 샘플은 data/*.json에 있다.
BOTH_SAMPLES = load_samples("feedback_both")
SCRIPT_SAMPLES = load_samples("feedback_script")
MATERIAL_SAMPLES = load_samples("feedback_material")
BOTH_DELAY = 8
SINGLE_DELAY = 5


@router.post("/")
def create_feedback(
    title: str,
    perpose: str,
    detail: Annotated[str | None, Form()] = None,
    prompt: Annotated[str | None, Form()] = None,
    file: Annotated[UploadFile | None, File()] = None,
):
    if prompt is not None and file is not None:
        simulate_latency(BOTH_DELAY, "대본과 파일을 함께 처리합니다")
        samples = BOTH_SAMPLES
    elif prompt is not None:
        simulate_latency(SINGLE_DELAY, "대본을 처리합니다")
        samples = SCRIPT_SAMPLES
    elif file is not None:
        simulate_latency(SINGLE_DELAY, "파일을 처리합니다")
        samples = MATERIAL_SAMPLES
    else:
        raise HTTPException(
            status_code=400, detail="대본이나 파일 중 하나 이상을 입력해야 합니다."
        )
    return random.choice(samples)
