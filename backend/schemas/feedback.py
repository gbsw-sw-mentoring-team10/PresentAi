from datetime import datetime
from typing import Literal

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


class FeedbackSummary(BaseModel):
    saved_result_id: int = Field(gt=0)
    title: str
    score: int = Field(ge=0, le=100)
    created_at: datetime


class FeedbackList(BaseModel):
    items: list[FeedbackSummary]
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)


class FeedbackFileStorage(BaseModel):
    saved_file_id: int | None = Field(default=None, gt=0)
    file_name: str | None = None
    file_size: int | None = Field(default=None, ge=0)
    file_content_type: str | None = None
    file_storage_status: Literal["pending", "saved", "failed"] | None = None
    file_storage_message: str | None = None


class SavedFeedback(FeedbackPayload, FeedbackFileStorage):
    saved_result_id: int = Field(gt=0)
    title: str
    created_at: datetime
    status: Literal["completed"]


class FeedbackJobStatus(FeedbackFileStorage):
    saved_result_id: int = Field(gt=0)
    status: Literal["pending", "processing", "failed"]
    error_message: str | None = None
