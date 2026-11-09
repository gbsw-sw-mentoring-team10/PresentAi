import hashlib
import secrets
from typing import TypeGuard

import pymysql
from fastapi import HTTPException
from pymysql.connections import Connection

from config import SESSION_TTL_SECONDS
from schemas.auth import PublicUser
from services.auth_security import (
    DUMMY_PASSWORD_HASH,
    MAX_PASSWORD_LENGTH,
    MIN_PASSWORD_LENGTH,
    password_hasher,
    verify_password,
)

MAX_SESSION_TOKEN_LENGTH = 128
SESSION_TOKEN_BYTES = 32
MYSQL_DUPLICATE_ENTRY = 1062


def register_user(connection: Connection, email: str, password: str) -> PublicUser:
    # 비밀번호를 해시로 저장하고 가입한 사용자의 공개 정보를 반환한다.
    if not MIN_PASSWORD_LENGTH <= len(password) <= MAX_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=422, detail="비밀번호는 8~128자로 입력해 주세요."
        )

    password_hash = password_hasher.hash(password)

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, 'user')",
                (email, password_hash),
            )
            user_id = cursor.lastrowid
        connection.commit()
    except pymysql.IntegrityError as exc:
        connection.rollback()
        if exc.args[0] == MYSQL_DUPLICATE_ENTRY:
            raise HTTPException(
                status_code=409, detail="이미 가입된 이메일입니다."
            ) from exc
        raise

    return PublicUser(user_id=user_id, email=email, role="user")


def authenticate_user(connection: Connection, email: str, password: str) -> PublicUser:
    # 이메일과 비밀번호가 맞는지 확인한다. 세션 발급은 별도로 처리한다.
    if not 1 <= len(password) <= MAX_PASSWORD_LENGTH:
        raise invalid_credentials()

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT user_id, email, password_hash, role FROM users WHERE email = %s",
            (email,),
        )
        user = cursor.fetchone()

    # 이메일이 없어도 검증을 수행해 계정 존재 여부에 따른 시간 차이를 줄인다.
    stored_hash = user["password_hash"] if user else DUMMY_PASSWORD_HASH
    password_matches = verify_password(password, stored_hash)
    if not password_matches or user is None:
        raise invalid_credentials()

    return PublicUser(user_id=user["user_id"], email=user["email"], role=user["role"])


def find_session_user(
    connection: Connection, token: str | None, *, for_update: bool = False
) -> PublicUser | None:
    # 만료되지 않은 세션의 사용자를 찾는다. 유효하지 않으면 None을 반환한다.
    if not is_valid_session_token(token):
        return None

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT u.user_id, u.email, u.role
            FROM auth_sessions AS s
            JOIN users AS u ON u.user_id = s.user_id
            WHERE s.token_hash = %s AND s.expires_at > UTC_TIMESTAMP(6)
            """
            + (" FOR UPDATE" if for_update else ""),
            (hash_session_token(token),),
        )
        user = cursor.fetchone()

    return PublicUser(**user) if user else None


def create_session(
    connection: Connection,
    user_id: int,
    previous_token: str | None,
) -> str:
    # 현재 브라우저의 이전 세션을 새 세션으로 교체하고 쿠키용 토큰을 반환한다.
    token = secrets.token_urlsafe(SESSION_TOKEN_BYTES)

    with connection.cursor() as cursor:
        if is_valid_session_token(previous_token):
            cursor.execute(
                "DELETE FROM auth_sessions WHERE token_hash = %s",
                (hash_session_token(previous_token),),
            )

        cursor.execute("DELETE FROM auth_sessions WHERE expires_at <= UTC_TIMESTAMP(6)")
        cursor.execute(
            """
            INSERT INTO auth_sessions (token_hash, user_id, expires_at)
            VALUES (%s, %s, DATE_ADD(UTC_TIMESTAMP(6), INTERVAL %s SECOND))
            """,
            (hash_session_token(token), user_id, SESSION_TTL_SECONDS),
        )
    connection.commit()

    return token


def delete_session(connection: Connection, token: str | None) -> None:
    # 로그아웃한 세션을 삭제해 이전 쿠키의 재사용을 막는다.
    if not is_valid_session_token(token):
        return

    with connection.cursor() as cursor:
        cursor.execute(
            "DELETE FROM auth_sessions WHERE token_hash = %s",
            (hash_session_token(token),),
        )
    connection.commit()


def is_valid_session_token(token: str | None) -> TypeGuard[str]:
    # DB 조회 전에 토큰의 존재 여부와 길이를 검사한다.
    return token is not None and 0 < len(token) <= MAX_SESSION_TOKEN_LENGTH


def hash_session_token(token: str) -> bytes:
    return hashlib.sha256(token.encode()).digest()


def invalid_credentials() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail="이메일 또는 비밀번호가 올바르지 않습니다.",
    )
