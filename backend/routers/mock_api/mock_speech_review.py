from fastapi import APIRouter

from routers.mock_api.common import simulate_latency
from routers.speech_review import SpeechReviewRequest

router = APIRouter()


# 실제 /speech-review/와 같은 형식의 고정 응답 (Gemini를 호출하지 않는다)
@router.post("/")
def create_speech_review(payload: SpeechReviewRequest):
    simulate_latency(4, "AI 리뷰를 처리합니다")
    return {
        "summary": "전체적으로 또렷하게 말했고 속도도 듣기 편한 편이에요. 몇몇 단어에서 발음이 흐려지는 부분만 다듬으면 더 자신감 있게 들릴 거예요. (예시 리뷰)",
        "strengths": ["말하기 속도가 일정해서 따라가기 편해요.", "문장 끝을 흐리지 않고 마무리했어요."],
        "improvements": [
            {
                "issue": "점수가 낮게 나온 단어에서 발음이 뭉개져요.",
                "solution": "해당 단어만 천천히 세 번 따라 읽은 뒤 문장 속에서 다시 말해 보세요.",
            },
            {
                "issue": "긴 쉼이 중간에 몇 번 있어요.",
                "solution": "쉼이 필요한 곳을 대본에 표시해 두고, 그 외에는 이어서 말하는 연습을 해 보세요.",
            },
        ],
    }
