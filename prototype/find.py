import json
p='龙城小程序.pen'
with open(p,encoding='utf-8') as f: d=json.load(f)
def walk(n):
 if n.get('id')=='Itazg': print(json.dumps(n,ensure_ascii=False,indent=2))
 for c in n.get('children',[]): walk(c)
walk(d)
