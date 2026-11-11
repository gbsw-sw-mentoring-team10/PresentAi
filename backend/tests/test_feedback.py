import copy
import json
import os
import re
from contextlib import nullcontext
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import config
import database
from main import app
from routers import auth, upload
from routers.mock_api import common as mock_common
from services.auth_security import AuthRateLimiter
from services import file_storage

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
    "input_files",
    "slides_feedback_result",
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
                ddl = re.sub(r"(?m)^  CONSTRAINT[^\n]*\n", "", ddl)
                ddl = ddl.replace(",\n)", "\n)")
                cursor.execute(ddl)
            cursor.execute("SHOW COLUMNS FROM slides_feedback_result LIKE 'feedback_result'")
            if cursor.fetchone() is None:
                cursor.execute("ALTER TABLE slides_feedback_result ADD COLUMN feedback_result JSON NULL")
            for column, definition in (
                ("input_file_id", "BIGINT NULL"),
                ("file_storage_status", "VARCHAR(20) NULL"),
                ("file_storage_message", "TEXT NULL"),
            ):
                cursor.execute("SHOW COLUMNS FROM slides_feedback_result LIKE %s", (column,))
                if cursor.fetchone() is None:
                    cursor.execute(f"ALTER TABLE slides_feedback_result ADD COLUMN {column} {definition}")
        yield db


@pytest.fixture
def stored_files(monkeypatch):
    objects = {}

    def put_object(**kwargs):
        objects[kwargs["Key"]] = kwargs["Body"]

    def delete_object(**kwargs):
        objects.pop(kwargs["Key"], None)

    client = SimpleNamespace(
        put_object=put_object,
        delete_object=delete_object,
        generate_presigned_url=lambda *args, **kwargs: "https://synthetic.example/download",
    )
    monkeypatch.setattr(file_storage, "get_s3_client", lambda: client)
    return objects


@pytest.fixture
def client(connection, monkeypatch, stored_files):
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


def count_payloads(connection):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT COUNT(*) AS count FROM slides_feedback_result WHERE feedback_result IS NOT NULL"
        )
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


def test_multiple_presentations_store_complete_json(client, connection):
    login(client)
    first = analyze(client)
    second = analyze(client)
    assert first.status_code == second.status_code == 200
    assert first.json()["result_id"] != second.json()["result_id"]
    with connection.cursor() as cursor:
        cursor.execute("SELECT feedback_result FROM slides_feedback_result ORDER BY slides_result_id")
        assert [json.loads(row["feedback_result"]) for row in cursor.fetchall()] == [RESULT, RESULT]


def test_feedback_json_is_nullable_and_pending_jobs_are_not_listed(client, connection):
    user = login(client)
    with connection.cursor() as cursor:
        cursor.execute("SHOW COLUMNS FROM slides_feedback_result LIKE 'feedback_result'")
        column = cursor.fetchone()
        assert column["Type"] == "json" and column["Null"] == "YES"
        cursor.execute(
            "INSERT INTO slides_feedback_result (user_id, title, status) VALUES (%s, 'waiting', 'pending')",
            (user["user_id"],),
        )
        result_id = cursor.lastrowid
        cursor.execute("SELECT feedback_result FROM slides_feedback_result WHERE slides_result_id=%s", (result_id,))
        assert cursor.fetchone()["feedback_result"] is None
    connection.commit()
    assert client.get("/feedback").json()["items"] == []
    assert client.get(f"/feedback/{result_id}").json() == {"saved_result_id": result_id, "status": "pending"}


def test_other_user_and_guest_cannot_read_saved_result(client):
    login(client)
    result_id = analyze(client).json()["result_id"]
    assert client.post("/auth/logout").status_code == 200
    assert client.get(f"/feedback/{result_id}").status_code == 401
    login(client, "other-feedback-test@example.com")
    assert client.get(f"/feedback/{result_id}?user_id=1").status_code == 404


def test_saved_feedback_list_is_empty_for_new_user(client):
    login(client)
    for path in ("/feedback", "/feedback/"):
        response = client.get(path, follow_redirects=False)
        assert response.status_code == 200
        assert response.headers["cache-control"] == "no-store"
        assert response.json() == {
            "items": [], "total": 0, "page": 1, "page_size": 20,
        }


