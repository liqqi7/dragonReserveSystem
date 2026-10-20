import json
from pathlib import Path
from PIL import Image
import numpy as np
r=Path('audit');meta={x['id']:x for x in json.loads((r/'components-preview-manifest.json').read_text(encoding='utf8'))};rows=[]
def score(s,t):
 size=(max(s.width,t.width),max(s.height,t.height));a=Image.new('RGBA',size,'white');b=a.copy();a.alpha_composite(s);b.alpha_composite(t);return float(np.abs(np.asarray(a).astype(int)[:,:,:3]-np.asarray(b).astype(int)[:,:,:3]).mean())
for f in sorted((r/'components-centering-after').glob('verify_*.png')):
 nid=f.stem[7:];source=Image.open(r/'component-review'/(nid+'-source.png')).convert('RGBA');before=Image.open(r/'components-centering-before'/f.name).convert('RGBA');after=Image.open(f).convert('RGBA');raw=after.size;offset=[0,0]
 if after.width>=before.width and after.height>=before.height and after.size!=before.size:
  a=np.array(after)[:,:,3];yy,xx=np.where(a>0)
  if len(xx):
   candidates=[]
   for y in range(max(0,int(yy.max()+1-before.height)),min(int(yy.min()),after.height-before.height)+1):
    for x in range(max(0,int(xx.max()+1-before.width)),min(int(xx.min()),after.width-before.width)+1):
     crop=after.crop((x,y,x+before.width,y+before.height));candidates.append((score(source,crop),x,y,crop))
   if candidates:
    _,x,y,after=min(candidates,key=lambda v:v[0]);offset=[x,y]
 old=score(source,before);new=score(source,after);rows.append({'id':nid,'name':meta[nid]['name'],'before':old,'after':new,'change':new-old,'beforeSize':before.size,'afterRawSize':raw,'afterNormalizedSize':after.size,'transparentOnlyCropOffset':offset})
result={'componentsCompared':len(rows),'improvedOverPointOne':sum(x['change']<-.1 for x in rows),'regressedOverPointOne':sum(x['change']>.1 for x in rows),'normalizedTransparentMarginCount':sum(any(x['transparentOnlyCropOffset'])for x in rows),'details':sorted(rows,key=lambda x:x['change'])};(r/'components-centering-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print({k:v for k,v in result.items()if k!='details'});print('Worst',sorted(rows,key=lambda x:x['change'],reverse=True)[:8]);print('Best',result['details'][:6])
