"""Chinese presentation labels for known boardgame metadata; source values stay intact."""
import json
import re
from pathlib import Path


_MECHANIC_ZH_PATH = Path(__file__).resolve().parents[1] / 'assets' / 'boardgame-labels' / 'bgg-mechanics-zh.json'
try:
    _MECHANIC_ROWS = {
        str(key).casefold(): value
        for key, value in json.loads(_MECHANIC_ZH_PATH.read_text(encoding='utf-8')).items()
        if isinstance(value, dict)
    }
except (OSError, ValueError, TypeError):
    _MECHANIC_ROWS = {}

_MECHANIC_ZH = {key: str(value.get('zh') or value.get('en') or key)
                for key, value in _MECHANIC_ROWS.items()}
_MECHANIC_ZH.update({str(value.get('en', '')).strip().casefold(): str(value.get('zh') or value.get('en'))
                     for value in _MECHANIC_ROWS.values() if value.get('en')})

LANGUAGES = {
    'simplified chinese': '简体中文', 'traditional chinese': '繁体中文',
    'chinese (simplified)': '简体中文', 'chinese (traditional)': '繁体中文',
    'chinese': '中文', 'english': '英文', 'japanese': '日文', 'korean': '韩文',
    'french': '法文', 'german': '德文', 'italian': '意大利文', 'spanish': '西班牙文',
    'portuguese': '葡萄牙文', 'catalan': '加泰罗尼亚文', 'dutch': '荷兰文',
    'multilingual': '多语言', '(neutral)': '无语言依赖', 'language independent': '无语言依赖',
}
EDITION_KINDS = {'': '版', 'second': '第二版', 'third': '第三版', 'fourth': '第四版',
                 'deluxe': '豪华版', "deluxe collector's": '豪华典藏版', 'limited': '限量版', 'retail': '零售版'}
_language = '|'.join(re.escape(k) for k in sorted(LANGUAGES, key=len, reverse=True))
_kind = '|'.join(re.escape(k) for k in EDITION_KINDS if k)
_edition = re.compile(rf'^(?P<prefix>.*?)(?P<languages>(?:{_language})(?:\s*/\s*(?:{_language}))*)'
                      rf'(?: (?P<kind>{_kind}))? edition(?: (?P<year>\d{{4}}))?$', re.I)


def language_label(value):
    values = value if isinstance(value, list) else re.split(r'\s*[,/]\s*', value or '')
    return ' / '.join(LANGUAGES.get(v.strip().casefold(), v.strip()) for v in values if v and v.strip())


def _legacy_mechanic_label(value):
    """Translate known BGG mechanics for display while preserving source values."""
    values = value if isinstance(value, list) else re.split(r'\s*[·,/]\s*', value or '')
    return ' · '.join(_MECHANIC_ZH.get(v.strip().casefold(), v.strip())
                      for v in values if v and v.strip())


def mechanic_label(value):
    """Translate known BGG mechanics for display while preserving source values."""
    values = value if isinstance(value, list) else [value]
    labels = []
    for item in values:
        if isinstance(item, dict):
            identity = str(item.get('id') or item.get('bgg_id') or '').casefold()
            source = str(item.get('name') or item.get('value') or '').strip()
            label = _MECHANIC_ZH.get(identity) or _MECHANIC_ZH.get(source.casefold()) or source
        else:
            source = str(item or '').strip()
            label = _MECHANIC_ZH.get(source.casefold(), source)
        if label and label not in labels:
            labels.append(label)
    return ' · '.join(labels)


def edition_label(value):
    value = (value or '').strip()
    if value.casefold() == 'simplified chinese edition 简体中文版':
        return '简体中文版'
    if value.casefold() == 'first edition':
        return '初版'
    match = _edition.fullmatch(value)
    if not match:
        return value
    return (match['prefix'] + language_label(match['languages']) + EDITION_KINDS[(match['kind'] or '').casefold()]
            + (' ' + match['year'] if match['year'] else ''))


def version_view(version):
    return {**version, 'display_name': edition_label(version.get('name')),
            'language_label': language_label(version.get('languages'))}
