import sys,json
from pathlib import Path
sys.path.insert(0,str(Path("audit/python-deps").resolve()))
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
source=json.loads(Path("audit/source.json").read_text(encoding="utf8"))
font=TTFont("audit/fonts/MaterialSymbolsRounded.ttf")
cmap=font.getBestCmap()
codepoints={}
for line in Path("audit/fonts/MaterialSymbolsRounded.codepoints").read_text().splitlines():
    name,cp=line.split()
    codepoints[name]=int(cp,16)
upem=font["head"].unitsPerEm
scale=24/upem
output={}
for row in source["nodes"]:
    node=row["node"]
    if node["type"]!="icon" or node["library"]!="Material Symbols Rounded":
        continue
    name=node["icon"]; weight=node.get("weight",400); key=f"{name}:{weight}"
    if key in output:continue
    glyphset=font.getGlyphSet(location={"FILL":0,"GRAD":0,"opsz":24,"wght":weight})
    glyph=glyphset[cmap[codepoints[name]]]
    pen=SVGPathPen(glyphset)
    glyph.draw(TransformPen(pen,(scale,0,0,-scale,0,24)))
    bounds=BoundsPen(glyphset);glyph.draw(bounds)
    left,bottom,right,top=bounds.bounds
    output[key]={"d":pen.getCommands(),"viewBox":[0,0,24,24],"bounds":[left*scale,24-top*scale,(right-left)*scale,(top-bottom)*scale],"family":"Material Symbols Rounded","weight":weight}
Path("audit/material-glyphs.json").write_text(json.dumps(output),encoding="utf8")
print(json.dumps({"glyphs":len(output),"em":upem,"axisDefaults":{a.axisTag:a.defaultValue for a in font["fvar"].axes},"samples":list(output)[:5]}))
