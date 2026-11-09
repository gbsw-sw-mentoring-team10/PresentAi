from pymysql.connections import Connection

from config import DB_DIR
from database import get_connection


def initialize_feedback_tables(connection: Connection) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COLUMN_NAME FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'slide_feedback'
              AND INDEX_NAME = 'PRIMARY' ORDER BY SEQ_IN_INDEX
            """
        )
        columns = [row["COLUMN_NAME"] for row in cursor.fetchall()]
        if columns == ["slides_result_id", "slide_number"]:
            return
        if columns != ["slide_number"]:
            raise ValueError("slide_feedback의 기본키 구조를 확인해 주세요.")
        migration = (DB_DIR / "migrations" / "003_slide_feedback_key.sql").read_text(
            encoding="utf-8"
        )
        cursor.execute(migration)
    connection.commit()


def main():
    with get_connection() as connection:
        initialize_feedback_tables(connection)
    print("발표별 슬라이드 피드백 저장 키 준비 완료")


if __name__ == "__main__":
    main()
