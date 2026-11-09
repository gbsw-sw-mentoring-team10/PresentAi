import time
from collections import deque
from threading import Lock

from fastapi import HTTPException
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128

password_hasher = PasswordHash.recommended()
# 존재하지 않는 이메일도 해시 검증을 거쳐 응답 시간 차이를 줄인다.
DUMMY_PASSWORD_HASH = password_hasher.hash("unused-password-for-timing-check")


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        return password_hasher.verify(password, stored_hash)
    except (UnknownHashError, ValueError):
        return False


class AuthRateLimiter:
    # 단일 서버 프로세스의 IP별 로그인/가입 시도 횟수를 제한한다.

    def __init__(self, window_seconds: int = 60):
        self.window_seconds = window_seconds
        self.attempts = {}
        self.lock = Lock()

    def check(self, action: str, client_ip: str) -> None:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        limit = 5 if action == "register" else 10

        with self.lock:
            expired_keys = [
                key for key, attempts in self.attempts.items() if attempts[-1] <= cutoff
            ]
            for key in expired_keys:
                del self.attempts[key]

            attempts = self.attempts.setdefault((action, client_ip), deque())
            while attempts and attempts[0] <= cutoff:
                attempts.popleft()

            if len(attempts) >= limit:
                raise HTTPException(
                    status_code=429,
                    detail="시도 횟수가 많습니다. 1분 후 다시 시도해 주세요.",
                    headers={"Retry-After": "60"},
                )

            attempts.append(now)
