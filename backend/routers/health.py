import os

from fastapi import APIRouter, Response

from routers.auth import DatabaseConnection

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: DatabaseConnection, response: Response):
    # 사용자 데이터를 읽지 않고 배포 코드에 필요한 컬럼이 존재하는지 확인한다.
    with db.cursor() as cursor:
        cursor.execute("SELECT feedback_result FROM slides_feedback_result LIMIT 0")
    response.headers["Cache-Control"] = "no-store"
    return {
        "status": "ok",
        "feedback_storage": "json",
        "revision": os.getenv("RENDER_GIT_COMMIT", "local"),
    }
