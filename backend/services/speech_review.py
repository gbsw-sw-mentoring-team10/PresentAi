import json

from google.genai import types
from pydantic import BaseModel, Field

from services.ai_feedback_method import client, get_model_name

MAX_INPUT_CHARS = 200_000

SYSTEM_PROMPT = """너는 발표 전달력을 코칭하는 AI인 PresentAI야.
사용자의 리허설 음성을 분석한 결과(JSON)가 주어져. 이 결과만 근거로 짧고 친절하게 리뷰해.

입력 JSON의 의미:
- speech.text / chunks: 인식한 발화 내용과 구간별 시간(초)
- speech.speech_rate: 분당 글자 수(대략 300~325자가 듣기 편한 속도), speech_rate_score: 속도 점수(0~100)
- speech.silence.pauses: 쉰 구간(start, end, duration 초)
- pronunciation.scores: Azure 발음 평가 점수(accuracy 정확도, fluency 유창성, completeness 완성도, pronunciation 종합, 모두 0~100)
- pronunciation.words: 단어별 accuracy와 error_type(Mispronunciation 발음 오류, Omission 빠뜨림, Insertion 끼어듦, None 문제없음)

반드시 지킬 것:
1. 입력에 없는 사실이나 수치를 만들어 내지 마. 점수나 시간을 언급할 때는 입력에 있는 값만 써.
2. summary는 2~3문장으로 전체 인상을 정리해. 점수 나열이 아니라 듣는 사람이 어떻게 느낄지를 중심으로 써.
3. strengths에는 실제로 잘한 점을 1~3개 적어. 근거가 없으면 빈 리스트로 둬.
4. improvements에는 가장 효과가 큰 순서대로 최대 3개를 적어. issue에는 문제를, solution에는 바로 연습해 볼 수 있는 구체적인 방법을 써. 발음이 약한 단어가 있다면 대표 단어를 직접 언급해.
5. 영어 같은 외국어 구간은 한국어 중심 평가의 특성상 점수가 낮게 나올 수 있어. 그런 구간은 단정하지 말고 참고용이라고 밝혀.
6. 분석 결과가 비어 있거나 부족하면 그 사실을 솔직히 적고 추측하지 마.
7. 한국어로, 존댓말로 작성해.
"""


class speech_improvement(BaseModel):
    issue: str = Field(description="개선이 필요한 점")
    solution: str = Field(description="바로 연습해 볼 수 있는 구체적인 방법")


class speech_review(BaseModel):
    summary: str = Field(description="전체 인상을 2~3문장으로 정리")
    strengths: list[str] = Field(description="잘한 점 1~3개, 근거가 없으면 빈 리스트")
    improvements: list[speech_improvement] = Field(description="우선순위 순서의 개선점, 최대 3개")


def generate_speech_review(speech: dict, pronunciation: dict) -> dict | None:
    payload = json.dumps(
        {"speech": speech, "pronunciation": pronunciation}, ensure_ascii=False
    )
    response = client.models.generate_content(
        model=get_model_name(),
        contents=[payload],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=speech_review,
        ),
    )
    parsed = response.parsed
    if parsed is None:
        return None
    return parsed.model_dump() if isinstance(parsed, BaseModel) else parsed
