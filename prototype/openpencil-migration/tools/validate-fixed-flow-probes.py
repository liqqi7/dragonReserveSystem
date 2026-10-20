import json
from pathlib import Path
from PIL import Image
import numpy as np
items=[]
for l in Path('audit/fixed-flow-edit-probe-layout.jsonl').read_text(encoding='utf-8-sig').splitlines():
 try:items.append(json.loads(l))
 except ValueError:pass
n={i['id']:i for i in items};checks=[]
for id,width,height,texty in [('heading22',350,22,-3),('heading40',420,40,6)]:
 checks.append({'case':id,'pass':n[id]['w']==width and n[id]['h']==height and n[id+'__f356O']['y']==texty and n[id+'__f356O']['w']==width,'container':n[id],'text':n[id+'__f356O']})
for width in [358,460]:
 id='progress'+str(width);checks.append({'case':id,'pass':n[id+'__R6Lle']['w']==width,'container':n[id],'track':n[id+'__R6Lle']})
root=Path('audit');manifest=json.loads((root/'source-preview-manifest.json').read_text(encoding='utf8'));changed=[]
for i in manifest:
 name=i['id']+'.png';a=Image.open(root/'target-previews-small'/name).convert('RGBA');b=Image.open(root/'layout-candidate-previews-small'/name).convert('RGBA')
 if a.size!=b.size or not np.array_equal(np.asarray(a),np.asarray(b)):changed.append(i['id'])
result={'passed':all(c['pass']for c in checks),'checks':checks,'allRegionsCompared':len(manifest),'changedRegionIds':changed};(root/'fixed-flow-edit-probe-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(result,ensure_ascii=False));assert result['passed']