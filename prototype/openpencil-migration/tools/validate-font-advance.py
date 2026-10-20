import sys,json
from pathlib import Path
sys.path.insert(0,'audit/python-deps')
from fontTools.ttLib import TTFont
root=Path('D:/Applications/OpenPencil/design-fonts/source-static');report=json.loads(Path('audit/kerning-probe-validation.json').read_text(encoding='utf8'));results=[]
for family,filename in [('Inter','Inter'),('Geist','Geist'),('Noto Sans SC','NotoSansSC')]:
 f=TTFont(root/(filename+'-400.ttf'));cmap=f.getBestCmap();scale=48/f['head'].unitsPerEm;gpos=f['GPOS'].table;indices=sorted({i for rec in gpos.FeatureList.FeatureRecord if rec.FeatureTag=='kern' for i in rec.Feature.LookupListIndex});lookups=[]
 for i in indices:
  l=gpos.LookupList.Lookup[i]
  for st in l.SubTable:
   kind=l.LookupType
   if kind==9:kind,st=st.ExtensionLookupType,st.ExtSubTable
   if kind==2:lookups.append(st)
 def pair(a,b):
  value=0
  for st in lookups:
   if a not in st.Coverage.glyphs:continue
   record=None
   if st.Format==1:
    records=st.PairSet[st.Coverage.glyphs.index(a)].PairValueRecord;record=next((x for x in records if x.SecondGlyph==b),None)
   elif st.Format==2:record=st.Class1Record[st.ClassDef1.classDefs.get(a,0)].Class2Record[st.ClassDef2.classDefs.get(b,0)]
   if record:
    for key in ['Value1','Value2']:value+=getattr(getattr(record,key,None),'XAdvance',0) or 0
  return value*scale
 for text in ['AVAVAVAVAV','ToToToToTo','iiiiiiiiii','WWWWWWWW']:
  glyphs=[cmap[ord(x)] for x in text];adv=[f['hmtx'].metrics[g][0]*scale for g in glyphs];kern=sum(pair(a,b) for a,b in zip(glyphs,glyphs[1:]));first=f['glyf'][glyphs[0]];last=f['glyf'][glyphs[-1]];inkTail=(last.xMax-first.xMin)*scale;expectedSource=sum(adv[:-1])+kern+inkTail;expectedNative=sum(adv[:-1])+inkTail;row=next(x for x in report['rows'] if x['family']==family and x['content']==text);actualSource=row['sourceInkBounds'][2]-row['sourceInkBounds'][0];actualNative=row['nativeInkBounds'][2]-row['nativeInkBounds'][0];results.append({'family':family,'text':text,'gposKerningPx':kern,'sourceInkWidth':actualSource,'nativeInkWidth':actualNative,'predictedShapedWidth':expectedSource,'predictedUnkernedWidth':expectedNative,'sourcePredictionError':actualSource-expectedSource,'nativePredictionError':actualNative-expectedNative})
x={'fontSize':48,'samples':results,'allSourcePredictionsWithinTwoPixels':all(abs(x['sourcePredictionError'])<=2 for x in results),'allNativePredictionsWithinTwoPixels':all(abs(x['nativePredictionError'])<=2 for x in results)};Path('audit/font-advance-engine-validation.json').write_text(json.dumps(x,indent=2),encoding='utf8');print(json.dumps(x,indent=2))
