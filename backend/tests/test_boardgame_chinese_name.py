"""Chinese display name extraction: a CJK alias counts as Chinese only when kana-free."""
from app.services.boardgame_catalog import library_metadata


def meta(aliases):
    return library_metadata({'projection': {'aliases': aliases}})['chinese_name']


def test_japanese_alias_never_wins_over_chinese():
    assert meta(['Splendor', '宝石の煌き', '璀璨宝石', '스플렌더']) == '璀璨宝石'


def test_kana_or_hangul_only_aliases_fall_back_to_none():
    assert meta(['Splendor', '宝石の煌き']) is None
    assert meta(['Splendor', 'アグリコラ']) is None
    assert meta(['Splendor', '스플렌더']) is None


def test_chinese_alias_still_picked_and_parentheses_stripped():
    assert meta(['Brass: Birmingham', '工业革命：伯明翰']) == '工业革命：伯明翰'
    assert meta(['Splendor', '璀璨宝石 (简体)']) == '璀璨宝石'
    assert meta(['ドミニオン', '皇舆争霸']) == '皇舆争霸'
    assert meta(['Splendor']) is None
