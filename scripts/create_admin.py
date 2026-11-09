import argparse
import os
import secrets
from pathlib import Path

from pydantic import EmailStr, TypeAdapter
from pymysql.connections import Connection

from config import BASE_DIR
from database import get_connection
from schemas.auth import PublicUser
from scripts.init_auth_db import initialize_auth_tables
from services.auth_security import (
    MAX_PASSWORD_LENGTH,
    MIN_PASSWORD_LENGTH,
    password_hasher,
)


def ensure_admin_account(
    connection: Connection, email: str, password: str
) -> tuple[PublicUser, bool]:
    # DB 연결을 가진 운영자가 실행하는 계정 생성/승격 처리다. 저장 확정은 호출자가 한다.
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT user_id, email, role FROM users WHERE email = %s FOR UPDATE",
            (email,),
        )
        existing_user = cursor.fetchone()

        if existing_user:
            if existing_user["role"] != "admin":
                cursor.execute(
                    "UPDATE users SET role = 'admin' WHERE user_id = %s",
                    (existing_user["user_id"],),
                )
            # 기존 계정의 비밀번호와 자료는 유지한다.
            return PublicUser(**{**existing_user, "role": "admin"}), False

        if not MIN_PASSWORD_LENGTH <= len(password) <= MAX_PASSWORD_LENGTH:
            raise ValueError("비밀번호는 8~128자로 입력해 주세요.")

        cursor.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, 'admin')",
            (email, password_hasher.hash(password)),
        )
        return PublicUser(user_id=cursor.lastrowid, email=email, role="admin"), True


def save_initial_credentials(path: Path, email: str, password: str) -> None:
    # 현재 사용자만 읽을 수 있는 로컬 파일에 저장한다. 기존 파일은 덮어쓰지 않는다.
    file_descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(file_descriptor, "w", encoding="utf-8") as file:
        file.write(
            f"서비스 관리자 계정\n이메일: {email}\n초기 비밀번호: {password}\n"
            "권한: admin\n로그인 API: http://localhost:8000/auth/login\n"
        )


def main():
    parser = argparse.ArgumentParser(
        description="서비스 관리자 계정을 생성하거나 승격합니다."
    )
    parser.add_argument("email", help="관리자로 지정할 이메일")
    parser.add_argument(
        "--credentials-file",
        type=Path,
        default=BASE_DIR / "admin-credentials.local.txt",
        help="새 계정의 초기 비밀번호를 저장할 로컬 파일",
    )
    args = parser.parse_args()
    email = str(TypeAdapter(EmailStr).validate_python(args.email.strip().lower()))
    password = secrets.token_urlsafe(24)

    with get_connection() as connection:
        initialize_auth_tables(connection)
        user, created = ensure_admin_account(connection, email, password)
        if created:
            save_initial_credentials(args.credentials_file, user.email, password)
        connection.commit()

    print(f"관리자 계정 준비 완료: {user.email} (role={user.role})")
    if created:
        print(f"초기 비밀번호 저장 위치: {args.credentials_file.resolve()}")
    else:
        print("기존 계정의 비밀번호를 유지했습니다.")


if __name__ == "__main__":
    main()
