import json
from pathlib import Path
from PIL import Image
rows=[]
for line in Path('audit/resize-probe-layout.jsonl').read_text(encoding='utf-8-sig').splitlines():
 try: rows.append(json.loads(line))
 except ValueError: pass
byid={r['id']:r for r in rows};checks=[]
def check(label,actual,expected):checks.append({'check':label,'actual':actual,'expected':expected,'pass':actual==expected})
check('header width change propagates to fill text',byid['header420__e7YZJ']['w']-byid['header350__e7YZJ']['w'],70)
check('header action follows right edge',byid['header420__Q3a1B']['x']-byid['header350__Q3a1B']['x'],70)
for width in [173,240]:
 prefix='card'+str(width)+'__'
 check(prefix+'cover width',byid[prefix+'p08rbS']['w'],width)
 check(prefix+'cover height',byid[prefix+'p08rbS']['h'],156)
 check(prefix+'information height',byid[prefix+'L5qPDj']['h'],74)
 check(prefix+'title width',byid[prefix+'lp4MR']['w'],width-16)
for name,width,height in [('alpha120',120,40),('alpha200',200,70)]:
 im=Image.open('audit/resize-probe-previews/'+name+'.png').convert('RGBA');check(name+' bounds',list(im.size),[width,height]);pixels=[im.getpixel((1,1)),im.getpixel((width//2,height//2)),im.getpixel((width-2,height-2))];check(name+' paint fills resized bounds',len(set(pixels)),1);check(name+' alpha kept',pixels[0][3],204)
report={'passed':all(c['pass']for c in checks),'checks':checks,'scope':'Representative title and library-card instances plus resized translucent fills. This does not prove every editing behavior; hidden-node limitation is tested separately.'}
Path('audit/resize-probe-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(report,ensure_ascii=False));assert report['passed']