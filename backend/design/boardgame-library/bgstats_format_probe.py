"""Offline field-mapping probe for observed BG Stats JSON export shapes.

This is not the production importer: no DB writes, account binding, publishing,
production team/scoring adapters, or file upload support. Unknown fields stay in raw data.
The legacy-file key hashes canonical JSON for this probe only; production must
hash the original uploaded bytes. Strict schema validation remains unimplemented.
"""

from __future__ import annotations

from copy import deepcopy
from decimal import Decimal, InvalidOperation
import hashlib
import json
from uuid import NAMESPACE_URL, uuid5


def decode_embedded(value: object, default: object) -> object:
    """Parse JSON-valued strings without evaluating formulas or losing originals."""
    if value is None or value == "":
        return deepcopy(default)
    return json.loads(value) if isinstance(value, str) else deepcopy(value)


def inspect_export(data: dict) -> dict:
    catalogs = {}
    for kind in ("games", "players", "locations"):
        rows = data.get(kind, [])
        if not isinstance(rows, list):
            raise ValueError(f"{kind} must be an array")
        index = {}
        for row in rows:
            if row["id"] in index:
                raise ValueError(f"duplicate {kind} reference")
            index[row["id"]] = row
        catalogs[kind] = index
    file_hash = hashlib.sha256(json.dumps(data, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    previews = []
    for position, play in enumerate(data.get("plays", []), start=1):
        uuid = play.get("uuid")
        namespace = "uuid" if uuid else f"file:{file_hash}"
        source_id = str(uuid).lower() if uuid else str(play.get("id", position))
        game = catalogs["games"].get(play.get("gameRefId"))
        if game is None:
            raise ValueError("missing game reference")
        players = []
        seen_refs = set()
        scores = play.get("playerScores", [])
        seats = [row.get("seatOrder") for row in scores]
        valid_seats = all(isinstance(seat, int) and not isinstance(seat, bool) and seat > 0 for seat in seats)
        valid_seats = valid_seats and len(set(seats)) == len(seats)
        for slot, row in enumerate(scores, start=1):
            ref = row.get("playerRefId")
            player = catalogs["players"].get(ref)
            anonymous = player is not None and player.get("isAnonymous") is True
            if player is None or (ref in seen_refs and not anonymous):
                raise ValueError("missing or duplicate player reference")
            seen_refs.add(ref)
            score = None
            try:
                decimal = Decimal(str(row.get("score", "")))
                if decimal.is_finite():
                    score = str(decimal)
            except InvalidOperation:
                pass
            rank = row.get("rank")
            metadata = decode_embedded(row.get("metaData"), {})
            score_uuid = metadata.get("scoreUuid") if isinstance(metadata, dict) else None
            # One anonymous catalog entry may represent multiple people in one play.
            # UUID/slot identity is local to this source play, never a global person.
            identity = f"bgstats:{namespace}:{source_id}:anonymous:{score_uuid or 'slot'}:{slot}"
            players.append({
                "source_player_ref": ref,
                "source_player_uuid": player.get("uuid"),
                "person_id": None,  # Stable person mapping is a later explicit import decision.
                "source_slot": slot,
                "source_score_uuid": score_uuid,
                "name": player.get("name"),
                "user_id": None,  # Mapping requires an explicit local identity choice.
                "is_anonymous": anonymous,
                "guest_key": str(uuid5(NAMESPACE_URL, identity)) if anonymous else None,
                "score": score,
                "rank": rank if isinstance(rank, int) and not isinstance(rank, bool) and rank > 0 else None,
                "seat_order": row["seatOrder"] if valid_seats else slot,
                "winner": row.get("winner"),
                "role": row.get("role") or None,
                "is_start_player": row.get("startPlayer") is True,
                "source_team": row.get("team"),
                "is_new_to_player": row.get("newPlayer") if isinstance(row.get("newPlayer"), bool) else None,
            })
        expansions = []
        seen_expansions = set()
        for expansion in play.get("expansionPlays", []):
            ref = expansion.get("gameRefId")
            if ref not in catalogs["games"] or ref in seen_expansions or ref == play.get("gameRefId"):
                raise ValueError("missing, duplicate or self expansion reference")
            seen_expansions.add(ref)
            expansion_game = catalogs["games"][ref]
            expansions.append({
                "source_game_ref": ref,
                "game_name": expansion_game.get("name"),
                "game_bgg_id": expansion_game.get("bggId") or None,
                "source_bgg_play_value": expansion.get("bggId") or None,
                "raw": deepcopy(expansion),
            })
        metadata = decode_embedded(play.get("metaData"), {})
        location_ref = play.get("locationRefId")
        if location_ref not in (None, 0) and location_ref not in catalogs["locations"]:
            raise ValueError("missing location reference")
        duration = play.get("durationMin")
        previews.append({
            "source_key": ["bgstats", namespace, source_id, 1],
            "game_name": game.get("name"),
            "game_bgg_id": game.get("bggId") or None,
            "source_bgg_play_value": play.get("bggId") or None,
            "players": players,
            "expansions": expansions,
            "played_on": play.get("playDate", "")[:10] or None,
            "duration_minutes": duration if isinstance(duration, int) and not isinstance(duration, bool) and duration > 0 else None,
            "source_location_ref": location_ref or None,
            "source_metadata": metadata,
            "scoresheet": decode_embedded(play.get("scoresheet"), {}),
            "image_references": decode_embedded(play.get("playImages"), []),
            "uses_teams": play.get("usesTeams") is True,
            "online_hint": metadata.get("isOnlinePlay") in (1, True) if isinstance(metadata, dict) else False,
            "play_environment": "online" if isinstance(metadata, dict) and metadata.get("isOnlinePlay") in (1, True) else "unknown",
            "publication_status": "held",
            "stats_exclusion": "all" if play.get("ignored") else "none",
            "raw": deepcopy(play),
        })
    return {"catalog_player_count": len(catalogs["players"]), "plays": previews, "raw": deepcopy(data)}


def verify_cases(synthetic: dict, official: dict | None = None) -> int:
    preview = inspect_export(synthetic)
    play = preview["plays"][0]
    assert preview["catalog_player_count"] == 3 and len(play["players"]) == 2
    assert [p["score"] for p in play["players"]] == ["0", "-2.5"]
    assert [p["rank"] for p in play["players"]] == [None, None]
    assert [p["seat_order"] for p in play["players"]] == [1, 2]
    assert play["game_bgg_id"] == 1001 and play["source_bgg_play_value"] is None
    assert all(p["user_id"] is None for p in play["players"])
    assert play["publication_status"] == "held" and preview["raw"] == synthetic
    assert inspect_export(deepcopy(synthetic))["plays"][0]["source_key"] == play["source_key"]
    changed = deepcopy(synthetic)
    changed["plays"][0]["playerScores"][0]["score"] = "100"
    assert inspect_export(changed)["plays"][0]["source_key"] == play["source_key"]
    missing = deepcopy(synthetic)
    missing["plays"][0]["playerScores"][0]["playerRefId"] = 999
    try:
        inspect_export(missing)
    except ValueError:
        pass
    else:
        raise AssertionError("Missing player reference was accepted")
    legacy = deepcopy(synthetic)
    del legacy["plays"][0]["uuid"]
    assert inspect_export(legacy)["plays"][0]["source_key"] == inspect_export(deepcopy(legacy))["plays"][0]["source_key"]
    ignored = deepcopy(synthetic)
    ignored["plays"][0]["ignored"] = True
    assert inspect_export(ignored)["plays"][0]["stats_exclusion"] == "all"
    nonnumeric = deepcopy(synthetic)
    nonnumeric["plays"][0]["playerScores"][0]["score"] = "2+3"
    assert inspect_export(nonnumeric)["plays"][0]["players"][0]["score"] is None
    if official is not None:
        result = inspect_export(official)
        first = result["plays"][0]
        assert len(result["plays"]) == 1 and result["catalog_player_count"] == 5
        assert len(first["players"]) == 4 and first["game_bgg_id"] == 36218
        assert [p["score"] for p in first["players"]] == ["11", "25", "34", "26"]
        assert all(p["rank"] is None for p in first["players"])
        assert [p["seat_order"] for p in first["players"]] == [1, 2, 3, 4]
        assert sum(p["winner"] is True for p in first["players"]) == 1
        assert result["raw"] == official
    return 13 + (1 if official is not None else 0)
