"""원본 파일 연결 컬럼을 확인합니다. --apply로 누락된 변경만 적용합니다."""

import argparse

from config import DB_DIR
from database import get_connection

COLUMNS = {"input_file_id", "file_storage_status", "file_storage_message"}


def prepare_file_storage(connection, *, apply=False):
    with connection.cursor() as cursor:
        cursor.execute("SHOW COLUMNS FROM slides_feedback_result")
        columns = {row["Field"] for row in cursor.fetchall()}
        if "feedback_result" not in columns:
            raise ValueError("먼저 피드백 JSON 저장 구조를 준비해 주세요.")
        present = columns & COLUMNS
        if present == COLUMNS:
            return "원본 파일 연결 구조가 이미 준비되어 있습니다."
        if present:
            raise ValueError("파일 연결 컬럼이 일부만 있습니다. DB 구조를 확인해 주세요.")
        if not apply:
            return "원본 파일 연결 컬럼이 필요합니다. --apply로 추가합니다."
        cursor.execute((DB_DIR / "migrations/006_feedback_files.sql").read_text())
    connection.commit()
    return "원본 파일 연결 컬럼을 추가했습니다. 기존 기록은 유지했습니다."


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    with get_connection() as connection:
        print(prepare_file_storage(connection, apply=args.apply))


if __name__ == "__main__":
    main()
