from contextlib import nullcontext

import pymysql
import pytest
from fastapi.testclient import TestClient

import database
from main import app


class SchemaConnection:
    def __init__(self, *, missing_column=False):
        self.missing_column = missing_column

    def cursor(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def execute(self, sql):
        if self.missing_column:
            raise pymysql.ProgrammingError(1054, "private schema details")

    def fetchall(self):
        raise AssertionError("health must not read user feedback")


def test_health_confirms_json_schema_and_deployed_revision_without_reading_feedback(monkeypatch):
    monkeypatch.setattr(database, "get_connection", lambda: nullcontext(SchemaConnection()))
    monkeypatch.setenv("RENDER_GIT_COMMIT", "synthetic-revision")
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json() == {"status": "ok", "feedback_storage": "json", "revision": "synthetic-revision"}


@pytest.mark.parametrize("failure", ["connection", "schema"])
def test_health_reports_unavailable_without_exposing_database_details(monkeypatch, failure):
    def connect():
        if failure == "connection":
            raise pymysql.OperationalError(2003, "private connection details")
        return nullcontext(SchemaConnection(missing_column=True))
    monkeypatch.setattr(database, "get_connection", connect)
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/health")
    assert response.status_code == 503
    assert "private" not in response.text
