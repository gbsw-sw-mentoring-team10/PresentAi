import logging
import os
import ssl
from collections.abc import Iterator

import pymysql
from fastapi import HTTPException
from pymysql.connections import Connection
from pymysql.cursors import DictCursor

from config import DB_SSL_CA

logger = logging.getLogger(__name__)


def get_connection() -> Connection:
    # 요청마다 별도 연결을 만들고, 호출한 쪽의 with 문에서 닫는다.
    return pymysql.connect(
        host=os.environ["DB_HOST"],
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ["DB_NAME"],
        charset="utf8mb4",
        cursorclass=DictCursor,
        connect_timeout=10,
        read_timeout=10,
        write_timeout=10,
        ssl=ssl.create_default_context(cafile=DB_SSL_CA),
        autocommit=False,
        init_command="SET time_zone = '+00:00'",
    )


def get_db() -> Iterator[Connection]:
    # FastAPI 요청에 DB 연결을 제공하고 사용 후 연결을 닫는다.
    try:
        with get_connection() as connection:
            yield connection
    except pymysql.MySQLError as exc:
        logger.error("MySQL 요청 실패: %s", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="DB에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        ) from exc


if __name__ == "__main__":
    with get_connection() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT 1 AS connected")
        print(cursor.fetchone())
