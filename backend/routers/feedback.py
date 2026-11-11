from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response

from routers.auth import DatabaseConnection, get_current_user
from schemas.auth import PublicUser
from schemas.feedback import FeedbackJobStatus, FeedbackList, SavedFeedback
from services.feedback_store import list_feedback, read_feedback

router = APIRouter(tags=["feedback"])


@router.get("", response_model=FeedbackList)
@router.get("/", response_model=FeedbackList, include_in_schema=False)
def saved_feedback_list(
    db: DatabaseConnection,
    current_user: Annotated[PublicUser, Depends(get_current_user)],
    response: Response,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    response.headers["Cache-Control"] = "no-store"
    return list_feedback(db, current_user.user_id, page=page, page_size=page_size)


@router.get(
    "/{result_id}",
    response_model=SavedFeedback | FeedbackJobStatus,
    response_model_exclude_unset=True,
)
def saved_feedback(
    result_id: Annotated[int, Path(gt=0)],
    db: DatabaseConnection,
    current_user: Annotated[PublicUser, Depends(get_current_user)],
    response: Response,
):
    response.headers["Cache-Control"] = "no-store"
    return read_feedback(db, current_user.user_id, result_id)
