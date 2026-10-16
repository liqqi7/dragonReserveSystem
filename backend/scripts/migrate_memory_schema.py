"""Add only memory tables to a shared test database; dry-run by default.

This intentionally does NOT run the boardgame/optimization migration branches or
update alembic_version. The regular memory revision validates and adopts these
same tables when the collaborating branches are eventually migrated together.
This is additive provisioning, not an upgrade to the main Alembic head; resolve
unrelated migration branches with their owners before a full upgrade.
Run with APP_ENV=test and --expected-database dragon_reserve_test; back up first.
"""
from __future__ import annotations

import argparse
import importlib.util
from pathlib import Path
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings


def memory_revision():
    path = Path(__file__).resolve().parents[1] / "alembic/versions/20261011_0024_memories.py"
    spec = importlib.util.spec_from_file_location("memory_schema_revision", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def migrate(expected_database: str, *, apply: bool = False):
    settings = get_settings()
    url = make_url(settings.database_url)
    if (settings.environment != "test" or url.get_backend_name() != "mysql" or
            url.database != expected_database or not expected_database.endswith("_test")):
        raise RuntimeError("Refusing migration: APP_ENV=test and the explicitly named MySQL test database are required")
    engine = create_engine(url, pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            actual = connection.scalar(text("SELECT DATABASE()"))
            if actual != expected_database:
                raise RuntimeError("Connected database does not match --expected-database")
            lock_name = f"{actual}.memory_schema"
            acquired = connection.scalar(text("SELECT GET_LOCK(:name, 10)"), {"name": lock_name})
            if acquired != 1:
                raise RuntimeError("Another memory schema migration holds the advisory lock")
            try:
                versions = tuple(connection.scalars(text("SELECT version_num FROM alembic_version ORDER BY version_num")))
                missing = memory_revision().ensure_schema(connection, apply=apply)
                if tuple(connection.scalars(text("SELECT version_num FROM alembic_version ORDER BY version_num"))) != versions:
                    raise RuntimeError("Unexpected change to the main Alembic version")
                if apply:
                    connection.commit()
                else:
                    connection.rollback()
                return {"database": actual, "applied": apply, "created_tables" if apply else "missing_tables": missing,
                        "main_alembic_versions_unchanged": list(versions)}
            finally:
                connection.execute(text("SELECT RELEASE_LOCK(:name)"), {"name": lock_name})
    finally:
        engine.dispose()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--expected-database", required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    print(migrate(args.expected_database, apply=args.apply))


if __name__ == "__main__":
    main()
