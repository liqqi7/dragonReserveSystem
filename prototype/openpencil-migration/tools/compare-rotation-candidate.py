import json,math
from pathlib import Path
from PIL import Image
import numpy as np
root=Path('audit');manifest=json.loads((root/'source-preview-manifest.json').read_text(encoding='utf8'));old={r['id']:r for r in json.loads((root/'visual-comparison.json').read_text(encoding='utf8'))};rows=[]
for item in manifest:
 p=root/'rotation-candidate-previews'/(item['id']+'.png')
 if item['scale']<1:continue
 a=Image.open(root/item['file']).convert('RGBA');b=Image.open(p).convert('RGBA');size=(max(a.width,b.width),max(a.height,b.height));aa=Image.new('RGBA',size,'white');bb=aa.copy();aa.alpha_composite(a);bb.alpha_composite(b);d=np.abs(np.asarray(aa).astype(np.int16)[:,:,:3]-np.asarray(bb).astype(np.int16)[:,:,:3]);mean=float(d.mean());row={'id':item['id'],'name':item.get('name',item['id']),'baseline':old[item['id']]['meanError'],'candidate':round(mean,4),'change':round(mean-old[item['id']]['meanError'],4)};rows.append(row)
rows.sort(key=lambda r:r['change']);result={'compared':len(rows),'improvedByMoreThan01':sum(r['change']<-.1 for r in rows),'worseByMoreThan01':sum(r['change']>.1 for r in rows),'totalMeanErrorBaseline':sum(r['baseline']for r in rows)/len(rows),'totalMeanErrorCandidate':sum(r['candidate']for r in rows)/len(rows),'details':rows};(root/'rotation-candidate-comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({k:v for k,v in result.items()if k!='details'}));print('Best:',json.dumps(rows[:8],ensure_ascii=False));print('Worst:',json.dumps(rows[-10:],ensure_ascii=False))