from decimal import Decimal, InvalidOperation
from xml.etree import ElementTree as ET
from app.services.boardgame_common import fail
MAX_BYTES = 8 * 1024 * 1024
PARSER_VERSION = "library-1"

def positive(value):
    if isinstance(value, bool):
        return None
    try:
        result = int(value)
        return result if result > 0 else None
    except (TypeError, ValueError):
        return None


def decimal_score(value, issues):
    if value is None or str(value).strip().lower() in ('', 'null'):
        return None
    try:
        number = Decimal(str(value))
        # BGG ratings and weights commonly carry four decimal places
        # (for example 8.5596); normalize them at the presentation boundary.
        if not number.is_finite() or abs(number) >= Decimal('1000000000') or number.as_tuple().exponent < -5:
            raise InvalidOperation()
        return str(number)
    except InvalidOperation:
        issues.append('nonnumeric_or_out_of_range_score')
        return None


def xml_root(raw):
    if len(raw) > MAX_BYTES:
        fail('source_response_too_large')
    if b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
        fail('unsafe_xml_declaration')
    try:
        root = ET.fromstring(raw)
        pending = [(root, 1)]
        while pending:
            node, depth = pending.pop()
            if depth > 128:
                fail('xml_too_deep')
            pending.extend((child, depth + 1) for child in node)
        return root
    except ET.ParseError:
        fail('invalid_source_xml')


def xml_tree(node):
    return {'tag': node.tag, 'attributes': dict(node.attrib), 'text': node.text,
            'tail': node.tail, 'children': [xml_tree(child) for child in node]}

def thing_items(raw):
    root = xml_root(raw)
    if root.tag != "items":
        fail("source_parse_failed")
    results = []
    for node in root.findall('item'):
        identity = positive(node.get('id'))
        if not identity:
            fail('missing_bgg_id')
        names = [n.get('value') for n in node.findall('name') if n.get('value')]
        projection = dict(name=next((n.get('value') for n in node.findall('name') if n.get('type') == 'primary'), names[0] if names else '未命名桌游'),
            aliases=list(dict.fromkeys(names)), game_type='expansion' if node.get('type') == 'boardgameexpansion' else 'base',
            description=node.findtext('description'), cover_url=node.findtext('image'), is_standalone=node.get('type') == 'boardgame',
            categories=list(dict.fromkeys(n.get('value').strip() for n in node.findall('link')
                if n.get('type') == 'boardgamecategory' and n.get('value', '').strip())),
            mechanics=list(dict.fromkeys(n.get('value').strip() for n in node.findall('link')
                if n.get('type') == 'boardgamemechanic' and n.get('value', '').strip())))
        for external, internal in [('minplayers', 'min_players'), ('maxplayers', 'max_players'),
            ('minplaytime', 'min_playtime_minutes'), ('maxplaytime', 'max_playtime_minutes'), ('minage', 'min_age'), ('yearpublished', 'year_published')]:
            child = node.find(external)
            projection[internal] = positive(child.get('value')) if child is not None else None
        weight = node.find('statistics/ratings/averageweight')
        value = decimal_score(weight.get('value'), []) if weight is not None else None
        if value is not None and Decimal('1') <= Decimal(value) <= Decimal('5'):
            projection['complexity'] = str(Decimal(value).quantize(Decimal('0.01')))
        average = node.find('statistics/ratings/average')
        rating = decimal_score(average.get('value'), []) if average is not None else None
        if rating is not None and Decimal('0') <= Decimal(rating) <= Decimal('10'):
            projection['bgg_rating'] = str(Decimal(rating).quantize(Decimal('0.01')))
        rank = next((r for r in node.findall('statistics/ratings/ranks/rank')
                     if r.get('name') == 'boardgame'), None)
        projection['bgg_rank'] = positive(rank.get('value')) if rank is not None else None
        payload = {'raw': xml_tree(node), 'projection': projection, 'parser_version': PARSER_VERSION, 'issues': [], 'normalized': {'projection': projection}}
        results.append(dict(source_kind='thing', source_key=str(identity), bgg_id=identity, raw_xml=ET.tostring(node, encoding='unicode'), payload=payload))
    return results
