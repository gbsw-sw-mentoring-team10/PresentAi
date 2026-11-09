import re
from graphlib import TopologicalSorter

from pymysql.connections import Connection

from config import DB_DIR
from database import get_connection

SCHEMA_PATH = DB_DIR / "schema.sql"


def export_schema(connection: Connection) -> str:
    # 데이터 없이 테이블 정의만 읽고, 참조되는 테이블부터 생성하도록 정렬한다.
    with connection.cursor() as cursor:
        cursor.execute("SELECT DATABASE() AS schema_name")
        schema_name = cursor.fetchone()["schema_name"]
        cursor.execute(
            """
            SELECT TABLE_NAME
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
            """
        )
        dependencies = {row["TABLE_NAME"]: set() for row in cursor.fetchall()}
        if not dependencies:
            raise ValueError("내보낼 테이블이 없습니다. DB_NAME을 확인해 주세요.")

        cursor.execute(
            """
            SELECT TABLE_NAME, REFERENCED_TABLE_SCHEMA, REFERENCED_TABLE_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND REFERENCED_TABLE_NAME IS NOT NULL
            ORDER BY TABLE_NAME, REFERENCED_TABLE_NAME
            """
        )
        for row in cursor.fetchall():
            table = row["TABLE_NAME"]
            referenced_table = row["REFERENCED_TABLE_NAME"]
            if row["REFERENCED_TABLE_SCHEMA"] != schema_name:
                raise ValueError(f"다른 DB의 참조 테이블 정의가 필요합니다: {table}")
            if referenced_table != table:
                dependencies[table].add(referenced_table)

        definitions = []
        ordered_dependencies = {
            table: sorted(references) for table, references in dependencies.items()
        }
        for table in TopologicalSorter(ordered_dependencies).static_order():
            quoted_table = table.replace("`", "``")
            cursor.execute(f"SHOW CREATE TABLE `{quoted_table}`")
            definition = cursor.fetchone()["Create Table"]
            # 현재 데이터에 따른 다음 ID 값은 제외하고 컬럼의 AUTO_INCREMENT는 유지한다.
            columns, options = definition.rsplit("\n)", 1)
            options = re.sub(r"\bAUTO_INCREMENT=\d+\s*", "", options)
            definitions.append(f"{columns}\n){options};")

    header = (
        "-- PresentAI: 현재 MySQL 테이블 구조\n"
        "-- backend 폴더에서 python -m scripts.export_db_schema 명령으로 갱신합니다.\n"
        "-- 데이터, DB 접속 정보, 계정 비밀번호는 포함하지 않습니다.\n"
        "-- 새 빈 DB를 선택한 뒤 전체를 실행합니다. 기존 DB 변경용 파일이 아닙니다.\n"
        "-- 기존 DB의 구조 변경 내역은 db/migrations/에서 관리합니다.\n\n"
        "SET NAMES utf8mb4;\n\n"
    )
    return header + "\n\n".join(definitions) + "\n"


def main():
    with get_connection() as connection:
        schema = export_schema(connection)
    SCHEMA_PATH.parent.mkdir(parents=True, exist_ok=True)
    SCHEMA_PATH.write_text(schema, encoding="utf-8")
    print(f"테이블 구조 저장 완료: {SCHEMA_PATH}")


if __name__ == "__main__":
    main()
