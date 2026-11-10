import copy
import os
import re
from contextlib import nullcontext

import pytest
from fastapi.testclient import TestClient

import config
import database
from main import app
from routers import auth, upload
from routers.mock_api import common as mock_common
from services.auth_security import AuthRateLimiter

RESULT = {
    "score": 85,
    "feedback": "저장 검증용 종합 평가",
    "strengths": ["핵심 내용이 명확함", "장점의 줄바꿈\n유지"],
    "improvements": [{"issue": "근거 부족", "deduction": 15, "solution": "출처 추가"}],
    "revised_script": "수정 대본",
    "slides": [
        {
            "slide_number": 1,
            "summary": "첫 장",
            "good_points": ["좋은 제목"],
            "issues": [
                {"problem": "작은 글씨", "solution": "크게 표시"},
                {"problem": "출처 누락", "solution": "각주 추가"},
            ],
            "script_connection": "대본과 연결됨",
        }
    ],
}
CREDENTIALS = {"email": "feedback-test@example.com", "password": "PresentAI-test-123!"}
TABLES = (
    "users",
    "auth_sessions",
    "slides_feedback_result",
    "entire_result",
    "entire_improvements",
    "slide_feedback",
)


@pytest.fixture(scope="module")
def connection():
    if os.getenv("RUN_MYSQL_TESTS") != "1":
        pytest.skip("RUN_MYSQL_TESTS=1로 MySQL 통합 테스트를 실행합니다.")
    with database.get_connection() as db:
        with db.cursor() as cursor:
            for table in TABLES:
                cursor.execute(f"SHOW CREATE TABLE `{table}`")
                ddl = cursor.fetchone()["Create Table"]
                ddl = ddl.replace("CREATE TABLE", "CREATE TEMPORARY TABLE", 1)
                ddl = re.sub(r",\s*CONSTRAINT[^\n]*FOREIGN KEY[^\n]*", "", ddl)
                cursor.execute(ddl)
        yield db


@pytest.fixture
def client(connection, monkeypatch):
    with connection.cursor() as cursor:
        for table in reversed(TABLES):
            cursor.execute(f"DELETE FROM `{table}`")
    connection.commit()

    def test_db():
        yield connection

    app.dependency_overrides[database.get_db] = test_db
    monkeypatch.setattr(database, "get_connection", lambda: nullcontext(connection))
    monkeypatch.setattr(config, "AUTH_COOKIE_SECURE", True)
    monkeypatch.setattr(auth, "rate_limiter", AuthRateLimiter())
    for name in (
        "overall_result",
        "generate_script_feedback",
        "generate_material_feedback",
    ):
        monkeypatch.setattr(upload, name, lambda *args, **kwargs: copy.deepcopy(RESULT))
    with TestClient(
        app, base_url="https://testserver", headers={"Origin": "https://testserver"}
    ) as client:
        yield client
    app.dependency_overrides.clear()


def login(client, email=CREDENTIALS["email"]):
    credentials = {**CREDENTIALS, "email": email}
    assert client.post("/auth/register", json=credentials).status_code == 201
    response = client.post("/auth/login", json=credentials)
    assert response.status_code == 200
    return response.json()


def analyze(client, **kwargs):
    return client.post(
        "/upload/?title=저장 테스트&perpose=교육&user_id=999999",
        data={"prompt": "합성 대본"},
        **kwargs,
    )


def count(connection, table):
    with connection.cursor() as cursor:
        cursor.execute(f"SELECT COUNT(*) AS count FROM `{table}`")
        return cursor.fetchone()["count"]


def test_guest_analysis_does_not_save(client, connection):
    response = analyze(client)
    assert response.status_code == 200
    assert response.json()["saved_result_id"] is None
    assert count(connection, "slides_feedback_result") == 0


def test_guest_does_not_open_database(monkeypatch):
    def forbidden():
        raise AssertionError("guest must not connect to DB")

    monkeypatch.setattr(database, "get_connection", forbidden)
    monkeypatch.setattr(upload, "generate_script_feedback", lambda *args: RESULT)
    with TestClient(app) as client:
        assert analyze(client).status_code == 200


