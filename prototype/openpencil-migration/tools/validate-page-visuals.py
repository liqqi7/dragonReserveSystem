import json
from pathlib import Path
from PIL import Image
import numpy as np
r=Path('audit');rows=[]
for a in json.loads((r/'page-organization.json').read_text(encoding='utf8'))['assignments']:
 x=np.array(Image.open(r/'target-previews-small'/(a['id']+'.png')).convert('RGBA'));y=np.array(Image.open(r/'pages-previews'/(a['id']+'.png')).convert('RGBA'))
 rows.append({'id':a['id'],'page':a['pageName'],'sameSize':x.shape==y.shape,'maxDifference':int(np.max(np.abs(x.astype(int)-y.astype(int)))) if x.shape==y.shape else None,'meanDifference':float(np.abs(x.astype(int)-y.astype(int)).mean()) if x.shape==y.shape else None})
probe=[]
for phase in ['before','after']:
 im=np.array(Image.open(r/('cross-page-'+phase)/'probe-instance.png').convert('RGBA'))
 doc=json.loads((r/('cross-page-probe-'+phase+'.op')).read_text(encoding='utf8'))
 assert doc['pages'][0]['children'][0]['ref']==doc['pages'][1]['children'][0]['id']
 probe.append({'phase':phase,'sample':im[50,50].tolist(),'masterText':doc['pages'][1]['children'][0]['children'][0]['content']})
assert probe[0]['sample']==[255,0,0,255] and probe[1]['sample']==[0,0,255,255]
assert probe[0]['masterText']!=probe[1]['masterText']
result={'compared':len(rows),'exactMatches':sum(x['maxDifference']==0 for x in rows),'mismatches':[x for x in rows if x['maxDifference']!=0],'crossPageMasterEditProbe':probe}
(r/'page-visual-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({k:v for k,v in result.items() if k!='crossPageMasterEditProbe'}));assert result['exactMatches']==164
