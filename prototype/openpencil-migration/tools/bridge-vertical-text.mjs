import fs from 'node:fs';
export function bridgeVerticalText(document){
 const selected=new Map(),changes=[];
 function gather(v){if(!v||typeof v!=='object')return;if(v.type==='text'&&typeof v.height==='number'&&v.textAlignVertical==='middle')selected.set(v.id,structuredClone(v));for(const x of Object.values(v))gather(x)}gather(document);
 const boxKeys=['x','y','width','height','constraints','enabled','visible','opacity','rotation','flipX','flipY','minWidth','minHeight','maxWidth','maxHeight','name','locked','role'];
 function wrap(v){if(!v||typeof v!=='object')return v;if(Array.isArray(v))return v.map(wrap);for(const[k,x]of Object.entries(v))v[k]=wrap(x);if(v.type!=='text'||!selected.has(v.id))return v;
  const box={id:v.id,type:'frame',name:v.name,layout:'horizontal',alignItems:'center',clipContent:false,fill:[{type:'solid',color:'#00000000'}]};for(const k of boxKeys)if(v[k]!==undefined){box[k]=v[k];if(!['width','height','name'].includes(k))delete v[k];}
  const id=v.id;const hugWidth=v.width===undefined||v.width==='fit_content';if(hugWidth)box.width='fit_content';v.id=id+'__centered_text';v.width=hugWidth?'fit_content':'fill_container';v.height='fit_content';v.textGrowth=hugWidth?'auto':'fixed-width';v.role='overlay';delete v.minWidth;delete v.maxWidth;delete v.minHeight;delete v.maxHeight;box.children=[v];box.explain='Source fixed text box: '+JSON.stringify({id,height:box.height,textAlignVertical:'middle',textGrowth:selected.get(id).textGrowth});changes.push({id,innerId:v.id,height:box.height});return box;
 }
 const result=wrap(document);
 function route(v){if(!v||typeof v!=='object')return;if(v.descendants&&typeof v.descendants==='object'){for(const[key,patch]of Object.entries({...v.descendants})){if(!patch||typeof patch!=='object'||Array.isArray(patch))continue;const original=key.split('/').at(-1);if(!selected.has(original))continue;const box={},text={};for(const[k,x]of Object.entries(patch))(boxKeys.includes(k)?box:text)[k]=x;if(Object.keys(box).length)v.descendants[key]=box;else delete v.descendants[key];if(Object.keys(text).length)v.descendants[key+'__centered_text']={...v.descendants[key+'__centered_text'],...text};}}
 for(const x of Object.values(v))route(x)}route(result);
 return {document:result,changes};
}
if(process.argv[1]?.endsWith('bridge-vertical-text.mjs')){const input=process.argv[2]??'../龙城小程序.op',output=process.argv[3]??'audit/centered-text-candidate.op';const {document,changes}=bridgeVerticalText(JSON.parse(fs.readFileSync(input,'utf8')));fs.writeFileSync(output,JSON.stringify(document,null,2));fs.writeFileSync('audit/centered-text-candidate-changes.json',JSON.stringify(changes,null,2));console.log(JSON.stringify({wrappedTextBoxes:changes.length,output}));}
