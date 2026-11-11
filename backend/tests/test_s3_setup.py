import sys
from types import SimpleNamespace

from scripts import check_s3_connection


def test_setup_reports_wrong_account_before_attempting_bucket_upload(monkeypatch, capsys):
    monkeypatch.setattr(
        sys,
        "argv",
        ["check_s3_connection", "--write-test", "--expected-account-id", "527137869907"],
    )
    identity = SimpleNamespace(
        get_caller_identity=lambda: {"Account": "111111111111"}
    )
    monkeypatch.setattr(
        check_s3_connection,
        "boto3",
        SimpleNamespace(Session=lambda: SimpleNamespace(client=lambda *args, **kwargs: identity)),
        raising=False,
    )

    def forbidden():
        raise AssertionError("wrong-account setup must not attempt an S3 upload")

    monkeypatch.setattr(check_s3_connection, "get_s3_client", forbidden)
    assert check_s3_connection.main() == 1
    message = capsys.readouterr().out
    assert "527137869907" in message
    assert "로그인 계정" in message
    assert "111111111111" not in message