def test_saved_feedback_list_filters_owner_and_paginates_in_stable_order(client, connection):
    owner = login(client)
    result_ids = [analyze(client).json()["result_id"] for _ in range(3)]
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE slides_feedback_result SET created_at=%s WHERE user_id=%s",
            ("2025-01-01 00:00:00", owner["user_id"]),
        )
        cursor.execute(
            "UPDATE slides_feedback_result SET created_at=%s WHERE slides_result_id=%s",
            ("2026-01-01 00:00:00", result_ids[0]),
        )
    connection.commit()
    client.post("/auth/logout")
    other = login(client, "other-history-test@example.com")
    other_result_id = analyze(client).json()["result_id"]
    client.post("/auth/logout")
    assert client.post("/auth/login", json=CREDENTIALS).status_code == 200

    response = client.get(
        f"/feedback?page=1&page_size=2&user_id={other['user_id']}"
    )
    assert response.status_code == 200
    page = response.json()
    assert (page["total"], page["page"], page["page_size"]) == (3, 1, 2)
    assert [item["saved_result_id"] for item in page["items"]] == [
        result_ids[0], result_ids[2],
    ]
    assert set(page["items"][0]) == {"saved_result_id", "title", "score", "created_at"}
    assert page["items"][0]["title"] == "저장 테스트"
    assert page["items"][0]["score"] == RESULT["score"]
    assert datetime.fromisoformat(page["items"][0]["created_at"]).utcoffset() == timedelta(0)
    second = client.get("/feedback?page=2&page_size=2").json()
    assert [item["saved_result_id"] for item in second["items"]] == [result_ids[1]]
    assert second["total"] == 3
    beyond = client.get("/feedback?page=3&page_size=2").json()
    assert beyond["items"] == [] and beyond["total"] == 3
    assert client.get(f"/feedback/{result_ids[0]}").status_code == 200
    assert client.get(f"/feedback/{other_result_id}").status_code == 404


def test_saved_feedback_detail_matches_initial_analysis_format(client):
    login(client)
    original = analyze(client).json()
    result_id = original["result_id"]
    response = client.get(f"/feedback/{result_id}")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    saved = response.json()
    assert {key: saved[key] for key in RESULT} == RESULT
    assert saved["saved_result_id"] == result_id
    assert saved["status"] == "completed"
    assert saved["title"] == "저장 테스트"
    assert "created_at" in saved
    assert not {"user_id", "result"} & saved.keys()


@pytest.mark.parametrize("mode", ["script", "material", "both"])
def test_saved_feedback_preserves_initial_feedback_fields(client, monkeypatch, mode):
    login(client)
    payload = copy.deepcopy(RESULT)
    if mode == "script":
        payload.pop("slides")
    elif mode == "material":
        payload.pop("revised_script")
        payload["slides"][0].pop("script_connection")
    for name in ("generate_script_feedback", "generate_material_feedback", "overall_result"):
        monkeypatch.setattr(upload, name, lambda *args, **kwargs: copy.deepcopy(payload))
    kwargs = {}
    if mode != "material":
        kwargs["data"] = {"prompt": "합성 대본"}
    if mode != "script":
        kwargs["files"] = {"file": ("synthetic.pdf", b"synthetic", "application/pdf")}
    original = client.post("/upload/?title=테스트&perpose=교육", **kwargs).json()
    response = client.get(f"/feedback/{original['result_id']}")
    assert response.status_code == 200
    saved = response.json()
    for key in ("score", "feedback", "strengths", "improvements"):
        assert saved[key] == payload[key]
    assert saved["saved_result_id"] == original["result_id"]
    assert saved["status"] == "completed"
    assert saved["revised_script"] == payload.get("revised_script", "")
    expected_slides = copy.deepcopy(payload.get("slides", []))
    for slide in expected_slides:
        slide.setdefault("script_connection", "")
    assert saved["slides"] == expected_slides
    if mode == "script":
        assert "saved_file_id" not in saved and "file_storage_status" not in saved
    else:
        assert saved["saved_file_id"] > 0
        assert saved["file_storage_status"] == "saved"
        assert saved["file_name"] == "synthetic.pdf"


def test_saved_feedback_list_requires_an_active_session(client, connection):
    assert client.get("/feedback").status_code == 401
    login(client)
    with connection.cursor() as cursor:
        cursor.execute("UPDATE auth_sessions SET expires_at=UTC_TIMESTAMP(6)")
    connection.commit()
    response = client.get("/feedback")
    assert response.status_code == 401
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("query", [
    "page=0", "page=-1", "page=invalid", "page_size=0", "page_size=101",
    "page_size=invalid",
])
def test_saved_feedback_list_rejects_invalid_pagination(client, query):
    login(client)
    assert client.get(f"/feedback?{query}").status_code == 422


def test_missing_saved_feedback_returns_not_found(client):
    login(client)
    response = client.get("/feedback/999999999")
    assert response.status_code == 404


@pytest.mark.parametrize("result_id", [0, -1])
def test_saved_feedback_detail_rejects_nonpositive_ids(client, result_id):
    login(client)
    assert client.get(f"/feedback/{result_id}").status_code == 422


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
    assert count_payloads(connection) == 0


