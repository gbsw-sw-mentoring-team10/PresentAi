import logging
import re
from dataclasses import dataclass
from pathlib import PurePosixPath
from urllib.parse import quote
from uuid import uuid4

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException, UploadFile
from pymysql.connections import Connection

import config
from services.auth_service import find_session_user

logger = logging.getLogger(__name__)
MAX_FILE_BYTES = 30 * 1024 * 1024
DOWNLOAD_TTL_SECONDS = 300
CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".html": "text/html",
    ".htm": "text/html",
}


class StorageNotConfigured(ValueError):
    pass


@dataclass(frozen=True)
class MaterialFile:
    name: str
    size: int
    content_type: str
    extension: str


def inspect_material(upload: UploadFile) -> MaterialFile:
    name = PurePosixPath((upload.filename or "").replace("\\", "/")).name
    name = re.sub(r"[\x00-\x1f\x7f]", "", name).strip()
    extension = PurePosixPath(name).suffix.lower()
    if not name or len(name) > 255 or extension not in CONTENT_TYPES:
        raise HTTPException(
            status_code=400, detail="PDF, PPT, PPTX, HTML 발표자료를 선택해 주세요."
        )
    position = upload.file.tell()
    try:
        upload.file.seek(0, 2)
        size = upload.file.tell()
    finally:
        upload.file.seek(position)
    if not size:
        raise HTTPException(status_code=400, detail="비어 있는 파일입니다.")
    if size > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="30MB 이하의 발표자료를 선택해 주세요.")
    return MaterialFile(name, size, CONTENT_TYPES[extension], extension)


def get_s3_client():
    if not config.S3_BUCKET_NAME or not config.S3_REGION:
        raise StorageNotConfigured("S3_BUCKET_NAME과 AWS_DEFAULT_REGION을 설정해 주세요.")
    return boto3.Session().client(
        "s3",
        region_name=config.S3_REGION,
        config=Config(
            signature_version="s3v4",
            connect_timeout=10,
            read_timeout=30,
            retries={"mode": "standard", "total_max_attempts": 3},
        ),
    )


def save_material(
    connection: Connection,
    token: str,
    user_id: int,
    upload: UploadFile,
    *,
    result_id: int | None = None,
) -> int:
    material = inspect_material(upload)
    user = find_session_user(connection, token)
    connection.rollback()
    if user is None or user.user_id != user_id:
        raise HTTPException(status_code=401, detail="다시 로그인한 뒤 파일을 저장해 주세요.")
    client = get_s3_client()
    key = f"presentai/users/{user_id}/{uuid4().hex}{material.extension}"
    position = upload.file.tell()
    try:
        upload.file.seek(0)
        body = upload.file.read(MAX_FILE_BYTES + 1)
    finally:
        upload.file.seek(position)
    if len(body) != material.size:
        raise HTTPException(status_code=400, detail="파일을 다시 선택해 주세요.")
    client.put_object(
        Bucket=config.S3_BUCKET_NAME,
        Key=key,
        Body=body,
        ContentType=material.content_type,
    )
    try:
        # 업로드 중 세션이 취소되었으면 파일과 DB 기록을 남기지 않는다.
        user = find_session_user(connection, token, for_update=True)
        if user is None or user.user_id != user_id:
            raise HTTPException(
                status_code=401, detail="파일 저장 중 로그인이 만료되었습니다."
            )
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO input_files (user_id, file_name, s3_key, file_size, content_type)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (user_id, material.name, key, material.size, material.content_type),
            )
            file_id = cursor.lastrowid
            if result_id is not None:
                cursor.execute(
                    """
                    UPDATE slides_feedback_result
                    SET input_file_id=%s, file_storage_status='saved',
                        file_storage_message=NULL
                    WHERE slides_result_id=%s AND user_id=%s
                      AND input_file_id IS NULL
                    """,
                    (file_id, result_id, user_id),
                )
                if cursor.rowcount != 1:
                    raise HTTPException(
                        status_code=409, detail="원본을 연결할 분석 기록을 찾을 수 없습니다."
                    )
        connection.commit()
        return file_id
    except Exception:
        connection.rollback()
        try:
            client.delete_object(Bucket=config.S3_BUCKET_NAME, Key=key)
        except (BotoCoreError, ClientError) as exc:
            logger.error(
                "저장 실패 파일 정리 필요: %s, key=%s", type(exc).__name__, key
            )
        raise


