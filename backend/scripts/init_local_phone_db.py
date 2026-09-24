"""Create/check an isolated SQLite schema for local phone integration tests.

This deliberately does not run the MySQL-specific Alembic history or seed fake WeChat identities.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from sqlalchemy import create_engine, inspect

from app.core.database import Base
from app import models  # noqa: F401 - import all mapped tables, including sub-items


def initialize(db_file: Path) -> str:
    db_file = db_file.resolve()
    db_file.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(f"sqlite:///{db_file.as_posix()}")
    try:
        inspector = inspect(engine)
        existing = set(inspector.get_table_names())
        expected = set(Base.metadata.tables)
        if existing:
            missing = expected - existing
            mismatched = {
                name: sorted(set(table.columns.keys()) - {column["name"] for column in inspector.get_columns(name)})
                for name, table in Base.metadata.tables.items()
                if name in existing
            }
            mismatched = {name: columns for name, columns in mismatched.items() if columns}
            if missing or mismatched:
                raise RuntimeError(
                    f"Existing local database schema is outdated/incomplete: missing_tables={sorted(missing)}, "
                    f"missing_columns={mismatched}. Back it up and migrate it explicitly; this script never overwrites it."
                )
            return "existing schema verified"
        Base.metadata.create_all(engine)
        return "new schema created"
    finally:
        engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db-file", type=Path, required=True)
    args = parser.parse_args()
    print(f"{initialize(args.db_file)}: {args.db_file.resolve()}")


if __name__ == "__main__":
    main()
