import json,sys
from pathlib import Path
sys.path.insert(0,str(Path('audit/python-deps').resolve()))
from fontTools.svgLib.path import parse_path
from fontTools.pens.boundsPen import BoundsPen
source=json.loads(Path('audit/source.json').read_text(encoding='utf8'))
out={}
for r in source['nodes']:
 n=r['node']
 if n['type']!='path' or 'viewBox' not in n:continue
 p=BoundsPen(None);parse_path(n['geometry'],p)
 out[n['id']]=p.bounds
Path('audit/path-bounds.json').write_text(json.dumps(out),encoding='utf8')
p=Path('audit/phosphor-glyphs.json');glyphs=json.loads(p.read_text(encoding='utf8'))
for g in glyphs.values():
 pen=BoundsPen(None);parse_path(g['d'],pen);x,y,x2,y2=pen.bounds;g['bounds']=[x,y,x2-x,y2-y]
p.write_text(json.dumps(glyphs),encoding='utf8')
print('Exact source path bounds:',len(out))