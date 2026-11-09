from typing import Annotated

from fastapi import APIRouter, Depends, Response

from routers.auth import DatabaseConnection, get_current_user
from schemas.auth import PublicUser
from services.feedback_store import read_feedback

router = APIRouter(tags=["feedback"])


@router.get("/{result_id}")
def saved_feedback(
    result_id: int,
    db: DatabaseConnection,
    current_user: Annotated[PublicUser, Depends(get_current_user)],
    response: Response,
):
    response.headers["Cache-Control"] = "no-store"
    return read_feedback(db, current_user.user_id, result_id)