def test_partial_save_rolls_back_and_marks_job_failed(client, connection):
    login(client)
    with connection.cursor() as cursor:
        cursor.execute(
            "ALTER TABLE slides_feedback_result RENAME COLUMN feedback_result TO unavailable_feedback_result"
        )
    try:
        response = analyze(client)
        assert response.status_code == 200
        job = status_of(connection, response.json()["result_id"])
        assert job["status"] == "failed"
        with connection.cursor() as cursor:
            cursor.execute("SELECT unavailable_feedback_result FROM slides_feedback_result")
            assert cursor.fetchone()["unavailable_feedback_result"] is None
        assert "unavailable_feedback_result" not in str(job)
    finally:
        with connection.cursor() as cursor:
            cursor.execute(
                "ALTER TABLE slides_feedback_result RENAME COLUMN unavailable_feedback_result TO feedback_result"
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
    assert count_payloads(connection) == 0


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


def test_file_upload_is_linked_to_feedback_and_only_owner_can_download(
    client, connection, stored_files, monkeypatch
):
    user = login(client)
    body = b"complete synthetic presentation bytes"
    analyzed = []

    def analyze_material(**kwargs):
        analyzed.append(kwargs["input_file"].read())
        assert list(stored_files.values()) == [body]
        return copy.deepcopy(RESULT)

    monkeypatch.setattr(upload, "generate_material_feedback", analyze_material)
    original = client.post(
        "/upload/?title=S3 flow&perpose=Testing",
        files={"file": ("deck.pdf", body, "application/pdf")},
    ).json()
    saved = client.get(f"/feedback/{original['result_id']}").json()
    assert analyzed == [body]
    assert saved["file_storage_status"] == "saved"
    assert saved["file_size"] == len(body)
    assert saved["file_name"] == "deck.pdf"
    assert saved["file_content_type"] == "application/pdf"
    assert "s3_key" not in saved
    file_id = saved["saved_file_id"]
    with connection.cursor() as cursor:
        cursor.execute("SELECT input_file_id, user_id, feedback_result FROM slides_feedback_result WHERE slides_result_id=%s", (original["result_id"],))
        row = cursor.fetchone()
    assert row["input_file_id"] == file_id and row["user_id"] == user["user_id"]
    assert json.loads(row["feedback_result"]) == RESULT
    downloaded = client.get(f"/files/{file_id}/download")
    assert downloaded.status_code == 200
    assert downloaded.headers["cache-control"] == "no-store"
    assert downloaded.json()["expires_in"] == 300
    client.post("/auth/logout")
    assert client.get(f"/files/{file_id}/download").status_code == 401
    login(client, "other-file-owner@example.com")
    assert client.get(f"/files/{file_id}/download?user_id={user['user_id']}").status_code == 404
    assert client.get(f"/feedback/{original['result_id']}").status_code == 404


def test_s3_failure_keeps_feedback_and_persists_file_failure(client, connection, monkeypatch):
    from botocore.exceptions import ClientError

    login(client)

    def denied():
        raise ClientError({"Error": {"Code": "AccessDenied", "Message": "private AWS detail"}}, "PutObject")

    monkeypatch.setattr(file_storage, "get_s3_client", denied)
    response = client.post(
        "/upload/?title=Storage unavailable&perpose=Testing",
        files={"file": ("deck.pdf", b"synthetic", "application/pdf")},
    )
    saved = client.get(f"/feedback/{response.json()['result_id']}").json()
    assert saved["status"] == "completed" and saved["score"] == RESULT["score"]
    assert saved["file_storage_status"] == "failed"
    assert "원본" in saved["file_storage_message"]
    assert "private AWS detail" not in str(saved)
    assert "saved_file_id" not in saved
    assert count(connection, "input_files") == 0


def test_guest_file_and_mock_file_are_not_uploaded(client, connection, stored_files, monkeypatch):
    file = {"file": ("guest.pdf", b"synthetic", "application/pdf")}
    guest = client.post("/upload/?title=Guest&perpose=Testing", files=file)
    assert guest.status_code == 200 and guest.json()["storage_status"] == "guest"
    login(client)
    monkeypatch.setattr(mock_common.time, "sleep", lambda seconds: None)
    mock = client.post("/mock/upload/?title=Mock&perpose=Testing", files=file)
    assert mock.status_code == 200
    assert not stored_files
    assert count(connection, "input_files") == count(connection, "slides_feedback_result") == 0


@pytest.mark.parametrize("filename,body,status", [
    ("empty.pdf", b"", 400), ("bad.exe", b"data", 400), ("large.pdf", b"12345", 413),
])
def test_invalid_files_are_rejected_before_analysis_or_storage(
    client, connection, stored_files, monkeypatch, filename, body, status
):
    login(client)
    monkeypatch.setattr(file_storage, "MAX_FILE_BYTES", 4)

    def forbidden(**kwargs):
        raise AssertionError("invalid files must not run analysis")

    monkeypatch.setattr(upload, "generate_material_feedback", forbidden)
    response = client.post(
        "/upload/?title=Invalid&perpose=Testing", files={"file": (filename, body)},
    )
    assert response.status_code == status
    assert not stored_files
    assert count(connection, "slides_feedback_result") == 0


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
