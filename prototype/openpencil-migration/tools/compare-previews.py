import json
from pathlib import Path
from PIL import Image
import numpy as np
manifest=json.loads(Path("audit/source-preview-manifest.json").read_text(encoding="utf8"))
rows=[]
for item in manifest:
    sp=Path("audit")/item["file"];tp=Path("audit/review")/(item["id"]+"-target.png")
    if not sp.exists() or not tp.exists():
        rows.append({"id":item["id"],"name":item.get("name",item["id"]),"missing":True});continue
    s=Image.open(sp).convert("RGBA");t=Image.open(tp).convert("RGBA")
    source_size=s.size;target_size=t.size

    width=max(s.width,t.width);height=max(s.height,t.height)
    a=Image.new("RGBA",(width,height),"white");b=a.copy()
    a.alpha_composite(s);b.alpha_composite(t)
    av=np.asarray(a).astype(np.int16)[:,:,:3];bv=np.asarray(b).astype(np.int16)[:,:,:3]
    diff=np.abs(av-bv);maxdiff=diff.max(axis=2)
    rows.append({"id":item["id"],"name":item.get("name",item["id"]),"sourceSize":source_size,"targetSize":target_size,"sizeMatch":s.size==t.size,"meanError":round(float(diff.mean()),3),"within10Percent":round(float((maxdiff<=10).mean()*100),2),"within25Percent":round(float((maxdiff<=25).mean()*100),2)})
rows.sort(key=lambda r:r.get("meanError",9999),reverse=True)
Path("audit/visual-comparison.json").write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding="utf8")
print(json.dumps({"total":len(rows),"missing":sum(r.get("missing",False) for r in rows),"sizeMismatch":sum(not r.get("sizeMatch",True) for r in rows),"worst":rows[:18]},ensure_ascii=False,indent=2))
