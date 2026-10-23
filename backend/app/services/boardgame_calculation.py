"""Bounded decimal arithmetic and typed, deterministic score sheet calculation."""

import ast
from decimal import Decimal, DecimalException, ROUND_HALF_UP, localcontext
import re

from app.schemas.boardgame import SheetCell, SheetTotal
from app.services.boardgame_common import fail, unique

PRECISION = Decimal('0.000001')
MAX_VALUE = Decimal('999999999999.999999')


def expression_value(expression):
    if not expression or len(expression) > 256 or not re.fullmatch(r'[0-9.\s+*/()\-]+', expression):
        fail('invalid_score_expression')
    depth = 0
    for char in expression:
        depth += (char == '(') - (char == ')')
        if depth > 20:
            fail('score_expression_too_complex')
    try:
        tree = ast.parse(expression.strip(), mode='eval')
        if len(list(ast.walk(tree))) > 128:
            fail('score_expression_too_complex')

        def walk(node, depth=0):
            if depth > 20:
                fail('score_expression_too_complex')
            if isinstance(node, ast.Expression):
                return walk(node.body, depth + 1)
            if isinstance(node, ast.Constant) and type(node.value) in (float, int):
                value = Decimal(ast.get_source_segment(expression.strip(), node))
            elif isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
                value = walk(node.operand, depth + 1) * (-1 if isinstance(node.op, ast.USub) else 1)
            elif isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div)):
                left, right = walk(node.left, depth + 1), walk(node.right, depth + 1)
                if isinstance(node.op, ast.Div) and right == 0:
                    fail('score_division_by_zero')
                value = left + right if isinstance(node.op, ast.Add) else left - right if isinstance(node.op, ast.Sub) else left * right if isinstance(node.op, ast.Mult) else left / right
            else:
                fail('invalid_score_expression')
            if not value.is_finite() or abs(value) > MAX_VALUE:
                fail('score_expression_out_of_range')
            return value

        with localcontext() as context:
            context.prec = 32
            return walk(tree).quantize(PRECISION, rounding=ROUND_HALF_UP)
    except (SyntaxError, DecimalException, ValueError, RecursionError):
        fail('invalid_score_expression')


