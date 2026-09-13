"""One query contract shared by charts, tables and play drilldowns."""

from datetime import date
from typing import Literal

from pydantic import Field

from app.schemas.boardgame import Strict, Id, Mode


class PlayQuery(Strict):
    scope: Literal['all', 'mine'] = 'all'
    period: Literal['all', 'month', 'quarter', 'year', 'custom'] = 'all'
    year: int | None = Field(None, ge=1, le=9998)
    month: int | None = Field(None, ge=1, le=12)
    quarter: int | None = Field(None, ge=1, le=4)
    from_date: date | None = Field(None, alias='from')
    to_date: date | None = Field(None, alias='to')
    activity_ids: list[Id] = Field(default_factory=list, max_length=50)
    activity_missing: bool | None = None
    game_id: Id | None = None
    inventory_id: Id | None = None
    eligible_only: bool = False
    origin: Literal['manual', 'bgg', 'bgstats'] | None = None
    mode: Mode | None = None
    comparison_key: str | None = Field(None, min_length=64, max_length=64)
    environment: Literal['all', 'online', 'offline', 'unknown'] = 'all'
    location_ids: list[Id] = Field(default_factory=list, max_length=50)
    location_missing: bool | None = None
    person_ids: list[Id] = Field(default_factory=list, max_length=50)
    person_match: Literal['any', 'all', 'exactly'] | None = None
    player_counts: list[int] = Field(default_factory=list, max_length=100)
    player_count: int | None = Field(None, ge=1, le=100)
    expansion_ids: list[Id] = Field(default_factory=list, max_length=50)
    expansion_match: Literal['any', 'all', 'exactly'] | None = None
    without_expansions: bool = False
    tag_ids: list[Id] = Field(default_factory=list, max_length=50)
    tag_match: Literal['any', 'all'] = 'any'
    exclude_tag_ids: list[Id] = Field(default_factory=list, max_length=50)
    exclude_game_ids: list[Id] = Field(default_factory=list, max_length=100)
    new_to_person_id: Id | None = None
    subject_person_id: Id | None = None
    user_id: Id | None = None
    weekdays: list[int] = Field(default_factory=list, max_length=7)
    role_label: str | None = Field(None, max_length=100)
    role_missing: bool | None = None
    sheet_comparison_key: str | None = Field(None, min_length=64, max_length=64)
    row_key: str | None = Field(None, max_length=128)
    result_filter: Literal['eligible', 'winner', 'non_winner', 'draw', 'unknown'] | None = None
    first_player: bool | None = None
    new_player: bool | None = None
    variant_key: str | None = Field(None, max_length=128)
    tiebreak_only: bool = False
    recorded_by: Literal['me'] | None = None
    status: Literal['draft', 'completed', 'abandoned', 'voided'] | None = None
    sort: str = 'play_count'
    limit: int = Field(20, ge=1, le=100)
    cursor: str | None = Field(None, max_length=4096)
    bucket: Literal['day', 'month', 'quarter', 'year', 'activity'] = 'month'
    dimension: Literal['weekday', 'player_count', 'environment'] = 'weekday'
    base_game_id: Id | None = None
