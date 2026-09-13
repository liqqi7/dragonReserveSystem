"""Lossless source archives plus conservative, versioned BGG/BG Stats projections."""

from copy import deepcopy
from datetime import date
from decimal import Decimal, InvalidOperation
import hashlib
import json
from uuid import UUID, NAMESPACE_URL, uuid5
from xml.etree import ElementTree as ET

from app.services.boardgame_common import digest, fail
from app.services import boardgame_source_semantics as semantic

MAX_BYTES = 20 * 1024 * 1024
PARSER_VERSION = '3'


def bounded_json(raw):
    if len(raw) > MAX_BYTES:
        fail('file_too_large', 413)
    # Count container nesting without interpreting quoted strings before decoding.
    depth = 0
    quoted = escaped = False
    for byte in raw:
        if quoted:
            if escaped:
                escaped = False
            elif byte == 92:
                escaped = True
            elif byte == 34:
                quoted = False
        elif byte == 34:
            quoted = True
        elif byte in (91, 123):
            depth += 1
            if depth > 128:
                fail('json_too_deep')
        elif byte in (93, 125):
            depth -= 1
    def pairs(entries):
        result = {}
        for key, value in entries:
            if key in result:
                raise ValueError('duplicate key')
            result[key] = value
        return result
    try:
        data = json.loads(raw, parse_constant=lambda _: (_ for _ in ()).throw(ValueError()), object_pairs_hook=pairs)
    except (ValueError, UnicodeError, RecursionError):
        fail('invalid_json')
    return data


def embedded(value, default, issues):
    if value in (None, ''):
        return deepcopy(default)
    try:
        result = bounded_json(value.encode()) if isinstance(value, str) else deepcopy(value)
        if not isinstance(result, type(default)):
            raise ValueError()
        return result
    except (ValueError, TypeError):
        issues.append('invalid_embedded_json')
        return deepcopy(default)


def positive(value):
    if isinstance(value, bool):
        return None
    try:
        result = int(value)
        return result if result > 0 else None
    except (TypeError, ValueError):
        return None


def decimal_score(value, issues):
    if value is None or str(value).strip().lower() in ('', 'null'):
        return None
    try:
        number = Decimal(str(value))
        if not number.is_finite() or abs(number) >= Decimal('1000000000') or number.as_tuple().exponent < -3:
            raise InvalidOperation()
        return str(number)
    except InvalidOperation:
        issues.append('nonnumeric_or_out_of_range_score')
        return None


def source_id(row, fallback):
    uuid = row.get('uuid')
    if uuid:
        try:
            return str(UUID(str(uuid)))
        except ValueError:
            fail('invalid_source_uuid')
    return str(row.get('id', fallback))


def item(kind, key, raw, normalized, issues=None, bgg_id=None):
    return dict(source_kind=kind, source_key=str(key), bgg_id=bgg_id,
        payload={'raw': raw, 'normalized': normalized, 'issues': sorted(set(issues or [])), 'parser_version': PARSER_VERSION},
        raw_xml=None)


