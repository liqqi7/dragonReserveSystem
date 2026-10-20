import sys,json,shutil,struct
from pathlib import Path
sys.path.insert(0,'audit/python-deps')
from fontTools.ttLib import TTFont
MASK=(1<<64)-1
def rotate(x,n):return ((x<<n)|(x>>(64-n)))&MASK
def sip13(data):
 v=[0x736f6d6570736575,0x646f72616e646f6d,0x6c7967656e657261,0x7465646279746573]
 def rnd():
  v[0]=(v[0]+v[1])&MASK;v[1]=rotate(v[1],13);v[1]^=v[0];v[0]=rotate(v[0],32)
  v[2]=(v[2]+v[3])&MASK;v[3]=rotate(v[3],16);v[3]^=v[2]
  v[0]=(v[0]+v[3])&MASK;v[3]=rotate(v[3],21);v[3]^=v[0]
  v[2]=(v[2]+v[1])&MASK;v[1]=rotate(v[1],17);v[1]^=v[2];v[2]=rotate(v[2],32)
 end=len(data)//8*8
 for i in range(0,end,8):
  m=int.from_bytes(data[i:i+8],'little');v[3]^=m;rnd();v[0]^=m
 b=((len(data)&255)<<56)|int.from_bytes(data[end:],'little');v[3]^=b;rnd();v[0]^=b;v[2]^=255
 for _ in range(3):rnd()
 return v[0]^v[1]^v[2]^v[3]
def content_hash(data):return sip13(struct.pack('<Q',len(data))+data)
assert content_hash(b'')==13646096770106105413,'Unexpected Rust DefaultHasher compatibility'
root=Path('C:/Users/NovusLuna/.openpencil/fonts');root.mkdir(parents=True,exist_ok=True);index=root/'index.json'
if index.exists():
 shutil.copy2(index,'audit/font-index-before-design-fonts.json');current=json.loads(index.read_text(encoding='utf8'))
else:current={'fonts':[]}
report=[]
for entry in json.loads(Path('audit/design-font-static-sources.json').read_text(encoding='utf8')):
 data=Path(entry['local']).read_bytes();font=TTFont(entry['local']);names=font['name'];family=names.getDebugName(16)or names.getDebugName(1);weight=font['OS/2'].usWeightClass;italic=bool(font['OS/2'].fsSelection&1)
 assert family==entry['family'],(family,entry['family']);assert len(data)<16*1024*1024
 h=content_hash(data);file=f'{h:016x}.ttf';(root/file).write_bytes(data);item={'family':family,'italic':italic,'weight':weight,'hash':h,'file':file}
 current['fonts']=[e for e in current['fonts']if(e['family'],e['italic'],e['weight'])!=(family,italic,weight)];current['fonts'].append(item);report.append(item)
index.write_text(json.dumps(current,ensure_ascii=False,indent=2),encoding='utf8');Path('audit/design-font-import-validation.json').write_text(json.dumps({'fonts':report,'store':str(root),'method':'Official FontStore disk schema; DefaultHasher SipHash13 bytes hash with usize length prefix. Renderer startup registers each file through Skia.'},ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({'importedFamilies':[r['family']for r in report],'fontCount':len(current['fonts'])}))