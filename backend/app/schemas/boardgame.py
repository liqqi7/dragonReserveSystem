"""Validated write contracts for the board game domain."""

from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, create_model, model_validator

Id = Annotated[int, Field(gt=0)]
Score = Annotated[Decimal, Field(max_digits=12, decimal_places=3, allow_inf_nan=False)]
CellNumber = Annotated[Decimal, Field(max_digits=18, decimal_places=6, allow_inf_nan=False)]
Name = Annotated[str, Field(min_length=1, max_length=255)]
ShortName = Annotated[str, Field(min_length=1, max_length=64)]
Reason = Annotated[str, Field(min_length=1, max_length=500)]
Mode = Literal['unscored', 'individual', 'team', 'cooperative', 'solo']
Direction = Literal['none', 'high', 'low', 'manual']
Outcome = Literal['win', 'loss', 'draw']
ScoreStatus = Literal['unrecorded', 'recorded', 'gave_up', 'unfinished', 'table_flip']


class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class Revision(Strict):
    expected_revision: Annotated[int, Field(ge=1)]
    reason: Reason | None = None


class RequiredReason(Revision):
    reason: Reason


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


class DefaultRules(Strict):
    competition_mode: Mode = 'unscored'
    score_direction: Direction = 'none'
    variant_key: Annotated[str, Field(max_length=128)] = ''
    rules_version: Annotated[str, Field(max_length=64)] = '1'


class GameCreate(Strict):
    name: Name
    game_type: Literal['base', 'expansion'] = 'base'
    bgg_id: Id | None = None
    set_overrides: GameFields = Field(default_factory=GameFields)
    default_rules: DefaultRules = Field(default_factory=DefaultRules)
    is_visible: bool = True
    sort_order: int = 0


class GamePatch(Revision):
    set_overrides: GameFields = Field(default_factory=GameFields)
    clear_overrides: list[str] = Field(default_factory=list, max_length=20)
    default_rules: DefaultRules | None = None
    is_visible: bool | None = None
    sort_order: int | None = None


class Binding(RequiredReason):
    bgg_id: Id | None


class InventoryFields(Strict):
    owner_type: Literal['member', 'club', 'external'] = 'member'
    owner_user_id: Id | None = None
    owner_label: ShortName | None = None
    status: Literal['unverified', 'available', 'borrowed', 'unavailable', 'retired'] = 'unverified'
    available_for_activity: bool = False
    purchased_on: date | None = None
    purchase_price: Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2)] | None = None
    purchase_currency: Annotated[str, Field(pattern=r'^[A-Z]{3}$')] | None = None
    edition_name: Name | None = None
    language: ShortName | None = None
    storage_location: Name | None = None
    photo_url: Annotated[str, Field(max_length=1024)] | None = None
    remark: Annotated[str, Field(max_length=5000)] | None = None
    sort_order: int = 0


class InventoryCreate(InventoryFields):
    game_id: Id
    quantity: Annotated[int, Field(ge=1, le=20)] = 1


def patch_model(name, source, base=Revision, exclude=()):
    return create_model(name, __base__=base, **{
        k: (v.annotation | None, None) for k, v in source.model_fields.items() if k not in exclude
    })


InventoryPatch = patch_model('InventoryPatch', InventoryFields)


class Expansion(Strict):
    game_id: Id
    modules_note: Reason | None = None
    compatibility_note: Reason | None = None
    inventory_id: Id | None = None
    bring_user_id: Id | None = None
    bring_label: ShortName | None = None
    sort_order: int = 0


class NominationInput(Strict):
    expected_revision: Annotated[int, Field(ge=0)]
    note: Reason | None = None
    expansions: list[Expansion] = Field(default_factory=list, max_length=50)


class Compatibility(NominationInput):
    manual_decision: Literal['inherit', 'allow', 'block']


class PlanCreate(Strict):
    game_id: Id
    inventory_id: Id | None = None
    bring_user_id: Id | None = None
    bring_label: ShortName | None = None
    table_label: ShortName | None = None
    note: Annotated[str, Field(max_length=1000)] | None = None
    sort_order: int = 0
    expansions: list[Expansion] = Field(default_factory=list, max_length=50)


PlanPatch = patch_model('PlanPatch', PlanCreate)


class OrderItem(Revision):
    id: Id
    sort_order: int


class PlanOrder(Strict):
    items: list[OrderItem] = Field(max_length=100)


