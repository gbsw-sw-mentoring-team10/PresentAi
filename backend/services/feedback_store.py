import json
from datetime import timezone

from fastapi import HTTPException
from pymysql.connections import Connection

from schemas.feedback import FeedbackPayload
from services.auth_service import find_session_user


def saved_feedback_status(result_id: int) -> dict:
    return {
        "saved_result_id": result_id,
        "storage_status": "saved",
        "storage_message": "분석 결과를 내 계정에 저장했어요.",
    }


def save_feedback(
    connection: Connection,
    token: str,
    user_id: int,
    title: str,
    result: FeedbackPayload,
) -> int:
    # 분석 중 로그아웃하거나 세션이 만료되었다면 저장하지 않는다.
    try:
        user = find_session_user(connection, token, for_update=True)
        if user is None or user.user_id != user_id:
            raise HTTPException(
                status_code=401, detail="다시 로그인한 뒤 분석해 주세요."
            )
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO slides_feedback_result (user_id, title) VALUES (%s, %s)",
                (user.user_id, title),
            )
            result_id = cursor.lastrowid
            cursor.execute(
                """
                INSERT INTO entire_result
                    (slices_result_id, score, feedback, strengths, revised_script)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    result_id,
                    result.score,
                    result.feedback,
                    json.dumps(result.strengths, ensure_ascii=False),
                    result.revised_script,
                ),
            )
            for item in result.improvements:
                cursor.execute(
                    """
                    INSERT INTO entire_improvements
                        (slides_result_id, issue, deduction, solution)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (result_id, item.issue, item.deduction, item.solution),
                )
            for slide in result.slides:
                cursor.execute(
                    """
                    INSERT INTO slide_feedback
                        (slides_result_id, slide_number, summary, good_points,
                         issues, script_connection)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        result_id,
                        slide.slide_number,
                        slide.summary,
                        json.dumps(slide.good_points, ensure_ascii=False),
                        json.dumps(
                            [issue.model_dump() for issue in slide.issues],
                            ensure_ascii=False,
                        ),
                        slide.script_connection,
                    ),
                )
        connection.commit()
        return result_id
    except Exception:
        # 전체 결과와 하위 피드백을 하나의 트랜잭션으로 저장한다.
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
            JOIN entire_result AS e ON e.slices_result_id = r.slides_result_id
            WHERE r.user_id = %s
            """,
            (user_id,),
        )
        total = cursor.fetchone()["total"]
        cursor.execute(
            """
            SELECT r.slides_result_id AS saved_result_id, r.title, r.created_at,
                   e.score
            FROM slides_feedback_result AS r
            JOIN entire_result AS e ON e.slices_result_id = r.slides_result_id
            WHERE r.user_id = %s
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
            SELECT e.score, e.feedback, e.strengths, e.revised_script
            FROM slides_feedback_result AS r
            JOIN entire_result AS e ON e.slices_result_id = r.slides_result_id
            WHERE r.slides_result_id = %s AND r.user_id = %s
            """,
            (result_id, user_id),
        )
        result = cursor.fetchone()
        if result is None:
            raise HTTPException(
                status_code=404,
                detail="저장된 결과를 찾을 수 없습니다.",
                headers={"Cache-Control": "no-store"},
            )
        result["strengths"] = json.loads(result["strengths"])
        cursor.execute(
            """
            SELECT issue, deduction, solution FROM entire_improvements
            WHERE slides_result_id = %s ORDER BY entire_improvements_id
            """,
            (result_id,),
        )
        result["improvements"] = cursor.fetchall()
        cursor.execute(
            """
            SELECT slide_number, summary, good_points, issues, script_connection
            FROM slide_feedback WHERE slides_result_id = %s ORDER BY slide_number
            """,
            (result_id,),
        )
        slides = cursor.fetchall()
        for slide in slides:
            slide["good_points"] = json.loads(slide["good_points"] or "[]")
            slide["issues"] = json.loads(slide["issues"] or "[]")
        result["slides"] = slides
        return {**result, **saved_feedback_status(result_id)}
