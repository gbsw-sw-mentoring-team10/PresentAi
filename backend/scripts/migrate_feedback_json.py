import argparse
import json
import os
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import pymysql
from pydantic import ValidationError
from pymysql.connections import Connection

from config import BASE_DIR, DB_DIR
from database import get_connection
from schemas.feedback import FeedbackPayload

PARENT = "slides_feedback_result"
LEGACY = ("entire_result", "entire_improvements", "slide_feedback")
TABLES = (PARENT, *LEGACY)
MIGRATION = DB_DIR / "migrations" / "005_feedback_result_json.sql"


def _array(value):
    return json.loads(value) if isinstance(value, (str, bytes)) else value


def build_payloads(rows: dict[str, list[dict]]) -> dict[int, dict]:
    parents = {row["slides_result_id"] for row in rows[PARENT]}
    entire = {row["slices_result_id"]: row for row in rows["entire_result"]}
    improvements = defaultdict(list)
    slides = defaultdict(list)
    for row in sorted(rows["entire_improvements"], key=lambda item: item["entire_improvements_id"]):
        result_id = row["slides_result_id"]
        if result_id not in entire:
            raise ValueError("전체 결과가 없는 개선 항목이 있어 이관을 중단합니다.")
        improvements[result_id].append({key: row[key] for key in ("issue", "deduction", "solution")})
    for row in sorted(rows["slide_feedback"], key=lambda item: (item["slides_result_id"], item["slide_number"])):
        result_id = row["slides_result_id"]
        if result_id not in entire:
            raise ValueError("전체 결과가 없는 슬라이드가 있어 이관을 중단합니다.")
        issues = _array(row["issues"] or "[]")
        # 과거 problem/solution 컬럼에만 기록된 피드백도 보존한다.
        legacy_issue = {"problem": row.get("problem") or "", "solution": row.get("solution") or ""}
        if any(legacy_issue.values()) and legacy_issue not in issues:
            issues.append(legacy_issue)
        slides[result_id].append({
            "slide_number": row["slide_number"],
            "summary": row["summary"],
            "good_points": _array(row["good_points"] or "[]"),
            "issues": issues,
            "script_connection": row["script_connection"] or "",
        })
    payloads = {}
    for result_id, row in entire.items():
        if result_id not in parents:
            raise ValueError("소유 발표가 없는 전체 결과가 있어 이관을 중단합니다.")
        payload = FeedbackPayload.model_validate({
            "score": row["score"],
            "feedback": row["feedback"],
            "strengths": _array(row["strengths"]),
            "improvements": improvements[result_id],
            "revised_script": row["revised_script"] or "",
            "slides": slides[result_id],
        })
        payloads[result_id] = payload.model_dump(mode="json")
    return payloads


def validate_existing(parents: list[dict], payloads: dict[int, dict], *, require_quiescent: bool = True) -> None:
    for row in parents:
        result_id = row["slides_result_id"]
        current = _array(row.get("feedback_result"))
        if current is not None and result_id in payloads and current != payloads[result_id]:
            raise ValueError("기존 JSON과 분리 테이블의 결과가 달라 이관을 중단합니다.")
        if require_quiescent and row["status"] in {"pending", "processing"} and result_id not in payloads and current is None:
            raise ValueError("아직 처리 중인 분석이 있습니다. 완료 후 다시 실행하세요.")
        if row["status"] == "completed" and result_id not in payloads and current is None:
            raise ValueError("완료 상태인데 결과가 없는 기록이 있어 이관을 중단합니다.")


def verify_payloads(parents: list[dict], expected: dict[int, dict], parent_count: int) -> None:
    if len(parents) != parent_count:
        raise ValueError("피드백 요청 수가 달라져 테이블 삭제를 중단합니다.")
    actual = {row["slides_result_id"]: _array(row.get("feedback_result")) for row in parents}
    if any(actual.get(result_id) != payload for result_id, payload in expected.items()):
        raise ValueError("JSON 이관 검증에 실패해 기존 테이블을 유지합니다.")


def _structure(connection: Connection):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT TABLE_NAME FROM information_schema.TABLES "
            "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (%s, %s, %s, %s)",
            TABLES,
        )
        present = {row["TABLE_NAME"] for row in cursor.fetchall()}
        if PARENT not in present:
            raise ValueError("slides_feedback_result 테이블을 먼저 준비해 주세요.")
        if present.intersection(LEGACY) and not set(LEGACY).issubset(present):
            raise ValueError("기존 피드백 테이블이 일부만 남아 있어 자동 이관을 중단합니다.")
        cursor.execute("SHOW COLUMNS FROM slides_feedback_result LIKE 'feedback_result'")
        column = cursor.fetchone()
        if column is not None and column["Type"].lower() != "json":
            raise ValueError("feedback_result 컬럼이 JSON 타입인지 확인해 주세요.")
    return present, column