class PlayerInput(Strict):
    id: Id | None = None
    user_id: Id | None = None
    person_id: Id | None = None
    guest_key: UUID | None = None
    display_name: ShortName | None = None
    participant_kind: Literal['human', 'automa'] = 'human'
    seat_order: Id
    score: Score | None = None
    score_status: ScoreStatus | None = None
    rank: Id | None = None
    outcome: Outcome | None = None
    team_key: ShortName | None = None
    is_start_player: bool = False
    role_label: Annotated[str, Field(max_length=100)] | None = None
    is_new_to_player: bool | None = None

    @model_validator(mode='after')
    def identity(self):
        if sum(v is not None for v in (self.user_id, self.person_id, self.guest_key)) != 1:
            raise ValueError('Exactly one of user_id, person_id and guest_key is required')
        if self.guest_key is not None and not self.display_name:
            raise ValueError('Anonymous players require display_name')
        if self.participant_kind == 'automa' and self.guest_key is None:
            raise ValueError('Automa requires a separate guest identity, not a member account')
        return self


class ObserverInput(Strict):
    id: Id | None = None
    user_id: Id | None = None
    person_id: Id | None = None
    guest_key: UUID | None = None
    display_name: ShortName | None = None
    observer_role: Literal['teacher', 'moderator']

    @model_validator(mode='after')
    def identity(self):
        if sum(v is not None for v in (self.user_id, self.person_id, self.guest_key)) != 1:
            raise ValueError('Exactly one observer identity is required')
        if self.guest_key is not None and not self.display_name:
            raise ValueError('Anonymous observers require display_name')
        return self


class TeamInput(Strict):
    id: Id | None = None
    client_key: ShortName
    name: ShortName
    score: Score | None = None
    score_status: ScoreStatus | None = None
    rank: Id | None = None
    outcome: Outcome | None = None
    sort_order: int = 0


class SheetOption(Strict):
    key: ShortName
    label: Name
    value: CellNumber


class SheetRow(Strict):
    key: Annotated[str, Field(min_length=1, max_length=128)]
    label: Name
    is_aggregate: bool = False
    kind: Literal['number', 'radio', 'checkbox', 'choice', 'text', 'subtotal'] = 'number'
    contributes: bool = True
    selection_value: CellNumber = Decimal('1')
    options: list[SheetOption] = Field(default_factory=list, max_length=30)
    repeatable: bool = False
    repeat_of: Annotated[str, Field(max_length=128)] | None = None


class SheetGroup(Strict):
    key: Annotated[str, Field(min_length=1, max_length=128)]
    label: Name
    kind: Literal['round', 'category'] = 'category'
    rows: list[SheetRow] = Field(max_length=500)


class SheetSubject(Strict):
    key: ShortName
    kind: Literal['player', 'team', 'shared']
    player_id: Id | None = None
    team_id: Id | None = None


class SheetCell(Strict):
    row_key: Annotated[str, Field(max_length=128)]
    subject_key: ShortName
    value_number: CellNumber | None = None
    value_text: Annotated[str, Field(max_length=1000)] | None = None
    expression: Annotated[str, Field(max_length=256)] | None = None
    checked: bool | None = None
    option_key: ShortName | None = None
    subtotal_override: CellNumber | None = None


class SheetTotal(Strict):
    subject_key: ShortName
    value_number: Score | None = None


class Sheet(Strict):
    schema_version: Literal[1, 2] = 1
    template_key: Annotated[str, Field(max_length=128)] | None = None
    template_id: Id | None = None
    template_family: ShortName | None = None
    template_version: Id | None = None
    sheet_type: Literal['generic', 'rounds'] = 'generic'
    scoring_method: Literal['best_total', 'best_round', 'rounds_won', 'scores_only'] = 'best_total'
    apply_totals: bool = False
    groups: list[SheetGroup] = Field(max_length=100)
    subjects: list[SheetSubject] = Field(max_length=100)
    cells: list[SheetCell] = Field(max_length=20000)
    recorded_totals: list[SheetTotal] = Field(default_factory=list, max_length=100)


class SheetPut(Revision):
    sheet_revision: Annotated[int, Field(ge=0)]
    sheet: Sheet


class SheetReview(RequiredReason):
    sheet_revision: Id
    semantic_version: ShortName
    additive_row_keys: list[str] = Field(default_factory=list, max_length=500)


class TemplateSelection(Strict):
    expansion_ids: list[Id] = Field(default_factory=list, max_length=50)
    variant_key: Annotated[str, Field(max_length=128)] = ''
    min_players: Annotated[int, Field(ge=1, le=100)] | None = None
    max_players: Annotated[int, Field(ge=1, le=100)] | None = None
    mode: Mode | None = None


