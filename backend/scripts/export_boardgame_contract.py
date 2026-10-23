#!/usr/bin/env python3
"""Export read-only schema and HTTP references from the current application code.

No database connection, schema mutation, source fetch, or user data is involved.
"""
from pathlib import Path
import json
import sys

from sqlalchemy.dialects.mysql import dialect
from sqlalchemy.schema import CreateTable, CreateIndex
from sqlalchemy.sql.elements import quoted_name

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.core.database import Base
from app import models
from app.main import app


def main():
    destination = ROOT / 'design/boardgame-library'
    tables = [t for t in Base.metadata.sorted_tables if t.name == 'boardgames'
              or t.name.startswith(('boardgame_', 'activity_game_'))]
    assert len(tables) == 34
    mysql = dialect()
    for table in Base.metadata.tables.values():
        table.name = quoted_name(str(table.name), True)
        for column in table.columns:
            column.name = quoted_name(str(column.name), True)
        for constraint in table.constraints:
            if constraint.name:
                constraint.name = quoted_name(str(constraint.name), True)
        for index in table.indexes:
            index.name = quoted_name(str(index.name), True)
    statements = ['-- v3.3 generated reference: 34 domain tables. Apply Alembic 0013 + 0014 + 0015 for deployment.',
                  '-- Requires existing users and activities tables. Values and times are assigned by services.', '']
    for table in tables:
        statements.append(str(CreateTable(table).compile(dialect=mysql)).strip()+';')
        for index in sorted(table.indexes, key=lambda i: str(i.name)):
            statements.append(str(CreateIndex(index).compile(dialect=mysql)).strip()+';')
        statements.append('')
    ddl = '\n'.join(line.rstrip() for line in '\n'.join(statements).splitlines()).rstrip()+'\n'
    (destination/'database-schema.sql').write_text(ddl)
    columns = ['# v3.3 完整字段快照', '',
        '从当前 ORM 离线生成，包含 34 张领域表。业务语义见 [数据模型](02-data-model.md)；索引、外键与 CHECK 见 [完整 DDL](database-schema.sql)。', '',
        '审计时间、用户、JSON 对象等无服务器默认值的字段由服务赋值；“—”不代表可省略。', '']
    for table in tables:
        columns += [f'## {table.name}', '', '| 字段 | MySQL 类型 | 可空 | 主键 | 服务器默认 |', '| --- | --- | --- | --- | --- |']
        for c in table.columns:
            default = str(c.server_default.arg) if c.server_default else '—'
            columns.append(f'| `{c.name}` | {c.type.compile(dialect=mysql)} | {"是" if c.nullable else "否"} | {"是" if c.primary_key else "—"} | {default} |')
        columns.append('')
    (destination/'database-columns.md').write_text('\n'.join(columns).rstrip()+'\n')
    schema = app.openapi()
    paths = {p: operations for p, operations in schema['paths'].items()
             if '/boardgame' in p or '/game-plan' in p or '/nominations/' in p or p.startswith('/api/v1/bgg')}
    # Keep referenced shared schemas to make this usable in HTTP clients.
    schema.update(info={**schema['info'], 'title':'Dragon board game API', 'version':'3.3'}, paths=paths)
    schema.pop('servers', None)
    (destination/'openapi.json').write_text(json.dumps(schema, ensure_ascii=False, indent=2)+'\n')
    operations = sum(sum(k in ('get','post','put','patch','delete') for k in value) for value in paths.values())
    print(f'Exported {len(tables)} domain tables, {len(paths)} HTTP paths and {operations} operations; no database connection.')


if __name__ == '__main__':
    main()
