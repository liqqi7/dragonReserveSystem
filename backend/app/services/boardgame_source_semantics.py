"""Verified export fields projected conservatively; opaque setting codes stay raw."""
from datetime import datetime
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo

from app.core.exceptions import AppError
from app.services.boardgame_calculation import expression_value


def source_number(value, issues):
    from app.services.boardgame_sources import decimal_score
    if isinstance(value, str) and any(c in value for c in '+-*/()'):
        try:
            number = expression_value(value)
            if number != number.quantize(Decimal('.001')):
                raise ValueError()
            return decimal_score(str(number.quantize(Decimal('.001'))), issues)
        except (AppError, ValueError, InvalidOperation):
            issues.append('source_expression_requires_review')
            return None
    return decimal_score(value, issues)


def started_at(value, timezone, issues):
    if not isinstance(value, str) or len(value) <= 10:
        return None
    try:
        parsed = datetime.fromisoformat(value)
        # BG Stats may fill date-only records with midnight; do not invent a time.
        if (parsed.hour, parsed.minute, parsed.second) == (0, 0, 0):
            return None
        if parsed.tzinfo is None:
            zone = ZoneInfo(timezone)
            early, late = parsed.replace(tzinfo=zone, fold=0), parsed.replace(tzinfo=zone, fold=1)
            if early.utcoffset() != late.utcoffset():
                issues.append('ambiguous_source_time')
                return None
            parsed = early
        return parsed.isoformat()
    except (ValueError, TypeError):
        issues.append('unknown_source_time')
        return None


def competitive_results(units, direction, issues):
    """False alone is not evidence of a resolved result. Known winners are verified."""
    if not any(u.get('source_winner') is True for u in units):
        return False
    winners = [u for u in units if u.get('source_winner') is True]
    if any(u.get('source_rank') and ((u in winners and u['source_rank'] != 1) or
        (u not in winners and u['source_rank'] == 1)) for u in units):
        issues.append('source_winner_rank_conflict')
        return False
    if direction in ('high', 'low') and all(u.get('score') is not None for u in units):
        best = (max if direction == 'high' else min)(Decimal(u['score']) for u in units)
        if {id(u) for u in winners} != {id(u) for u in units if Decimal(u['score']) == best}:
            issues.append('source_winner_score_or_tiebreak_review')
            return False
    return True


def copy_projection(copy, metadata, issues):
    from app.services.boardgame_sources import positive
    values = dict(edition_name=copy.get('versionName') or None, purchased_on=None,
        storage_location=metadata.get('InventoryLocation') or None, remark=metadata.get('PrivateComment') or None,
        purchase_price=None, purchase_currency=None)
    day = metadata.get('AcquisitionDate') or copy.get('acquisitionDate')
    if day:
        try:
            values['purchased_on'] = datetime.fromisoformat(str(day)).date().isoformat()
        except ValueError:
            issues.append('source_purchase_date_requires_review')
    price, currency = metadata.get('PricePaid'), metadata.get('PricePaidCurrency')
    if price not in (None, '') or currency not in (None, ''):
        try:
            number = Decimal(str(price))
            if not number.is_finite() or not 0 <= number < Decimal('1000000000000') or number != number.quantize(Decimal('.01')) or not isinstance(currency, str) or len(currency) != 3 or not currency.isascii() or not currency.isalpha():
                raise ValueError()
            values.update(purchase_price=str(number), purchase_currency=currency.upper())
        except (ValueError, InvalidOperation):
            issues.append('source_purchase_price_requires_review')
    if copy.get('statusOwned') not in (True, 1):
        issues.append('source_copy_not_currently_owned')
    return values
