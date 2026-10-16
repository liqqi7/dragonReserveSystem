"""Add private memory submissions and a transactional capacity ledger."""

from alembic import op
from sqlalchemy import (BigInteger, Column, DateTime, Float, ForeignKey, Index, Integer,
                        JSON, MetaData, String, Table, UniqueConstraint, func, inspect, select)

revision = "20261011_0024"
down_revision = "20261010_0023"
branch_labels = None
depends_on = None


MEMORY_TABLES = ("memories", "memory_media", "memory_audit_logs", "memory_capacity")


def define_tables():
    metadata = MetaData()
    # Reference-only stubs: these tables are never created or altered here.
    for name in ("users", "activities"):
        Table(name, metadata, Column("id", Integer, primary_key=True))
    memories = Table("memories", metadata, Column("id", Integer, primary_key=True),
        Column("user_id", Integer, ForeignKey("users.id"), nullable=False),
        Column("activity_id", Integer, ForeignKey("activities.id", ondelete="SET NULL")),
        Column("activity_name", String(128), nullable=False),
        Column("location_name", String(128), nullable=False), Column("caption", String(50), nullable=False),
        Column("author_nickname", String(64), nullable=False), Column("status", String(24), nullable=False),
        Column("client_submission_id", String(64), nullable=False), Column("revision", Integer, nullable=False),
        Column("expires_at", DateTime, nullable=False), Column("published_at", DateTime),
        Column("created_at", DateTime, nullable=False),
        UniqueConstraint("user_id", "client_submission_id", name="uq_memory_submission"))
    Index("ix_memories_user_id", memories.c.user_id)
    Index("ix_memories_public", memories.c.status, memories.c.published_at, memories.c.id)
    Index("ix_memories_review", memories.c.status, memories.c.created_at, memories.c.id)
    media = Table("memory_media", metadata, Column("id", Integer, primary_key=True),
        Column("memory_id", Integer, ForeignKey("memories.id"), nullable=False),
        Column("sort", Integer, nullable=False), Column("kind", String(8), nullable=False),
        Column("declared_bytes", BigInteger, nullable=False), Column("original_bytes", BigInteger, nullable=False),
        Column("reserved_bytes", BigInteger, nullable=False), Column("original_key", String(255), nullable=False),
        Column("display_key", String(255), nullable=False), Column("thumbnail_key", String(255), nullable=False),
        Column("digest", String(64), nullable=False), Column("width", Integer, nullable=False),
        Column("height", Integer, nullable=False), Column("duration", Float, nullable=False),
        Column("state", String(24), nullable=False), Column("publication_status", String(24), nullable=False),
        Column("lease_until", DateTime), Column("attempts", Integer, nullable=False),
        UniqueConstraint("memory_id", "sort", name="uq_memory_slot"))
    Index("ix_memory_media_memory_id", media.c.memory_id)
    audit_logs = Table("memory_audit_logs", metadata, Column("id", Integer, primary_key=True),
        Column("memory_id", Integer, ForeignKey("memories.id"), nullable=False),
        Column("actor_id", Integer, ForeignKey("users.id")), Column("action", String(32), nullable=False),
        Column("media_ids", JSON, nullable=False), Column("revision", Integer, nullable=False),
        Column("created_at", DateTime, nullable=False))
    Index("ix_memory_audit_logs_memory_id", audit_logs.c.memory_id)
    Table("memory_capacity", metadata, Column("id", Integer, primary_key=True),
                            Column("reserved_bytes", BigInteger, nullable=False))
    return {name: metadata.tables[name] for name in MEMORY_TABLES}


def _type_signature(column_type, dialect):
    # Ignore the database's inherited string collation, not size/precision.
    return column_type.compile(dialect=dialect).split(" COLLATE ")[0].upper()


def validate_existing(connection, tables):
    """Fail before DDL on incompatible tables; never silently skip a collision."""
    inspector = inspect(connection)
    existing = set(inspector.get_table_names())
    if not {"users", "activities"} <= existing:
        raise RuntimeError("Memory schema requires existing users and activities tables")
    for name, table in tables.items():
        if name not in existing:
            continue
        actual = {column["name"]: column for column in inspector.get_columns(name)}
        expected = {column.name: column for column in table.columns}
        if actual.keys() != expected.keys():
            raise RuntimeError(f"Incompatible memory table {name}: column set differs")
        for column_name, column in expected.items():
            found = actual[column_name]
            if (found["nullable"] != column.nullable or
                    _type_signature(found["type"], connection.dialect) !=
                    _type_signature(column.type, connection.dialect)):
                raise RuntimeError(f"Incompatible memory column {name}.{column_name}")
        primary = inspector.get_pk_constraint(name)["constrained_columns"]
        if primary != [column.name for column in table.primary_key.columns]:
            raise RuntimeError(f"Incompatible memory primary key {name}")
        unique = {tuple(item["column_names"]) for item in inspector.get_unique_constraints(name)}
        for constraint in table.constraints:
            if isinstance(constraint, UniqueConstraint) and tuple(c.name for c in constraint.columns) not in unique:
                raise RuntimeError(f"Missing memory unique constraint {name}.{constraint.name}")
        indexes = {(tuple(item["column_names"]), bool(item["unique"]))
                   for item in inspector.get_indexes(name)}
        for index in table.indexes:
            if (tuple(c.name for c in index.columns), bool(index.unique)) not in indexes:
                raise RuntimeError(f"Missing memory index {name}.{index.name}")
        foreign_keys = {(tuple(item["constrained_columns"]), item["referred_table"],
                         tuple(item["referred_columns"]), item.get("options", {}).get("ondelete"))
                        for item in inspector.get_foreign_keys(name)}
        for constraint in table.foreign_key_constraints:
            signature = (tuple(c.name for c in constraint.columns), constraint.referred_table.name,
                         tuple(element.column.name for element in constraint.elements), constraint.ondelete)
            if signature not in foreign_keys:
                raise RuntimeError(f"Missing memory foreign key {name}")
    return existing


def ensure_schema(connection, *, apply=True):
    """Create only memory tables. The main Alembic version is deliberately untouched.

    This also lets the regular revision adopt an independently provisioned schema
    after checking all columns, constraints and indexes, without losing submissions.
    """
    tables = define_tables()
    existing = validate_existing(connection, tables)
    ledger = tables["memory_capacity"]
    capacity = (connection.execute(select(ledger.c.reserved_bytes).where(ledger.c.id == 1)).scalar_one_or_none()
                if "memory_capacity" in existing else None)
    if capacity is None and "memory_media" in existing:
        media = tables["memory_media"]
        # Do not initialize an empty ledger over already submitted media.
        if connection.scalar(select(func.count()).select_from(media)):
            raise RuntimeError("Existing memory media require an intact capacity ledger")
    if capacity is not None and capacity < 0:
        raise RuntimeError("Memory capacity ledger must not be negative")
    missing = [table for table in ledger.metadata.sorted_tables
               if table.name in tables and table.name not in existing]
    if apply:
        for table in missing:
            table.create(connection)
        if capacity is None:
            connection.execute(ledger.insert().values(id=1, reserved_bytes=0))
        validate_existing(connection, tables)
    return [table.name for table in missing]


def upgrade():
    ensure_schema(op.get_bind())


def downgrade():
    raise RuntimeError("Memory rollback must preserve submissions; restore compatible code without dropping memory tables")
