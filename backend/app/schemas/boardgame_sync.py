"""Versioned inbound client mutations. No provider writeback or arbitrary HTTP proxy."""

from typing import Literal
from uuid import UUID

from pydantic import Field, model_validator

from app.schemas.boardgame import Id, Strict


class SyncMutation(Strict):
    operation_id: UUID
    action: Literal['play.create', 'play.patch', 'scoresheet.put', 'preference.put', 'prior.put', 'inventory.patch',
                    'game_tags.put', 'play_tags.put']
    resource_id: Id | None = None
    payload: dict

    @model_validator(mode='after')
    def target(self):
        if (self.action == 'play.create') != (self.resource_id is None):
            raise ValueError('Only play.create omits resource_id')
        return self


class SyncBatch(Strict):
    client_id: UUID
    operations: list[SyncMutation] = Field(min_length=1, max_length=20)
