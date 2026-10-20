import json,math
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
root=Path('audit');manifest=json.loads((root/'source-preview-manifest.json').read_text(encoding='utf8'));rows=[]
for item in manifest:
 name=item['id']+'.png';a=Image.open(root/'target-previews-small'/name).convert('RGBA');b=Image.open(root/'roundtrip-previews'/name).convert('RGBA')
 if a.size!=b.size:rows.append({'id':item['id'],'sizeMatch':False,'source':a.size,'roundtrip':b.size});continue
 diff=np.abs(np.asarray(a).astype(np.int16)-np.asarray(b).astype(np.int16));rows.append({'id':item['id'],'sizeMatch':True,'maxChannelDifference':int(diff.max()),'meanDifference':float(diff.mean())})
report={'compared':len(rows),'sizeMismatches':sum(not r['sizeMatch']for r in rows),'exactImageMatches':sum(r.get('maxChannelDifference')==0 for r in rows),'maxChannelDifference':max([r.get('maxChannelDifference',255)for r in rows]),'details':rows};(root/'save-roundtrip-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print({k:v for k,v in report.items()if k!='details'})
minx=min(i['bounds']['x']for i in manifest);miny=min(i['bounds']['y']for i in manifest);maxx=max(i['bounds']['x']+i['bounds']['width']for i in manifest);maxy=max(i['bounds']['y']+i['bounds']['height']for i in manifest);scale=min(1600/(maxx-minx),1000/(maxy-miny));size=(math.ceil((maxx-minx)*scale)+40,math.ceil((maxy-miny)*scale)+40)
for typ in ['source','target']:
 canvas=Image.new('RGBA',size,'#e9edf2')
 for i in manifest:
  path=root/i['file'] if typ=='source' else root/'review'/(i['id']+'-target.png');im=Image.open(path).convert('RGBA');factor=scale/i['scale'];im=im.resize((max(1,round(im.width*factor)),max(1,round(im.height*factor))),Image.Resampling.LANCZOS);pos=(20+round((i['bounds']['x']-minx)*scale),20+round((i['bounds']['y']-miny)*scale));canvas.alpha_composite(im,pos)
 canvas.convert('RGB').save(root/'review'/('canvas-'+typ+'.png'))