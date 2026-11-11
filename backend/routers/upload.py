import io
import logging
from collections.abc import Iterator
from typing import Annotated

import pymysql
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import (
    APIRouter,
    BackgroundTasks,
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
from services.feedback_store import (
    complete_feedback,
    create_pending_feedback,
    set_file_storage_failure,
    set_feedback_status,
)
from services.file_storage import StorageNotConfigured, inspect_material, save_material

router = APIRouter()
logger = logging.getLogger(__name__)
STORAGE_UNAVAILABLE = "분석 결과는 받았지만 DB에 저장하지 못했습니다."
FILE_STORAGE_UNAVAILABLE = "발표자료 원본을 저장하지 못했습니다. 피드백 분석은 계속 진행합니다."


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


def run_analysis(
    prompt: str | None,
    input_file,
    mime_type: str | None,
    title: str,
    perpose: str,
    detail: str | None,
):
    if prompt is not None and input_file is not None:
        return overall_result(
            prompt=prompt,
            input_file=input_file,
            mime_type=mime_type,
            title=title,
            perpose=perpose,
            detail=detail,
        )
    if prompt is not None:
        return generate_script_feedback(prompt, title, perpose, detail)
    if input_file is not None:
        return generate_material_feedback(
            input_file=input_file,
            mime_type=mime_type,
            title=title,
            perpose=perpose,
            detail=detail,
        )
    raise HTTPException(
        status_code=400, detail="대본이나 파일 중 하나 이상을 입력해야 합니다."
    )


def model_error_response(exc: Exception) -> tuple[int, str]:
    # 모델 오류를 (HTTP 상태, 사용자용 메시지)로 바꾼다. 동기/비동기 경로가 공유한다.
    if isinstance(exc, genai_errors.ClientError):
        logger.warning("모델 요청 거절: HTTP %s", exc.code)
        if exc.code == 429:
            return 503, "모델 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요."
        return 502, "분석 모델을 사용할 수 없습니다. 서버의 모델 설정을 확인해 주세요."
    if exc.code == 503:
        return 503, "모델 사용량이 많습니다. 잠시 후 다시 시도해 주세요."
    return 502, "AI 서버 오류가 발생했습니다."


def run_feedback_job(
    result_id: int,
    prompt: str | None,
    file_bytes: bytes | None,
    mime_type: str | None,
    title: str,
    perpose: str,
    detail: str | None,
    *,
    file_name: str | None = None,
    user_id: int | None = None,
    session_token: str | None = None,
) -> None:
    # 응답이 나간 뒤 실행되므로 요청용 DB 연결 대신 단계마다 새 연결을 쓴다.
    # 긴 AI 호출 동안에는 DB 연결을 잡고 있지 않는다.
    failure: str | None = None
    payload = None
    try:
        with database.get_connection() as db:
            set_feedback_status(db, result_id, "processing")
        if file_bytes is not None:
            # 요청 스트림과 별도로 원본 전체를 저장한다. 저장 실패도 기록에 남긴다.
            try:
                with io.BytesIO(file_bytes) as source, database.get_connection() as db:
                    save_material(
                        db,
                        session_token,
                        user_id,
                        UploadFile(filename=file_name, file=source),
                        result_id=result_id,
                    )
            except (
                StorageNotConfigured,
                BotoCoreError,
                ClientError,
                pymysql.MySQLError,
                HTTPException,
            ) as exc:
                logger.warning("원본 파일 저장 실패: %s", type(exc).__name__)
                try:
                    with database.get_connection() as db:
                        set_file_storage_failure(db, result_id, FILE_STORAGE_UNAVAILABLE)
                except pymysql.MySQLError as db_exc:
                    logger.error("파일 저장 상태 기록 실패: %s", type(db_exc).__name__)
        input_file = io.BytesIO(file_bytes) if file_bytes is not None else None
        try:
            result = run_analysis(
                prompt, input_file, mime_type, title, perpose, detail
            )
            if result is None:
                failure = "피드백 결과 반환 실패"
            else:
                payload = FeedbackPayload.model_validate(
                    result.model_dump() if isinstance(result, BaseModel) else result
                )
        except (genai_errors.ClientError, genai_errors.ServerError) as exc:
            failure = model_error_response(exc)[1]
        except ValidationError:
            failure = "응답 형식이 달라 결과를 저장하지 못했습니다."
        except Exception:
            logger.exception("피드백 분석 실패")
            failure = "분석 중 오류가 발생했습니다."
        with database.get_connection() as db:
            if payload is not None:
                try:
                    complete_feedback(db, result_id, payload)
                    return
                except pymysql.MySQLError as exc:
                    logger.warning("피드백 저장 실패: %s", type(exc).__name__)
                    failure = STORAGE_UNAVAILABLE
            set_feedback_status(db, result_id, "failed", failure)
    except pymysql.MySQLError as exc:
        # 상태를 기록하지 못한 작업은 updated_at 기준 정리 대상이 된다.
        logger.error("피드백 작업 상태 갱신 실패: %s", type(exc).__name__)


@router.post("/", dependencies=[Depends(require_trusted_origin)])
def create_feedback(
    title: str,
    perpose: str,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    db: FeedbackDatabase,
    current_user: Annotated[PublicUser | None, Depends(get_feedback_user)],
    detail: Annotated[str | None, Form()] = None,
    prompt: Annotated[str | None, Form()] = None,
    file: Annotated[UploadFile | None, File()] = None,
):
    response.headers["Cache-Control"] = "no-store"
    if prompt is None and file is None:
        raise HTTPException(
            status_code=400, detail="대본이나 파일 중 하나 이상을 입력해야 합니다."
        )
    if file is not None:
        inspect_material(file)

    if current_user is not None and db is not None:
        # 회원: 요청 한 건을 pending으로 기록하고 분석은 background에서 처리한다.
        try:
            result_id = create_pending_feedback(
                db, current_user.user_id, title, has_file=file is not None
            )
        except pymysql.MySQLError as exc:
            logger.warning("피드백 요청 기록 실패: %s", type(exc).__name__)
            request.state.feedback_storage_error = STORAGE_UNAVAILABLE
        else:
            # 응답 후에는 업로드 스트림이 닫히므로 지금 바이트로 읽어 둔다.
            file_bytes = file.file.read() if file is not None else None
            background_tasks.add_task(
                run_feedback_job,
                result_id,
                prompt,
                file_bytes,
                file.content_type if file is not None else None,
                title,
                perpose,
                detail,
                file_name=file.filename if file is not None else None,
                user_id=current_user.user_id,
                session_token=request.cookies.get(config.AUTH_COOKIE_NAME),
            )
            return {"result_id": result_id, "status": "pending"}

    # 비회원(또는 DB 사용 불가): 기존처럼 동기로 분석하고 저장하지 않는다.
    try:
        result = run_analysis(
            prompt,
            file.file if file is not None else None,
            file.content_type if file is not None else None,
            title,
            perpose,
            detail,
        )
    except (genai_errors.ClientError, genai_errors.ServerError) as exc:
        status_code, message = model_error_response(exc)
        raise HTTPException(status_code=status_code, detail=message) from exc

    if result is None:
        raise HTTPException(status_code=502, detail="피드백 결과 반환 실패")
    payload = result.model_dump() if isinstance(result, BaseModel) else result
    storage = {
        "saved_result_id": None,
        "storage_status": "guest",
        "storage_message": "비회원 분석 결과는 저장하지 않습니다.",
    }
    storage_error = getattr(request.state, "feedback_storage_error", None)
    if storage_error:
        storage.update(storage_status="failed", storage_message=storage_error)
    encoded = jsonable_encoder(payload)
    response_body = encoded if isinstance(encoded, dict) else {"raw_result": encoded}
    return {**response_body, **storage}
