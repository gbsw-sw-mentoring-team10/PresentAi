import logging
from collections.abc import Iterator
from typing import Annotated

import pymysql
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
)
from fastapi.encoders import jsonable_encoder
from google.genai import errors as genai_errors
from pydantic import BaseModel, ValidationError
from pymysql.connections import Connection

import config
import database
from routers.auth import get_current_user, require_trusted_origin
from schemas.auth import PublicUser
from schemas.feedback import FeedbackPayload
from services.ai_feedback_method import (
    generate_material_feedback,
    generate_script_feedback,
    overall_result,
)
from services.feedback_store import save_feedback, saved_feedback_status
from services.file_storage import StorageNotConfigured, inspect_material, save_material

router = APIRouter()
logger = logging.getLogger(__name__)
STORAGE_UNAVAILABLE = "분석 결과는 받았지만 DB에 저장하지 못했습니다."


def get_feedback_db(request: Request) -> Iterator[Connection | None]:
    # 비회원 분석은 DB 연결 없이 기존처럼 사용할 수 있다.
    if request.cookies.get(config.AUTH_COOKIE_NAME) is None:
        yield None
    else:
        try:
            connection = database.get_connection()
        except pymysql.MySQLError as exc:
            logger.warning("피드백 DB 연결 실패: %s", type(exc).__name__)
            request.state.feedback_storage_error = STORAGE_UNAVAILABLE
            yield None
            return
        with connection as db:
            yield db


FeedbackDatabase = Annotated[Connection | None, Depends(get_feedback_db)]


def get_feedback_user(request: Request, db: FeedbackDatabase) -> PublicUser | None:
    if db is None:
        return None
    try:
        user = get_current_user(request, db)
        # AI 응답을 기다리는 동안 읽기 트랜잭션을 유지하지 않는다.
        db.rollback()
    except pymysql.MySQLError as exc:
        logger.warning("피드백 세션 조회 실패: %s", type(exc).__name__)
        request.state.feedback_storage_error = STORAGE_UNAVAILABLE
        return None
    return user


@router.post("/", dependencies=[Depends(require_trusted_origin)])
def create_feedback(
    title: str,
    perpose: str,
    request: Request,
    response: Response,
    db: FeedbackDatabase,
    current_user: Annotated[PublicUser | None, Depends(get_feedback_user)],
    detail: Annotated[str | None, Form()] = None,
    prompt: Annotated[str | None, Form()] = None,
    file: Annotated[UploadFile | None, File()] = None,
):
    response.headers["Cache-Control"] = "no-store"
    if file is not None:
        inspect_material(file)
    try:
        if prompt is not None and file is not None:
            result = overall_result(
                prompt=prompt,
                input_file=file.file,
                mime_type=file.content_type,
                title=title,
                perpose=perpose,
                detail=detail,
            )
        elif prompt is not None:
            result = generate_script_feedback(prompt, title, perpose, detail)
        elif file is not None:
            result = generate_material_feedback(
                input_file=file.file,
                mime_type=file.content_type,
                title=title,
                perpose=perpose,
                detail=detail,
            )
        else:
            raise HTTPException(
                status_code=400, detail="대본이나 파일 중 하나 이상을 입력해야 합니다."
            )
    except genai_errors.ClientError as exc:
        logger.warning("모델 요청 거절: HTTP %s", exc.code)
        if exc.code == 429:
            raise HTTPException(
                status_code=503,
                detail="모델 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.",
            ) from exc
        raise HTTPException(
            status_code=502,
            detail="분석 모델을 사용할 수 없습니다. 서버의 모델 설정을 확인해 주세요.",
        ) from exc
    except genai_errors.ServerError as exc:
        if exc.code == 503:
            raise HTTPException(
                status_code=503,
                detail="모델 사용량이 많습니다. 잠시 후 다시 시도해 주세요.",
            ) from exc
        raise HTTPException(
            status_code=502, detail="AI 서버 오류가 발생했습니다."
        ) from exc

    if result is None:
        raise HTTPException(status_code=502, detail="피드백 결과 반환 실패")
    payload = result.model_dump() if isinstance(result, BaseModel) else result
    storage = {
        "saved_result_id": None,
        "storage_status": "guest",
        "storage_message": "비회원 분석 결과는 저장하지 않습니다.",
        "saved_file_id": None,
        "file_storage_status": "not_requested" if file is None else "guest",
    }
    storage_error = getattr(request.state, "feedback_storage_error", None)
    if storage_error:
        storage.update(storage_status="failed", storage_message=storage_error)
    if current_user is not None and db is not None:
        try:
            validated = FeedbackPayload.model_validate(payload)
            result_id = save_feedback(
                db,
                request.cookies[config.AUTH_COOKIE_NAME],
                current_user.user_id,
                title,
                validated,
            )
            storage.update(saved_feedback_status(result_id))
        except ValidationError:
            storage.update(
                storage_status="failed",
                storage_message="응답 형식이 달라 DB에 저장하지 못했습니다. 모델 응답 원문을 확인해 주세요.",
            )
        except HTTPException as exc:
            if exc.status_code != 401:
                raise
            storage.update(
                storage_status="failed",
                storage_message="분석 중 로그인이 만료되어 저장하지 못했습니다. 결과는 아래에서 확인할 수 있습니다.",
            )
        except pymysql.MySQLError as exc:
            logger.warning("피드백 저장 실패: %s", type(exc).__name__)
            storage.update(storage_status="failed", storage_message=STORAGE_UNAVAILABLE)
        if file is not None:
            storage["file_storage_status"] = "skipped"
            if storage["storage_status"] == "saved":
                try:
                    storage["saved_file_id"] = save_material(
                        db,
                        request.cookies[config.AUTH_COOKIE_NAME],
                        current_user.user_id,
                        file,
                    )
                    storage["file_storage_status"] = "saved"
                except (
                    StorageNotConfigured,
                    BotoCoreError,
                    ClientError,
                    pymysql.MySQLError,
                    HTTPException,
                ) as exc:
                    logger.warning("발표자료 원본 저장 실패: %s", type(exc).__name__)
                    storage.update(
                        file_storage_status="failed",
                        file_storage_message="분석 결과는 저장했지만 원본 파일을 저장하지 못했습니다.",
                    )
    encoded = jsonable_encoder(payload)
    response_body = encoded if isinstance(encoded, dict) else {"raw_result": encoded}
    return {**response_body, **storage}
