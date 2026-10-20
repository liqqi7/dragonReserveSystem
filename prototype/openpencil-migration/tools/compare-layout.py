import json,re
from pathlib import Path
import numpy as np
from PIL import Image,ImageChops,ImageDraw,ImageFont
raw=json.loads(Path("audit/source-resolved-layout-result.json").read_text(encoding="utf8"))
text=next(c["text"] for c in raw["content"] if c["type"]=="text")
source=json.loads(text.split("## Print output\n",1)[1])
Path("audit/source-resolved-layout.json").write_text(json.dumps(source,ensure_ascii=False),encoding="utf8")
source_by={n["id"]:n for n in source}
cache={}
def source_box(n):
    if n["id"] in cache:return cache[n["id"]]
    b=n["bounds"]; x=b["x"];y=b["y"]
    if n["parent"] is not None:
        p=source_box(source_by[n["parent"]]);x+=p[0];y+=p[1]
    out=[x,y,b["width"],b["height"]];cache[n["id"]]=out;return out
report=json.loads(Path("audit/conversion-report.json").read_text(encoding="utf8"))
derived=[d["id"] for d in report["derivedComponents"]]
def normalized(id):
    for key in derived:
        id=id.replace("__"+key+"__derived_reference","")
        if id.startswith(key+"__derived_reference"):id=key+id[len(key+"__derived_reference"):]
    return id
targets={}
for line in Path("audit/target-layout.jsonl").read_text(encoding="utf-8-sig").splitlines():
    try:n=json.loads(line)
    except:continue
    nid=normalized(n["id"])
    if nid not in targets:targets[nid]=n
comparisons=[];missing=[]
for n in source:
    key=n["id"].replace("/","__")
    t=targets.get(key)
    if not t:missing.append({"id":n["id"],"name":n.get("name"),"enabled":n.get("enabled")});continue
    s=source_box(n);b=[t["x"],t["y"],t["w"],t["h"]]
    delta=[round(y-x,3) for x,y in zip(s,b)]
    comparisons.append({"id":n["id"],"name":n.get("name"),"type":n["type"],"source":s,"target":b,"delta":delta,"maxError":max(abs(x) for x in delta)})
comparisons.sort(key=lambda x:x["maxError"],reverse=True)
result={"sourceResolvedNodes":len(source),"matched":len(comparisons),"missing":missing,"within1px":sum(r["maxError"]<=1 for r in comparisons),"within01px":sum(r["maxError"]<=.1 for r in comparisons),"worst":comparisons[:200],"all":comparisons}
Path("audit/layout-comparison.json").write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf8")
print(json.dumps({k:v for k,v in result.items() if k not in ["all","worst","missing"]}))
print(json.dumps({"missingCount":len(missing),"missingSample":missing[:6],"worst":comparisons[:12]},ensure_ascii=False,indent=2))
