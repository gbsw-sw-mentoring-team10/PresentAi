import json
import logging

from fastapi import APIRouter, HTTPException
from google.genai import errors as genai_errors
from pydantic import BaseModel

from routers.upload import model_error_response
from services.speech_review import MAX_INPUT_CHARS, generate_speech_review

router = APIRouter()
logger = logging.getLogger(__name__)


class SpeechReviewRequest(BaseModel):
    # /speech/와 /pronunciation/ 응답을 그대로 받는다.
    speech: dict
    pronunciation: dict


# 음성·발음 분석 결과(JSON)를 Gemini가 읽고 코칭 리뷰를 만든다 (저장하지 않는다)
@router.post("/")
def create_speech_review(payload: SpeechReviewRequest):
    if len(json.dumps(payload.model_dump(), ensure_ascii=False)) > MAX_INPUT_CHARS:
        raise HTTPException(status_code=413, detail="분석 결과가 너무 길어 리뷰할 수 없습니다.")
    if not payload.pronunciation.get("scores"):
        raise HTTPException(status_code=422, detail="발음 평가 결과(scores)가 필요합니다.")
    try:
        review = generate_speech_review(payload.speech, payload.pronunciation)
    except (genai_errors.ClientError, genai_errors.ServerError) as exc:
        status_code, message = model_error_response(exc)
        raise HTTPException(status_code=status_code, detail=message) from exc
    if review is None:
        raise HTTPException(status_code=502, detail="AI 리뷰를 만들지 못했습니다.")
    return review
