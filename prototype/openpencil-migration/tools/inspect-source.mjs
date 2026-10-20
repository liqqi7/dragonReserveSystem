import fs from 'node:fs';
const raw=JSON.parse(fs.readFileSync('audit/source-mcp-result.json','utf8'));
const block=raw.content.find(c=>c.type==='text').text;
const input=JSON.parse(block.slice(block.indexOf('## Print output\n')+'## Print output\n'.length));
fs.writeFileSync('audit/source.json',JSON.stringify(input,null,2));
const props={},types={},fonts={},fills={},effects={},layouts={},refs=[],images=[],byType={};
function inspect(v){
 if(!v||typeof v!=='object')return;
 if(v.type==='image'&&v.url)images.push(v.url);
 if(v.type==='gradient')fills[v.gradientType??'linear']=(fills[v.gradientType??'linear']??0)+1;
 if(['shadow','blur','background_blur'].includes(v.type))effects[v.type]=(effects[v.type]??0)+1;
 for(const x of Object.values(v))if(typeof x==='object')inspect(x);
}
for(const r of input.nodes){
 const n=r.node;types[n.type]=(types[n.type]??0)+1;byType[n.type]??=n;
 for(const p of Object.keys(n))props[p]=(props[p]??0)+1;
 if(n.fontFamily)fonts[n.fontFamily]=(fonts[n.fontFamily]??0)+1;
 if(n.layout)layouts[n.layout]=(layouts[n.layout]??0)+1;
 if(n.ref)refs.push({id:n.id,ref:n.ref,descendants:n.descendants,properties:n});
 inspect(n);
}
const summary={count:input.nodes.length,roots:input.nodes.filter(r=>r.parent===null).map(r=>({id:r.node.id,name:r.node.name,...r.bounds})),types,props,fonts,fills,effects,layouts,variables:input.variables,uniqueImages:[...new Set(images)],samples:byType,referenceSamples:refs.slice(0,4)};
fs.writeFileSync('audit/source-inventory.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify({...summary,roots:summary.roots.slice(0,12),referenceSamples:refs.slice(0,2)},null,2));