def bgstats_items(raw, params):
    data = bounded_json(raw)
    if not isinstance(data, dict) or not isinstance(data.get('plays', []), list):
        fail('unsupported_bgstats_format')
    if len(data.get('plays', [])) > 50000:
        fail('too_many_source_plays')
    catalogs = {}
    for kind in ('games', 'players', 'locations'):
        entries = data.get(kind, [])
        if not isinstance(entries, list):
            fail('invalid_source_dictionary')
        mapping = {}
        for row in entries:
            if not isinstance(row, dict) or 'id' not in row or str(row['id']) in mapping:
                fail('duplicate_or_missing_dictionary_reference')
            if len(str(row['id'])) > 40:
                fail('invalid_source_dictionary_reference')
            mapping[str(row['id'])] = row
        catalogs[kind] = mapping
    sha = hashlib.sha256(raw).hexdigest()
    namespace = params['source_namespace']
    # RefId is only a pointer within one export and can be reassigned. Reuse
    # confirmed identities by UUID. Without UUID, scope the pointer to this
    # exact file so a later export cannot silently bind it to another person.
    identity_keys = {}
    for kind, catalog in catalogs.items():
        seen = set()
        identity_keys[kind] = {}
        for ref, row in catalog.items():
            key = f'uuid:{source_id(row, ref)}' if row.get('uuid') else f'file:{sha[:32]}:ref:{ref}'
            if key in seen:
                fail('duplicate_source_dictionary_uuid')
            seen.add(key)
            identity_keys[kind][ref] = key
    def identity(kind, ref):
        return identity_keys[kind].get(str(ref), f'file:{sha[:32]}:missing:{ref}')
    results = [item('archive', 'file', data, {'sha256': sha})]
    for game_ref, game in catalogs['games'].items():
        projection = dict(name=str(game.get('name') or '未命名桌游'), game_type='expansion' if game.get('isExpansion') in (True, 1) else 'base',
                          is_standalone=game.get('isBaseGame') in (True, 1), aliases=[])
        game_identity = identity('games', game_ref)
        results.append(item('bgstats_game', game_identity, game, dict(projection=projection, external_id=game_identity,
            source_file_ref=game_ref,
            source_namespace=namespace, game_uuid=game.get('uuid')), bgg_id=positive(game.get('bggId'))))
        copies = game.get('copies', [])
        if not isinstance(copies, list):
            fail('invalid_copies')
        for index, copy in enumerate(copies, 1):
            issues = []
            meta = embedded(copy.get('metaData'), {}, issues)
            quantity = positive(meta.get('Quantity')) or 1
            key = source_id(copy, f'{game_identity}:copy:{index}')
            if not copy.get('uuid'):
                key = f'file:{sha[:32]}:copy:{game_ref}:{index}'
                issues.append('source_copy_identity_unstable')
            results.append(item('bgstats_copy', key, copy, dict(game_ref=game_identity, game_name=projection['name'],
                source_namespace=namespace, source_id=key, quantity=quantity,
                owned=copy.get('statusOwned') in (True, 1), purchased_on=copy.get('acquisitionDate'),
                projection=projection, inventory=semantic.copy_projection(copy, meta, issues)), issues, positive(game.get('bggId'))))
    seen_plays = set()
    for position, play in enumerate(data.get('plays', []), 1):
        issues = []
        if not isinstance(play, dict):
            fail('invalid_play_object')
        key = source_id(play, position)
        if key in seen_plays:
            fail('duplicate_source_play')
        seen_plays.add(key)
        play_namespace = 'uuid' if play.get('uuid') else f'file:{sha}'
        game_ref = str(play.get('gameRefId'))
        game = catalogs['games'].get(game_ref)
        if not game:
            issues.append('missing_game_reference')
        metadata = embedded(play.get('metaData'), {}, issues)
        scores = play.get('playerScores', [])
        if not isinstance(scores, list) or len(scores) > 100:
            fail('invalid_source_players')
        seats = [positive(p.get('seatOrder')) for p in scores]
        valid_seats = None not in seats and len(set(seats)) == len(seats)
        players, seen_people = [], set()
        for slot, score in enumerate(scores, 1):
            ref = str(score.get('playerRefId'))
            person = catalogs['players'].get(ref)
            if not person:
                issues.append('missing_player_reference')
                person = {}
            person_meta = embedded(person.get('metaData'), {}, issues)
            automa = person_meta.get('isNpc') in (True, 1)
            anonymous = person.get('isAnonymous') is True or automa
            if ref in seen_people and not anonymous:
                issues.append('duplicate_named_player')
            seen_people.add(ref)
            meta = embedded(score.get('metaData'), {}, issues)
            players.append(dict(source_player_ref=identity('players', ref), source_file_ref=ref,
                identity_stable=bool(person.get('uuid')), source_slot=slot, source_score_uuid=meta.get('scoreUuid'),
                name=person.get('name') or '匿名玩家', is_anonymous=anonymous, participant_kind='automa' if automa else 'human',
                guest_key=str(uuid5(NAMESPACE_URL, f'bgstats:{play_namespace}:{key}:{slot}')) if anonymous else None,
                score=semantic.source_number(score.get('score'), issues), source_expression=score.get('score'), source_rank=positive(score.get('rank')),
                source_winner=score.get('winner'), seat_order=seats[slot-1] if valid_seats else slot,
                role_label=score.get('role') or None, is_start_player=score.get('startPlayer') is True,
                is_new_to_player=score.get('newPlayer') if isinstance(score.get('newPlayer'), bool) else None,
                source_team=score.get('team')))
        expansions = []
        for exp in play.get('expansionPlays', []):
            ref = str(exp.get('gameRefId'))
            egame = catalogs['games'].get(ref)
            if not egame or ref == game_ref or identity('games', ref) in [e['game_ref'] for e in expansions]:
                issues.append('invalid_expansion_reference')
            expansions.append(dict(game_ref=identity('games', ref), bgg_id=positive((egame or {}).get('bggId')), name=(egame or {}).get('name')))
        day = str(play.get('playDate') or '')[:10]
        try:
            played_on = date.fromisoformat(day).isoformat()
        except ValueError:
            played_on = None
            issues.append('unknown_play_date')
        if play.get('playDateYmd') and played_on and str(play['playDateYmd']) != played_on.replace('-', ''):
            issues.append('source_date_conflict')
        location_ref = str(play.get('locationRefId')) if play.get('locationRefId') else None
        location = catalogs['locations'].get(location_ref)
        if location_ref and not location:
            issues.append('missing_location_reference')
        sheet = embedded(play.get('scoresheet'), {}, issues)
        mode = 'individual' if len(players) >= 2 else 'solo' if len(players) == 1 else 'unscored'
        if (game or {}).get('cooperative') is True:
            mode = 'cooperative' if len(players) > 1 else 'solo'
        elif (game or {}).get('noPoints') is True and not any(p['source_winner'] is True for p in players):
            mode = 'unscored'
        if play.get('usesTeams') is True:
            mode = 'team'
            issues.append('team_result_review_required')
        highest = (game or {}).get('highestWins')
        direction = 'high' if highest is True else 'low' if highest is False else 'manual'
        source_result_valid = semantic.competitive_results(players, direction, issues) if mode == 'individual' else False
        start_time = semantic.started_at(play.get('playDate'), params.get('source_timezone', 'Asia/Shanghai'), issues)
        if start_time:
            from datetime import datetime
            from zoneinfo import ZoneInfo
            local_day = datetime.fromisoformat(start_time).astimezone(ZoneInfo('Asia/Shanghai')).date().isoformat()
            if played_on != local_day:
                issues.append('source_timezone_date_adjusted')
                played_on = local_day
        normalized = dict(source_namespace=play_namespace, source_id=key, identity_namespace=namespace,
            game_ref=identity('games', game_ref), game_name=(game or {}).get('name'), players=players, expansions=expansions,
            played_on=played_on, started_at=start_time, round_count=positive(play.get('rounds')), note=play.get('comments') or None,
            variant_key=sheet.get('variantId') or None, variant_label=sheet.get('variantLabel') or play.get('board') or None,
            source_result_valid=source_result_valid, source_modified_at=play.get('modificationDate'),
            duration_minutes=positive(play.get('durationMin')), location_ref=identity('locations', location_ref) if location_ref else None,
            location_name=(location or {}).get('name'), play_environment='online' if metadata.get('isOnlinePlay') in (True, 1) else 'unknown',
            competition_mode=mode, score_direction=direction, stats_exclusion='all' if play.get('ignored') else 'none',
            scoresheet=sheet, quantity=1)
        results.append(item('bgstats_play', key, play, normalized, issues, positive((game or {}).get('bggId'))))
    return results


