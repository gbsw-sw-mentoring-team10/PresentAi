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


def _verified_user_row(connection: Connection, user_id: int, password: str) -> dict:
    # 현재 비밀번호가 맞는 사용자 행을 잠가서 돌려준다. 틀리면 401.
    if not 1 <= len(password) <= MAX_PASSWORD_LENGTH:
        raise HTTPException(status_code=401, detail="현재 비밀번호가 올바르지 않습니다.")
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT user_id, email, password_hash, role FROM users WHERE user_id = %s FOR UPDATE",
            (user_id,),
        )
        row = cursor.fetchone()
    if row is None or not verify_password(password, row["password_hash"]):
        connection.rollback()
        raise HTTPException(status_code=401, detail="현재 비밀번호가 올바르지 않습니다.")
    return row


def change_email(
    connection: Connection, user_id: int, new_email: str, password: str
) -> PublicUser:
    row = _verified_user_row(connection, user_id, password)
    if row["email"] == new_email:
        connection.rollback()
        raise HTTPException(status_code=422, detail="현재 이메일과 다른 이메일을 입력해 주세요.")
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE users SET email = %s WHERE user_id = %s", (new_email, user_id)
            )
        connection.commit()
    except pymysql.IntegrityError as exc:
        connection.rollback()
        if exc.args[0] == MYSQL_DUPLICATE_ENTRY:
            raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다.") from exc
        raise
    return PublicUser(user_id=user_id, email=new_email, role=row["role"])


def change_password(
    connection: Connection,
    user_id: int,
    current_password: str,
    new_password: str,
    keep_token: str | None,
) -> None:
    # 비밀번호를 바꾸고, 현재 브라우저를 뺀 다른 로그인 세션은 모두 끊는다.
    if not MIN_PASSWORD_LENGTH <= len(new_password) <= MAX_PASSWORD_LENGTH:
        raise HTTPException(status_code=422, detail="비밀번호는 8~128자로 입력해 주세요.")
    _verified_user_row(connection, user_id, current_password)
    if new_password == current_password:
        connection.rollback()
        raise HTTPException(
            status_code=422, detail="현재 비밀번호와 다른 비밀번호를 입력해 주세요."
        )
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE users SET password_hash = %s WHERE user_id = %s",
            (password_hasher.hash(new_password), user_id),
        )
        if is_valid_session_token(keep_token):
            cursor.execute(
                "DELETE FROM auth_sessions WHERE user_id = %s AND token_hash <> %s",
                (user_id, hash_session_token(keep_token)),
            )
        else:
            cursor.execute("DELETE FROM auth_sessions WHERE user_id = %s", (user_id,))
    connection.commit()


def delete_user(connection: Connection, user_id: int) -> None:
    # 연결된 세션·피드백·파일 기록은 DB의 ON DELETE CASCADE로 함께 지워진다.
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
    connection.commit()
