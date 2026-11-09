from typing import Literal

from pydantic import BaseModel, EmailStr, Field, SecretStr, field_validator


class Credentials(BaseModel):
    # 회원가입과 로그인에서 받는 이메일·비밀번호.

    email: EmailStr = Field(max_length=255)
    password: SecretStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        if isinstance(value, str):
            return value.strip().lower()
        return value


class PublicUser(BaseModel):
    # 클라이언트에 반환할 사용자 정보. 비밀번호는 포함하지 않는다.

    user_id: int
    email: str
    role: Literal["user", "admin"]
