import json,math,html
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path('audit');manifest=json.loads((root/'source-preview-manifest.json').read_text(encoding='utf8'));src=json.loads((root/'source.json').read_text(encoding='utf8'));types={r['node']['id']:r['node']['type'] for r in src['nodes']}
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',13)
qa=root/'review';qa.mkdir(exist_ok=True)
items=[]
for item in manifest:
 sp=root/item['file'];tp=root/('target-previews' if item['scale']==1 else 'target-previews-small')/(item['id']+'.png')
 a=Image.open(sp).convert('RGBA');b=Image.open(tp).convert('RGBA')
 if item['scale']<.5:
  factor=item['scale']/.5;b=b.resize((math.ceil(b.width*factor),math.ceil(b.height*factor)),Image.Resampling.LANCZOS)
 b.save(qa/(item['id']+'-target.png'))
 item['sourcePreviewSize']=list(a.size);item['targetPreviewSize']=list(b.size);item['nodeType']=types[item['id']]
 items.append((item,a,b))
for start in range(0,len(items),12):
 sheet=Image.new('RGB',(1360,1584),'#e9edf2');draw=ImageDraw.Draw(sheet)
 for index,(item,a,b) in enumerate(items[start:start+12]):
  x=(index%4)*340;y=(index//4)*528
  draw.text((x+6,y+6),item['id']+' · '+item.get('name',item['id'])[:19],fill='#142235',font=font)
  draw.text((x+6,y+28),'Pencil 源稿',fill='#142235',font=font);draw.text((x+176,y+28),'OpenPencil',fill='#142235',font=font)
  for image,xx in [(a,x+6),(b,x+176)]:
   im=image.copy();im.thumbnail((158,472),Image.Resampling.LANCZOS);base=Image.new('RGBA',im.size,'white');base.alpha_composite(im);sheet.paste(base.convert('RGB'),(xx,y+49))
 sheet.save(qa/('contact-'+str(start//12+1).zfill(2)+'.jpg'),quality=90)
(root/'review-manifest.json').write_text(json.dumps([i for i,a,b in items],ensure_ascii=False,indent=2),encoding='utf8')
print('Review contact sheets:',math.ceil(len(items)/12))