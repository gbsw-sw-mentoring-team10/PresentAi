from pymysql.connections import Connection

from config import DB_DIR
from database import get_connection


def initialize_auth_tables(connection: Connection) -> None:
    migration = (DB_DIR / "migrations" / "001_auth.sql").read_text(encoding="utf-8")
    with connection.cursor() as cursor:
        for statement in migration.split(";"):
            if statement.strip():
                cursor.execute(statement)

        # 이미 적용된 컬럼은 유지해 초기화 명령을 다시 실행해도 안전하게 처리한다.
        cursor.execute(
            """
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'users'
              AND COLUMN_NAME = 'role'
            """
        )
        if cursor.fetchone() is None:
            role_migration = (DB_DIR / "migrations" / "002_user_roles.sql").read_text(
                encoding="utf-8"
            )
            cursor.execute(role_migration)

    connection.commit()


def main():
    with get_connection() as connection:
        initialize_auth_tables(connection)
    print("로그인 테이블 및 사용자 권한 준비 완료: users, auth_sessions")


if __name__ == "__main__":
    main()
