import json, statistics
from pathlib import Path
root=Path('backend/app/assets/activity-covers')
catalog=json.loads((root/'catalog.json').read_text(encoding='utf-8'))
manifest=json.loads((root/'jpeg-q88-manifest.json').read_text(encoding='utf-8'))
items=[]
for artist in catalog['artists']:
    for art in artist['artworks']:
        entry=manifest[art['image_path']]
        items.append({'id':art['id'],'width':art['width'],'height':art['height'],'bytes':entry['bytes'],'source_bytes':entry['source_bytes'],'method':entry['method'],'deprecated':art.get('deprecated',False)})
for subset_name, subset in [('全部高清封面',items),('当前可选封面',[x for x in items if not x['deprecated']])]:
    widths=[x['width'] for x in subset]; heights=[x['height'] for x in subset]; sizes=[x['bytes'] for x in subset]
    print(subset_name)
    print(' count=',len(subset))
    print(' dimensions=',f'{min(widths)}–{max(widths)} x {min(heights)}–{max(heights)} px')
    print(' size_bytes=',f'min={min(sizes)} max={max(sizes)} mean={round(statistics.mean(sizes))} median={round(statistics.median(sizes))} total={sum(sizes)}')
    print(' smallest=',min(subset,key=lambda x:x['bytes']))
    print(' largest=',max(subset,key=lambda x:x['bytes']))
    print(' dimensions_dist=', sorted({(x['width'],x['height']) for x in subset}))
