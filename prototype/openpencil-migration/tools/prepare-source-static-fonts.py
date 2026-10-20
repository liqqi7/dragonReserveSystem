import sys,json,shutil,hashlib
from pathlib import Path
sys.path.insert(0,'audit/python-deps')
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
manifest=json.loads(Path('audit/design-font-runtime-sources.json').read_text(encoding='utf8'));output=Path('D:/Applications/OpenPencil/design-fonts/source-static');output.mkdir(exist_ok=True);rows=[]
for source in manifest:
 family=source['family'];weights=[400,500,600,700,800]if family in ['Inter','Noto Sans SC']else[400,500,600,700]if family in ['Geist','Geist Mono']else[400]
 for weight in weights:
  dest=output/(family.replace(' ','')+'-'+str(weight)+'.ttf')
  if not dest.exists():
   font=TTFont(source['local'])
   if 'fvar'in font:
    axes={a.axisTag:(weight if a.axisTag=='wght'else a.defaultValue)for a in font['fvar'].axes};font=instantiateVariableFont(font,axes,inplace=True)
   for nameid,text in [(1,family),(16,family),(2,{400:'Regular',500:'Medium',600:'SemiBold',700:'Bold',800:'ExtraBold'}[weight]),(17,{400:'Regular',500:'Medium',600:'SemiBold',700:'Bold',800:'ExtraBold'}[weight])]:
    for record in list(font['name'].names):
     if record.nameID==nameid:font['name'].setName(text,nameid,record.platformID,record.platEncID,record.langID)
   font['OS/2'].usWeightClass=weight;font.save(dest)
  data=dest.read_bytes();rows.append({'family':family,'file':dest.name,'local':str(dest),'weight':weight,'sourceUrl':source['url'],'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)});print(f'Prepared {family} {weight}: {len(data)} bytes',flush=True)
Path('audit/design-font-static-sources.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
importer=Path('tools/import-design-fonts.py').read_text(encoding='utf8');importer=importer.replace("'audit/design-font-sources.json'","'audit/design-font-static-sources.json'")
Path('tools/import-static-design-fonts.py').write_text(importer,encoding='utf8')
index=Path('C:/Users/NovusLuna/.openpencil/fonts/index.json');shutil.copy2(index,'audit/font-index-before-source-static.json')
exec(compile(importer,'tools/import-static-design-fonts.py','exec'))