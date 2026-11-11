import os
import re
import stat

import pymysql
import pytest
from fastapi.testclient import TestClient

import config
import database
from main import app
from routers import auth
from scripts.create_admin import ensure_admin_account, save_initial_credentials
from services.auth_security import AuthRateLimiter, password_hasher

CREDENTIALS = {"email": "presentai-test@example.com", "password": "PresentAI-test-123!"}


@pytest.fixture(scope="session")
def mysql_connection():
    if os.getenv("RUN_MYSQL_TESTS") != "1":
        pytest.skip("RUN_MYSQL_TESTS=1로 MySQL 통합 테스트를 실행합니다.")
    with database.get_connection() as connection:
        with connection.cursor() as cursor:
            # 같은 연결에서만 보이는 임시 테이블로 실제 사용자/세션을 보호한다.
            for table in ("users", "auth_sessions"):
                cursor.execute(f"SHOW CREATE TABLE `{table}`")
                ddl = cursor.fetchone()["Create Table"]
                ddl = ddl.replace("CREATE TABLE", "CREATE TEMPORARY TABLE", 1)
                # MySQL의 임시 테이블에는 외래 키를 정의할 수 없다.
                ddl = re.sub(r",\s*CONSTRAINT[^\n]*FOREIGN KEY[^\n]*", "", ddl)
                cursor.execute(ddl)
        yield connection


@pytest.fixture
def db(mysql_connection):
    with mysql_connection.cursor() as cursor:
        cursor.execute("DELETE FROM auth_sessions")
        cursor.execute("DELETE FROM users")
    mysql_connection.commit()
    return mysql_connection


@pytest.fixture
def client(db, monkeypatch):
    def test_db():
        yield db

    app.dependency_overrides[database.get_db] = test_db
    monkeypatch.setattr(auth, "rate_limiter", AuthRateLimiter())
    monkeypatch.setattr(config, "AUTH_COOKIE_SECURE", True)
    with TestClient(
        app,
        base_url="https://testserver",
        headers={"Origin": config.CORS_ORIGINS[0]},
    ) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def register_and_login(client):
    registered = client.post("/auth/register", json=CREDENTIALS)
    assert registered.status_code == 201
    logged_in = client.post("/auth/login", json=CREDENTIALS)
    assert logged_in.status_code == 200
    return registered.json(), logged_in


def test_register_hashes_password_and_normalizes_email(client, db):
    response = client.post(
        "/auth/register",
        json={**CREDENTIALS, "email": "  PresentAI-Test@EXAMPLE.COM  "},
    )
    assert response.status_code == 201
    assert set(response.json()) == {"user_id", "email", "role"}
    assert response.json()["email"] == CREDENTIALS["email"]
    assert response.json()["role"] == "user"
    with db.cursor() as cursor:
        cursor.execute(
            "SELECT password_hash FROM users WHERE user_id = %s",
            (response.json()["user_id"],),
        )
        stored = cursor.fetchone()["password_hash"]
    assert stored.startswith("$argon2id$")
    assert password_hasher.verify(CREDENTIALS["password"], stored)
    assert CREDENTIALS["password"] not in response.text


def test_duplicate_registration_returns_conflict(client):
    assert client.post("/auth/register", json=CREDENTIALS).status_code == 201
    assert client.post("/auth/register", json=CREDENTIALS).status_code == 409


def test_api_docs_same_origin_requests_are_allowed(client):
    headers = {"Origin": "https://testserver"}
    assert (
        client.post("/auth/register", json=CREDENTIALS, headers=headers).status_code
        == 201
    )
    assert (
        client.post("/auth/login", json=CREDENTIALS, headers=headers).status_code == 200
    )


@pytest.mark.parametrize("password", ["short", "x" * 129])
def test_invalid_registration_password_is_not_saved(client, db, password):
    response = client.post("/auth/register", json={**CREDENTIALS, "password": password})
    assert response.status_code == 422
    with db.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) AS count FROM users")
        assert cursor.fetchone()["count"] == 0
    assert password not in response.text


def test_validation_errors_do_not_echo_password(client):
    response = client.post("/auth/login", json={"password": CREDENTIALS["password"]})
    assert response.status_code == 422
    assert CREDENTIALS["password"] not in response.text


def test_login_cookie_and_current_user(client, db):
    user, response = register_and_login(client)
    cookie_header = response.headers["set-cookie"].lower()
    assert "httponly" in cookie_header
    assert "secure" in cookie_header
    assert "samesite=lax" in cookie_header
    assert "max-age=86400" in cookie_header
    assert response.headers["cache-control"] == "no-store"
    assert response.json() == user
    assert client.get("/auth/me").json() == user
    token = client.cookies.get(config.AUTH_COOKIE_NAME)
    with db.cursor() as cursor:
        cursor.execute("SELECT token_hash FROM auth_sessions")
        stored_token_hash = cursor.fetchone()["token_hash"]
    assert len(stored_token_hash) == 32
    assert stored_token_hash != token.encode()


