import logging
from typing import Annotated

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, HTTPException, Response

from routers.auth import DatabaseConnection, get_current_user
from schemas.auth import PublicUser
from services.file_storage import StorageNotConfigured, material_download

router = APIRouter(tags=["files"])
logger = logging.getLogger(__name__)


@router.get("/{file_id}/download")
def download_file(
    file_id: int,
    db: DatabaseConnection,
    current_user: Annotated[PublicUser, Depends(get_current_user)],
    response: Response,
):
    response.headers["Cache-Control"] = "no-store"
    try:
        return material_download(db, current_user.user_id, file_id)
    except (StorageNotConfigured, BotoCoreError, ClientError) as exc:
        logger.warning("파일 다운로드 주소 생성 실패: %s", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="파일 저장소에 연결할 수 없습니다.",
            headers={"Cache-Control": "no-store"},
        ) from exc
