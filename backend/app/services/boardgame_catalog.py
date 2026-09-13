"""Catalog, physical inventory and safe public identities."""

from urllib.parse import urlparse
from decimal import Decimal

from sqlalchemy import func, or_, select, update, UniqueConstraint

from app.models import User
from app.models.boardgame import (BoardGame, Inventory, InventorySource, ExpansionLink, Person, Location,
    Nomination, GamePlan, Play, PlayPlayer, PlayExpansion, PlanExpansion, NominationExpansion,
    ImportMapping, ImportItem, Ruleset, GamePreference, PriorPlay, GameTagLink, GameTag, TABLES)
from app.schemas.boardgame import GameFields
from app.services.boardgame_common import (admin, audit, check_revision, columns, digest, fail, get,
    member, now, safe, stamp, touch, unique, user_summary)

GAME_PUBLIC = ['id', 'bgg_id', 'name', 'game_type', 'is_standalone', 'cover_url', 'min_players',
    'max_players', 'min_playtime_minutes', 'max_playtime_minutes', 'min_age', 'year_published',
    'complexity', 'sort_order', 'archived_at', 'revision']
GAME_DEFAULTS = dict(aliases=[], is_standalone=False, cover_url=None, description=None,
    min_players=None, max_players=None, min_playtime_minutes=None, max_playtime_minutes=None,
    min_age=None, year_published=None, complexity=None)


def game(db, identity, actor=None, *, usable=False, lock=False):
    obj = get(db, BoardGame, identity, lock)
    if not obj.is_visible and not (actor and (actor.role == 'admin' or obj.created_by == actor.id)):
        fail('not_found', 404)
    if usable and (obj.archived_at or obj.merged_into_id):
        fail('game_unavailable', 409, canonical_id=obj.merged_into_id)
    return obj


def can_edit_game(db, obj, actor):
    if actor.role == 'admin':
        return True
    if actor.role != 'user' or obj.created_by != actor.id:
        return False
    for cls in (Inventory, Nomination, GamePlan, Play, GamePreference, PriorPlay):
        if db.scalar(select(cls.id).where(cls.game_id == obj.id, cls.created_by != actor.id).limit(1)):
            return False
    if db.scalar(select(GameTagLink.game_id).join(GameTag, GameTag.id == GameTagLink.tag_id).where(
            GameTagLink.game_id == obj.id, GameTag.user_id != actor.id).limit(1)):
        return False
    for child, parent, fk in ((PlayExpansion, Play, 'play_id'), (PlanExpansion, GamePlan, 'plan_id'),
                              (NominationExpansion, Nomination, 'nomination_id')):
        if db.scalar(select(parent.id).join(child, getattr(child, fk) == parent.id).where(
                child.expansion_game_id == obj.id, parent.created_by != actor.id).limit(1)):
            return False
    return True


def inventory_summary(db, game_id):
    rows = db.execute(select(Inventory.status, func.count()).where(Inventory.game_id == game_id,
                  Inventory.archived_at.is_(None)).group_by(Inventory.status)).all()
    return dict(total=sum(n for _, n in rows), by_status={s: n for s, n in rows},
                activity_available=db.scalar(select(func.count()).select_from(Inventory).where(
                    Inventory.game_id == game_id, Inventory.archived_at.is_(None),
                    Inventory.status == 'available', Inventory.available_for_activity.is_(True))))


def game_detail(db, obj, actor, detail=True):
    out = columns(obj, GAME_PUBLIC)
    out['inventory_summary'] = inventory_summary(db, obj.id)
    if detail:
        out.update(columns(obj, ['aliases', 'description', 'default_rules', 'bgg_synced_at', 'projection_warnings']))
        out.update(field_sources={k: 'manual' if k in obj.local_overrides else 'bgg' if obj.bgg_id else 'unknown'
                                  for k in GameFields.model_fields}, canonical_id=obj.merged_into_id,
                   permissions={'can_edit': can_edit_game(db, obj, actor)})
    return out