def test_bad_password_and_unknown_email_have_same_error(client):
    client.post("/auth/register", json=CREDENTIALS)
    wrong_password = client.post(
        "/auth/login", json={**CREDENTIALS, "password": "wrong-password"}
    )
    unknown_user = client.post(
        "/auth/login", json={**CREDENTIALS, "email": "unknown@example.com"}
    )
    assert wrong_password.status_code == unknown_user.status_code == 401
    assert wrong_password.json() == unknown_user.json()
    assert not client.cookies.get(config.AUTH_COOKIE_NAME)


def test_unauthenticated_and_forged_sessions_are_rejected(client):
    assert client.get("/auth/me").status_code == 401
    client.cookies.set(
        config.AUTH_COOKIE_NAME, "forged-session", domain="testserver.local", path="/"
    )
    assert client.get("/auth/me").status_code == 401


def test_query_parameter_cannot_impersonate_another_user(client):
    user, _ = register_and_login(client)
    assert client.get("/auth/me?user_id=999999").json() == user


def test_expired_session_is_rejected(client, db):
    register_and_login(client)
    with db.cursor() as cursor:
        cursor.execute(
            "UPDATE auth_sessions SET expires_at = UTC_TIMESTAMP(6) - INTERVAL 1 SECOND"
        )
    db.commit()
    assert client.get("/auth/me").status_code == 401


def test_logout_invalidates_session_even_if_cookie_is_replayed(client, db):
    register_and_login(client)
    token = client.cookies.get(config.AUTH_COOKIE_NAME)
    assert client.post("/auth/logout").status_code == 200
    assert client.get("/auth/me").status_code == 401
    replay = client.get(
        "/auth/me", headers={"Cookie": f"{config.AUTH_COOKIE_NAME}={token}"}
    )
    assert replay.status_code == 401
    with db.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) AS count FROM auth_sessions")
        assert cursor.fetchone()["count"] == 0
    assert client.post("/auth/logout").status_code == 200


def test_repeated_login_rotates_session(client):
    register_and_login(client)
    old_token = client.cookies.get(config.AUTH_COOKIE_NAME)
    assert client.post("/auth/login", json=CREDENTIALS).status_code == 200
    assert client.cookies.get(config.AUTH_COOKIE_NAME) != old_token
    replay = client.get(
        "/auth/me", headers={"Cookie": f"{config.AUTH_COOKIE_NAME}={old_token}"}
    )
    assert replay.status_code == 401
    assert client.get("/auth/me").status_code == 200


@pytest.mark.parametrize("path", ["/auth/register", "/auth/login", "/auth/logout"])
def test_cross_origin_mutations_are_rejected(client, path):
    response = client.post(
        path, json=CREDENTIALS, headers={"Origin": "https://untrusted.example"}
    )
    assert response.status_code == 403


def test_rejected_cross_origin_logout_preserves_session(client):
    register_and_login(client)
    assert (
        client.post(
            "/auth/logout", headers={"Origin": "https://untrusted.example"}
        ).status_code
        == 403
    )
    assert client.get("/auth/me").status_code == 200


def test_login_attempt_limit(client):
    for _ in range(10):
        assert client.post("/auth/login", json=CREDENTIALS).status_code == 401
    response = client.post("/auth/login", json=CREDENTIALS)
    assert response.status_code == 429
    assert response.headers["retry-after"] == "60"


def test_database_outage_returns_generic_error(client, monkeypatch):
    app.dependency_overrides.pop(database.get_db)

    def unavailable_db():
        raise pymysql.OperationalError(2003, "internal connection error")

    monkeypatch.setattr(database, "get_connection", unavailable_db)
    response = client.post("/auth/login", json=CREDENTIALS)
    assert response.status_code == 503
    assert "internal connection error" not in response.text


def test_registration_cannot_grant_admin_role(client, db):
    response = client.post("/auth/register", json={**CREDENTIALS, "role": "admin"})
    assert response.status_code == 201
    assert response.json()["role"] == "user"
    with db.cursor() as cursor:
        cursor.execute(
            "SELECT role FROM users WHERE user_id = %s", (response.json()["user_id"],)
        )
        assert cursor.fetchone()["role"] == "user"
    assert client.post("/auth/login", json=CREDENTIALS).status_code == 200
    assert client.get("/auth/admin/me?role=admin").status_code == 403


def test_admin_endpoint_requires_login(client):
    assert client.get("/auth/admin/me").status_code == 401


def test_regular_user_cannot_access_admin_endpoint(client):
    register_and_login(client)
    assert client.get("/auth/admin/me").status_code == 403


