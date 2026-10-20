import fs from 'node:fs';
import bounds from 'svg-path-bounds';
const data=JSON.parse(fs.readFileSync('node_modules/@iconify-json/ph/icons.json','utf8'));
const source=JSON.parse(fs.readFileSync('audit/source.json','utf8')),glyphs={};
for(const {node:n} of source.nodes){
 if(n.type!=='icon'||n.library!=='phosphor')continue;
 const k=n.icon+':'+(n.weight??400);if(glyphs[k])continue;
 // Phosphor source icons use the SVG library; the weight option is
 // variable-font-specific, not a synthetic stroke width.
 const icon=data.icons[n.icon];if(!icon)throw new Error('Missing Phosphor '+n.icon);
 const paths=[...icon.body.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(m=>m[1]);
 if(paths.length!==1)throw new Error('Unexpected SVG structure for '+n.icon);
 const b=bounds(paths[0]);
 glyphs[k]={d:paths[0],viewBox:[0,0,icon.width??data.width??256,icon.height??data.height??256],bounds:[b[0],b[1],b[2]-b[0],b[3]-b[1]],family:'phosphor',weight:n.weight??400};
}
fs.writeFileSync('audit/phosphor-glyphs.json',JSON.stringify(glyphs));
console.log(JSON.stringify({phosphorGlyphs:Object.keys(glyphs).length}));