def validate_cover(url, imported=False):
    if url is None:
        return
    parsed = urlparse(url)
    from app.core.config import get_settings
    prefix = get_settings().media_url_prefix.rstrip('/') + '/boardgames/'
    if url.startswith(prefix) and '..' not in url and not parsed.query and not parsed.fragment:
        return
    if imported and parsed.scheme == 'https' and parsed.hostname in ('cf.geekdo-images.com', 'cf.geekdo.com'):
        return
    fail('controlled_image_required')


def project_game(obj):
    base = (obj.bgg_payload or {}).get('projection', {})
    values = {**GAME_DEFAULTS, **{k: v for k, v in base.items() if k in GameFields.model_fields}, **obj.local_overrides}
    if not values.get('name') or values.get('game_type') not in ('base', 'expansion'):
        fail('required_game_fields')
    for a, b in [('min_players', 'max_players'), ('min_playtime_minutes', 'max_playtime_minutes')]:
        if values.get(a) and values.get(b) and values[a] > values[b]:
            fail('invalid_range')
    for k, v in values.items():
        setattr(obj, k, Decimal(str(v)) if k == 'complexity' and v is not None else v)
    obj.search_text = ' '.join([obj.name, *(obj.aliases or [])]).casefold()


def create_game(db, actor, payload, source=None):
    member(actor)
    changes = payload.set_overrides.model_dump(mode='json', exclude_unset=True)
    for key in ('name', 'game_type'):
        if key in changes and changes[key] != getattr(payload, key):
            fail('conflicting_game_fields')
    validate_cover(changes.get('cover_url'))
    item = None
    if payload.bgg_id and source is None:
        item = db.scalar(select(ImportItem).where(ImportItem.bgg_id == payload.bgg_id,
                         ImportItem.source_kind == 'thing').order_by(ImportItem.id.desc()).limit(1))
        if item is None:
            fail('standard_thing_required')
        # Catalog snapshots are public upstream data; never use private play or collection items.
        source = item.payload
    if payload.bgg_id:
        existing = db.scalar(select(BoardGame).where(BoardGame.bgg_id == payload.bgg_id))
        if existing:
            fail('bgg_already_bound', 409, canonical_id=existing.id)
    obj = BoardGame(**stamp(actor, bgg_id=payload.bgg_id, local_overrides={
        'name': payload.name, 'game_type': payload.game_type, **changes}, bgg_payload=source,
        projection_warnings=[], default_rules=payload.default_rules.model_dump(),
        is_visible=payload.is_visible, sort_order=payload.sort_order))
    project_game(obj)
    if item is not None:
        obj.bgg_raw_xml, obj.bgg_content_hash, obj.bgg_parser_version = item.raw_xml, item.content_hash, '1'
        obj.bgg_request_params, obj.bgg_synced_at = {'id': payload.bgg_id, 'stats': 1, 'versions': 1}, item.updated_at
    db.add(obj)
    db.flush()
    audit(db, obj, actor, 'create', after=columns(obj, GAME_PUBLIC))
    return obj


def patch_game(db, obj, actor, payload):
    if not can_edit_game(db, obj, actor):
        fail('shared_game_admin_required', 403)
    check_revision(obj, payload.expected_revision)
    before = columns(obj, GAME_PUBLIC)
    changes = payload.set_overrides.model_dump(mode='json', exclude_unset=True)
    validate_cover(changes.get('cover_url'))
    if set(changes) & set(payload.clear_overrides) or not set(payload.clear_overrides) <= GameFields.model_fields.keys():
        fail('invalid_overrides')
    overrides = {k: v for k, v in obj.local_overrides.items() if k not in payload.clear_overrides}
    obj.local_overrides = {**overrides, **changes}
    old_type = obj.game_type
    project_game(obj)
    if obj.game_type != old_type:
        for cls, key in ((Inventory, 'game_id'), (Play, 'game_id'), (GamePlan, 'game_id'),
                         (ExpansionLink, 'expansion_game_id'), (PlayExpansion, 'expansion_game_id')):
            if db.scalar(select(getattr(cls, key)).where(getattr(cls, key) == obj.id).limit(1)):
                fail('game_type_in_use', 409)
    for key in ('is_visible', 'sort_order', 'default_rules'):
        if key in payload.model_fields_set:
            value = getattr(payload, key)
            if value is None:
                fail('invalid_null', field=key)
            setattr(obj, key, value.model_dump() if key == 'default_rules' else value)
    touch(obj, actor)
    audit(db, obj, actor, 'edit', before, payload.reason, columns(obj, GAME_PUBLIC))
    db.flush()
    return obj


