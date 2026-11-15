import json
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from services.feedback_prompts import (
    MATERIAL_SYSTEM_PROMPT,
    OVERALL_SYSTEM_PROMPT,
    SCRIPT_SYSTEM_PROMPT,
)

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("프로젝트 루트 .env에 GEMINI_API_KEY를 설정해 주세요.")

client = genai.Client(api_key=api_key)


def get_model_name():
    return os.getenv("GEMINI_MODEL", "").strip() or "gemini-3.8-flash"


def get_feedback_response(response):
    # 구조화된 파싱이 실패해도 모델이 생성한 텍스트는 프론트에 전달한다.
    if response.parsed is not None:
        return response.parsed
    text = response.text
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text


class improvement(BaseModel):
    issue: str = Field(description="개선이 필요한 문제점")
    deduction: int = Field(ge=0, description="이 문제로 감점한 점수")
    solution: str = Field(description="문제를 해결하기 위한 구체적인 수정 방법과 예시")

class feedback(BaseModel):
    score: int = Field(ge=0, le=100)
    feedback: str
    strengths: list[str]
    improvements: list[improvement]

class script_feedback(feedback):
    revised_script: str = Field(description="피드백을 반영하여 수정한 대본 전문")

class slide_issue(BaseModel):
    problem: str = Field(description="해당 슬라이드의 나쁜점(문제점)")
    solution: str = Field(description="그 문제를 해결하기 위한 구체적인 수정 방법과 예시")

class slide_feedback(BaseModel):
    slide_number: int = Field(ge=1, description="슬라이드 번호(1부터 시작)")
    summary: str = Field(description="해당 슬라이드의 내용을 한 줄로 요약한 제목")
    good_points: list[str] = Field(description="해당 슬라이드의 좋은점. 없으면 빈 리스트")
    issues: list[slide_issue] = Field(description="해당 슬라이드의 나쁜점과 솔루션 쌍. 문제가 없으면 빈 리스트")

class material_feedback(feedback):
    slides: list[slide_feedback] = Field(description="발표 자료의 모든 슬라이드를 번호 순서대로 빠짐없이 평가한 목록")

class overall_slide_feedback(slide_feedback):
    script_connection: str = Field(description="해당 슬라이드와 대본의 연관성 분석. 대본에서 이 슬라이드에 해당하는 부분이 없으면 그 사실을 적는다")

class overall_feedback(feedback):
    revised_script: str = Field(description="피드백을 반영하여 수정한 대본 전문")
    slides: list[overall_slide_feedback] = Field(description="발표 자료의 모든 슬라이드를 번호 순서대로 빠짐없이 평가한 목록")

# 자료 피드백 함수
def generate_material_feedback(input_file, mime_type: str, title: str, perpose: str, detail: str | None = None):
    SYSTEM_PROMPT = MATERIAL_SYSTEM_PROMPT

    uploaded_file = client.files.upload(file=input_file, config=types.UploadFileConfig(mime_type=mime_type))
    if detail is None:
        prompt = f"발표 제목과 목적, 추가 설명등을 참고해서 피드백에 반영해, 발표 제목: {title}, 발표 목적: {perpose}"
    elif detail is not None:
        prompt = f"발표 제목과 목적, 추가 설명등을 참고해서 피드백에 반영해, 발표 제목: {title}, 발표 목적: {perpose}, 추가 설명: {detail}"

    response = client.models.generate_content(
        model=get_model_name(),
        contents=[prompt, uploaded_file],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=material_feedback,
        ),
    )

    return get_feedback_response(response)


# 대본 피드백 함수
def generate_script_feedback(prompt: str, title: str, perpose: str, detail: str | None = None):
    SYSTEM_PROMPT = SCRIPT_SYSTEM_PROMPT
    if detail is None:
            TPD = f"발표 제목과 목적, 추가 설명등을 참고해서 피드백에 반영해, 발표 제목: {title}, 발표 목적: {perpose}, 발표 대본: "
    elif detail is not None:
            TPD = f"발표 제목과 목적, 추가 설명등을 참고해서 피드백에 반영해, 발표 제목: {title}, 발표 목적: {perpose}, 추가 설명: {detail}, 발표 대본: "
    
    response = client.models.generate_content(
        model=get_model_name(),
        contents=[TPD, prompt],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=script_feedback,
        ),
    )

    return get_feedback_response(response)


# 대본 / 자료 종합 피드백 함수
def overall_result(prompt: str, input_file, mime_type: str, title: str, perpose: str, detail: str | None = None):
    SYSTEM_PROMPT = OVERALL_SYSTEM_PROMPT
    if detail is None:
        TPD = f"발표 제목과 목적, 추가 설명등을 참고해서 피드백에 반영해, 발표 제목: {title}, 발표 목적: {perpose}, 발표 대본 및 발표 자료: "
    elif detail is not None:
        TPD = f"발표 제목과 목적, 추가 설명등을 참고해서 피드백에 반영해, 발표 제목: {title}, 발표 목적: {perpose}, 추가 설명: {detail}, 발표 대본 및 발표 자료: "

    uploaded_file = client.files.upload(file=input_file, config=types.UploadFileConfig(mime_type=mime_type))
    response = client.models.generate_content(
        model=get_model_name(),
        contents=[TPD, prompt, uploaded_file],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=overall_feedback,
        ),
    )

    return get_feedback_response(response)
