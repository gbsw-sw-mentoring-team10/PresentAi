from io import BytesIO
from types import SimpleNamespace

import boto3
import pymysql
import pytest
from botocore.exceptions import ClientError
from botocore.response import StreamingBody
from botocore.stub import ANY, Stubber
from fastapi import HTTPException, UploadFile
from fastapi.testclient import TestClient

import config
from main import app
from routers import upload
from scripts.check_s3_connection import check_connection
from services import file_storage

USER = SimpleNamespace(user_id=12)
RESULT = {"score": 80, "feedback": "분석 완료", "strengths": [], "improvements": []}


class Database:
    lastrowid = 37

    def __init__(self, *, row=None, fail_commit=False):
        self.row = row
        self.fail_commit = fail_commit
        self.commits = 0
        self.rollbacks = 0
        self.queries = []

    def cursor(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def execute(self, sql, params):
        self.queries.append((sql, params))

    def fetchone(self):
        return self.row

    def commit(self):
        if self.fail_commit:
            raise pymysql.OperationalError(2006, "synthetic DB failure")
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1


@pytest.fixture
def s3(monkeypatch):
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    client = boto3.client("s3", region_name="ap-southeast-2", aws_access_key_id="test", aws_secret_access_key="test")
    monkeypatch.setattr(config, "S3_BUCKET_NAME", "gbsw10presentai-storage")
    monkeypatch.setattr(file_storage, "get_s3_client", lambda: client)
    with Stubber(client) as stub:
        yield stub
        stub.assert_no_pending_responses()


def material():
    return UploadFile(filename="../발표.pdf", file=BytesIO(b"synthetic PDF bytes"))


def expect_upload(s3):
    s3.add_response("put_object", {}, {"Bucket": config.S3_BUCKET_NAME, "Key": ANY, "Body": b"synthetic PDF bytes", "ContentType": "application/pdf"})


def test_saved_original_is_complete_after_model_consumes_stream(monkeypatch, s3):
    db = Database()
    source = material()
    source.file.read()
    position = source.file.tell()
    monkeypatch.setattr(file_storage, "find_session_user", lambda *args, **kwargs: USER)
    expect_upload(s3)
    assert file_storage.save_material(db, "session", 12, source) == 37
    assert source.file.tell() == position
    params = db.queries[0][1]
    assert params[0:2] == (12, "발표.pdf")
    assert params[2].startswith("presentai/users/12/")
    assert params[3:] == (len(b"synthetic PDF bytes"), "application/pdf")
    assert db.commits == 1


@pytest.mark.parametrize("failure", ["database", "revoked-session"])
def test_partial_save_removes_object_when_database_or_session_fails(monkeypatch, s3, failure):
    db = Database(fail_commit=failure == "database")
    users = iter([USER, None if failure == "revoked-session" else USER])
    monkeypatch.setattr(file_storage, "find_session_user", lambda *args, **kwargs: next(users))
    expect_upload(s3)
    s3.add_response("delete_object", {}, {"Bucket": config.S3_BUCKET_NAME, "Key": ANY})
    with pytest.raises(pymysql.OperationalError if failure == "database" else HTTPException):
        file_storage.save_material(db, "session", 12, material())
    assert db.rollbacks == 2


@pytest.mark.parametrize("row", [None, {"file_id": 37, "file_name": "presentation.pdf", "s3_key": "presentai/users/999/private.pdf"}])
def test_download_does_not_sign_a_missing_or_other_owner_file(monkeypatch, row):
    def forbidden():
        raise AssertionError("unauthorized files must not reach S3")
    monkeypatch.setattr(file_storage, "get_s3_client", forbidden)
    db = Database(row=row)
    with pytest.raises(HTTPException) as exc:
        file_storage.material_download(db, 12, 37)
    assert exc.value.status_code == 404
    assert db.queries[0][1] == (37, 12)


def test_authorized_download_expires_and_forces_attachment(monkeypatch):
    calls = []
    client = SimpleNamespace(generate_presigned_url=lambda *args, **kwargs: calls.append((args, kwargs)) or "https://synthetic.example/download")
    monkeypatch.setattr(file_storage, "get_s3_client", lambda: client)
    db = Database(row={"file_id": 37, "file_name": "발표\r\n자료.html", "s3_key": "presentai/users/12/synthetic.html"})
    result = file_storage.material_download(db, 12, 37)
    assert result["expires_in"] == 300
    assert calls[0][1]["ExpiresIn"] == 300
    disposition = calls[0][1]["Params"]["ResponseContentDisposition"]
    assert disposition.startswith("attachment;")
    assert "\r" not in disposition and "\n" not in disposition


@pytest.fixture
def analysis(monkeypatch):
    db = Database()
    app.dependency_overrides[upload.get_feedback_db] = lambda: db
    app.dependency_overrides[upload.get_feedback_user] = lambda: USER
    monkeypatch.setattr(upload, "save_feedback", lambda *args: 91)
    def analyze(**kwargs):
        kwargs["input_file"].read()
        return RESULT
    monkeypatch.setattr(upload, "generate_material_feedback", analyze)
    monkeypatch.setattr(file_storage, "find_session_user", lambda *args, **kwargs: USER)
    with TestClient(app) as client:
        client.cookies.set(config.AUTH_COOKIE_NAME, "session")
        yield client
    app.dependency_overrides.clear()


def analyze_file(client):
    return client.post("/upload/?title=테스트&perpose=교육", files={"file": ("presentation.pdf", b"synthetic PDF bytes", "application/pdf")})


def test_analysis_and_original_are_saved_for_session_owner(analysis, s3):
    expect_upload(s3)
    response = analyze_file(analysis)
    assert response.status_code == 200
    assert response.json()["saved_result_id"] == 91
    assert response.json()["saved_file_id"] == 37
    assert response.json()["file_storage_status"] == "saved"


def test_s3_failure_keeps_successful_model_and_database_result(analysis, s3):
    s3.add_client_error("put_object", service_error_code="AccessDenied", service_message="synthetic private error")
    response = analyze_file(analysis)
    assert response.status_code == 200
    body = response.json()
    assert body["feedback"] == RESULT["feedback"]
    assert body["storage_status"] == "saved"
    assert body["file_storage_status"] == "failed"
    assert body["saved_file_id"] is None
    assert "synthetic private error" not in response.text


def test_guest_does_not_upload_to_s3(analysis, monkeypatch):
    app.dependency_overrides[upload.get_feedback_user] = lambda: None
    def forbidden(*args):
        raise AssertionError("guests must not store originals")
    monkeypatch.setattr(upload, "save_material", forbidden)
    response = analyze_file(analysis)
    assert response.status_code == 200
    assert response.json()["file_storage_status"] == "guest"


def test_oversized_file_is_rejected_before_analysis(analysis, monkeypatch):
    monkeypatch.setattr(file_storage, "MAX_FILE_BYTES", 2)
    def forbidden(**kwargs):
        raise AssertionError("oversized files must not reach AI")
    monkeypatch.setattr(upload, "generate_material_feedback", forbidden)
    assert analyze_file(analysis).status_code == 413


def test_connection_probe_removes_its_object_even_if_read_fails(s3):
    s3.add_response("put_object", {})
    s3.add_client_error("get_object", service_error_code="AccessDenied")
    s3.add_response("delete_object", {})
    with pytest.raises(ClientError):
        check_connection(s3.client, config.S3_BUCKET_NAME)


def test_connection_probe_uploads_reads_and_deletes(s3):
    body = b"PresentAi S3 connection check\n"
    s3.add_response("put_object", {})
    s3.add_response("get_object", {"Body": StreamingBody(BytesIO(body), len(body))})
    s3.add_response("delete_object", {})
    check_connection(s3.client, config.S3_BUCKET_NAME)
