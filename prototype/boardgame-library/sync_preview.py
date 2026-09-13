"""Embed the shared design values, local CSS and JS in the offline flow."""
from pathlib import Path
import json
import re

here=Path(__file__).resolve().parent
tokens=json.loads((here.parent/'design-system/tokens.json').read_text())
c=tokens['colors']
mapping={'page':c['surface'],'panel':c['surface'],'form':c['surface_secondary'],
         'text':c['foreground'],'muted':c['secondary'],'line':c['border'],
         'accent':c['accent'],'accent-text':c['accent_text'],'soft':c['accent_soft'],
         'on':c['on_accent'],'danger':'#995B32','mask':'rgba(0,0,0,.4)'}
variables=';'.join('--dr-'+k+':'+v for k,v in mapping.items())
variables+=';'+';'.join('--dr-drawer-'+k+':'+str(v) for k,v in tokens['drawer']['height_tiers'].items())
palette='#dragon-boardgame-flow{'+variables+';color:var(--dr-text);font:400 14px/22px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;max-width:390px;margin:auto;color-scheme:light;}'
css=palette+'\n'+(here/'flow.css').read_text()
js=(here/'flow.js').read_text()
path=here/'flow.html'
source=path.read_text()
source,n=re.subn(r'<style>.*?</style>',lambda _: '<style>\n'+css+'</style>',source,count=1,flags=re.S)
assert n==1
source,n=re.subn(r'/\* FLOW_SOURCE_START \*/.*?/\* FLOW_SOURCE_END \*/',lambda _: '/* FLOW_SOURCE_START */\n'+js+'\n/* FLOW_SOURCE_END */',source,count=1,flags=re.S)
assert n==1
assert len(source.encode())<1_000_000
path.write_text(source)
print('已同步统一配色、抽屉高度、预览样式与交互逻辑')
