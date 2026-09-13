from copy import deepcopy

import pytest

from app.services.boardgame_labels import edition_label, language_label, version_view


@pytest.mark.parametrize('source,expected', [
    ('Chinese edition', '中文版'), ('SImplified Chinese edition', '简体中文版'),
    ('Traditional Chinese second edition', '繁体中文第二版'),
    ('Chinese/English edition 2017', '中文 / 英文版 2017'),
    ("English deluxe collector's edition", '英文豪华典藏版'),
    ('Publisher Chinese retail edition', 'Publisher 中文零售版'),
    ('Simplified Chinese Edition 简体中文版', '简体中文版'),
    ('Unknown game special version', 'Unknown game special version'), ('限定中文版', '限定中文版'),
])
def test_edition_labels_preserve_publisher_year_and_unknown_values(source, expected):
    assert edition_label(source) == expected


def test_version_labels_do_not_replace_source_or_identity():
    version = {'bgg_version_id': 701001, 'name': 'Chinese/English edition 2017',
               'languages': ['Chinese', 'English'], 'publishers': ['Original Publisher']}
    original = deepcopy(version)
    result = version_view(version)
    assert version == original
    assert all(result[k] == v for k, v in original.items())
    assert result['display_name'] == '中文 / 英文版 2017'
    assert result['language_label'] == '中文 / 英文'
    assert language_label('Chinese, English, Japanese') == '中文 / 英文 / 日文'
    assert language_label('(neutral)') == '无语言依赖'
    assert language_label(['未知语言', 'Uncatalogued']) == '未知语言 / Uncatalogued'
