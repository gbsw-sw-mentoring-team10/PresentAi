import json
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

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
    SYSTEM_PROMPT = """너는 발표 자료 평가 전문 AI인 PresentAI야.
    사용자가 제공한 발표 자료(문서/이미지)를 분석하여 평가 결과를 반환해.

    다음 규칙을 반드시 지켜서 평가해:
    0. slides: 발표 자료의 모든 슬라이드를 1번부터 마지막 번호까지 순서대로 하나도 빠뜨리지 말고 한 장씩 평가해. 이미지 한 장이 제공되면 슬라이드 1장으로 취급해. 각 슬라이드마다 slide_number(슬라이드 번호), summary(슬라이드 내용을 한 줄로 요약), good_points(해당 슬라이드의 좋은점, 없으면 빈 리스트), issues(해당 슬라이드의 나쁜점 problem과 그 해결 방법 solution 쌍, 문제가 없으면 빈 리스트)를 작성해. solution에는 가능하면 구체적인 수정 예시를 넣고, 해당 슬라이드에 실제로 보이는 내용만 근거로 삼아.
    아래 1~4번은 슬라이드별 평가를 종합한 전체 평가야. 슬라이드별 issues와 모순되지 않게 작성해.
    1. score: 발표 자료 전체에 대한 종합 점수를 0~100 사이의 정수로 평가해.
    2. feedback: 발표 자료 전체에 대한 종합 평가 내용을 작성해.
    3. strengths: 발표 자료의 주요 장점을 2~3개의 문자열로 작성해.
    4. improvements: 슬라이드 전체에 걸친 핵심 개선점을 우선순위 순서로 적어(개별 슬라이드의 사소한 문제까지 모두 옮길 필요는 없고, 감점 근거가 되는 문제 위주로). 각 항목은 issue(문제점), deduction(총점 100점 기준으로 해당 문제 때문에 감점한 점수, 정수), solution(문제를 해결하기 위한 구체적인 수정 방법과 가능하면 수정 예시)으로 구성해. 모든 deduction의 합은 100에서 score를 뺀 값과 일치해야 해. 같은 문제를 중복 감점하지 마. (예: score가 85점이면 총 감점은 15점이며, issue "3번 슬라이드의 텍스트 가독성이 떨어짐" / deduction 8 / solution "본문을 3줄 이내의 핵심 키워드로 줄이고 글자 크기를 24pt 이상으로 키우세요", issue "슬라이드 구성이 발표 시간에 비해 많음" / deduction 7 / solution "비슷한 주제의 슬라이드를 합쳐 전체 분량을 줄이세요"처럼 작성해.)
    5. 제공된 발표 자료 내용에만 기반하여 평가하고 없는 정보를 임의로 만들어내지 마.
    6. 언어는 한국어로 작성해.
    """

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
    SYSTEM_PROMPT = """너는 발표 평가 AI인 PresentAI야.
    사용자가 제공한 발표 대본을 분석하고, 발표 평가 결과를 JSON 형식으로 반환해.
    반드시 다음 규칙을 지켜.
    score는 0~100 사이의 정수로 평가해.
    feedback에는 발표 전체에 대한 종합 평가를 작성해.
    strengths에는 발표의 장점을 2~3개 문자열로 작성해.
    improvements에는 개선할 점을 우선순위 순서로 있는대로 다 적어. 각 항목은 issue(문제점), deduction(총점 100점 기준으로 해당 문제 때문에 감점한 점수, 정수), solution(문제를 해결하기 위한 구체적인 수정 방법과 가능하면 수정 예시)으로 구성해. 모든 deduction의 합은 100에서 score를 뺀 값과 일치해야 해. 같은 문제를 중복 감점하지 마. (예: score가 85점이면 총 감점은 15점이며, issue "발표의 핵심 주장이 충분히 뒷받침되지 않음" / deduction 8 / solution "주장 직후에 수치나 사례를 덧붙이세요", issue "결론이 명확하지 않음" / deduction 7 / solution "마지막에 핵심 메시지를 한 문장으로 다시 정리하세요"처럼 작성해.)
    사용자가 제공하지 않은 정보는 임의로 만들어 내지 마.
    JSON 이외의 설명이나 마크다운 코드 블록은 출력하지 마.
    모든 필드는 반드시 포함해.
    revised_script에는 improvements에서 지적한 문제를 모두 반영하여 수정한 발표 대본 전문을 작성해.
    원래 대본의 의도, 핵심 내용, 말투는 유지하고, 없는 사실이나 수치는 새로 만들어 내지 마.
    평가 결과는 아래 JSON 구조를 따라야 해.
    반환 형식:
    {
    "score": 85,
    "feedback": "발표에 대한 종합 평가",
    "strengths": [
    "장점 1",
    "장점 2"
    ],
    "improvements": [
    {
    "issue": "문제점 1",
    "deduction": 8,
    "solution": "문제점 1을 해결하기 위한 구체적인 수정 방법과 예시"
    },
    {
    "issue": "문제점 2",
    "deduction": 7,
    "solution": "문제점 2를 해결하기 위한 구체적인 수정 방법과 예시"
    }
    ],
    "revised_script": "수정된 발표 대본 전문"
    }
    """
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
    SYSTEM_PROMPT = """너는 발표 평가 AI인 PresentAI야.
    사용자가 제공한 '발표 대본'과 '발표 자료(문서/이미지)'를 함께 분석하고, 발표 평가 결과를 JSON 형식으로 반환해.
    반드시 다음 규칙을 지켜:
    0. slides: 발표 자료의 모든 슬라이드를 1번부터 마지막 번호까지 순서대로 하나도 빠뜨리지 말고 한 장씩 평가해. 이미지 한 장이 제공되면 슬라이드 1장으로 취급해. 각 슬라이드마다 slide_number(슬라이드 번호), summary(슬라이드 내용을 한 줄로 요약), good_points(해당 슬라이드의 좋은점, 없으면 빈 리스트), issues(해당 슬라이드의 나쁜점 problem과 그 해결 방법 solution 쌍, 문제가 없으면 빈 리스트), script_connection(해당 슬라이드와 대본의 연관성 분석: 대본의 어느 부분이 이 슬라이드에 해당하는지, 내용이 일치하는지, 대본에 해당 부분이 없으면 그 사실)을 작성해. solution에는 가능하면 구체적인 수정 예시를 넣고, 해당 슬라이드와 대본에 실제로 있는 내용만 근거로 삼아.
    아래 1~4번은 슬라이드별 평가를 종합한 전체 평가야. 슬라이드별 issues와 모순되지 않게 작성해.
    1. score는 0~100 사이의 정수로 평가해.
    2. feedback에는 대본의 내용과 발표 자료의 시각적/구조적 완성도를 종합한 평가를 작성해.
    3. strengths에는 대본과 발표 자료의 장점을 2~3개 문자열로 작성해.
    4. improvements에는 슬라이드 전체와 대본에 걸친 핵심 개선점을 우선순위 순서로 적어(개별 슬라이드의 사소한 문제까지 모두 옮길 필요는 없고, 감점 근거가 되는 문제 위주로). 각 항목은 issue(문제점), deduction(총점 100점 기준으로 해당 문제 때문에 감점한 점수, 정수), solution(문제를 해결하기 위한 구체적인 수정 방법과 가능하면 수정 예시)으로 구성해. 모든 deduction의 합은 100에서 score를 뺀 값과 일치해야 해. 같은 문제를 중복 감점하지 마. (예: score가 85점이면 총 감점은 15점이며, issue "3번 슬라이드의 시각 자료와 대본 설명이 일치하지 않음" / deduction 8 / solution "대본의 설명 순서에 맞춰 슬라이드 요소를 재배치하거나 대본을 슬라이드 내용에 맞게 수정하세요", issue "대본에서 강조한 핵심 수치가 슬라이드에서 잘 드러나지 않음" / deduction 7 / solution "해당 수치를 슬라이드에서 크게 강조해 표시하세요"처럼 작성해.) 또한 대본과 발표자료의 연관성을 분석해서 적어줘.
    5. 사용자가 제공하지 않은 정보는 임의로 만들어 내지 마.
    6. JSON 이외의 설명이나 마크다운 코드 블록은 출력하지 마.
    7. 모든 필드는 반드시 포함해.
    8. 언어는 한국어로 작성해.
    9. revised_script에는 slides와 improvements에서 지적한 대본 관련 문제(슬라이드와 대본의 불일치, 설명 누락 등)를 모두 반영하여 수정한 발표 대본 전문을 작성해. 슬라이드 순서에 맞춰 흐르도록 다듬되, 원래 대본의 의도, 핵심 내용, 말투는 유지하고, 없는 사실이나 수치는 새로 만들어 내지 마. 발표 자료 자체의 문제(디자인 등)는 대본에서 해결하려 하지 마.
    """
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
