import json
from pathlib import Path
from PIL import Image
import numpy as np
r=Path('audit');ids=[i['id']for i in json.loads((r/'source-preview-manifest.json').read_text(encoding='utf8'))];changed=[]
for id in ids:
 a=Image.open(r/'target-previews-small'/(id+'.png')).convert('RGBA');b=Image.open(r/'disabled-style-candidate-previews-small'/(id+'.png')).convert('RGBA')
 if a.size!=b.size or not np.array_equal(np.asarray(a),np.asarray(b)):changed.append(id)
result={'compared':len(ids),'exactImageMatches':len(ids)-len(changed),'changedRegionIds':changed};(r/'disabled-style-visual-validation.json').write_text(json.dumps(result,indent=2),encoding='utf8');print(result);assert not changed