from pathlib import Path
from PIL import Image
import numpy as np,json
p=Path('audit');a=Image.open(p/'native-after-font-restart.png').convert('RGBA');b=Image.open(p/'final-candidate-previews/Gnsno.png').convert('RGBA');r={'nativeSize':a.size,'headlessSize':b.size,'sameSize':a.size==b.size}
if a.size==b.size:r['maxChannelDifference']=int(np.abs(np.asarray(a).astype(np.int16)-np.asarray(b).astype(np.int16)).max())
(p/'native-font-render-validation.json').write_text(json.dumps(r,indent=2),encoding='utf8');print(r);assert r['sameSize']and r['maxChannelDifference']==0