def inventory_private(obj, actor):
    return actor.role == 'admin' or (actor.role == 'user' and obj.owner_user_id == actor.id)


def inventory_detail(db, obj, actor):
    out = columns(obj, ['id', 'game_id', 'status', 'available_for_activity', 'edition_name', 'language',
                        'photo_url', 'sort_order', 'archived_at', 'revision', 'bgg_version_id'])
    snapshot = obj.bgg_version_snapshot or {}
    out['bgg_version'] = {k: snapshot.get(k) for k in ('name', 'year_published', 'languages', 'publishers',
                                                     'cover_url', 'thumbnail_url')} if snapshot else None
    owner = user_summary(db, obj.owner_user_id)
    out.update(owner={'type': obj.owner_type, 'id': obj.owner_user_id,
                       'display_name': owner['nickname'] if owner else obj.owner_label or '俱乐部'},
               permissions={'can_edit': inventory_private(obj, actor)})
    if inventory_private(obj, actor):
        out['internal'] = columns(obj, ['purchased_on', 'purchase_price', 'purchase_currency', 'storage_location', 'remark'])
    return out


def validate_inventory(db, actor, values, existing=None):
    if (values.get('purchase_price') is None) != (values.get('purchase_currency') is None):
        fail('price_currency_required_together')
    ot, uid, label = values['owner_type'], values.get('owner_user_id'), values.get('owner_label')
    if not ((ot == 'member' and uid and label is None) or (ot == 'club' and uid is None and label is None)
            or (ot == 'external' and uid is None and label)):
        fail('invalid_owner')
    if actor.role != 'admin' and (ot != 'member' or uid != actor.id or (existing and existing.owner_user_id != actor.id)):
        fail('own_inventory_only', 403)
    if uid:
        get(db, User, uid)
    if values['status'] != 'available' and values['available_for_activity']:
        fail('inventory_not_available')
    if values.get('purchased_on') and values['purchased_on'] > now().date():
        fail('future_purchase_date')
    validate_cover(values.get('photo_url'))


def create_inventory(db, actor, payload, source='manual'):
    game(db, payload.game_id, actor, usable=True, lock=True)
    values = payload.model_dump(exclude={'quantity', 'game_id'})
    validate_inventory(db, actor, values)
    rows = []
    for _ in range(payload.quantity):
        obj = Inventory(**stamp(actor, game_id=payload.game_id, entry_source=source, **values))
        db.add(obj)
        db.flush()
        audit(db, obj, actor, 'create')
        rows.append(obj)
    return rows


def patch_inventory(db, obj, actor, payload):
    if not inventory_private(obj, actor):
        fail('own_inventory_only', 403)
    check_revision(obj, payload.expected_revision)
    from app.schemas.boardgame import InventoryFields
    values = {k: getattr(obj, k) for k in InventoryFields.model_fields}
    values.update(payload.model_dump(exclude_unset=True, exclude={'expected_revision', 'reason'}))
    # Revalidate the merged object, so nullable PATCH fields cannot erase required state.
    values = InventoryFields.model_validate(values).model_dump()
    validate_inventory(db, actor, values, obj)
    # Explicitly changing an edition label/language detaches the verified BGG
    # edition. Keep the old selection in the audit, rather than reporting a
    # different physical edition under the old BGG version ID.
    detach_version = obj.bgg_version_id is not None and any(
        values[k] != getattr(obj, k) for k in ('edition_name', 'language'))
    before = columns(obj, [*values, 'bgg_version_id', 'bgg_version_snapshot'])
    for k, v in values.items():
        setattr(obj, k, v)
    if detach_version:
        obj.bgg_version_id = obj.bgg_version_snapshot = None
    touch(obj, actor)
    audit(db, obj, actor, 'edit', before, payload.reason,
          {**values, 'bgg_version_id':obj.bgg_version_id, 'bgg_version_snapshot':obj.bgg_version_snapshot})
    db.flush()
    return obj


