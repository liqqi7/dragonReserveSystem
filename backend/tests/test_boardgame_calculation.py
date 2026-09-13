from decimal import Decimal

import pytest

from app.core.exceptions import AppError
from app.schemas.boardgame import Sheet
from app.services.boardgame_calculation import calculate, expression_value


@pytest.mark.parametrize('source,expected', [('(2+3)*4-1/2','19.500000'),('0','0.000000'),('-1.5 + 0.5','-1.000000')])
def test_decimal_expressions(source, expected):
    assert expression_value(source) == Decimal(expected)


@pytest.mark.parametrize('source', ['1/0','2**10','2//3','min(1,2)','x+1','9e999','[1]', '('*30+'1'+')'*30])
def test_invalid_expressions(source):
    with pytest.raises(AppError):
        expression_value(source)


def test_radio_checkbox_auxiliary_repeat_and_subtotal():
    data = dict(schema_version=2, groups=[dict(key='g', label='组', rows=[
        dict(key='n', label='分数', repeatable=True), dict(key='n2', label='再记一项', repeat_of='n'),
        dict(key='r', label='独占奖励', kind='radio', selection_value='5'),
        dict(key='c', label='完成', kind='checkbox', selection_value='2'),
        dict(key='aux', label='辅助', contributes=False), dict(key='s', label='小计', kind='subtotal')])],
        subjects=[dict(key=f'p:{i}', kind='player', player_id=i) for i in (1,2)],
        cells=[dict(row_key=key, subject_key=f'p:{i}', **value) for i in (1,2) for key,value in [
            ('n',dict(value_number='0')),('n2',dict(expression='-1+3')),('r',dict(checked=i==1)),
            ('c',dict(checked=False)),('aux',dict(value_number='999'))]])
    form, result = calculate(Sheet.model_validate(data))
    assert result['totals'] == {'p:1': Decimal('7.000'), 'p:2': Decimal('2.000')}
    assert next(c.value_number for c in form.cells if c.row_key=='s' and c.subject_key=='p:1') == 7
    data['cells'] = [c for c in data['cells'] if not (c['row_key']=='n' and c['subject_key']=='p:2')]
    _, missing = calculate(Sheet.model_validate(data))
    assert missing['totals']['p:2'] is None
    data['cells'].append(dict(row_key='s', subject_key='p:2', subtotal_override='10'))
    # A manual subtotal cannot conceal missing data after another contributing row was entered.
    assert calculate(Sheet.model_validate(data))[1]['totals']['p:2'] is None
