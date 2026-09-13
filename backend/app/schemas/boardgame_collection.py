"""Personal collection, tags and reusable filters; prices belong to physical copies."""

from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import Field

from app.schemas.boardgame import Id, Name, Reason, Revision, Strict


class PreferencePut(Strict):
    expected_revision: Annotated[int, Field(ge=0)]
    rating: Annotated[Decimal, Field(ge=1, le=10, decimal_places=1)] | None = None
    wishlist: bool = False
    preordered: bool = False
    want_to_play: bool = False
    note: Annotated[str, Field(max_length=5000)] | None = None


class PriorPut(Strict):
    expected_revision: Annotated[int, Field(ge=0)]
    played_before: bool = True
    approximate_count: Annotated[int, Field(ge=1, le=1000000)] | None = None
    note: Reason | None = None


class TagCreate(Strict):
    name: Annotated[str, Field(min_length=1, max_length=64)]


class TagPatch(Revision):
    name: Annotated[str, Field(min_length=1, max_length=64)] | None = None
    is_active: bool | None = None


class TagLinks(Strict):
    expected_hash: Annotated[str, Field(min_length=64, max_length=64)]
    tag_ids: list[Id] = Field(default_factory=list, max_length=100)


class GameQuery(Strict):
    q: str = Field('', max_length=255)
    game_type: Literal['base', 'expansion'] | None = None
    inventory_scope: Literal['all', 'mine'] = 'all'
    available_for_activity: bool | None = None
    owned: bool | None = None
    played: bool | None = None
    wishlist: bool | None = None
    preordered: bool | None = None
    want_to_play: bool | None = None
    min_rating: Decimal | None = Field(None, ge=1, le=10)
    max_rating: Decimal | None = Field(None, ge=1, le=10)
    player_count: int | None = Field(None, ge=1, le=100)
    max_minutes: int | None = Field(None, ge=1, le=100000)
    min_complexity: Decimal | None = Field(None, ge=1, le=5)
    max_complexity: Decimal | None = Field(None, ge=1, le=5)
    purchased_from: date | None = None
    purchased_to: date | None = None
    tag_ids: list[Id] = Field(default_factory=list, max_length=50)
    tag_match: Literal['any', 'all'] = 'any'
    exclude_tag_ids: list[Id] = Field(default_factory=list, max_length=50)
    exclude_game_ids: list[Id] = Field(default_factory=list, max_length=100)
    sort: Literal['manual', 'recent', 'name'] = 'manual'
    limit: int = Field(20, ge=1, le=100)
    cursor: str | None = Field(None, max_length=4096)


class SavedFilterCreate(Strict):
    name: Annotated[str, Field(min_length=1, max_length=64)]
    target: Literal['games', 'plays', 'statistics']
    query: dict


class SavedFilterPatch(Revision):
    name: Annotated[str, Field(min_length=1, max_length=64)] | None = None
    query: dict | None = None