def validate_box(db, box_id, game_id, actor, *, activity=False):
    if box_id is None:
        return
    box = get(db, Inventory, box_id, True)
    if box.game_id != game_id:
        fail('inventory_game_mismatch')
    if activity and (box.archived_at or box.status != 'available' or not box.available_for_activity):
        fail('inventory_unavailable', 409)


def validate_expansions(db, actor, base_id, selections, *, context='play'):
    unique([e.game_id for e in selections], 'duplicate_expansion')
    for e in sorted(selections, key=lambda e: e.game_id):
        expansion = game(db, e.game_id, actor, usable=True, lock=True)
        if e.game_id == base_id or expansion.game_type != 'expansion':
            fail('invalid_expansion')
        link = db.get(ExpansionLink, (base_id, e.game_id))
        allowed = link and (link.manual_decision == 'allow' or (link.manual_decision == 'inherit' and link.bgg_suggested))
        if not allowed and not e.compatibility_note:
            fail('incompatible_expansion', game_id=e.game_id)
        if context == 'nomination' and (e.inventory_id or e.bring_user_id or e.bring_label):
            fail('nomination_inventory_not_allowed')
        if e.bring_user_id and e.bring_label:
            fail('invalid_bringer')
        if context != 'plan' and (e.bring_user_id or e.bring_label):
            fail('bringer_not_allowed')
        validate_box(db, e.inventory_id, e.game_id, actor, activity=context == 'plan')


def archive(db, obj, actor, payload, restore=False):
    if isinstance(obj, BoardGame):
        if not can_edit_game(db, obj, actor):
            fail('shared_game_admin_required', 403)
    elif isinstance(obj, Inventory):
        if not inventory_private(obj, actor):
            fail('own_inventory_only', 403)
    else:
        admin(actor)
    check_revision(obj, payload.expected_revision)
    if restore and getattr(obj, 'merged_into_id', None):
        fail('merged_resource', 409)
    if not restore and not payload.reason:
        fail('reason_required')
    obj.archived_at = None if restore else now()
    if isinstance(obj, Inventory):
        obj.available_for_activity = False
    touch(obj, actor)
    audit(db, obj, actor, 'restore' if restore else 'archive', reason=payload.reason)
    db.flush()
    return obj


def provision_person(db, user):
    if user.role not in ('user', 'admin'):
        return None
    existing = db.scalar(select(Person).where(Person.user_id == user.id))
    if existing:
        return existing
    person = Person(**stamp(user, user_id=user.id, display_name=user.nickname, is_visible=True))
    db.add(person)
    db.flush()
    return person


def person_detail(db, obj, actor):
    if not obj.is_visible:
        fail('not_found', 404)
    out = columns(obj, ['id', 'display_name', 'archived_at', 'revision'])
    user = user_summary(db, obj.user_id)
    out.update(user=user, canonical_id=obj.merged_into_id, permissions={'can_edit': actor.role == 'admin'})
    if user:
        out['display_name'] = user['nickname']
    return out


def new_person(db, actor, name, visible=True):
    obj = Person(**stamp(actor, display_name=name, is_visible=visible))
    db.add(obj)
    db.flush()
    audit(db, obj, actor, 'create')
    return obj


def new_location(db, actor, name, visible=True):
    obj = Location(**stamp(actor, name=name, is_visible=visible))
    db.add(obj)
    db.flush()
    audit(db, obj, actor, 'create')
    return obj


def ruleset_configuration(payload):
    # Cosmetic module notes never determine identity. variant_key is the explicit
    # semantic identifier for a different module/rule combination.
    return {'rules': payload.rules.model_dump(), 'expansion_ids': sorted(e.game_id for e in payload.expansions)}


def create_ruleset(db, actor, game_id, payload):
    g = game(db, game_id, actor, usable=True, lock=True)
    validate_expansions(db, actor, g.id, payload.expansions)
    config = ruleset_configuration(payload)
    fingerprint = digest(config)
    obj = db.scalar(select(Ruleset).where(Ruleset.game_id == g.id, Ruleset.configuration_hash == fingerprint))
    if obj:
        return obj
    obj = Ruleset(**stamp(actor, game_id=g.id, name=payload.name, configuration=config, configuration_hash=fingerprint))
    db.add(obj)
    db.flush()
    audit(db, obj, actor, 'create')
    return obj


