from pydantic import BaseModel, Field, model_validator


class Improvement(BaseModel):
    issue: str
    deduction: int = Field(ge=0)
    solution: str


class SlideIssue(BaseModel):
    problem: str
    solution: str


class SlideFeedback(BaseModel):
    slide_number: int = Field(ge=1)
    summary: str
    good_points: list[str]
    issues: list[SlideIssue]
    script_connection: str = ""


class FeedbackPayload(BaseModel):
    score: int = Field(ge=0, le=100)
    feedback: str
    strengths: list[str]
    improvements: list[Improvement]
    revised_script: str = ""
    slides: list[SlideFeedback] = Field(default_factory=list)

    @model_validator(mode="after")
    def unique_slides(self):
        numbers = [slide.slide_number for slide in self.slides]
        if len(numbers) != len(set(numbers)):
            raise ValueError("슬라이드 번호가 중복되었습니다.")
        return self
