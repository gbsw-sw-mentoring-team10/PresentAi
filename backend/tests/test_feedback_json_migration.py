import copy
import json
import stat
import sys
from datetime import datetime

import pytest

from scripts import migrate_feedback_json as migration
from scripts.migrate_feedback_json import (
    build_payloads,
    validate_existing,
    verify_payloads,
    write_backup,
)


@pytest.fixture
def legacy():
    return {
        "slides_feedback_result": [{"slides_result_id": 10, "status": "pending"}],
        "entire_result": [{
            "slices_result_id": 10, "score": 85, "feedback": "한글 평가\n줄바꿈",
            "strengths": '["명확한 주제"]', "revised_script": "수정 대본",
        }],
        "entire_improvements": [
            {"slides_result_id": 10, "entire_improvements_id": 2, "issue": "두 번째", "deduction": 5, "solution": "둘째 해결"},
            {"slides_result_id": 10, "entire_improvements_id": 1, "issue": "첫 번째", "deduction": 10, "solution": "첫째 해결"},
        ],
        "slide_feedback": [{
            "slides_result_id": 10, "slide_number": number, "summary": f"{number}장",
            "good_points": '["가독성"]',
            "issues": '[{"problem":"글씨","solution":"확대"}]',
            "script_connection": "대본과 연결", "problem": None, "solution": None,
        } for number in (3, 1)],
    }


def test_migration_reconstructs_ordered_json_without_nested_json_strings(legacy):
    payload = build_payloads(legacy)[10]
    assert payload["feedback"] == "한글 평가\n줄바꿈"
    assert payload["strengths"] == ["명확한 주제"]
    assert [item["issue"] for item in payload["improvements"]] == ["첫 번째", "두 번째"]
    assert [slide["slide_number"] for slide in payload["slides"]] == [1, 3]
    assert payload["slides"][0]["issues"] == [{"problem": "글씨", "solution": "확대"}]
    assert json.loads(json.dumps(payload, ensure_ascii=False)) == payload


def test_migration_preserves_old_problem_solution_columns(legacy):
    row = legacy["slide_feedback"][0]
    row.update(issues=None, good_points=None, problem="누락된 근거", solution="출처 추가")
    slide = build_payloads(legacy)[10]["slides"][1]
    assert slide["good_points"] == []
    assert slide["issues"] == [{"problem": "누락된 근거", "solution": "출처 추가"}]


@pytest.mark.parametrize("table", ["entire_improvements", "slide_feedback"])
def test_migration_refuses_to_discard_orphan_feedback(legacy, table):
    legacy[table][0]["slides_result_id"] = 999
    with pytest.raises(ValueError, match="이관을 중단"):
        build_payloads(legacy)


def test_migration_refuses_to_overwrite_different_existing_json(legacy):
    payloads = build_payloads(legacy)
    parent = legacy["slides_feedback_result"][0]
    parent["feedback_result"] = json.dumps({**payloads[10], "score": 99})
    with pytest.raises(ValueError, match="결과가 달라"):
        validate_existing(legacy["slides_feedback_result"], payloads)


def test_migration_waits_for_active_jobs_and_allows_failed_null_results():
    with pytest.raises(ValueError, match="처리 중"):
        validate_existing([{"slides_result_id": 1, "status": "processing"}], {})
    validate_existing([{"slides_result_id": 1, "status": "failed", "feedback_result": None}], {})


@pytest.mark.parametrize("corruption", ["missing_row", "missing_json", "changed_json"])
def test_migration_verification_detects_loss_before_legacy_tables_are_dropped(legacy, corruption):
    expected = build_payloads(legacy)
    rows = [{"slides_result_id": 10, "feedback_result": json.dumps(expected[10])}]
    verify_payloads(rows, expected, 1)
    if corruption == "missing_row":
        rows.clear()
    elif corruption == "missing_json":
        rows[0]["feedback_result"] = None
    else:
        changed = copy.deepcopy(expected[10])
        changed["slides"].clear()
        rows[0]["feedback_result"] = json.dumps(changed)
    with pytest.raises(ValueError):
        verify_payloads(rows, expected, 1)