def test_new_admin_can_log_in_and_access_admin_endpoint(client, db):
    user, created = ensure_admin_account(
        db, CREDENTIALS["email"], CREDENTIALS["password"]
    )
    db.commit()
    assert created is True
    response = client.post("/auth/login", json=CREDENTIALS)
    assert response.status_code == 200
    assert response.json() == user.model_dump()
    assert client.get("/auth/me").json()["role"] == "admin"
    assert client.get("/auth/admin/me").status_code == 200


def test_promoting_existing_user_preserves_password_and_session(client, db):
    original_user, _ = register_and_login(client)
    user, created = ensure_admin_account(
        db, CREDENTIALS["email"], "ignored-new-password"
    )
    db.commit()
    assert created is False
    assert user.user_id == original_user["user_id"]
    assert client.get("/auth/admin/me").status_code == 200
    assert client.post("/auth/login", json=CREDENTIALS).status_code == 200


def test_revoking_admin_role_blocks_existing_session(client, db):
    user, _ = ensure_admin_account(db, CREDENTIALS["email"], CREDENTIALS["password"])
    db.commit()
    assert client.post("/auth/login", json=CREDENTIALS).status_code == 200
    assert client.get("/auth/admin/me").status_code == 200
    with db.cursor() as cursor:
        cursor.execute(
            "UPDATE users SET role = 'user' WHERE user_id = %s", (user.user_id,)
        )
    db.commit()
    assert client.get("/auth/admin/me").status_code == 403
    assert client.get("/auth/me").json()["role"] == "user"


def test_repeated_admin_setup_keeps_same_account_and_password(client, db):
    first_user, _ = ensure_admin_account(
        db, CREDENTIALS["email"], CREDENTIALS["password"]
    )
    second_user, created = ensure_admin_account(
        db, CREDENTIALS["email"], "ignored-new-password"
    )
    db.commit()
    assert created is False
    assert first_user == second_user
    with db.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) AS count FROM users")
        assert cursor.fetchone()["count"] == 1
    assert client.post("/auth/login", json=CREDENTIALS).status_code == 200


def test_credentials_file_is_private(tmp_path):
    path = tmp_path / "admin-credentials.local.txt"
    save_initial_credentials(path, CREDENTIALS["email"], CREDENTIALS["password"])
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    assert CREDENTIALS["email"] in path.read_text()
    assert CREDENTIALS["password"] in path.read_text()


def test_existing_credentials_file_is_preserved(tmp_path):
    path = tmp_path / "admin-credentials.local.txt"
    save_initial_credentials(path, CREDENTIALS["email"], CREDENTIALS["password"])
    original = path.read_text()
    with pytest.raises(FileExistsError):
        save_initial_credentials(path, CREDENTIALS["email"], "another-password")
    assert path.read_text() == original


def test_change_email_requires_password_and_rejects_duplicates(client):
    register_and_login(client)
    other = {"email": "other-test@example.com", "password": CREDENTIALS["password"]}
    assert client.post("/auth/register", json=other).status_code == 201

    wrong = client.patch("/auth/email", json={"new_email": "new@example.com", "password": "wrong-password"})
    assert wrong.status_code == 401
    taken = client.patch("/auth/email", json={"new_email": other["email"], "password": CREDENTIALS["password"]})
    assert taken.status_code == 409
    changed = client.patch("/auth/email", json={"new_email": " New@Example.com ", "password": CREDENTIALS["password"]})
    assert changed.status_code == 200
    assert changed.json()["email"] == "new@example.com"
    assert client.get("/auth/me").json()["email"] == "new@example.com"


def test_change_password_keeps_current_session_and_drops_others(client):
    register_and_login(client)
    other_session = TestClient(
        app, base_url="https://testserver", headers={"Origin": config.CORS_ORIGINS[0]}
    )
    assert other_session.post("/auth/login", json=CREDENTIALS).status_code == 200

    new_password = "Another-Pass-456!"
    bad = client.patch("/auth/password", json={"current_password": "wrong-password", "new_password": new_password})
    assert bad.status_code == 401
    short = client.patch("/auth/password", json={"current_password": CREDENTIALS["password"], "new_password": "short"})
    assert short.status_code == 422
    ok = client.patch("/auth/password", json={"current_password": CREDENTIALS["password"], "new_password": new_password})
    assert ok.status_code == 200

    assert client.get("/auth/me").status_code == 200
    assert other_session.get("/auth/me").status_code == 401
    fresh = {**CREDENTIALS, "password": new_password}
    assert client.post("/auth/login", json=CREDENTIALS).status_code == 401
    assert client.post("/auth/login", json=fresh).status_code == 200


def test_delete_account_removes_user_and_session(client, db):
    register_and_login(client)
    response = client.delete("/auth/account")
    assert response.status_code == 200
    assert client.get("/auth/me").status_code == 401
    with db.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) AS n FROM users WHERE email = %s", (CREDENTIALS["email"],))
        assert cursor.fetchone()["n"] == 0