@pytest.mark.parametrize("mode", ["script", "file", "both"])
def test_authenticated_analysis_saves_under_session_owner(client, connection, mode):
    user = login(client)
    kwargs = {"data": {"prompt": "합성 대본"}} if mode != "file" else {}
    if mode != "script":
        kwargs["files"] = {
            "file": ("synthetic.pdf", b"synthetic bytes", "application/pdf")
        }
    response = client.post(
        "/upload/?title=테스트&perpose=교육&user_id=999999", **kwargs
    )
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "pending"
    result_id = response.json()["result_id"]
    assert isinstance(result_id, int)
    saved = client.get(f"/feedback/{result_id}")
    assert saved.status_code == 200
    data = saved.json()
    assert data["status"] == "completed"
    for key in (
        "score",
        "feedback",
        "strengths",
        "improvements",
        "revised_script",
        "slides",
    ):
        assert data[key] == RESULT[key]
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT user_id FROM slides_feedback_result WHERE slides_result_id=%s",
            (result_id,),
        )
        assert cursor.fetchone()["user_id"] == user["user_id"]
    assert response.headers["cache-control"] == "no-store"


def test_material_only_result_without_script_fields_is_saved(client, monkeypatch):
    login(client)
    payload = copy.deepcopy(RESULT)
    payload.pop("revised_script")
    payload["slides"][0].pop("script_connection")
    monkeypatch.setattr(upload, "generate_material_feedback", lambda **kwargs: payload)
    response = client.post(
        "/upload/?title=Material-only&perpose=Testing",
        files={"file": ("synthetic.pdf", b"synthetic", "application/pdf")},
    )
    assert response.status_code == 200
    stored = client.get(f"/feedback/{response.json()['result_id']}").json()
    assert stored["revised_script"] == ""
    assert stored["slides"][0]["script_connection"] == ""


def test_multiple_presentations_can_each_save_slide_one(client, connection):
    login(client)
    first = analyze(client)
    second = analyze(client)
    assert first.status_code == second.status_code == 200
    assert first.json()["result_id"] != second.json()["result_id"]
    assert count(connection, "slide_feedback") == 2


def test_other_user_and_guest_cannot_read_saved_result(client):
    login(client)
    result_id = analyze(client).json()["result_id"]
    assert client.post("/auth/logout").status_code == 200
    assert client.get(f"/feedback/{result_id}").status_code == 401
    login(client, "other-feedback-test@example.com")
    assert client.get(f"/feedback/{result_id}?user_id=1").status_code == 404


@pytest.mark.parametrize("invalid", ["forged", "expired", "logout"])
def test_invalid_session_is_rejected_before_ai(
    client, connection, monkeypatch, invalid
):
    login(client)
    if invalid == "forged":
        client.cookies.clear()
        client.cookies.set(config.AUTH_COOKIE_NAME, "forged-session")
    elif invalid == "expired":
        with connection.cursor() as cursor:
            cursor.execute("UPDATE auth_sessions SET expires_at=UTC_TIMESTAMP(6)")
        connection.commit()
    else:
        token = client.cookies.get(config.AUTH_COOKIE_NAME)
        client.post("/auth/logout")
        client.cookies.set(config.AUTH_COOKIE_NAME, token)

    def forbidden(*args):
        raise AssertionError("invalid session must not run AI")

    monkeypatch.setattr(upload, "generate_script_feedback", forbidden)
    assert analyze(client).status_code == 401
    assert count(connection, "slides_feedback_result") == 0


def status_of(connection, result_id):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT status, error_message FROM slides_feedback_result "
            "WHERE slides_result_id=%s",
            (result_id,),
        )
        return cursor.fetchone()


def test_job_runs_in_background_after_pending_is_returned(
    client, connection, monkeypatch
):
    login(client)
    seen = {}

    def inspect(*args):
        with connection.cursor() as cursor:
            cursor.execute("SELECT status FROM slides_feedback_result")
            seen["status"] = cursor.fetchone()["status"]
        return RESULT

    monkeypatch.setattr(upload, "generate_script_feedback", inspect)
    response = analyze(client)
    assert response.json()["status"] == "pending"
    assert seen["status"] == "processing"
    assert status_of(connection, response.json()["result_id"])["status"] == "completed"


def test_pending_and_processing_return_status_only(client, connection):
    login(client)
    with connection.cursor() as cursor:
        cursor.execute("SELECT user_id FROM users")
        user_id = cursor.fetchone()["user_id"]
        cursor.execute(
            "INSERT INTO slides_feedback_result (user_id, title, status) "
            "VALUES (%s, 'pending job', 'pending')",
            (user_id,),
        )
        result_id = cursor.lastrowid
    connection.commit()
    assert client.get(f"/feedback/{result_id}").json() == {
        "saved_result_id": result_id,
        "status": "pending",
    }


