#!/usr/bin/env python3
"""Read-only BG Stats export audit. Prints aggregates, never player/location names.

No application imports, credentials, network requests, DB writes or publication.
The optional output is an aggregate report, not the backup or an import payload.
"""

from __future__ import annotations

import argparse
from collections import Counter
from copy import deepcopy
from datetime import date
from decimal import Decimal, InvalidOperation
import hashlib
import json
from pathlib import Path

from bgstats_format_probe import decode_embedded, inspect_export


def sheet_score_keys(value: object) -> list[str]:
    result = []
    if isinstance(value, dict):
        if isinstance(value.get("scores"), dict):
            result.extend(value["scores"])
        for child in value.values():
            result.extend(sheet_score_keys(child))
    elif isinstance(value, list):
        for child in value:
            result.extend(sheet_score_keys(child))
    return result


def audit_export(data: dict, raw_bytes: bytes) -> dict:
    preview = inspect_export(data)
    plays = data.get("plays", [])
    catalogs = {name: data.get(name, []) for name in ("games", "players", "locations")}
    players = {row["id"]: row for row in catalogs["players"]}
    slots = [score for play in plays for score in play.get("playerScores", [])]
    copies = [copy for game in catalogs["games"] for copy in game.get("copies", [])]
    dates = []
    invalid_dates = mismatched_dates = 0
    for play in plays:
        try:
            parsed = date.fromisoformat(play.get("playDate", "")[:10])
            dates.append(parsed.isoformat())
            if play.get("playDateYmd") is not None and str(play["playDateYmd"]) != parsed.strftime("%Y%m%d"):
                mismatched_dates += 1
        except ValueError:
            invalid_dates += 1
    numeric = zero = negative = empty = null_text = other_score = 0
    for slot in slots:
        text = str(slot.get("score", "")).strip()
        if not text:
            empty += 1
        elif text.lower() == "null":
            null_text += 1
        else:
            try:
                value = Decimal(text)
                if not value.is_finite():
                    raise InvalidOperation
                numeric += 1
                zero += value == 0
                negative += value < 0
            except InvalidOperation:
                other_score += 1
    repeated_anonymous = 0
    unknown_with_rank = conflicts = partial_rank = 0
    for play in plays:
        scores = play.get("playerScores", [])
        refs = Counter(s["playerRefId"] for s in scores)
        repeated_anonymous += any(count > 1 and players[ref].get("isAnonymous") is True for ref, count in refs.items())
        known_ranks = [s for s in scores if s.get("rank", 0) > 0]
        winners = [s for s in scores if s.get("winner") is True]
        unknown_with_rank += bool(known_ranks) and not winners
        partial_rank += bool(known_ranks) and len(known_ranks) != len(scores)
        conflicts += bool(winners) and any((s["rank"] == 1) != (s.get("winner") is True) for s in known_ranks)
    cells = matched = 0
    for play in preview["plays"]:
        keys = sheet_score_keys(play["scoresheet"])
        score_uuids = {s["source_score_uuid"] for s in play["players"] if s["source_score_uuid"]}
        cells += len(keys)
        matched += sum(key in score_uuids for key in keys)
    uuid_issues = {}
    for kind, rows in {**catalogs, "plays": plays}.items():
        counts = Counter(str(row.get("uuid")).lower() for row in rows if row.get("uuid"))
        uuid_issues[kind] = {"missing": sum(not row.get("uuid") for row in rows), "duplicates": sum(c - 1 for c in counts.values())}
    assert preview["raw"] == data, "Original source was changed"
    assert all(p["publication_status"] == "held" for p in preview["plays"])
    assert all(s["user_id"] is None for p in preview["plays"] for s in p["players"])
    return {
        "audit_version": "1", "source_sha256": hashlib.sha256(raw_bytes).hexdigest(),
        "source_bytes": len(raw_bytes), "app_version": data.get("userInfo", {}).get("appVersion"),
        "exported_at": data.get("userInfo", {}).get("exportDate"),
        "counts": {"games": len(catalogs["games"]), "players_in_dictionary": len(players),
                   "anonymous_dictionary_entries": sum(p.get("isAnonymous") is True for p in players.values()),
                   "locations": len(catalogs["locations"]), "plays": len(plays), "player_slots": len(slots),
                   "anonymous_slots": sum(players[s["playerRefId"]].get("isAnonymous") is True for s in slots),
                   "distinct_main_games": len({p["gameRefId"] for p in plays}),
                   "plays_with_expansions": sum(bool(p.get("expansionPlays")) for p in plays),
                   "expansion_uses": sum(len(p.get("expansionPlays", [])) for p in plays),
                   "distinct_expansions": len({e["gameRefId"] for p in plays for e in p.get("expansionPlays", [])}),
                   "plays_with_scoresheet": sum(bool(p["scoresheet"]) for p in preview["plays"]),
                   "plays_with_image_references": sum(bool(p["image_references"]) for p in preview["plays"]),
                   "online_marked_plays": sum(p["online_hint"] for p in preview["plays"]),
                   "team_mode_plays": sum(p["uses_teams"] for p in preview["plays"]),
                   "copy_entries": len(copies), "owned_copy_entries": sum(c.get("statusOwned") == 1 for c in copies),
                   "deleted_objects": len(data.get("deletedObjects", []))},
        "date_range": {"first": min(dates) if dates else None, "last": max(dates) if dates else None},
        "integrity": {"invalid_dates": invalid_dates, "date_field_mismatches": mismatched_dates,
                      "uuid_issues": uuid_issues, "scoresheet_cells": cells,
                      "matched_scoresheet_cells": matched, "unmatched_scoresheet_cells": cells - matched},
        "normalization": {"plays_repeating_anonymous_ref": repeated_anonymous,
                          "zero_duration_plays": sum(p.get("durationMin") == 0 for p in plays),
                          "numeric_scores": numeric, "zero_scores": zero, "negative_scores": negative,
                          "empty_scores": empty, "literal_null_scores": null_text, "other_nonnumeric_scores": other_score,
                          "zero_ranks": sum(s.get("rank") == 0 for s in slots),
                          "missing_seat_orders": sum("seatOrder" not in s for s in slots),
                          "zero_seat_orders": sum(s.get("seatOrder") == 0 for s in slots),
                          "zero_team_strings_without_team_mode": sum(s.get("team") == "0" for p in plays if not p.get("usesTeams") for s in p.get("playerScores", []))},
        "result_review": {"plays_without_winner": sum(not any(s.get("winner") is True for s in p.get("playerScores", [])) for p in plays),
                          "unknown_outcome_with_ranks": unknown_with_rank, "partial_rank_plays": partial_rank,
                          "winner_rank_conflict_plays": conflicts},
        "dry_run": {"held_previews": len(preview["plays"]), "bound_local_users": 0,
                    "business_database_writes": 0, "published_plays": 0, "source_preserved": True},
    }