def xml_root(raw):
    if len(raw) > MAX_BYTES:
        fail('source_response_too_large')
    if b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
        fail('unsafe_xml_declaration')
    try:
        root = ET.fromstring(raw)
        pending = [(root, 1)]
        while pending:
            node, depth = pending.pop()
            if depth > 128:
                fail('xml_too_deep')
            pending.extend((child, depth + 1) for child in node)
        return root
    except ET.ParseError:
        fail('invalid_source_xml')


def xml_tree(node):
    return {'tag': node.tag, 'attributes': dict(node.attrib), 'text': node.text,
            'tail': node.tail, 'children': [xml_tree(child) for child in node]}


def bgg_items(raw, kind, params):
    root = xml_root(raw)
    file_hash = hashlib.sha256(raw).hexdigest()[:32]
    results = [item('archive', f'response:{params.get("page", 1)}:{params.get("subtype", "boardgame")}', xml_tree(root), {})]
    results[0]['raw_xml'] = raw.decode('utf-8-sig')
    if kind == 'bgg_thing':
        for node in root.findall('item'):
            identity = positive(node.get('id'))
            if not identity:
                fail('missing_bgg_id')
            names = [n.get('value') for n in node.findall('name') if n.get('value')]
            projection = dict(name=next((n.get('value') for n in node.findall('name') if n.get('type') == 'primary'), names[0] if names else '未命名桌游'),
                aliases=list(dict.fromkeys(names)), game_type='expansion' if node.get('type') == 'boardgameexpansion' else 'base',
                description=node.findtext('description'), cover_url=node.findtext('image'), is_standalone=node.get('type') == 'boardgame')
            for external, internal in [('minplayers', 'min_players'), ('maxplayers', 'max_players'),
                ('minplaytime', 'min_playtime_minutes'), ('maxplaytime', 'max_playtime_minutes'), ('minage', 'min_age'), ('yearpublished', 'year_published')]:
                child = node.find(external)
                projection[internal] = positive(child.get('value')) if child is not None else None
            weight = node.find('statistics/ratings/averageweight')
            value = decimal_score(weight.get('value'), []) if weight is not None else None
            if value is not None and Decimal('1') <= Decimal(value) <= Decimal('5'):
                projection['complexity'] = str(Decimal(value).quantize(Decimal('0.01')))
            payload = {'raw': xml_tree(node), 'projection': projection, 'parser_version': PARSER_VERSION, 'issues': [], 'normalized': {'projection': projection}}
            results.append(dict(source_kind='thing', source_key=str(identity), bgg_id=identity, raw_xml=ET.tostring(node, encoding='unicode'), payload=payload))
    elif kind == 'bgg_collection':
        for index, node in enumerate(root.findall('item'), 1):
            collid = node.get('collid')
            issues = [] if collid else ['missing_collection_id']
            status = node.find('status')
            normalized = dict(source_namespace=params['username'].casefold(), source_id=collid or f'file:{file_hash}:copy:{index}',
                quantity=positive(node.findtext('numowned')) or 1,
                owned=status is not None and status.get('own') == '1', game_name=node.findtext('name'),
                projection=dict(name=node.findtext('name') or '未命名桌游', game_type='expansion' if node.get('subtype') == 'boardgameexpansion' else 'base'))
            results.append(item('bgg_collection', collid or f'missing:{index}', xml_tree(node), normalized, issues, positive(node.get('objectid'))))
            results[-1]['raw_xml'] = ET.tostring(node, encoding='unicode')
    elif kind == 'bgg_plays':
        for index, node in enumerate(root.findall('play'), 1):
            issues = []
            identity = node.get('id') or f'file:{file_hash}:play:{index}'
            if not node.get('id'):
                issues.append('missing_play_id')
            game = node.find('item')
            players = []
            for slot, player in enumerate(node.findall('players/player'), 1):
                username, name = player.get('username'), player.get('name')
                # Only a BGG account is stable. A display name cannot safely
                # carry an identity mapping into another export or play.
                ref = f'user:{username.casefold()}' if username else f'file:{file_hash}:row:{index}:slot:{slot}'
                players.append(dict(source_player_ref=ref, source_slot=slot, source_score_uuid=None, name=name or username or '匿名玩家',
                    is_anonymous=not username and not name,
                    guest_key=str(uuid5(NAMESPACE_URL, f'bgg:{params["username"].casefold()}:{identity}:{slot}')) if not username and not name else None,
                    score=decimal_score(player.get('score'), issues), source_rank=None, source_winner=player.get('win') == '1', seat_order=slot,
                    role_label=player.get('color') or None, is_start_player=False,
                    is_new_to_player=player.get('new') == '1' if player.get('new') in ('0', '1') else None))
            day = node.get('date')
            try:
                day = date.fromisoformat(day).isoformat()
            except (TypeError, ValueError):
                day = None
                issues.append('unknown_play_date')
            quantity = positive(node.get('quantity')) or 1
            if quantity > 1:
                issues.append('quantity_split_review_required')
            if not players:
                issues.append('players_required')
            normalized = dict(source_namespace=params['username'].casefold(), source_id=identity,
                identity_namespace=params['source_namespace'], game_ref=game.get('objectid') if game is not None else None,
                game_name=game.get('name') if game is not None else None, players=players, expansions=[],
                played_on=day, duration_minutes=positive(node.get('length')), location_ref=None, location_name=node.get('location'),
                play_environment='unknown', competition_mode='individual' if len(players) > 1 else 'solo' if players else 'unscored',
                score_direction='manual', stats_exclusion='wins' if node.get('nowinstats') == '1' else 'none',
                scoresheet={}, quantity=quantity, incomplete=node.get('incomplete') == '1', note=node.findtext('comments'),
                source_result_valid=semantic.competitive_results(players, 'manual', issues))
            results.append(item('bgg_play', identity, xml_tree(node), normalized, issues, positive(game.get('objectid')) if game is not None else None))
            results[-1]['raw_xml'] = ET.tostring(node, encoding='unicode')
    return results, positive(root.get('total')) or 0
