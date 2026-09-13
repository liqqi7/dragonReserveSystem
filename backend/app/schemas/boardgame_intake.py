"""Name-search intake; image recognition is deliberately a separate extension."""
from typing import Literal
from uuid import UUID

from pydantic import Field, model_validator

from app.schemas.boardgame import Strict, Id, Name, GameCreate, InventoryFields


class PreviewCreate(Strict):
    bgg_ids: list[Id] = Field(min_length=1, max_length=20)

    @model_validator(mode='after')
    def unique_ids(self):
        self.bgg_ids = list(dict.fromkeys(self.bgg_ids))
        return self


class IntakeInventory(InventoryFields):
    quantity: int = Field(default=1, ge=1, le=20)


class IntakeConfirm(Strict):
    source: Literal['bgg', 'manual']
    preview_id: UUID | None = None
    item_id: Id | None = None
    expected_revision: Id | None = None
    bgg_version_id: Id | None = None
    version_unspecified: bool = False
    display_name: Name | None = None
    game: GameCreate | None = None
    inventory: IntakeInventory | None = None

    @model_validator(mode='after')
    def shape(self):
        if self.source == 'bgg':
            if not self.preview_id or not self.item_id or not self.expected_revision or self.game:
                raise ValueError('BGG intake requires a prepared candidate')
            if bool(self.bgg_version_id) == self.version_unspecified:
                raise ValueError('Choose a version or explicitly leave it unspecified')
            if self.bgg_version_id and self.inventory is None:
                raise ValueError('A selected physical edition requires an inventory copy')
        elif (not self.game or self.game.bgg_id or self.preview_id or self.item_id
              or self.expected_revision or self.bgg_version_id or self.display_name or self.version_unspecified):
            raise ValueError('Manual intake requires only local game fields and optional inventory')
        return self
