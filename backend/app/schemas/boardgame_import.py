"""Import jobs, review decisions and explicit source mappings."""

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import Field, model_validator

from app.schemas.boardgame import (Strict, Id, Revision, Reason, ShortName, Name, InventoryCreate,
                                   PlayCreate, PlayPatch, GameCreate)


class ImportCreate(Strict):
    kind: Literal['bgg_thing', 'bgg_collection', 'bgg_plays']
    ids: list[Id] = Field(default_factory=list, max_length=20)
    username: str | None = Field(None, min_length=1, max_length=64, pattern=r'^[A-Za-z0-9_ .-]+$')
    from_date: date | None = Field(None, alias='from')
    to_date: date | None = Field(None, alias='to')
    owner_user_id: Id | None = None

    @model_validator(mode='after')
    def shape(self):
        if self.kind == 'bgg_thing':
            if not self.ids or self.username or self.from_date or self.to_date:
                raise ValueError('Thing requires only ids')
        elif not self.username or self.ids:
            raise ValueError('Collection/plays require username')
        if (self.from_date is None) != (self.to_date is None):
            raise ValueError('Both date boundaries are required')
        if self.from_date and self.from_date > self.to_date:
            raise ValueError('Invalid date boundaries')
        return self


class PlayerMapping(Strict):
    source_player_ref: str
    source_slot: Id
    source_score_uuid: str | None = Field(None, max_length=128)
    is_anonymous: bool = False
    person_id: Id | None = None
    create_person: dict[str, ShortName] | None = None
    guest_label: ShortName | None = None

    @model_validator(mode='after')
    def identity(self):
        if self.is_anonymous:
            if self.person_id or self.create_person or not self.guest_label:
                raise ValueError('Anonymous slots require only guest_label')
        elif bool(self.person_id) == bool(self.create_person):
            raise ValueError('Choose person_id or create_person')
        if self.create_person and set(self.create_person) != {'display_name'}:
            raise ValueError('Invalid create_person')
        return self


class ImportDecision(Strict):
    action: Literal['create_game', 'update_game', 'create_inventory', 'link_inventory', 'create_play', 'link_play', 'update_play', 'skip']
    reason: Reason | None = None
    target_game_id: Id | None = None
    target_inventory_id: Id | None = None
    target_play_id: Id | None = None
    target_revision: Id | None = None
    target_play_revision: Id | None = None
    game: GameCreate | None = None
    inventory: InventoryCreate | None = None
    players: list[PlayerMapping] = Field(default_factory=list, max_length=100)
    location_id: Id | None = None
    create_location: dict[str, Name] | None = None
    keep_unclassified: bool = False
    # Final normalized form is optional, so the worker can project a reviewed source.
    play: PlayCreate | None = None
    acknowledged_issues: list[str] = Field(default_factory=list, max_length=100)
    segment_count: int = Field(1, ge=1, le=100)
    segments: list[PlayCreate] = Field(default_factory=list, max_length=100)
    # Each entry maps an edited segment player back to a reviewed source slot.
    # Null means an explicitly selected local participant, without a source identity.
    segment_player_slots: list[list[int | None]] = Field(default_factory=list, max_length=100)
    expansion_game_ids: list[Id] = Field(default_factory=list, max_length=50)
    compatibility_note: Reason | None = None
    replace_scoresheet: bool = False


class ItemPatch(Revision):
    decision: ImportDecision


class Selection(Strict):
    id: Id
    expected_revision: Id


class Apply(Revision):
    selection: list[Selection] = Field(min_length=1, max_length=1000)


class Retry(Revision):
    item_ids: list[Id] = Field(default_factory=list, max_length=1000)


class Mapping(Strict):
    provider: Literal['bgg', 'bgstats']
    source_namespace: str = Field(min_length=1, max_length=128)
    entity_type: Literal['game', 'player', 'location']
    external_id: str = Field(min_length=1, max_length=128)
    mapping_revision: int = Field(ge=0)
    target_game_id: Id | None = None
    target_person_id: Id | None = None
    target_location_id: Id | None = None


class MappingsPut(Revision):
    items: list[Mapping] = Field(min_length=1, max_length=1000)


class HeldPatch(Revision):
    play: PlayPatch


class PublishSelection(Strict):
    item_id: Id
    play_id: Id
    expected_revision: Id
    review_token: str = Field(min_length=64, max_length=64)


class Publish(Revision):
    selection: list[PublishSelection] = Field(min_length=1, max_length=100)
    reason: Reason
    acknowledge_public: Literal[True]
    acknowledge_unmatched_people: bool = False