class TemplateCreate(Strict):
    game_id: Id
    name: Name
    template_family: ShortName
    version_number: Id
    semantic_version: ShortName
    selection: TemplateSelection = Field(default_factory=TemplateSelection)
    definition: Sheet
    additive_row_keys: list[str] = Field(default_factory=list, max_length=500)


class TemplateUse(Revision):
    sheet_revision: Annotated[int, Field(ge=0)]
    template_id: Id | None = None
    builtin: Literal['generic', 'rounds'] | None = None
    round_count: Annotated[int, Field(ge=1, le=100)] = 1
    scoring_method: Literal['best_total', 'best_round', 'rounds_won', 'scores_only'] = 'best_total'


class PlayCreate(Strict):
    game_id: Id
    activity_id: Id | None = None
    plan_id: Id | None = None
    inventory_id: Id | None = None
    played_on: date | None = None
    started_at: datetime | None = None
    duration_minutes: Annotated[int, Field(ge=1, le=100000)] | None = None
    round_count: Annotated[int, Field(ge=1, le=10000)] | None = None
    location_label: Name | None = None
    location_id: Id | None = None
    play_environment: Literal['online', 'offline', 'unknown'] = 'unknown'
    status: Literal['draft', 'completed', 'abandoned'] = 'draft'
    competition_mode: Mode = 'unscored'
    score_direction: Direction = 'none'
    result_status: Literal['unknown', 'resolved'] = 'unknown'
    result_source: Literal['auto', 'unknown', 'score', 'manual_winner', 'manual_rank', 'tiebreak', 'source'] = 'auto'
    result_reason: Reason | None = None
    stats_exclusion: Literal['none', 'wins', 'all'] = 'none'
    exclusion_reason: Reason | None = None
    tie_policy: Literal['shared_win', 'draw'] = 'shared_win'
    shared_score: Score | None = None
    shared_score_status: ScoreStatus | None = None
    end_reason: Literal['unfinished', 'table_flip'] | None = None
    cooperative_result: Literal['success', 'failure'] | None = None
    ruleset_id: Id | None = None
    rules_snapshot: DefaultRules = Field(default_factory=DefaultRules)
    note: Annotated[str, Field(max_length=5000)] | None = None
    players: list[PlayerInput] = Field(default_factory=list, max_length=100)
    observers: list[ObserverInput] = Field(default_factory=list, max_length=30)
    teams: list[TeamInput] = Field(default_factory=list, max_length=50)
    expansions: list[Expansion] = Field(default_factory=list, max_length=50)
    duplicate_ack_ids: list[Id] = Field(default_factory=list, max_length=100)


class PlayPatchExtras(Revision):
    sheet: Sheet | None = None
    sheet_revision: Annotated[int, Field(ge=0)] | None = None
    clear_scoresheet: bool = False


PlayPatch = patch_model('PlayPatch', PlayCreate, PlayPatchExtras)


class PlayRestore(RequiredReason):
    target_status: Literal['draft', 'completed', 'abandoned']


class PlayCopy(Strict):
    activity_id: Id | None = None


class TimerAction(Revision):
    action: Literal['start', 'pause', 'resume', 'stop', 'restore']


class PersonCreate(Strict):
    display_name: ShortName


class PersonPatch(RequiredReason):
    display_name: ShortName


class AccountBinding(RequiredReason):
    user_id: Id | None


class LocationCreate(Strict):
    name: Name


class LocationPatch(RequiredReason):
    name: Name


class Merge(Strict):
    target_id: Id
    source_revision: Id
    target_revision: Id
    preview_hash: Annotated[str, Field(min_length=64, max_length=64)]
    reason: Reason


class InventoryCorrection(RequiredReason):
    target_game_id: Id
    preview_hash: Annotated[str, Field(min_length=64, max_length=64)]


class ReportCreate(Strict):
    message: Annotated[str, Field(min_length=1, max_length=1000)]


class ReportPatch(Revision):
    status: Literal['resolved', 'dismissed']
    resolution: Annotated[str, Field(min_length=1, max_length=1000)]


class RulesetCreate(Strict):
    name: Annotated[str, Field(min_length=1, max_length=128)]
    rules: DefaultRules = Field(default_factory=DefaultRules)
    expansions: list[Expansion] = Field(default_factory=list, max_length=50)