def correction_preview(db, box, target_game_id, actor):
    admin(actor)
    target = game(db, target_game_id, actor, usable=True, lock=True)
    if box.game_id == target.id:
        fail('same_game_correction')
    counts = {c.__table__.name: db.scalar(select(func.count()).select_from(c).where(c.inventory_id == box.id))
              for c in (GamePlan, PlanExpansion, Play, PlayExpansion)}
    data = dict(id=box.id, revision=box.revision, current_game_id=box.game_id, target_game_id=target.id,
                target_revision=target.revision, references=counts, clears_bgg_edition=bool(box.bgg_version_id))
    data['reference_hash'] = digest({c.__table__.name: [safe(dict(row)) for row in db.execute(select(c.__table__).where(
        c.inventory_id == box.id)).mappings()] for c in (GamePlan, PlanExpansion, Play, PlayExpansion)})
    return {**data, 'preview_hash': digest(data)}


def correct_inventory(db, box, actor, payload):
    check_revision(box, payload.expected_revision)
    preview = correction_preview(db, box, payload.target_game_id, actor)
    if preview['preview_hash'] != payload.preview_hash:
        fail('preview_changed', 409)
    # Future plans lose an invalid physical-box choice; historical game snapshots
    # and recorded results are deliberately preserved.
    affected = set(db.scalars(select(GamePlan.id).where(GamePlan.inventory_id == box.id)))
    affected.update(db.scalars(select(PlanExpansion.plan_id).where(PlanExpansion.inventory_id == box.id)))
    for plan in db.scalars(select(GamePlan).where(GamePlan.id.in_(affected)).order_by(GamePlan.id).with_for_update()):
        if plan.inventory_id == box.id:
            plan.inventory_id = None
        db.execute(update(PlanExpansion).where(PlanExpansion.plan_id == plan.id,
            PlanExpansion.inventory_id == box.id).values(inventory_id=None))
        touch(plan, actor)
        audit(db, plan, actor, 'inventory_game_corrected', reason=payload.reason, after={'inventory_id_cleared': box.id})
    before = columns(box, ['game_id', 'bgg_version_id', 'bgg_version_snapshot', 'edition_name', 'language'])
    box.game_id = payload.target_game_id
    if box.bgg_version_id:
        box.bgg_version_id = box.bgg_version_snapshot = None
        box.edition_name = box.language = None
    touch(box, actor)
    audit(db, box, actor, 'correct_game', before, payload.reason,
          columns(box, ['game_id', 'bgg_version_id', 'edition_name', 'language']))
    db.flush()
    return box


def merge_preview(db, cls, source_id, target_id, actor):
    admin(actor)
    if source_id == target_id:
        fail('self_merge')
    source, target = [get(db, cls, x, True) for x in (source_id, target_id)]
    if source.merged_into_id or target.merged_into_id or target.archived_at:
        fail('invalid_merge_target')
    conflicts = []
    if cls is BoardGame:
        if source.game_type != target.game_type or (source.bgg_id and target.bgg_id and source.bgg_id != target.bgg_id):
            conflicts.append('distinct_game_identity')
    else:
        if not source.is_visible or not target.is_visible:
            fail('not_found', 404)
        if source.user_id and target.user_id and source.user_id != target.user_id:
            conflicts.append('distinct_accounts')
        a = select(PlayPlayer.play_id).where(PlayPlayer.person_id == source.id)
        if db.scalar(select(PlayPlayer.id).where(PlayPlayer.person_id == target.id, PlayPlayer.play_id.in_(a)).limit(1)):
            conflicts.append('same_play_people')
    refs = {}
    target_table = cls.__table__.name
    for table in TABLES.values():
        source_columns = {fk.parent.name for fk in table.foreign_keys if fk.column.table.name == target_table}
        if source_columns and table.name != target_table:
            keys = [table.primary_key, *(c for c in table.constraints if isinstance(c, UniqueConstraint))]
            for key in keys:
                if not source_columns.intersection(c.name for c in key.columns):
                    continue
                seen = set()
                for row in db.execute(select(*key.columns).where(or_(
                    *(table.c[name].in_([source.id, target.id]) for name in source_columns)))).mappings():
                    value = tuple(target.id if name in source_columns and val == source.id else val for name, val in row.items())
                    if None in value:
                        continue
                    if value in seen:
                        conflicts.append(f'unique_relationship:{table.name}:{key.name or "primary_key"}')
                    seen.add(value)
        for fk in table.foreign_keys:
            if fk.column.table.name == target_table and table.name != target_table:
                col = fk.parent
                ids = [safe(dict(r)) for r in db.execute(select(table).where(col == source.id)).mappings()]
                # Only hashes/counts leave the service; held rows and private sources remain private.
                refs[f'{table.name}.{col.name}'] = {'count': len(ids), 'hash': digest(ids)}
    data = dict(source_id=source.id, target_id=target.id, source_revision=source.revision,
                target_revision=target.revision, conflicts=conflicts, references=refs)
    return {**data, 'preview_hash': digest(data)}


