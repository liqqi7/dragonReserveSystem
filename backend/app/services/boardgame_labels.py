"""Chinese presentation labels for known edition metadata; source values stay intact."""
import re

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
