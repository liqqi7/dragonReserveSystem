from typing import Annotated, Literal
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

Id = Annotated[int, Field(gt=0)]
Name = Annotated[str, Field(min_length=1, max_length=255)]
ShortName = Annotated[str, Field(min_length=1, max_length=64)]
Reason = Annotated[str, Field(min_length=1, max_length=500)]

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class Revision(Strict):
    expected_revision: Annotated[int, Field(ge=1)]
    reason: Reason | None = None


class GameFields(Strict):
    name: Name | None = None
    aliases: list[Name] | None = Field(default=None, max_length=100)
    game_type: Literal['base', 'expansion'] | None = None
    is_standalone: bool | None = None
    cover_url: Annotated[str, Field(max_length=1024)] | None = None
    description: Annotated[str, Field(max_length=100000)] | None = None
    min_players: Id | None = None
    max_players: Id | None = None
    min_playtime_minutes: Id | None = None
    max_playtime_minutes: Id | None = None
    min_age: Annotated[int, Field(ge=0, le=100)] | None = None
    year_published: Annotated[int, Field(ge=-10000, le=10000)] | None = None
    complexity: Annotated[Decimal, Field(ge=1, le=5, decimal_places=2)] | None = None


class GameCreate(Strict):
    name: Name
    game_type: Literal['base', 'expansion'] = 'base'
    bgg_id: Id | None = None
    set_overrides: GameFields = Field(default_factory=GameFields)
    is_visible: bool = True
    sort_order: int = 0


class InventoryFields(Strict):
    owner_type: Literal['member'] = 'member'
    owner_user_id: Id | None = None
    owner_label: ShortName | None = None
    status: Literal['unverified', 'available', 'borrowed', 'unavailable', 'retired'] = 'unverified'
    edition_name: Name | None = None
    language: ShortName | None = None
    remark: Annotated[str, Field(max_length=5000)] | None = None
    sort_order: int = 0


class InventoryCreate(InventoryFields):
    game_id: Id
    quantity: Annotated[int, Field(ge=1, le=1)] = 1


class InventoryVersionChange(Revision):
    bgg_version_id: Id
