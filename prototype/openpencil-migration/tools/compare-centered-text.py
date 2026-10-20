import json,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np
r=Path('audit');manifest=json.loads((r/'source-preview-manifest.json').read_text(encoding='utf8'));rows=[];samples=[]
def white(im):
 a=Image.new('RGBA',im.size,'white');a.alpha_composite(im);return a.convert('RGB')
def score(src,target):
 a=white(src);b=white(target);w=max(a.width,b.width);h=max(a.height,b.height);aa=Image.new('RGB',(w,h),'white');bb=aa.copy();aa.paste(a);bb.paste(b);return float(np.abs(np.array(aa).astype(int)-np.array(bb).astype(int)).mean())
for item in manifest:
 if item['id']in ['lnq9c','qCoEK','x2L4V5','yqArW']:continue
 src=Image.open(r/item['file']).convert('RGBA');f=.5/item['scale'];src=src.resize((math.ceil(src.width*f),math.ceil(src.height*f)),Image.Resampling.LANCZOS)
 before=Image.open(r/'tools-retired-previews'/(item['id']+'.png')).convert('RGBA');after=Image.open(r/'centered-text-previews'/(item['id']+'.png')).convert('RGBA');a=score(src,before);b=score(src,after);row={'id':item['id'],'name':item.get('name',item['id']),'before':a,'after':b,'change':b-a,'sameSize':before.size==after.size};rows.append(row)
 if abs(b-a)>.1:samples.append((row,src,before,after))
result={'compared':len(rows),'meanBefore':sum(x['before']for x in rows)/len(rows),'meanAfter':sum(x['after']for x in rows)/len(rows),'improvedOverPointOne':sum(x['change']<-.1 for x in rows),'regressedOverPointOne':sum(x['change']>.1 for x in rows),'sizeChanges':[x for x in rows if not x['sameSize']],'details':sorted(rows,key=lambda x:x['change'])};(r/'centered-text-visual-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print({k:v for k,v in result.items() if k!='details'});print('Worst regressions',sorted(rows,key=lambda x:x['change'],reverse=True)[:10]);print('Best',sorted(rows,key=lambda x:x['change'])[:10])
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',12);samples.sort(key=lambda x:x[0]['change'],reverse=True)
for start in range(0,len(samples),9):
 canvas=Image.new('RGB',(1320,1250),'#e9edf2');draw=ImageDraw.Draw(canvas)
 for i,(row,src,before,after)in enumerate(samples[start:start+9]):
  x=i%3*440;y=i//3*410;draw.text((x+4,y+4),row['id']+' '+str(round(row['change'],3)),font=font,fill='black')
  for j,im in enumerate([src,before,after]):
   q=white(im);q.thumbnail((140,370));canvas.paste(q,(x+j*146+2,y+28))
 canvas.save(r/('centered-text-review-'+str(start//9+1)+'.png'))
