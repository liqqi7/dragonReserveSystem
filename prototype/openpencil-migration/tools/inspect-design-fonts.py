import sys,json
from pathlib import Path
sys.path.insert(0,'audit/python-deps')
from fontTools.ttLib import TTFont
for f in Path('D:/Applications/OpenPencil/design-fonts').glob('*.ttf'):
 font=TTFont(f);print(json.dumps({'file':f.name,'family':font['name'].getDebugName(1),'version':font['name'].getDebugName(5),'weight':font['OS/2'].usWeightClass,'units':font['head'].unitsPerEm,'cap':getattr(font['OS/2'],'sCapHeight',None),'axes':[a.axisTag for a in font['fvar'].axes]if'fvar'in font else []}))