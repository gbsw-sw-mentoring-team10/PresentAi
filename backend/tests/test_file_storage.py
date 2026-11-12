from io import BytesIO
from types import SimpleNamespace

import boto3
import pymysql
import pytest
from botocore.exceptions import ClientError
from botocore.response import StreamingBody
from botocore.stub import ANY, Stubber
from fastapi import HTTPException, UploadFile

import config
from scripts.check_s3_connection import check_connection
from services import file_storage

USER = SimpleNamespace(user_id=12)


class Database:
    lastrowid = 37
    rowcount = 1

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


def test_file_metadata_and_feedback_link_are_committed_together(monkeypatch, s3):
    db = Database()
    monkeypatch.setattr(file_storage, "find_session_user", lambda *args, **kwargs: USER)
    expect_upload(s3)
    assert file_storage.save_material(db, "session", 12, material(), result_id=88) == 37
    assert db.queries[1][1] == (37, 88, 12)
    assert db.commits == 1


def test_invalid_feedback_link_rolls_back_metadata_and_removes_object(monkeypatch, s3):
    db = Database()
    db.rowcount = 0
    monkeypatch.setattr(file_storage, "find_session_user", lambda *args, **kwargs: USER)
    expect_upload(s3)
    s3.add_response("delete_object", {}, {"Bucket": config.S3_BUCKET_NAME, "Key": ANY})
    with pytest.raises(HTTPException) as error:
        file_storage.save_material(db, "session", 12, material(), result_id=88)
    assert error.value.status_code == 409
    assert db.commits == 0 and db.rollbacks == 2


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


def stored_pdf_row(**changes):
    return {"file_id": 37, "file_name": "발표.pdf", "s3_key": "presentai/users/12/a.pdf", "content_type": "application/pdf", **changes}


def test_pdf_content_is_streamed_from_s3_for_the_owner(s3):
    body = b"%PDF-1.4 synthetic"
    s3.add_response(
        "get_object",
        {"Body": StreamingBody(BytesIO(body), len(body)), "ContentLength": len(body)},
        {"Bucket": config.S3_BUCKET_NAME, "Key": "presentai/users/12/a.pdf"},
    )
    db = Database(row=stored_pdf_row())
    result = file_storage.material_content(db, 12, 37)
    assert result["body"].read() == body and result["length"] == len(body)
    assert db.queries[0][1] == (37, 12)  # 내 파일만 조회한다


@pytest.mark.parametrize("row", [None, stored_pdf_row(s3_key="presentai/users/99/a.pdf")])
def test_pdf_content_hides_other_users_and_missing_files(row, monkeypatch):
    monkeypatch.setattr(file_storage, "get_s3_client", lambda: pytest.fail("S3를 부르면 안 된다"))
    with pytest.raises(HTTPException) as exc:
        file_storage.material_content(Database(row=row), 12, 37)
    assert exc.value.status_code == 404


def test_only_pdf_originals_are_served_inline(monkeypatch):
    monkeypatch.setattr(file_storage, "get_s3_client", lambda: pytest.fail("S3를 부르면 안 된다"))
    with pytest.raises(HTTPException) as exc:
        file_storage.material_content(Database(row=stored_pdf_row(content_type="text/html")), 12, 37)
    assert exc.value.status_code == 415


def test_a_file_missing_in_s3_is_reported_as_not_found(s3):
    s3.add_client_error("get_object", service_error_code="NoSuchKey")
    with pytest.raises(HTTPException) as exc:
        file_storage.material_content(Database(row=stored_pdf_row()), 12, 37)
    assert exc.value.status_code == 404
