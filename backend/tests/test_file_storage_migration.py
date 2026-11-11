import pytest

from scripts.init_file_storage import COLUMNS, prepare_file_storage


class Schema:
    def __init__(self, columns):
        self.columns = columns
        self.changes = []

    def cursor(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def execute(self, sql):
        if sql.startswith("SHOW"):
            return
        self.changes.append(sql)
        self.columns |= COLUMNS

    def fetchall(self):
        return [{"Field": name} for name in self.columns]

    def commit(self):
        pass


def test_default_is_read_only_and_repeated_apply_does_not_change_data():
    db = Schema({"feedback_result", "slides_result_id"})
    prepare_file_storage(db)
    assert not db.changes
    prepare_file_storage(db, apply=True)
    prepare_file_storage(db, apply=True)
    assert len(db.changes) == 1
    assert "ADD COLUMN" in db.changes[0]
    assert "DROP " not in db.changes[0] and "DELETE FROM" not in db.changes[0]


def test_incompatible_schema_is_not_modified():
    for columns in ({"slides_result_id"}, {"feedback_result", "input_file_id"}):
        db = Schema(columns)
        with pytest.raises(ValueError):
            prepare_file_storage(db, apply=True)
        assert not db.changes
