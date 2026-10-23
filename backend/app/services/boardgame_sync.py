"""Sequential offline replay with savepoints, actor ownership and stable operation IDs."""

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.exceptions import AppError
from app.models.boardgame import Inventory, PlayScoresheet, SyncOperation
from app.schemas import boardgame as s, boardgame_collection as cs
from app.services import boardgame_catalog as catalog, boardgame_collection as collection
from app.services import boardgame_play as plays, boardgame_scoresheet as sheets
from app.services.boardgame_common import check_revision, digest, fail, get, member, now, safe, unique


MODELS = {'play.create':s.PlayCreate, 'play.patch':s.PlayPatch, 'scoresheet.put':s.SheetPut,
          'preference.put':cs.PreferencePut, 'prior.put':cs.PriorPut, 'inventory.patch':s.InventoryPatch,
          'game_tags.put':cs.TagLinks, 'play_tags.put':cs.TagLinks}


def mutate(db, actor, op):
    try:
        form = MODELS[op.action].model_validate(op.payload)
    except ValidationError:
        fail('invalid_sync_payload')
    if op.action == 'play.create':
        return plays.detail(db, plays.save_play(db, actor, form), actor)
    if op.action == 'play.patch':
        return plays.detail(db, plays.save_play(db, actor, form, plays.play(db, op.resource_id, actor, True)), actor)
    if op.action == 'scoresheet.put':
        obj = plays.play(db, op.resource_id, actor, True)
        if not plays.can_edit(db, obj, actor):
            fail('play_edit_forbidden', 403)
        check_revision(obj, form.expected_revision)
        return sheets.detail(db, obj, sheets.save_sheet(db, obj, actor, form.sheet, form.sheet_revision, form.reason))
    if op.action == 'preference.put':
        collection.put_preference(db, actor, op.resource_id, form)
        return collection.preference(db, actor, op.resource_id)
    if op.action == 'prior.put':
        collection.put_prior(db, actor, op.resource_id, form)
        return collection.prior(db, actor, op.resource_id)
    if op.action == 'inventory.patch':
        obj = catalog.patch_inventory(db, get(db, Inventory, op.resource_id, True), actor, form)
        return catalog.inventory_detail(db, obj, actor)
    return collection.set_tags(db, actor, 'games' if op.action == 'game_tags.put' else 'plays', op.resource_id, form)


def current_resource(db, actor, op):
    try:
        if op.action in ('play.patch','scoresheet.put'):
            obj = plays.play(db, op.resource_id, actor)
            if op.action == 'scoresheet.put':
                sheet = db.scalar(select(PlayScoresheet).where(PlayScoresheet.play_id == obj.id))
                return {'play':plays.detail(db, obj, actor), 'scoresheet':sheets.detail(db, obj, sheet) if sheet else None}
            return plays.detail(db, obj, actor)
        if op.action == 'preference.put':
            return collection.preference(db, actor, op.resource_id)
        if op.action == 'prior.put':
            return collection.prior(db, actor, op.resource_id)
        if op.action == 'inventory.patch':
            obj = get(db, Inventory, op.resource_id)
            catalog.game(db, obj.game_id, actor)
            return catalog.inventory_detail(db, obj, actor)
        if op.action in ('game_tags.put','play_tags.put'):
            return collection.tag_links(db, actor, 'games' if op.action == 'game_tags.put' else 'plays', op.resource_id)
    except AppError:
        pass
    return None


def apply_batch(db, actor, form):
    member(actor)
    unique([str(op.operation_id) for op in form.operations], 'duplicate_sync_operation')
    results = []
    for op in form.operations:
        fingerprint = digest(op.model_dump(mode='json', exclude={'operation_id'}))
        previous = db.scalar(select(SyncOperation).where(SyncOperation.user_id == actor.id,
            SyncOperation.client_id == str(form.client_id), SyncOperation.operation_id == str(op.operation_id)))
        if previous:
            if previous.request_hash != fingerprint:
                results.append({'operation_id':str(op.operation_id), 'status':'rejected', 'http_status':409,
                                'error':{'reason':'sync_operation_id_reused'}, 'replayed':False})
            else:
                results.append({**previous.response, 'replayed':True})
            continue
        try:
            with db.begin_nested():
                value = mutate(db, actor, op)
                db.flush()
            result = {'operation_id':str(op.operation_id), 'status':'applied', 'http_status':200, 'resource':safe(value)}
        except (AppError, IntegrityError) as exc:
            status = exc.status_code if isinstance(exc, AppError) else 409
            reason = exc.details if isinstance(exc, AppError) else {'reason':'concurrent_or_invalid_reference'}
            result = {'operation_id':str(op.operation_id), 'status':'conflict' if status == 409 else 'rejected',
                      'http_status':status, 'error':reason}
            if status == 409:
                result['current'] = current_resource(db, actor, op)
        db.add(SyncOperation(user_id=actor.id, client_id=str(form.client_id), operation_id=str(op.operation_id),
            request_hash=fingerprint, response=safe(result), created_at=now()))
        db.flush()
        results.append({**result, 'replayed':False})
    return {'items':results, 'server_time':safe(now()), 'conflict_policy':'explicit_resolution_new_operation_id',
            'atomicity':'each_operation', 'outbound_provider_sync':False}
