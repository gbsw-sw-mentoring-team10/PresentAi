import logging
from typing import Annotated
from urllib.parse import quote

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse

from routers.auth import DatabaseConnection, get_current_user
from schemas.auth import PublicUser
from services.file_storage import StorageNotConfigured, material_content, material_download

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


# 기록 화면에서 PDF 원본을 미리 보기 위해 본인의 PDF만 그대로 전달한다
@router.get("/{file_id}/content")
def file_content(
    file_id: int,
    db: DatabaseConnection,
    current_user: Annotated[PublicUser, Depends(get_current_user)],
):
    try:
        item = material_content(db, current_user.user_id, file_id)
    except (StorageNotConfigured, BotoCoreError, ClientError) as exc:
        logger.warning("원본 파일 읽기 실패: %s", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="파일 저장소에 연결할 수 없습니다.",
            headers={"Cache-Control": "no-store"},
        ) from exc
    headers = {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline; filename*=UTF-8''" + quote(item["file_name"], safe=""),
    }
    if item["length"] is not None:
        headers["Content-Length"] = str(item["length"])
    return StreamingResponse(
        item["body"].iter_chunks(1024 * 1024), media_type="application/pdf", headers=headers
    )
