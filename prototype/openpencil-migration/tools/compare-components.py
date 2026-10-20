import json,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np
root=Path('audit');manifest=json.loads((root/'components-preview-manifest.json').read_text(encoding='utf8'));out=root/'component-review';out.mkdir(exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',12)
raw=json.loads((root/'source.json').read_text(encoding='utf8'));byid={r['node']['id']:r['node']for r in raw['nodes']}
def effective(n):
 if n['type']!='ref':return n
 return {**effective(byid[n['ref']]),**n}
rows=[];images=[]
for n in manifest:
 a=Image.open(root/'source-components'/(n['id']+'.png')).convert('RGBA');b=Image.open(root/'target-components-raw'/(n['id']+'.png')).convert('RGBA');b.save(out/(n['id']+'-target.png'))
 original_size=a.size;crop_offset=(0,0);expected=(math.ceil(n['bounds']['width']),math.ceil(n['bounds']['height']))
 if a.width-expected[0]>1 or a.height-expected[1]>1:
  cw=min(a.width,expected[0]);ch=min(a.height,expected[1]);dx=a.width-cw;dy=a.height-ch
  factor=min(1,120/max(cw,ch));sa=a.resize((max(1,round(a.width*factor)),max(1,round(a.height*factor))),Image.Resampling.BILINEAR);sw=max(1,round(cw*factor));sh=max(1,round(ch*factor));tb=b.resize((max(1,round(b.width*factor)),max(1,round(b.height*factor))),Image.Resampling.BILINEAR)
  def score(image,reference):
   w=max(image.width,reference.width);h=max(image.height,reference.height);aa=Image.new('RGBA',(w,h),'white');bb=aa.copy();aa.alpha_composite(image);bb.alpha_composite(reference);return np.abs(np.asarray(aa).astype(np.int16)[:,:,:3]-np.asarray(bb).astype(np.int16)[:,:,:3]).mean()
  best=(float('inf'),0,0)
  for yy in range(max(0,sa.height-sh)+1):
   for xx in range(max(0,sa.width-sw)+1):
    val=score(sa.crop((xx,yy,xx+sw,yy+sh)),tb)
    if val<best[0]:best=(val,xx,yy)
  bx=round(best[1]/factor);by=round(best[2]/factor);radius=max(3,math.ceil(1/factor));best_full=(float('inf'),0,0)
  for yy in range(max(0,by-radius),min(dy,by+radius)+1):
   for xx in range(max(0,bx-radius),min(dx,bx+radius)+1):
    val=score(a.crop((xx,yy,xx+cw,yy+ch)),b)
    if val<best_full[0]:best_full=(val,xx,yy)
  crop_offset=best_full[1:];a=a.crop((crop_offset[0],crop_offset[1],crop_offset[0]+cw,crop_offset[1]+ch))
 a.save(out/(n['id']+'-source.png'))
 size=(max(a.width,b.width),max(a.height,b.height));aa=Image.new('RGBA',size,'white');bb=aa.copy();aa.alpha_composite(a);bb.alpha_composite(b);diff=np.abs(np.asarray(aa).astype(np.int16)[:,:,:3]-np.asarray(bb).astype(np.int16)[:,:,:3]);row={'id':n['id'],'name':n['name'],'sourceSize':list(a.size),'targetSize':list(b.size),'sourceExportSize':list(original_size),'sourceCropOffset':list(crop_offset),'sizeMatch':a.size==b.size,'meanError':round(float(diff.mean()),3),'within10Percent':round(float((diff.max(axis=2)<=10).mean()*100),2)};rows.append(row);images.append((row,a,b))
images.sort(key=lambda t:t[0]['meanError'],reverse=True)
for start in range(0,len(images),12):
 sheet=Image.new('RGB',(1440,1200),'#e9edf2');draw=ImageDraw.Draw(sheet)
 for ix,(n,a,b) in enumerate(images[start:start+12]):
  x=ix%3*480;y=ix//3*300;draw.text((x+6,y+5),n['id']+' '+n['name'][:25],font=font,fill='#142235');draw.text((x+6,y+26),'源稿 / OpenPencil · mean '+str(n['meanError']),font=font,fill='#475467')
  for im,xx in [(a,x+6),(b,x+246)]:
   img=im.copy();img.thumbnail((228,246),Image.Resampling.LANCZOS);base=Image.new('RGBA',img.size,'white');base.alpha_composite(img);sheet.paste(base.convert('RGB'),(xx,y+49))
 sheet.save(out/('contact-'+str(start//12+1).zfill(2)+'.jpg'),quality=90)
rows.sort(key=lambda r:r['meanError'],reverse=True);(root/'component-visual-comparison.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'count':len(rows),'sizeMismatch':sum(not r['sizeMatch']for r in rows),'worst':rows[:8]},ensure_ascii=False))