def snapshot(connection: Connection, present: set[str]) -> dict:
    tables = {}
    with connection.cursor() as cursor:
        for table in TABLES:
            if table not in present:
                continue
            cursor.execute(f"SHOW CREATE TABLE `{table}`")
            ddl = cursor.fetchone()["Create Table"]
            cursor.execute(f"SELECT * FROM `{table}`")
            tables[table] = {"create_sql": ddl, "rows": cursor.fetchall()}
    return tables


def write_backup(tables: dict, backup_root: Path) -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    folder = backup_root / f"{stamp}-{uuid4().hex[:8]}"
    folder.mkdir(parents=True, mode=0o700)
    path = folder / "feedback-tables.json"
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as stream:
        json.dump(tables, stream, ensure_ascii=False, indent=2, default=lambda value: value.isoformat())
        stream.flush()
        os.fsync(stream.fileno())
    return path


def migrate(connection: Connection, backup_root: Path, *, drop_legacy: bool = False) -> dict:
    present, column = _structure(connection)
    statements = MIGRATION.read_text(encoding="utf-8")
    add_column = statements.split("-- ADD_COLUMN\n", 1)[1].split("-- DROP_LEGACY", 1)[0].strip()
    drop_statement = statements.split("-- DROP_LEGACY\n", 1)[1].strip()
    connection.rollback()
    with connection.cursor() as cursor:
        if column is None:
            cursor.execute(add_column)
        elif column["Null"] != "YES":
            cursor.execute("ALTER TABLE slides_feedback_result MODIFY COLUMN feedback_result JSON NULL")
    if not present.intersection(LEGACY):
        return {"migrated": 0, "backup": None, "already_migrated": True}
    locked = False
    try:
        with connection.cursor() as cursor:
            cursor.execute("SET autocommit=0")
            cursor.execute("SET SESSION lock_wait_timeout=10")
            cursor.execute("LOCK TABLES " + ", ".join(f"`{table}` WRITE" for table in TABLES))
            locked = True
        tables = snapshot(connection, present)
        backup = write_backup(tables, backup_root)
        rows = {table: item["rows"] for table, item in tables.items()}
        payloads = build_payloads(rows)
        validate_existing(rows[PARENT], payloads, require_quiescent=drop_legacy)
        with connection.cursor() as cursor:
            for result_id, payload in payloads.items():
                cursor.execute(
                    "UPDATE slides_feedback_result SET feedback_result=%s, "
                    "status=CASE WHEN status IN ('pending', 'processing') THEN 'completed' ELSE status END, "
                    "updated_at=updated_at WHERE slides_result_id=%s",
                    (json.dumps(payload, ensure_ascii=False, allow_nan=False), result_id),
                )
            cursor.execute("SELECT slides_result_id, feedback_result FROM slides_feedback_result")
            verify_payloads(cursor.fetchall(), payloads, len(rows[PARENT]))
        connection.commit()
        if drop_legacy:
            with connection.cursor() as cursor:
                cursor.execute(drop_statement)
        return {"migrated": len(payloads), "backup": str(backup), "legacy_dropped": drop_legacy}
    except Exception:
        connection.rollback()
        raise
    finally:
        if locked:
            with connection.cursor() as cursor:
                cursor.execute("UNLOCK TABLES")


def _main():
    parser = argparse.ArgumentParser(description="기존 피드백을 nullable JSON 컬럼으로 통합합니다.")
    parser.add_argument("--apply", action="store_true", help="백업·이관·검증을 수행합니다.")
    parser.add_argument("--drop-legacy", action="store_true", help="새 코드 전환 후 기존 세 테이블까지 삭제합니다.")
    parser.add_argument("--backup-dir", type=Path, default=BASE_DIR.parent / ".git" / "db-backups")
    args = parser.parse_args()
    if args.drop_legacy and not args.apply:
        parser.error("--drop-legacy는 --apply와 함께 사용합니다.")
    with get_connection() as connection:
        if args.apply:
            print(migrate(connection, args.backup_dir, drop_legacy=args.drop_legacy))
        else:
            present, column = _structure(connection)
            tables = snapshot(connection, present)
            rows = {table: item["rows"] for table, item in tables.items()}
            payloads = build_payloads(rows) if present.intersection(LEGACY) else {}
            validate_existing(rows[PARENT], payloads)
            print("테이블별 기록 수:", {name: len(items) for name, items in rows.items()})
            print("JSON 이관 대상:", len(payloads))
            print("feedback_result:", "JSON NULL" if column and column["Null"] == "YES" else "추가/변경 필요")
            print("확인만 수행했습니다. 적용하려면 --apply를 사용하세요.")


def main():
    try:
        _main()
    except (ValidationError, json.JSONDecodeError, TypeError):
        raise SystemExit("기존 피드백 형식을 검증하지 못해 중단했습니다. 기존 테이블은 유지합니다.") from None
    except ValueError as exc:
        raise SystemExit(str(exc)) from None
    except pymysql.MySQLError as exc:
        code = exc.args[0] if exc.args else type(exc).__name__
        raise SystemExit(f"DB 이관 작업에 실패했습니다. 오류 코드: {code}. 백업과 DB 상태를 확인해 주세요.") from None


if __name__ == "__main__":
    main()
