import json
from datetime import timezone

from fastapi import HTTPException
from pymysql.connections import Connection

from schemas.feedback import FeedbackPayload

VALID_STATUS = {"pending", "processing", "completed", "failed"}


def create_pending_feedback(connection: Connection, user_id: int, title: str) -> int:
    # 분석을 시작하기 전에 요청 한 건을 pending 상태로 먼저 기록한다.
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO slides_feedback_result (user_id, title, status) "
                "VALUES (%s, %s, 'pending')",
                (user_id, title),
            )
            result_id = cursor.lastrowid
        connection.commit()
        return result_id
    except Exception:
        connection.rollback()
        raise


def set_feedback_status(
    connection: Connection,
    result_id: int,
    status: str,
    error_message: str | None = None,
) -> None:
    if status not in VALID_STATUS:
        raise ValueError(f"알 수 없는 상태: {status}")
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE slides_feedback_result SET status=%s, error_message=%s "
                "WHERE slides_result_id=%s",
                (status, error_message, result_id),
            )
        connection.commit()
    except Exception:
        connection.rollback()
        raise


def complete_feedback(
    connection: Connection, result_id: int, result: FeedbackPayload
) -> None:
    # 피드백 JSON과 완료 상태를 같은 UPDATE로 저장한다.
    payload = json.dumps(result.model_dump(mode="json"), ensure_ascii=False, allow_nan=False)
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE slides_feedback_result
                SET feedback_result=%s, status='completed', error_message=NULL
                WHERE slides_result_id=%s
                """,
                (payload, result_id),
            )
        connection.commit()
    except Exception:
        connection.rollback()
        raise


def _with_utc_timestamp(row: dict) -> dict:
    # MySQL 연결의 time_zone은 UTC이며, PyMySQL은 timezone 없는 datetime을 반환한다.
    if row["created_at"].tzinfo is None:
        row["created_at"] = row["created_at"].replace(tzinfo=timezone.utc)
    return row


def list_feedback(
    connection: Connection, user_id: int, *, page: int, page_size: int
) -> dict:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM slides_feedback_result AS r
            WHERE r.user_id = %s AND r.status = 'completed'
              AND r.feedback_result IS NOT NULL
            """,
            (user_id,),
        )
        total = cursor.fetchone()["total"]
        cursor.execute(
            """
            SELECT r.slides_result_id AS saved_result_id, r.title, r.created_at,
                   CAST(JSON_UNQUOTE(JSON_EXTRACT(r.feedback_result, '$.score')) AS UNSIGNED) AS score
            FROM slides_feedback_result AS r
            WHERE r.user_id = %s AND r.status = 'completed'
              AND r.feedback_result IS NOT NULL
            ORDER BY r.created_at DESC, r.slides_result_id DESC
            LIMIT %s OFFSET %s
            """,
            (user_id, page_size, (page - 1) * page_size),
        )
        items = [_with_utc_timestamp(row) for row in cursor.fetchall()]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


def read_feedback(connection: Connection, user_id: int, result_id: int) -> dict:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT slides_result_id, title, created_at, status, error_message,
                   feedback_result
            FROM slides_feedback_result
            WHERE slides_result_id = %s AND user_id = %s
            """,
            (result_id, user_id),
        )
        row = cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="저장된 결과를 찾을 수 없습니다.")
    if row["status"] != "completed":
        body = {"saved_result_id": result_id, "status": row["status"]}
        if row["status"] == "failed":
            body["error_message"] = row["error_message"]
        return body
    stored = row["feedback_result"]
    payload = json.loads(stored) if isinstance(stored, (str, bytes, bytearray)) else stored
    if payload is None:
        raise HTTPException(status_code=404, detail="저장된 결과를 찾을 수 없습니다.")
    if not isinstance(payload, dict):
        raise HTTPException(status_code=500, detail="저장된 결과 형식을 확인할 수 없습니다.")
    return {
        **payload,
        "saved_result_id": row["slides_result_id"],
        "title": row["title"],
        "created_at": row["created_at"],
        "status": "completed",
    }