def merge(db, cls, source_id, actor, payload):
    preview = merge_preview(db, cls, source_id, payload.target_id, actor)
    source, target = get(db, cls, source_id), get(db, cls, payload.target_id)
    check_revision(source, payload.source_revision)
    check_revision(target, payload.target_revision)
    if preview['preview_hash'] != payload.preview_hash or preview['conflicts']:
        fail('merge_conflict', 409, conflicts=preview['conflicts'])
    affected = set(db.scalars(select(Play.id).where(Play.game_id == source.id))) if cls is BoardGame else set(
        db.scalars(select(PlayPlayer.play_id).where(PlayPlayer.person_id == source.id)))
    if cls is BoardGame:
        affected.update(db.scalars(select(PlayExpansion.play_id).where(PlayExpansion.expansion_game_id == source.id)))
    # Unique-key collisions roll back the entire request, requiring a fresh preview.
    for table in TABLES.values():
        for fk in table.foreign_keys:
            if fk.column.table.name == cls.__table__.name and table.name != cls.__table__.name:
                db.execute(update(table).where(fk.parent == source.id).values({fk.parent.name: target.id}))
    if cls is BoardGame:
        for rules in db.scalars(select(Ruleset).with_for_update()):
            if source.id in rules.configuration['expansion_ids']:
                rules.configuration = {**rules.configuration, 'expansion_ids': sorted({target.id if e == source.id else e
                    for e in rules.configuration['expansion_ids']})}
                rules.configuration_hash = digest(rules.configuration)
                touch(rules, actor)
    db.flush()
    from app.services.boardgame_play import children
    from app.services.boardgame_scoresheet import refresh_sheet
    for play in db.scalars(select(Play).where(Play.id.in_(affected)).execution_options(populate_existing=True)):
        people, teams, expansions = children(db, play)
        play.comparison_key = digest(dict(game_id=play.game_id,
            rules={k: v for k, v in play.rules_snapshot.items() if k != 'ruleset_id'},
            expansion_ids=sorted(e.expansion_game_id for e in expansions), player_count=len(people), tie_policy=play.tie_policy,
            team_sizes=sorted(sum(p.team_id == t.id for p in people) for t in teams)))
        touch(play, actor)
        refresh_sheet(db, play)
        audit(db, play, actor, 'identity_merged', reason=payload.reason, after={'source': source.id, 'target': target.id})
    binding = 'bgg_id' if cls is BoardGame else 'user_id'
    transferred = getattr(source, binding)
    setattr(source, binding, None)
    db.flush()
    if getattr(target, binding) is None:
        setattr(target, binding, transferred)
        if cls is BoardGame and transferred:
            for key in ('bgg_payload', 'bgg_raw_xml', 'bgg_content_hash', 'bgg_request_params', 'bgg_synced_at', 'bgg_parser_version'):
                setattr(target, key, getattr(source, key))
            project_game(target)
    source.merged_into_id, source.archived_at = target.id, now()
    touch(source, actor)
    touch(target, actor)
    audit(db, source, actor, 'merge', reason=payload.reason, after={'target_id': target.id})
    db.flush()
    return target
