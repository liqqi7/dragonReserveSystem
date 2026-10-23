cat = '/tmp/dragonReserveSystem-main-20261007/backend/app/services/boardgame_catalog.py'
s = open(cat).read()

old = """    existing = db.scalar(select(Inventory).where(Inventory.game_id == payload.game_id,
        Inventory.owner_user_id == actor.id, Inventory.archived_at.is_(None)).with_for_update())
    if existing:
        fail('already_owned', 409, inventory_id=existing.id)
    values = payload.model_dump(exclude={'quantity','game_id','owner_user_id'})"""

new = """    existing = db.scalar(select(Inventory).where(Inventory.game_id == payload.game_id,
        Inventory.owner_user_id == actor.id).with_for_update())
    values = payload.model_dump(exclude={'quantity','game_id','owner_user_id'})
    if existing:
        if existing.archived_at is None:
            fail('already_owned', 409, inventory_id=existing.id)
        before = columns(existing, ['id', 'game_id', 'owner_user_id', 'status', 'edition_name', 'language',
                                    'bgg_version_id', 'bgg_version_snapshot', 'remark', 'archived_at', 'revision'])
        for key, value in values.items():
            setattr(existing, key, value)
        existing.archived_at = None
        touch(existing, actor)
        audit(db, existing, actor, 'restore', before, None,
              columns(existing, ['id', 'game_id', 'owner_user_id', 'status', 'edition_name', 'language',
                                 'bgg_version_id', 'bgg_version_snapshot', 'remark', 'archived_at', 'revision']))
        db.flush()
        return [existing]"""

assert old in s, 'anchor not found'
s = s.replace(old, new, 1)
open(cat, 'w').write(s)
print('revive patched')