def test_migration_backup_preserves_schema_data_and_private_permissions(tmp_path):
    tables = {"slides_feedback_result": {
        "create_sql": "CREATE TABLE slides_feedback_result (...)" ,
        "rows": [{"created_at": datetime(2026, 1, 1), "title": "보존할 발표"}],
    }}
    backup = write_backup(tables, tmp_path)
    saved = json.loads(backup.read_text())
    assert saved["slides_feedback_result"]["rows"][0]["title"] == "보존할 발표"
    assert saved["slides_feedback_result"]["rows"][0]["created_at"] == "2026-01-01T00:00:00"
    assert stat.S_IMODE(backup.stat().st_mode) == 0o600
    assert stat.S_IMODE(backup.parent.stat().st_mode) == 0o700


class MigrationDatabase:
    def __init__(self, parents, *, corrupt_write=False):
        self.parents = copy.deepcopy(parents)
        self.corrupt_write = corrupt_write
        self.queries = []
        self.rollbacks = 0

    def cursor(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def execute(self, sql, params=None):
        self.queries.append(sql)
        if sql.startswith("UPDATE slides_feedback_result SET feedback_result=") and not self.corrupt_write:
            payload, result_id = params
            for row in self.parents:
                if row["slides_result_id"] == result_id:
                    row["feedback_result"] = payload

    def fetchall(self):
        return self.parents

    def rollback(self):
        self.rollbacks += 1

    def commit(self):
        pass


@pytest.fixture
def migration_run(legacy, monkeypatch):
    tables = {name: {"create_sql": f"CREATE TABLE {name} (...) ", "rows": rows} for name, rows in legacy.items()}
    monkeypatch.setattr(migration, "_structure", lambda connection: (set(migration.TABLES), {"Type": "json", "Null": "YES"}))
    monkeypatch.setattr(migration, "snapshot", lambda *args: tables)
    return tables


def test_copy_phase_never_drops_legacy_tables_by_default(migration_run, tmp_path):
    db = MigrationDatabase(migration_run["slides_feedback_result"]["rows"])
    report = migration.migrate(db, tmp_path)
    assert report["legacy_dropped"] is False
    assert report["migrated"] == 1
    assert not any(sql.startswith("DROP TABLE") for sql in db.queries)
    assert json.loads(db.parents[0]["feedback_result"])["score"] == 85


def test_delete_phase_requires_explicit_drop_flag(migration_run, tmp_path):
    db = MigrationDatabase(migration_run["slides_feedback_result"]["rows"])
    report = migration.migrate(db, tmp_path, drop_legacy=True)
    assert report["legacy_dropped"] is True
    drops = [sql for sql in db.queries if sql.startswith("DROP TABLE")]
    assert drops == ["DROP TABLE entire_improvements, slide_feedback, entire_result;"]
    assert db.queries.index(drops[0]) > next(i for i, sql in enumerate(db.queries) if sql.startswith("SELECT slides_result_id, feedback_result"))


def test_failed_copy_never_reaches_drop_even_when_requested(migration_run, tmp_path):
    db = MigrationDatabase(migration_run["slides_feedback_result"]["rows"], corrupt_write=True)
    with pytest.raises(ValueError, match="검증에 실패"):
        migration.migrate(db, tmp_path, drop_legacy=True)
    assert not any(sql.startswith("DROP TABLE") for sql in db.queries)
    assert db.rollbacks >= 1
    assert list(tmp_path.glob("*/feedback-tables.json"))


def test_drop_cli_flag_cannot_run_without_apply(monkeypatch):
    monkeypatch.setattr(sys, "argv", ["migrate_feedback_json", "--drop-legacy"])
    def forbidden():
        raise AssertionError("invalid migration flags must not access the database")
    monkeypatch.setattr(migration, "get_connection", forbidden)
    with pytest.raises(SystemExit) as exc:
        migration.main()
    assert exc.value.code == 2