def material_download(connection: Connection, user_id: int, file_id: int) -> dict:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT file_id, file_name, s3_key FROM input_files
            WHERE file_id = %s AND user_id = %s
            """,
            (file_id, user_id),
        )
        row = cursor.fetchone()
    if row is None or not row["s3_key"].startswith(f"presentai/users/{user_id}/"):
        raise HTTPException(status_code=404, detail="저장된 파일을 찾을 수 없습니다.")
    client = get_s3_client()
    url = client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": config.S3_BUCKET_NAME,
            "Key": row["s3_key"],
            "ResponseCacheControl": "private, no-store",
            "ResponseContentDisposition": "attachment; filename*=UTF-8''"
            + quote(row["file_name"], safe=""),
        },
        ExpiresIn=DOWNLOAD_TTL_SECONDS,
    )
    return {
        "file_id": row["file_id"],
        "file_name": row["file_name"],
        "download_url": url,
        "expires_in": DOWNLOAD_TTL_SECONDS,
    }


def delete_feedback(connection: Connection, user_id: int, result_id: int) -> None:
    """내 피드백 기록과 연결된 원본 파일(DB·S3)을 삭제한다."""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT r.status, r.input_file_id, f.s3_key
            FROM slides_feedback_result AS r
            LEFT JOIN input_files AS f ON f.file_id = r.input_file_id
            WHERE r.slides_result_id = %s AND r.user_id = %s
            """,
            (result_id, user_id),
        )
        row = cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="저장된 피드백을 찾을 수 없습니다.")
    if row["status"] in ("pending", "processing"):
        raise HTTPException(status_code=409, detail="분석이 끝난 뒤에 삭제할 수 있습니다.")
    key = row["s3_key"]
    if key and not key.startswith(f"presentai/users/{user_id}/"):
        key = None
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM slides_feedback_result WHERE slides_result_id=%s AND user_id=%s",
                (result_id, user_id),
            )
            if row["input_file_id"] is not None:
                cursor.execute(
                    """
                    DELETE FROM input_files WHERE file_id=%s AND user_id=%s
                      AND NOT EXISTS (
                        SELECT 1 FROM slides_feedback_result WHERE input_file_id=%s
                      )
                    """,
                    (row["input_file_id"], user_id, row["input_file_id"]),
                )
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    if key:
        try:
            get_s3_client().delete_object(Bucket=config.S3_BUCKET_NAME, Key=key)
        except (StorageNotConfigured, BotoCoreError, ClientError) as exc:
            logger.error("삭제된 기록의 S3 파일 정리 필요: %s, key=%s", type(exc).__name__, key)


def user_s3_keys(connection: Connection, user_id: int) -> list[str]:
    """계정 삭제 전에 내 원본 파일의 S3 키를 모은다."""
    with connection.cursor() as cursor:
        cursor.execute("SELECT s3_key FROM input_files WHERE user_id = %s", (user_id,))
        rows = cursor.fetchall()
    prefix = f"presentai/users/{user_id}/"
    return [row["s3_key"] for row in rows if row["s3_key"].startswith(prefix)]


def delete_s3_keys(keys: list[str]) -> None:
    """S3 원본을 지운다. 실패해도 계정 삭제는 막지 않고 로그만 남긴다."""
    if not keys:
        return
    try:
        client = get_s3_client()
    except (StorageNotConfigured, BotoCoreError, ClientError) as exc:
        logger.error("계정 삭제 후 S3 정리 필요: %s, 파일 %d개", type(exc).__name__, len(keys))
        return
    for key in keys:
        try:
            client.delete_object(Bucket=config.S3_BUCKET_NAME, Key=key)
        except (BotoCoreError, ClientError) as exc:
            logger.error("계정 삭제 후 S3 정리 필요: %s, key=%s", type(exc).__name__, key)


def material_content(connection: Connection, user_id: int, file_id: int) -> dict:
    """내 PDF 원본을 S3에서 읽어 스트림으로 돌려준다 (기록 화면의 슬라이드 미리보기용).

    브라우저가 S3 주소를 직접 읽으려면 버킷 CORS 설정이 필요해서, 서버가 대신 전달한다.
    저장된 HTML 등을 이 서버 주소로 그대로 내려주면 위험하므로 PDF만 허용한다.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT file_id, file_name, s3_key, content_type FROM input_files
            WHERE file_id = %s AND user_id = %s
            """,
            (file_id, user_id),
        )
        row = cursor.fetchone()
    if row is None or not row["s3_key"].startswith(f"presentai/users/{user_id}/"):
        raise HTTPException(status_code=404, detail="저장된 파일을 찾을 수 없습니다.")
    if row["content_type"] != "application/pdf":
        raise HTTPException(status_code=415, detail="PDF 원본만 미리 볼 수 있습니다.")
    try:
        stored = get_s3_client().get_object(Bucket=config.S3_BUCKET_NAME, Key=row["s3_key"])
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") in ("NoSuchKey", "404"):
            raise HTTPException(status_code=404, detail="저장된 파일을 찾을 수 없습니다.") from exc
        raise
    return {
        "body": stored["Body"],
        "length": stored.get("ContentLength"),
        "file_name": row["file_name"],
    }