def test_model_error_marks_job_failed(client, connection, monkeypatch):
    from google.genai import errors

    login(client)

    def rate_limited(*args):
        raise errors.ClientError(429, {"error": {"message": "private detail"}})

    monkeypatch.setattr(upload, "generate_script_feedback", rate_limited)
    response = analyze(client)
    assert response.status_code == 200
    body = client.get(f"/feedback/{response.json()['result_id']}").json()
    assert body["status"] == "failed"
    assert "사용량" in body["error_message"]
    assert "private detail" not in str(body)
    assert count(connection, "entire_result") == 0


def test_partial_save_rolls_back_and_marks_job_failed(client, connection):
    login(client)
    with connection.cursor() as cursor:
        cursor.execute(
            "ALTER TABLE entire_improvements RENAME COLUMN issue TO unavailable_issue"
        )
    try:
        response = analyze(client)
        assert response.status_code == 200
        job = status_of(connection, response.json()["result_id"])
        assert job["status"] == "failed"
        assert count(connection, "entire_result") == 0
        assert "unavailable_issue" not in str(job)
    finally:
        with connection.cursor() as cursor:
            cursor.execute(
                "ALTER TABLE entire_improvements RENAME COLUMN unavailable_issue TO issue"
            )
        connection.commit()


def test_mock_analysis_does_not_save(client, connection, monkeypatch):
    login(client)
    monkeypatch.setattr(mock_common.time, "sleep", lambda seconds: None)
    response = client.post("/mock/upload/?title=예시&perpose=체험", data={"prompt": "대본"})
    assert response.status_code == 200
    assert count(connection, "slides_feedback_result") == 0


def test_cross_site_analysis_does_not_save(client, connection):
    login(client)
    response = analyze(client, headers={"Origin": "https://other.example"})
    assert response.status_code == 403
    assert count(connection, "slides_feedback_result") == 0


def test_database_connection_failure_still_returns_model_output(monkeypatch):
    import pymysql

    def unavailable():
        raise pymysql.OperationalError(2003, "private connection details")

    monkeypatch.setattr(database, "get_connection", unavailable)
    monkeypatch.setattr(upload, "generate_script_feedback", lambda *args: RESULT)
    with TestClient(app) as client:
        client.cookies.set(config.AUTH_COOKIE_NAME, "existing-session")
        response = analyze(client)
    assert response.status_code == 200
    assert response.json()["storage_status"] == "failed"
    assert response.json()["saved_result_id"] is None
    assert response.json()["feedback"] == RESULT["feedback"]
    assert "private connection details" not in response.text


def test_unexpected_model_format_marks_job_failed(client, connection, monkeypatch):
    login(client)
    raw = {"unexpected_feedback": ["the model output is retained"]}
    monkeypatch.setattr(upload, "generate_script_feedback", lambda *args: raw)
    response = analyze(client)
    assert response.status_code == 200
    job = status_of(connection, response.json()["result_id"])
    assert job["status"] == "failed"
    assert count(connection, "entire_result") == 0


def test_unparsed_model_text_is_returned_as_raw_output(monkeypatch):
    from types import SimpleNamespace

    from services.ai_feedback_method import get_feedback_response

    text = "Unparsed model feedback"
    assert get_feedback_response(SimpleNamespace(parsed=None, text=text)) == text
    assert get_feedback_response(
        SimpleNamespace(parsed=None, text='{"feedback":"raw"}')
    ) == {"feedback": "raw"}
    monkeypatch.setattr(upload, "generate_script_feedback", lambda *args: text)
    with TestClient(app) as client:
        response = analyze(client)
    assert response.status_code == 200
    assert response.json()["raw_result"] == text


@pytest.mark.parametrize("configured", [None, "", "gemini-2.5-pro"])
def test_model_request_has_a_default_when_model_setting_is_missing(
    monkeypatch, configured
):
    from types import SimpleNamespace

    from google.genai import errors

    from services import ai_feedback_method

    if configured is None:
        monkeypatch.delenv("GEMINI_MODEL", raising=False)
    else:
        monkeypatch.setenv("GEMINI_MODEL", configured)
    used_models = []

    def generate_content(*, model, **kwargs):
        used_models.append(model)
        if not model:
            raise errors.ClientError(404, {"error": {"message": "model not found"}})
        return SimpleNamespace(parsed=RESULT, text="")

    monkeypatch.setattr(
        ai_feedback_method.client.models, "generate_content", generate_content
    )
    with TestClient(app, raise_server_exceptions=False) as client:
        response = analyze(client)
    assert response.status_code == 200, response.text
    assert used_models == [configured or "gemini-3.8-flash"]
    assert response.json()["feedback"] == RESULT["feedback"]
