from datetime import date
from decimal import Decimal
from typing import Annotated

from pydantic import Field

from app.schemas.boardgame import Id, ShortName, Strict, Revision


class PlayPlayerIn(Strict):
    user_id: Id
    display_name: ShortName | None = None
    score: Annotated[Decimal, Field(ge=Decimal('-99999'), le=Decimal('999999'),
                                    max_digits=9, decimal_places=2)] | None = None


class PlayCreate(Strict):
    game_id: Id
    played_on: date
    players: Annotated[list[PlayPlayerIn], Field(min_length=1, max_length=20)]
    expansion_game_ids: list[Id] = Field(default_factory=list, max_length=50)


class PlayUpdate(Revision):
    played_on: date | None = None
    players: Annotated[list[PlayPlayerIn], Field(min_length=1, max_length=20)] | None = None
    expansion_game_ids: list[Id] | None = None
