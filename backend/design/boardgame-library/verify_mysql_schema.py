#!/usr/bin/env python3
"""Check the reference DDL in a disposable local MySQL instance, never an existing DB.

Requires explicit --mysqld and --mysql executable paths. Uses --no-defaults,
an isolated temporary data directory and Unix socket, and disables TCP/MySQL X.
Legacy tables are minimal ID-compatible stubs, not a complete migration test.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import subprocess
import tempfile
import time


ROOT = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mysqld", type=Path, required=True)
    parser.add_argument("--mysql", type=Path, required=True)
    args = parser.parse_args()
    for executable in (args.mysqld, args.mysql):
        if not executable.is_absolute() or not executable.is_file():
            parser.error("Both executable paths must be absolute existing files")
    version = subprocess.check_output([str(args.mysqld), "--no-defaults", "--version"], text=True).strip()
    ddl = (ROOT / "database-schema.sql").read_text()
    expected_tables = set(re.findall(r"CREATE TABLE `([^`]+)`", ddl))
    assert len(expected_tables) == 34
    with tempfile.TemporaryDirectory(prefix="dragon-bg-ddl-", dir="/tmp") as directory:
        work = Path(directory)
        data, sock, log = work / "data", work / "mysql.sock", work / "mysql.log"
        init = subprocess.run([
            str(args.mysqld), "--no-defaults", "--initialize-insecure",
            f"--datadir={data}", f"--log-error={log}",
        ], capture_output=True, text=True, timeout=60)
        if init.returncode:
            raise RuntimeError(f"Temporary MySQL initialization failed: {init.stderr}")
        server = subprocess.Popen([
            str(args.mysqld), "--no-defaults", f"--datadir={data}",
            f"--socket={sock}", f"--pid-file={work / 'mysql.pid'}",
            f"--log-error={log}", "--skip-networking", "--mysqlx=OFF", "--skip-log-bin",
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        client = [str(args.mysql), "--no-defaults", "--protocol=SOCKET",
                  f"--socket={sock}", "--user=root", "--batch", "--skip-column-names",
                  "--default-character-set=utf8mb4"]

        def run(sql: str, expected_error: int | None = None) -> str:
            result = subprocess.run(client, input=sql, text=True, capture_output=True, timeout=20)
            if expected_error is None:
                assert result.returncode == 0, result.stderr
            else:
                assert result.returncode != 0 and f"ERROR {expected_error} " in result.stderr, result.stderr
            return result.stdout.strip()

        count = 0

        def check(sql: str, expected: str = "", error: int | None = None) -> None:
            nonlocal count
            actual = run("USE boardgame_reference;\n" + sql, error)
            if error is None:
                assert actual == expected, (sql, actual, expected)
            count += 1

        def insert(table: str, values: dict) -> None:
            def literal(value: object) -> str:
                if value is None:
                    return "NULL"
                if isinstance(value, (int, float)):
                    return str(value)
                if isinstance(value, (dict, list)):
                    value = json.dumps(value, ensure_ascii=False)
                return "'" + str(value).replace("\\", "\\\\").replace("'", "''") + "'"
            columns = ",".join(f"`{name}`" for name in values)
            run(f"USE boardgame_reference; INSERT INTO `{table}` ({columns}) VALUES ({','.join(literal(v) for v in values.values())});")

        try:
            deadline = time.monotonic() + 30
            while time.monotonic() < deadline:
                if server.poll() is not None:
                    raise RuntimeError("Temporary MySQL exited: " + log.read_text()[-2000:])
                result = subprocess.run(client, input="SELECT 1;", capture_output=True, text=True, timeout=2)
                if result.returncode == 0:
                    break
                time.sleep(0.1)
            else:
                raise RuntimeError("Temporary MySQL did not become ready")
            run("CREATE DATABASE boardgame_reference CHARACTER SET utf8mb4; USE boardgame_reference; "
                "CREATE TABLE users(id INT PRIMARY KEY) ENGINE=InnoDB; "
                "CREATE TABLE activities(id INT PRIMARY KEY) ENGINE=InnoDB; " + ddl)
            tables = set(run("USE boardgame_reference; SHOW TABLES;").splitlines())
            assert tables == expected_tables | {"users", "activities"}
            count += 1
            run("USE boardgame_reference; INSERT INTO users VALUES(1),(2),(3); INSERT INTO activities VALUES(81),(82);")
            audit = dict(created_by=1, updated_by=1, created_at="2026-09-11 10:00:00", updated_at="2026-09-11 10:00:00")
            for person_id in (1, 2, 3):
                insert("boardgame_people", dict(id=person_id, user_id=person_id, display_name="示例成员", is_visible=1, **audit))
            insert("boardgame_people", dict(id=11, display_name="示例朋友", is_visible=1, **audit))
            insert("boardgame_locations", dict(id=21, name="示例地点", is_visible=1, **audit))
            for game_id in (10, 11):
                insert("boardgames", dict(id=game_id, name="示例桌游", aliases=[], game_type="base" if game_id == 10 else "expansion",
                                         local_overrides={}, search_text="示例桌游", default_rules={}, projection_warnings=[], **audit))
            check("SELECT COUNT(*) FROM boardgames WHERE bgg_id IS NULL;", "2")
            insert("boardgame_inventory", dict(id=101, game_id=10, owner_type="member", owner_user_id=1, **audit))
            check("UPDATE boardgame_inventory SET owner_type='club' WHERE id=101;", error=3819)
            insert("activity_game_settings", dict(activity_id=81))
            insert("activity_game_nominations", dict(id=301, activity_id=81, game_id=10, user_id=1, **audit))
            check("INSERT INTO activity_game_nominations SELECT 302,activity_id,game_id,user_id,state,frozen_at,note,created_by,updated_by,created_at,updated_at,revision FROM activity_game_nominations WHERE id=301;", error=1062)
            insert("activity_game_plans", dict(id=401, activity_id=81, game_id=10, inventory_id=101, **audit))
            for play_id, activity_id in ((201, 81), (202, 82)):
                insert("boardgame_plays", dict(id=play_id, game_id=10, activity_id=activity_id, original_activity_id=activity_id,
                                              plan_id=401 if play_id == 201 else None, played_on="2026-09-10", status="completed",
                                              publication_status="published", rules_snapshot={}, game_snapshot={"name": "示例桌游"},
                                              activity_snapshot={"name": "历史活动", "created_by": 1}, **audit))
            insert("boardgame_play_teams", dict(id=501, play_id=201, name="红队"))
            insert("boardgame_play_players", dict(id=601, play_id=201, person_id=1, display_name_snapshot="玩家一", seat_order=1, score="-2.500", score_status="recorded"))
            insert("boardgame_play_expansions", dict(play_id=201, expansion_game_id=11, game_snapshot={"name": "扩展"}))
            check("SELECT score FROM boardgame_play_players WHERE id=601;", "-2.500")
            check("UPDATE boardgame_plays SET duration_minutes=-1 WHERE id=201;", error=3819)
            check("UPDATE boardgame_plays SET status='invalid' WHERE id=201;", error=3819)
            check("UPDATE boardgame_plays SET played_on=NULL WHERE id=201;", error=3819)
            check("INSERT INTO boardgame_play_players(play_id,person_id,display_name_snapshot,seat_order) VALUES(201,1,'重复成员',2);", error=1062)
            check("INSERT INTO boardgame_play_players(play_id,person_id,display_name_snapshot,seat_order) VALUES(201,2,'重复座位',1);", error=1062)
            check("UPDATE boardgame_play_players SET guest_key='00000000-0000-4000-8000-000000000001' WHERE id=601;", error=3819)
            check("INSERT INTO boardgame_play_players(play_id,person_id,display_name_snapshot,seat_order,team_id) VALUES(202,2,'跨局队伍',1,501);", error=1452)
            check("INSERT INTO boardgame_play_expansions(play_id,expansion_game_id,game_snapshot) VALUES(201,11,'{}');", error=1062)
            check("DELETE FROM boardgames WHERE id=10;", error=1451)
            check("UPDATE boardgames SET bgg_id=1001 WHERE id=10; UPDATE boardgames SET bgg_id=1001 WHERE id=11;", error=1062)
            job_id = "00000000-0000-4000-8000-000000000081"
            insert("boardgame_import_jobs", dict(id=job_id, kind="bgstats_file", requested_by=1, params={}, progress={}, created_at=audit["created_at"], updated_at=audit["updated_at"]))
            insert("boardgame_import_items", dict(id=701, job_id=job_id, source_kind="play", source_key="source-1", payload={"unknown": {"retained": "完整原件"}}, content_hash="0"*64, created_at=audit["created_at"], updated_at=audit["updated_at"]))
            check("SELECT JSON_UNQUOTE(JSON_EXTRACT(payload,'$.unknown.retained')) FROM boardgame_import_items WHERE id=701;", "完整原件")
            insert("boardgame_play_sources", dict(id=801, play_id=201, provider="bgstats", source_namespace="uuid", source_play_id="source-1", source_item_id=701, content_hash="0"*64, last_applied_play_revision=1, mapping_snapshot={}, created_at=audit["created_at"], updated_at=audit["updated_at"]))
            check("INSERT INTO boardgame_play_sources SELECT 802,play_id,provider,source_namespace,source_play_id,segment_index,source_item_id,content_hash,source_modified_at,last_applied_play_revision,mapping_snapshot,created_at,updated_at FROM boardgame_play_sources WHERE id=801;", error=1062)
            check(f"DELETE FROM boardgame_import_jobs WHERE id='{job_id}';", error=1451)
            check("DELETE FROM activities WHERE id=81; SELECT activity_id IS NULL,plan_id IS NULL,original_activity_id,JSON_UNQUOTE(JSON_EXTRACT(activity_snapshot,'$.name')) FROM boardgame_plays WHERE id=201;", "1\t1\t81\t历史活动")
            check("SELECT (SELECT COUNT(*) FROM activity_game_nominations WHERE activity_id=81),(SELECT COUNT(*) FROM activity_game_plans WHERE activity_id=81),(SELECT COUNT(*) FROM activity_game_settings WHERE activity_id=81),(SELECT COUNT(*) FROM boardgame_play_players WHERE play_id=201),(SELECT COUNT(*) FROM boardgame_play_expansions WHERE play_id=201);", "0\t0\t0\t1\t1")
            check("UPDATE boardgame_people SET user_id=1 WHERE id=11;", error=1062)
            check("SELECT user_id IS NULL FROM boardgame_people WHERE id=11;", "1")
            check("DELETE FROM boardgame_people WHERE id=1;", error=1451)
            check("UPDATE boardgame_plays SET play_environment='maybe' WHERE id=201;", error=3819)
            check("SELECT play_environment FROM boardgame_plays WHERE id=201;", "unknown")
            check("UPDATE boardgame_plays SET location_id=999 WHERE id=201;", error=1452)
            check("UPDATE boardgame_plays SET location_id=21,play_environment='online' WHERE id=201; SELECT COUNT(*) FROM boardgame_plays WHERE location_id=21 AND play_environment='online';", "1")
            insert("boardgame_play_players", dict(id=602, play_id=202, person_id=2, display_name_snapshot="另一局玩家", seat_order=1))
            insert("boardgame_play_scoresheets", dict(id=901, play_id=201, source_item_id=701, display_data={}, issues=[], content_hash="1"*64, play_revision=1, **audit))
            insert("boardgame_play_scoresheets", dict(id=902, play_id=202, display_data={}, issues=[], content_hash="2"*64, play_revision=1, **audit))
            insert("boardgame_scoresheet_cells", dict(id=1001, sheet_id=901, play_id=201, row_key="round1/card", group_key="round1", row_label="卡牌", subject_kind="player", subject_key="p:601", player_id=601, value_number="0", projection_version=1))
            check("SELECT value_number FROM boardgame_scoresheet_cells WHERE id=1001;", "0.000000")
            check("UPDATE boardgame_scoresheet_cells SET value_number=-2.5 WHERE id=1001; SELECT value_number FROM boardgame_scoresheet_cells WHERE id=1001;", "-2.500000")
            check("UPDATE boardgame_scoresheet_cells SET player_id=602,subject_key='p:602' WHERE id=1001;", error=1452)
            check("UPDATE boardgame_scoresheet_cells SET sheet_id=902 WHERE id=1001;", error=1452)
            check("UPDATE boardgame_scoresheet_cells SET subject_key='p:999' WHERE id=1001;", error=3819)
            check("UPDATE boardgame_scoresheet_cells SET team_id=501 WHERE id=1001;", error=3819)
            check("UPDATE boardgame_scoresheet_cells SET projection_version=0 WHERE id=1001;", error=3819)
            check("DELETE FROM boardgame_play_players WHERE id=601;", error=1451)
            check("UPDATE boardgame_play_scoresheets SET play_id=201 WHERE id=902;", error=1062)
            insert("boardgame_import_mappings", dict(id=1101, provider="bgstats", source_namespace="owner:1:dataset:sample", entity_type="player", external_id="person-uuid", target_person_id=11, confirmed_by=1, created_at=audit["created_at"], updated_at=audit["updated_at"]))
            check("UPDATE boardgame_import_mappings SET target_location_id=21 WHERE id=1101;", error=3819)
            check("DELETE FROM boardgame_play_scoresheets WHERE id=901; SELECT COUNT(*) FROM boardgame_scoresheet_cells WHERE sheet_id=901;", "0")
            print(version)
            print(f"PASS: 34 reference tables created; {count} DDL/constraint/history checks")
            print("Isolated Unix-socket instance only; minimal legacy ID stubs. No application, Alembic or concurrency tests.")
        finally:
            server.terminate()
            try:
                server.wait(timeout=15)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)
    print("Temporary MySQL stopped and its data directory removed.")


if __name__ == "__main__":
    main()
