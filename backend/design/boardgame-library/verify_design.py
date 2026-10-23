#!/usr/bin/env python3
"""Offline contract examples, not application or production database tests.

Run from any directory. Uses only Python's standard library and an in-memory
SQLite database. Optionally validate the lossless node representation on a
previously downloaded public BGG XML file; no network or credentials are read.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from pathlib import Path
from urllib.parse import unquote
import xml.etree.ElementTree as ET

from bgstats_format_probe import verify_cases as verify_bgstats_cases
from bgstats_export_audit import audit_export, verify_modern_cases


ROOT = Path(__file__).resolve().parent
BACKEND = ROOT.parents[1]


def check_documents() -> tuple[int, int]:
    documents = [BACKEND / "boardgame-library-scope.md", BACKEND / "boardgame-library-technical-solution.md",
                 BACKEND / 'README.md', BACKEND / 'boardgame-import-runbook.md',
                 BACKEND.parent / 'prototype/boardgame-library/README.md', *sorted(ROOT.glob("*.md"))]
    example_count = 0
    for path in documents:
        content = path.read_text(encoding="utf-8")
        assert content.endswith("\n"), f"Missing final newline: {path.name}"
        assert all(line == line.rstrip() for line in content.splitlines()), path.name
        assert content.count("```") % 2 == 0, f"Unclosed code fence: {path.name}"
        for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", content):
            if re.match(r"[a-zA-Z][a-zA-Z0-9+.-]*:", target) or target.startswith("#"):
                continue
            file_target = unquote(target.split("#", 1)[0])
            assert (path.parent / file_target).exists(), f"Broken link: {path.name}: {target}"
        for block in re.findall(r"```json\n(.*?)\n```", content, flags=re.S):
            json.loads(block)
            example_count += 1
    scope = documents[0].read_text(encoding="utf-8")
    acceptance = (ROOT / "04-statistics-and-acceptance.md").read_text(encoding="utf-8")
    for prefix, count, content in (("R", 19, scope), ("D", 14, scope), ("A", 39, acceptance)):
        for number in range(1, count + 1):
            assert f"| {prefix}{number:02d} |" in content, f"Missing {prefix}{number:02d}"
    assert "在本步骤细化" not in scope and "按步骤处理的后续需求" not in scope
    product = (ROOT / "01-product.md").read_text(encoding="utf-8")
    api = (ROOT / "03-api-and-bgg.md").read_text(encoding="utf-8")
    model = (ROOT / "02-data-model.md").read_text(encoding="utf-8")
    assert "已确认的业务决策" in scope and "跨场不去重" in api
    assert "period=all/month/quarter/year/custom" in api
    assert "checked_in_at 非空" in product
    assert "| POST `/activities/{id}/boardgames/lock`" not in api
    assert "`club` / `personal`" not in model and "visibility=club/personal" not in api
    assert "至少 5 局" not in acceptance and "一局" in scope
    assert "bgg_plays/bgstats_file" in model and "boardgame_play_sources" in model
    technical = (BACKEND / "boardgame-library-technical-solution.md").read_text(encoding="utf-8")
    contracts = (ROOT / "06-api-contracts.md").read_text(encoding="utf-8")
    assert "BOARDGAME_IMPORT_ROOT" in technical and "MEDIA_ROOT 外" in technical
    assert "get_activity_by_id/list_activities/list_my_activities" in technical
    assert "selection=[{id,expected_revision}]" in api and "apply_selection" in contracts
    ddl = (ROOT / "database-schema.sql").read_text(encoding="utf-8")
    ddl = re.sub(r'FOREIGN KEY\s*\(', 'FOREIGN KEY (', ddl)
    tables = re.findall(r"CREATE TABLE `([^`]+)`", ddl)
    model_tables = re.findall(r"^\| `([^`]+)` \|", model.split("通用约定：")[0], flags=re.M)
    assert len(tables) == 34 and len(set(tables)) == 34 and set(tables) == set(model_tables)
    assert "ON DELETE SET NULL" in ddl and "FOREIGN KEY (`play_id`, `team_id`)" in ddl
    assert "FOREIGN KEY (`original_activity_id`)" not in ddl
    names = re.findall(r"(?:CONSTRAINT|(?:UNIQUE )?KEY) `([^`]+)`", ddl)
    assert all(len(name) <= 64 for name in names)
    assert "DROP TABLE" not in ddl and "CREATE DATABASE" not in ddl
    player_ddl = ddl.split("CREATE TABLE `boardgame_play_players`")[1].split("ENGINE=InnoDB")[0]
    assert "`person_id`" in player_ddl and "`user_id`" not in player_ddl
    assert "target_user_id" not in model and "fk_cell_sheet" in ddl and "fk_cell_player" in ddl
    assert "| A35 |" in acceptance and 'definition_version:\"4\"' in api
    for block in re.findall(r"```json\n(.*?)\n```", api, flags=re.S):
        obj = json.loads(block)
        for player in obj.get("players", []):
            assert "user_id" not in player, "Stale PlayerInput example"
    expanded = (ROOT / '11-expanded-scope.md').read_text(encoding='utf-8')
    for number in range(1, 17):
        assert f'| E{number:02d} |' in expanded
    current = json.loads((ROOT / 'openapi.json').read_text())
    assert '/api/v1/boardgame-sync' in current['paths']
    assert '/api/v1/boardgame-imports/{job_id}/publish' in current['paths']
    assert '/api/v1/activities/{activity_id}/nominations/{game_id}/me' in current['paths']
    assert 'user_id' in current['components']['schemas']['PlayerInput']['properties']
    assert 'purchase_price' in current['components']['schemas']['InventoryCreate']['properties']
    return len(documents), example_count


def check_queries(db: sqlite3.Connection, filename: str = "statistics-checks.sql") -> int:
    source = (ROOT / filename).read_text(encoding="utf-8")
    cases = re.findall(
        r"^-- check: ([^\n]+)\n-- expected: ([^\n]+)\n(.*?)(?=^-- check: |\Z)",
        source,
        flags=re.S | re.M,
    )
    assert cases and len({name for name, _, _ in cases}) == len(cases)
    for name, expected, query in cases:
        actual = [list(row) for row in db.execute(query)]
        assert actual == json.loads(expected), f"{name}: expected {expected}; got {actual}"
    return len(cases)


def check_constraints_and_lifecycle(db: sqlite3.Connection) -> int:
    rejected_statements = {
        "duplicate_nomination": "INSERT INTO activity_game_nominations VALUES (100,1,10,1,'active')",
        "duplicate_player": "INSERT INTO boardgame_play_players VALUES (100,1,1,NULL,NULL,NULL,NULL,NULL)",
        "duplicate_expansion": "INSERT INTO boardgame_play_expansions VALUES (1,101)",
        "missing_play": "INSERT INTO boardgame_play_expansions VALUES (999,101)",
        "team_from_another_play": "INSERT INTO boardgame_play_players VALUES (100,1,4,NULL,901,NULL,NULL,NULL)",
        "member_and_guest_both_set": "INSERT INTO boardgame_play_players VALUES (100,1,4,'guest',NULL,NULL,NULL,NULL)",
        "negative_duration": "UPDATE boardgame_plays SET duration_minutes=-1 WHERE id=1",
        "duplicate_bgstats_source": "INSERT INTO boardgame_play_sources VALUES(100,16,'bgstats','uuid','same-play-uuid',1)",
        "duplicate_bgg_source_segment": "INSERT INTO boardgame_play_sources VALUES(100,16,'bgg','sample-account','bgg-100',1)",
    }
    for name, statement in rejected_statements.items():
        db.execute("SAVEPOINT rejected")
        try:
            try:
                db.execute(statement)
            except sqlite3.IntegrityError:
                pass
            else:
                raise AssertionError(f"Constraint did not reject {name}")
        finally:
            db.execute("ROLLBACK TO rejected")
            db.execute("RELEASE rejected")

    db.execute("SAVEPOINT activity_delete")
    db.execute("DELETE FROM activities WHERE id=2")
    assert db.execute("SELECT COUNT(*) FROM public_completed").fetchone()[0] == 11
    assert db.execute("SELECT activity_id FROM boardgame_plays WHERE id=1").fetchone()[0] is None
    snapshot = json.loads(db.execute("SELECT activity_snapshot FROM boardgame_plays WHERE id=1").fetchone()[0])
    assert snapshot == {"name": "历史活动", "created_by": 1}
    assert db.execute("SELECT COUNT(*) FROM activity_game_nominations WHERE activity_id=2").fetchone()[0] == 0
    assert db.execute("SELECT COUNT(*) FROM public_completed WHERE original_activity_id=2").fetchone()[0] == 9
    db.execute("ROLLBACK TO activity_delete")
    db.execute("RELEASE activity_delete")

    db.execute("SAVEPOINT void_play")
    db.execute("UPDATE boardgame_plays SET status='voided' WHERE id=1")
    assert db.execute("SELECT COUNT(*) FROM public_completed").fetchone()[0] == 10
    assert db.execute("SELECT COUNT(*) FROM individual_results WHERE user_id=1").fetchone()[0] == 4
    db.execute("ROLLBACK TO void_play")
    db.execute("RELEASE void_play")

    db.execute("SAVEPOINT leave_before_and_after_freeze")
    db.execute("DELETE FROM activity_participants WHERE activity_id=1 AND user_id=2")
    assert db.execute("SELECT COUNT(*) FROM valid_nominations WHERE user_id=2 AND state='active'").fetchone()[0] == 0
    assert db.execute("SELECT COUNT(*) FROM valid_nominations WHERE user_id=2 AND state='frozen'").fetchone()[0] == 1
    db.execute("ROLLBACK TO leave_before_and_after_freeze")
    db.execute("RELEASE leave_before_and_after_freeze")

    db.execute("SAVEPOINT clear_role")
    db.execute("UPDATE users SET role='guest' WHERE id=2")
    assert db.execute("SELECT COUNT(*) FROM valid_nominations WHERE user_id=2 AND state='active'").fetchone()[0] == 0
    assert db.execute("SELECT COUNT(*) FROM valid_nominations WHERE user_id=2 AND state='frozen'").fetchone()[0] == 1
    db.execute("ROLLBACK TO clear_role")
    db.execute("RELEASE clear_role")
    db.execute("SAVEPOINT postpone_activity")
    db.execute("UPDATE activities SET start_date='2026-09-13',status='未开始' WHERE id=2")
    db.execute("""UPDATE activity_game_nominations SET state=CASE WHEN
        user_id=(SELECT created_by FROM activities WHERE id=2) OR EXISTS (
          SELECT 1 FROM activity_participants ap WHERE ap.activity_id=2
          AND ap.user_id=activity_game_nominations.user_id) THEN 'active' ELSE 'ineligible' END
        WHERE activity_id=2 AND state='frozen'""")
    assert db.execute("SELECT state FROM activity_game_nominations WHERE id=3").fetchone()[0] == "active"
    assert db.execute("SELECT state FROM activity_game_nominations WHERE id=5").fetchone()[0] == "ineligible"
    assert db.execute("SELECT COUNT(*) FROM public_completed").fetchone()[0] == 11
    db.execute("ROLLBACK TO postpone_activity")
    db.execute("RELEASE postpone_activity")

    db.execute("SAVEPOINT revoke_checkin")
    db.execute("UPDATE activity_participants SET checked_in_at=NULL WHERE activity_id=1 AND user_id=2")
    assert db.execute("SELECT COUNT(*) FROM activity_participants WHERE activity_id=1 AND user_id=2 AND checked_in_at IS NOT NULL").fetchone()[0] == 0
    assert db.execute("SELECT COUNT(*) FROM public_completed").fetchone()[0] == 11
    db.execute("ROLLBACK TO revoke_checkin")
    db.execute("RELEASE revoke_checkin")

    db.execute("SAVEPOINT source_stats_flags")
    db.execute("UPDATE boardgame_plays SET stats_exclusion='wins' WHERE id=1")
    assert db.execute("SELECT COUNT(*) FROM public_completed").fetchone()[0] == 11
    assert db.execute("SELECT COUNT(*) FROM individual_results WHERE play_id=1").fetchone()[0] == 0
    db.execute("UPDATE boardgame_plays SET stats_exclusion='all' WHERE id=1")
    assert db.execute("SELECT COUNT(*) FROM public_completed").fetchone()[0] == 10
    db.execute("ROLLBACK TO source_stats_flags")
    db.execute("RELEASE source_stats_flags")
    return len(rejected_statements) + 7



def check_v3_lifecycle(db: sqlite3.Connection) -> int:
    db.execute("SAVEPOINT bind_person")
    db.execute("UPDATE boardgame_people SET user_id=88 WHERE id=8")
    assert db.execute("SELECT COUNT(DISTINCT p.id) FROM public_completed p JOIN participant_accounts pp ON pp.play_id=p.id WHERE pp.user_id=88").fetchone()[0] == 2
    db.execute("ROLLBACK TO bind_person")
    db.execute("RELEASE bind_person")
    for statement in (
        "UPDATE boardgame_people SET user_id=1 WHERE id=8",
        "UPDATE boardgame_play_players SET person_id=1 WHERE id=33",
        "UPDATE boardgame_plays SET play_environment='maybe' WHERE id=17",
    ):
        db.execute("SAVEPOINT reject_v3")
        try:
            try:
                db.execute(statement)
            except sqlite3.IntegrityError:
                pass
            else:
                raise AssertionError("Invalid identity/environment accepted")
        finally:
            db.execute("ROLLBACK TO reject_v3")
            db.execute("RELEASE reject_v3")
    db.execute("SAVEPOINT stale_projection")
    db.execute("UPDATE boardgame_scoresheet_cells SET projection_version=2 WHERE id=1")
    assert db.execute("SELECT id FROM eligible_sheets WHERE sheet_comparison_key='sheetA' ORDER BY id").fetchall() == [(2,)]
    db.execute("ROLLBACK TO stale_projection")
    db.execute("RELEASE stale_projection")
    return 5


def to_node(element: ET.Element) -> dict:
    return {
        "tag": element.tag,
        "attributes": dict(element.attrib),
        "text": element.text,
        "tail": element.tail,
        "children": [to_node(child) for child in element],
    }


def from_node(node: dict) -> ET.Element:
    element = ET.Element(node["tag"], node["attributes"])
    element.text, element.tail = node["text"], node["tail"]
    element.extend(from_node(child) for child in node["children"])
    return element


def check_lossless_shape(xml_paths: list[Path]) -> tuple[int, int]:
    synthetic = '''<items unknown="root-value"><extra value="retain"/><item type="boardgame" id="1">
<description>Full &amp; untrimmed &lt;b&gt;description&lt;/b&gt;.</description>
<link type="boardgamecategory" id="1" value="A"/><link type="boardgamecategory" id="2" value="B" inbound="true"/>
<poll name="suggested_numplayers"><results numplayers="3"><result value="Best" numvotes="0"/></results></poll>
<versions><item id="55"><name type="primary" value="中文版本"/></item></versions>
<future-node new-attribute="N/A">keep<child/>tail</future-node></item></items>'''
    elements = [ET.fromstring(synthetic)]
    elements.extend(ET.parse(path).getroot() for path in xml_paths)
    nodes = 0
    for original in elements:
        payload = json.loads(json.dumps(to_node(original), ensure_ascii=False))
        rebuilt = from_node(payload)
        reparsed = ET.fromstring(ET.tostring(rebuilt, encoding="utf-8"))
        assert to_node(reparsed) == to_node(original)
        assert len(original.findall(".//description")) == len(reparsed.findall(".//description"))
        nodes += sum(1 for _ in original.iter())
    return len(elements), nodes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bgg-xml", type=Path, action="append", default=[],
                        help="Optional existing public BGG response; read only; repeatable")
    parser.add_argument("--bgstats-json", type=Path, help="Optional official basic export sample; read only")
    parser.add_argument("--bgstats-export", type=Path, help="Optional user export; aggregate audit only, no DB writes")
    args = parser.parse_args()
    docs, examples = check_documents()
    with sqlite3.connect(":memory:") as db:
        db.executescript((ROOT / "statistics-fixtures.sql").read_text(encoding="utf-8"))
        queries = check_queries(db)
        lifecycle = check_constraints_and_lifecycle(db)
        # Ensure savepoint checks did not corrupt the shared fixture.
        check_queries(db)
        db.executescript((ROOT / "statistics-v3-fixtures.sql").read_text())
        v3_queries = check_queries(db, "statistics-v3-checks.sql")
        v3_lifecycle = check_v3_lifecycle(db)
    xml_documents, nodes = check_lossless_shape(args.bgg_xml)
    synthetic = json.loads((ROOT / "bgstats-format-fixture.json").read_text(encoding="utf-8"))
    official = json.loads(args.bgstats_json.read_text(encoding="utf-8")) if args.bgstats_json else None
    bgstats_cases = verify_bgstats_cases(synthetic, official)
    modern_fixture = json.loads((ROOT / "bgstats-modern-format-fixture.json").read_text(encoding="utf-8"))
    modern_cases = verify_modern_cases(modern_fixture)
    print(f"PASS: {docs} Markdown documents, {examples} JSON examples, all relative links and R/D/A coverage")
    print(f"PASS: {queries} statistical cases, {lifecycle} constraint/lifecycle cases (in-memory SQLite only)")
    print(f"PASS: {v3_queries} v3 statistical cases, {v3_lifecycle} identity/projection lifecycle cases")
    print(f"PASS: {xml_documents} XML response(s), {nodes} nodes preserved through node JSON round trip")
    print(f"PASS: {bgstats_cases} BG Stats basic format cases; no account binding or publishing")
    print(f"PASS: {modern_cases} synthetic modern BG Stats cases; anonymous slots, expansions and scoresheet references")
    if args.bgstats_export:
        raw = args.bgstats_export.read_bytes()
        report = audit_export(json.loads(raw), raw)
        assert report["integrity"]["invalid_dates"] == 0 and report["integrity"]["date_field_mismatches"] == 0
        assert report["integrity"]["unmatched_scoresheet_cells"] == 0
        assert all(row["duplicates"] == 0 for row in report["integrity"]["uuid_issues"].values())
        print(f"PASS: real export dry run: {report['counts']['plays']} plays, {report['counts']['player_slots']} player slots; all held/unbound, source preserved")
    print("Not covered: production endpoints/transactions, Alembic, actual DB imports, team/cooperative and unseen export variants, image files or WeChat devices. Reference MySQL DDL has a separate disposable-instance verifier.")


if __name__ == "__main__":
    main()
