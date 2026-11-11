from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pymysql.connections import Connection

import config
from database import get_db
from schemas.auth import Credentials, EmailChange, PasswordChange, PublicUser
from services import auth_service, file_storage
from services.auth_security import AuthRateLimiter


def prevent_caching(response: Response):
    response.headers["Cache-Control"] = "no-store"


def require_trusted_origin(request: Request):
    # 브라우저의 다른 사이트에서 로그인/로그아웃 요청을 보내는 것을 차단한다.
    origin = request.headers.get("origin")
    same_origin = f"{request.url.scheme}://{request.url.netloc}"
    allowed_origins = {*config.CORS_ORIGINS, same_origin}
    if origin is not None and origin not in allowed_origins:
        raise HTTPException(status_code=403, detail="허용되지 않은 요청 출처입니다.")
    if origin is None and request.headers.get("sec-fetch-site") == "cross-site":
        raise HTTPException(status_code=403, detail="허용되지 않은 요청 출처입니다.")


router = APIRouter(tags=["auth"], dependencies=[Depends(prevent_caching)])
rate_limiter = AuthRateLimiter()
DatabaseConnection = Annotated[Connection, Depends(get_db)]


def get_current_user(request: Request, db: DatabaseConnection) -> PublicUser:
    # 로그인이 필요한 API에서 Depends(get_current_user)로 사용한다.
    token = request.cookies.get(config.AUTH_COOKIE_NAME)
    user = auth_service.find_session_user(db, token)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="로그인이 필요합니다.",
            headers={"Cache-Control": "no-store"},
        )
    return user


def get_current_admin(
    current_user: Annotated[PublicUser, Depends(get_current_user)],
) -> PublicUser:
    # 관리자 전용 API에서 사용한다. 권한은 매 요청마다 DB에서 확인한다.
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    return current_user


def check_attempt_limit(request: Request, action: str) -> None:
    client_ip = request.client.host if request.client else "unknown"
    rate_limiter.check(action, client_ip)


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=config.AUTH_COOKIE_NAME,
        value=token,
        max_age=config.SESSION_TTL_SECONDS,
        httponly=True,
        secure=config.AUTH_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=config.AUTH_COOKIE_NAME,
        path="/",
        secure=config.AUTH_COOKIE_SECURE,
        httponly=True,
        samesite="lax",
    )


@router.get("/")
def get_auth_page():
    return {"message": "this is auth page"}


@router.post(
    "/register",
    status_code=201,
    response_model=PublicUser,
    dependencies=[Depends(require_trusted_origin)],
)
def register(payload: Credentials, request: Request, db: DatabaseConnection):
    check_attempt_limit(request, "register")
    return auth_service.register_user(
        connection=db,
        email=str(payload.email),
        password=payload.password.get_secret_value(),
    )


@router.post(
    "/login",
    response_model=PublicUser,
    dependencies=[Depends(require_trusted_origin)],
)
def login(
    payload: Credentials, request: Request, response: Response, db: DatabaseConnection
):
    check_attempt_limit(request, "login")

    user = auth_service.authenticate_user(
        connection=db,
        email=str(payload.email),
        password=payload.password.get_secret_value(),
    )
    token = auth_service.create_session(
        connection=db,
        user_id=user.user_id,
        previous_token=request.cookies.get(config.AUTH_COOKIE_NAME),
    )
    set_session_cookie(response, token)

    return user


@router.get("/me", response_model=PublicUser)
def me(current_user: Annotated[PublicUser, Depends(get_current_user)]):
    return current_user


@router.get("/admin/me", response_model=PublicUser)
def admin_me(current_admin: Annotated[PublicUser, Depends(get_current_admin)]):
    return current_admin


@router.post("/logout", dependencies=[Depends(require_trusted_origin)])
def logout(request: Request, response: Response, db: DatabaseConnection):
    token = request.cookies.get(config.AUTH_COOKIE_NAME)
    auth_service.delete_session(db, token)
    clear_session_cookie(response)

    return {"message": "로그아웃되었습니다."}


@router.patch(
    "/email",
    response_model=PublicUser,
    dependencies=[Depends(require_trusted_origin)],
)
def change_email(
    payload: EmailChange,
    request: Request,
    db: DatabaseConnection,
    current_user: Annotated[PublicUser, Depends(get_current_user)],
):
    check_attempt_limit(request, "account-change")
    return auth_service.change_email(
        db,
        current_user.user_id,
        str(payload.new_email),
        payload.password.get_secret_value(),
    )


@router.patch(
    "/password",
    response_model=PublicUser,
    dependencies=[Depends(require_trusted_origin)],
)
def change_password(
    payload: PasswordChange,
    request: Request,
    db: DatabaseConnection,
    current_user: Annotated[PublicUser, Depends(get_current_user)],
):
    check_attempt_limit(request, "account-change")
    auth_service.change_password(
        db,
        current_user.user_id,
        payload.current_password.get_secret_value(),
        payload.new_password.get_secret_value(),
        keep_token=request.cookies.get(config.AUTH_COOKIE_NAME),
    )
    return current_user


@router.delete("/account", dependencies=[Depends(require_trusted_origin)])
def delete_account(
    response: Response,
    db: DatabaseConnection,
    current_user: Annotated[PublicUser, Depends(get_current_user)],
):
    keys = file_storage.user_s3_keys(db, current_user.user_id)
    auth_service.delete_user(db, current_user.user_id)
    file_storage.delete_s3_keys(keys)
    clear_session_cookie(response)
    return {"message": "계정이 삭제되었습니다."}