def calculate(form, direction='high', excluded_subjects=()):
    """Return normalized cells and totals; missing numeric inputs stay unknown."""
    form = form.model_copy(deep=True)
    unique([g.key for g in form.groups], 'duplicate_group_key')
    unique([r.key for g in form.groups for r in g.rows], 'duplicate_row_key')
    unique([s.key for s in form.subjects], 'duplicate_subject_key')
    unique([(c.row_key, c.subject_key) for c in form.cells], 'duplicate_cell')
    if sum(len(g.rows) for g in form.groups) > 500 or sum(len(g.rows) for g in form.groups) * len(form.subjects) > 20000:
        fail('too_many_sheet_rows')
    if form.sheet_type != 'rounds' and form.scoring_method in ('best_round', 'rounds_won'):
        fail('round_scoring_requires_round_sheet')
    cells = {(c.row_key, c.subject_key): c for c in form.cells}
    rows = {r.key for g in form.groups for r in g.rows}
    subjects = {s.key for s in form.subjects}
    if any(c.row_key not in rows or c.subject_key not in subjects for c in form.cells):
        fail('unknown_cell_reference')
    group_values = {s.key: [] for s in form.subjects}
    expression_count = 0
    for group in form.groups:
        by_key = {r.key: r for r in group.rows}
        subtotals = [r for r in group.rows if r.kind == 'subtotal']
        if len(subtotals) > 1:
            fail('one_subtotal_per_group')
        for row in group.rows:
            if row.kind == 'subtotal':
                row.is_aggregate = True
            if row.kind == 'text':
                row.contributes = False
            if row.repeat_of:
                parent = by_key.get(row.repeat_of)
                if not parent or not parent.repeatable or parent.repeat_of or row.repeat_of == row.key or row.kind == 'subtotal':
                    fail('invalid_repeated_row')
                if any(getattr(row, field) != getattr(parent, field) for field in ('kind', 'contributes', 'selection_value', 'options')):
                    fail('repeated_row_semantics_mismatch')
            unique([o.key for o in row.options], 'duplicate_choice_option')
            if row.kind == 'choice' and not row.options:
                fail('choice_options_required')
            if row.kind != 'choice' and row.options:
                fail('options_require_choice_row')
            checked = [s.key for s in form.subjects if cells.get((row.key, s.key)) and cells[(row.key, s.key)].checked is True]
            if row.kind == 'radio' and len(checked) > 1:
                fail('radio_requires_single_subject')
            for subject in form.subjects:
                cell = cells.setdefault((row.key, subject.key), SheetCell(row_key=row.key, subject_key=subject.key))
                if row.kind in ('checkbox', 'radio'):
                    if cell.expression or cell.option_key or cell.subtotal_override is not None:
                        fail('checkbox_input_conflict')
                    if row.kind == 'radio' and checked and cell.checked is None:
                        cell.checked = False
                    cell.value_number = None if cell.checked is None else row.selection_value if cell.checked else Decimal(0)
                elif row.kind == 'choice':
                    if cell.expression or cell.checked is not None or cell.subtotal_override is not None:
                        fail('choice_input_conflict')
                    options = {o.key: o.value for o in row.options}
                    if cell.option_key is not None and cell.option_key not in options:
                        fail('unknown_choice_option')
                    cell.value_number = options.get(cell.option_key)
                elif row.kind == 'text':
                    if cell.expression or cell.checked is not None or cell.option_key or cell.subtotal_override is not None:
                        fail('text_input_conflict')
                    cell.value_number = None
                else:
                    if cell.checked is not None or cell.option_key or row.kind != 'subtotal' and cell.subtotal_override is not None:
                        fail('number_input_conflict')
                    if cell.expression is not None:
                        cell.value_number = expression_value(cell.expression) if cell.expression.strip() else None
                        expression_count += bool(cell.expression.strip())
        for subject in form.subjects:
            contributing = [cells[(r.key, subject.key)].value_number for r in group.rows if r.contributes and not r.is_aggregate]
            subtotal = cells[(subtotals[0].key, subject.key)] if subtotals else None
            fallback = (subtotal.subtotal_override if subtotal.subtotal_override is not None else expression_value(subtotal.expression) if subtotal.expression and subtotal.expression.strip() else None) if subtotal else None
            if contributing and all(value is None for value in contributing) and fallback is not None:
                total = fallback
            else:
                total = sum(contributing, Decimal(0)) if contributing and all(v is not None for v in contributing) else None
            if subtotal:
                subtotal.value_number = total
            group_values[subject.key].append(total)
    totals = {}
    if form.scoring_method == 'rounds_won':
        eligible = [s.key for s in form.subjects if s.key not in excluded_subjects]
        if not eligible or not form.groups or any(v is None for key in eligible for v in group_values[key]):
            totals = {key: None for key in subjects}
        else:
            totals = {key: Decimal(0) for key in subjects}
            for index in range(len(form.groups)):
                best = (min if direction == 'low' else max)(group_values[key][index] for key in eligible)
                for key in eligible:
                    totals[key] += int(group_values[key][index] == best)
    else:
        for key, values in group_values.items():
            totals[key] = None if not values or any(v is None for v in values) else (min(values) if direction == 'low' else max(values)) if form.scoring_method == 'best_round' else sum(values, Decimal(0))
    for key, value in totals.items():
        if key in excluded_subjects:
            totals[key] = None
        elif value is not None:
            if abs(value) > Decimal('999999999.999'):
                fail('total_score_out_of_range')
            totals[key] = value.quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)
    form.cells = list(cells.values())
    form.recorded_totals = [SheetTotal(subject_key=key, value_number=totals[key]) for key in sorted(totals)]
    return form, dict(totals=totals, rounds=group_values, expression_count=expression_count,
                      missing_subject_count=sum(v is None for v in totals.values()), precision='0.001', round_ties='shared_win')
