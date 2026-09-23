import json
from collections import Counter
from pathlib import Path

categories = {
    '派对': '''ardhira-putra-001
ardhira-putra-002
ardhira-putra-012'''.split(),
    '运动': '''patryk-wojciechowicz-010'''.split(),
    '外出': '''ardhira-putra-004
ardhira-putra-006
ardhira-putra-010
magoyama-008
benjamin-flouw-012
venmen-011
patryk-wojciechowicz-002
patryk-wojciechowicz-004
patryk-wojciechowicz-006
patryk-wojciechowicz-007
patryk-wojciechowicz-008
patryk-wojciechowicz-009'''.split(),
    '桌游': '''ardhira-putra-003
ardhira-putra-008'''.split(),
    '电影': '''aleksey-rico-001
aleksey-rico-002
aleksey-rico-003
aleksey-rico-004
aleksey-rico-005
aleksey-rico-006
aleksey-rico-009
aleksey-rico-011'''.split(),
    '杂项': '''lam-002
lam-007
lam-011
magoyama-001
magoyama-003
magoyama-004
yoneyama-mai-016'''.split(),
}
deprecated = '''aleksey-rico-010
aleksey-rico-012
aleksey-rico-013
aleksey-rico-014
lam-001
lam-003
lam-004
lam-005
lam-006
lam-008
lam-009
lam-010
lam-012
ardhira-putra-005
ardhira-putra-007
ardhira-putra-009
ardhira-putra-011
magoyama-002
magoyama-005
magoyama-006
magoyama-007
magoyama-009
magoyama-010
magoyama-011
magoyama-012
yoneyama-mai-003
yoneyama-mai-004
yoneyama-mai-006
yoneyama-mai-007
yoneyama-mai-008
yoneyama-mai-010
yoneyama-mai-011
yoneyama-mai-012
yoneyama-mai-013
yoneyama-mai-014
yoneyama-mai-015
benjamin-flouw-001
benjamin-flouw-003
benjamin-flouw-004
benjamin-flouw-005
benjamin-flouw-006
benjamin-flouw-007
benjamin-flouw-009
benjamin-flouw-010
benjamin-flouw-011
benjamin-flouw-013
benjamin-flouw-014
venmen-001
venmen-003
venmen-004
venmen-005
venmen-006
venmen-007
venmen-008
venmen-010
patryk-wojciechowicz-005
patryk-wojciechowicz-011
patryk-wojciechowicz-012
patryk-wojciechowicz-013
patryk-wojciechowicz-014'''.split()

path = Path('backend/app/assets/activity-covers/catalog.json')
catalog = json.loads(path.read_text(encoding='utf-8'))
artworks = [artwork for artist in catalog['artists'] for artwork in artist['artworks']]
catalog_ids = [artwork['id'] for artwork in artworks]
submitted = [cover_id for ids in categories.values() for cover_id in ids] + deprecated
counts = Counter(submitted)
assert len(catalog_ids) == 93, len(catalog_ids)
assert len(submitted) == 93, len(submitted)
assert not [cover_id for cover_id, count in counts.items() if count > 1], counts
assert set(submitted) == set(catalog_ids), (set(submitted) - set(catalog_ids), set(catalog_ids) - set(submitted))
assert {category: len(ids) for category, ids in categories.items()} == {'派对': 3, '运动': 1, '外出': 12, '桌游': 2, '电影': 8, '杂项': 7}
assert len(deprecated) == 60

assignments = {cover_id: category for category, ids in categories.items() for cover_id in ids}
for artwork in artworks:
    artwork.pop('categories', None)
    artwork.pop('deprecated', None)
    category = assignments.get(artwork['id'])
    if category:
        artwork['categories'] = [category]
    else:
        artwork['deprecated'] = True
path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'catalog': len(catalog_ids), **{name: len(ids) for name, ids in categories.items()}, '弃用': len(deprecated), '可选': len(assignments)}, ensure_ascii=False))