def verify_modern_cases(data: dict) -> int:
    parsed = inspect_export(data)
    first, second, third, fourth = parsed["plays"]
    cases = {
        "root_play_count": len(parsed["plays"]) == 4,
        "anonymous_occurrences_distinct": first["players"][1]["source_player_ref"] == first["players"][2]["source_player_ref"] and first["players"][1]["guest_key"] != first["players"][2]["guest_key"],
        "anonymous_retry_stable": first["players"][1]["guest_key"] == inspect_export(deepcopy(data))["plays"][0]["players"][1]["guest_key"],
        "missing_scores_not_zero": all(p["score"] is None for p in first["players"][1:]),
        "numeric_zero_and_negative": [p["score"] for p in second["players"]] == ["0", "-2.5"],
        "seat_placeholders_normalized": [p["seat_order"] for p in first["players"]] == [1, 2, 3],
        "duration_unknown": first["duration_minutes"] is None and second["duration_minutes"] == 30,
        "expansion_not_extra_play": len(first["expansions"]) == 1 and first["expansions"][0]["game_bgg_id"] == 5002 and first["expansions"][0]["source_bgg_play_value"] is None,
        "embedded_metadata": first["online_hint"] and first["source_metadata"]["futureSourceField"] == {"keep": True},
        "both_sheet_shapes": bool(first["scoresheet"]["groups"]) and bool(third["scoresheet"]["rounds"]),
        "team_zero_not_team_mode": first["players"][0]["source_team"] == "0" and not first["uses_teams"],
        "formula_not_executed": fourth["players"][0]["score"] is None and fourth["raw"]["playerScores"][0]["score"] == "2+3",
        "source_tombstones_preserved": parsed["raw"] == data and len(parsed["raw"]["deletedObjects"]) == 1,
        "no_identity_binding_or_publication": all(p["publication_status"] == "held" and all(s["user_id"] is None for s in p["players"]) for p in parsed["plays"]),
    }
    for name, mutate in (
        ("named_duplicate_rejected", lambda d: d["plays"][0]["playerScores"][1].update(playerRefId=1)),
        ("missing_expansion_rejected", lambda d: d["plays"][0]["expansionPlays"][0].update(gameRefId=999)),
    ):
        invalid = deepcopy(data)
        mutate(invalid)
        try:
            inspect_export(invalid)
        except ValueError:
            cases[name] = True
        else:
            cases[name] = False
    report = audit_export(data, json.dumps(data).encode())
    cases["sheet_uuid_join"] = report["integrity"]["scoresheet_cells"] == 2 and report["integrity"]["unmatched_scoresheet_cells"] == 0
    cases["result_ambiguity_reported"] = report["result_review"]["partial_rank_plays"] == 2 and report["result_review"]["winner_rank_conflict_plays"] == 1
    changed = deepcopy(data)
    changed["plays"][0]["playerScores"][0]["newPlayer"] = True
    changed["plays"][0]["playerScores"][1]["newPlayer"] = False
    normalized = inspect_export(changed)["plays"][0]["players"]
    cases["new_player_true_false_missing"] = [s["is_new_to_player"] for s in normalized] == [True, False, None]
    cases["environment_unknown_not_offline"] = first["play_environment"] == "online" and second["play_environment"] == "unknown"
    cases["person_binding_not_inferred"] = all(s["person_id"] is None for p in parsed["plays"] for s in p["players"])
    for name, passed in cases.items():
        assert passed, name
    return len(cases)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.source.stat().st_size > 20 * 1024 * 1024:
        parser.error("Source exceeds the planned 20 MiB limit")
    if args.output and args.output.resolve() == args.source.resolve():
        parser.error("Output must not overwrite the source")
    original = args.source.read_bytes()
    report = audit_export(json.loads(original), original)
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered)
    print(rendered, end="")


if __name__ == "__main__":
    main()
