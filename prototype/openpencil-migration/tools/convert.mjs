import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gradientMesh,gradientMeshGrid} from './gradient-mesh.mjs';
import {organizePages} from './organize-pages.mjs';
import {bridgeVerticalText} from './bridge-vertical-text.mjs';

const source=JSON.parse(fs.readFileSync('audit/source.json','utf8'));
const rows=new Map(source.nodes.map(r=>[r.node.id,r]));
const pathBounds=JSON.parse(fs.readFileSync('audit/path-bounds.json','utf8'));
const materialGlyphs=JSON.parse(fs.readFileSync('audit/material-glyphs.json','utf8'));
const phosphorGlyphs=JSON.parse(fs.readFileSync('audit/phosphor-glyphs.json','utf8'));
function vectorIcon(n,out,row){
 const glyph=(n.library==='Material Symbols Rounded'?materialGlyphs:phosphorGlyphs)[n.icon+':'+(n.weight??400)];
 if(!glyph)throw new Error('Missing glyph '+n.library+'/'+n.icon);
 const [vx,vy,vw,vh]=glyph.viewBox,[x,y,w,h]=glyph.bounds;
 const width=typeof n.width==='number'?n.width:row.bounds.width,height=typeof n.height==='number'?n.height:row.bounds.height;
 const fill=out.fill;
 delete out.iconFontFamily;delete out.iconFontName;delete out.fill;
 return {...out,type:'frame',layout:'none',width,height,children:[{id:n.id+'__glyph',type:'path',name:n.name+' · 原始矢量轮廓',x:(x-vx)*width/vw,y:(y-vy)*height/vh,width:w*width/vw,height:h*height/vh,constraints:{h:'left',v:'top'},d:glyph.d,fill}]};
}

const byKind=new Map(JSON.parse(fs.readFileSync('audit/openpencil-schema.json','utf8')).definitions.PenNode.oneOf.map(v=>[v.properties.type.enum[0],v.properties]));
const report={sourceNodes:source.nodes.length,mappedProperties:{},notices:[],missingAssets:[],sourceAssets:[],derivedComponents:[]};
const seenAssets=new Set();
const embeddedImages={};
const sourceDir=path.resolve('..');
const argValue=flag=>{const i=process.argv.indexOf(flag);return i<0?undefined:process.argv[i+1];};
const targetFile=path.resolve(argValue('--output')??path.join(sourceDir,'龙城小程序.op'));
if(path.extname(targetFile)!=='.op')throw new Error('Migration output must use .op; source .pen must never be overwritten.');
const reportFile=argValue('--report')??'audit/conversion-report.json';
const own=(o,k)=>Object.hasOwn(o,k);
const list=v=>v==null?[]:Array.isArray(v)?v:[v];
const note=(id,feature,detail)=>report.notices.push({id,feature,detail});
function effective(n,visiting=new Set()){
 if(n.type!=='ref')return n;
 if(visiting.has(n.ref))throw new Error('Circular component '+n.ref);
 const base=rows.get(n.ref)?.node;if(!base)throw new Error('Missing component '+n.ref);
 return {...effective(base,new Set([...visiting,n.ref])),...n};
}
function imageUrl(url,id){
 if(!url||/^(data:|https?:|op-image:)/.test(url))return url;
 const absolute=path.resolve(sourceDir,url);
 if(!seenAssets.has(absolute)){
  seenAssets.add(absolute);
  report.sourceAssets.push({source:url,resolved:absolute,exists:fs.existsSync(absolute)});
  if(!fs.existsSync(absolute))report.missingAssets.push({id,url,absolute});
 }
 let actual=absolute;
 if(!fs.existsSync(actual)){
  if(url==='generated-1.png'&&fs.existsSync('audit/source-missing-asset.png/qAMWN.png')){
   actual=path.resolve('audit/source-missing-asset.png/qAMWN.png');
   note(id,'missing_asset_placeholder','Source itself shows missing-image checkerboard. Preserve its rendered placeholder, not a recovered original.');
  }else return url.replaceAll('\\','/');
 }
 const bytes=fs.readFileSync(actual),hash=createHash('sha256').update(bytes).digest('hex');
 const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp'}[path.extname(actual).toLowerCase()]??'application/octet-stream';
 embeddedImages[hash]??='data:'+mime+';base64,'+bytes.toString('base64');
 return 'op-image:'+hash;
}
function fills(value,id,isStroke=false){
 const values=list(value);return values.map(v=>{
  if(typeof v==='string')return {type:'solid',color:v};
  const common={};if(own(v,'opacity'))common.opacity=v.opacity;
  if(v.blendMode)common.blendMode=v.blendMode.replace(/[A-Z]/g,m=>'_'+m.toLowerCase());
  if(v.type==='color')return {...common,type:'solid',color:v.color};
  if(v.type==='image'){
   const out={...common,type:'image',src:'',url:imageUrl(v.url,id),mode:{cover:'fill',contain:'fit',stretch:'stretch'}[v.mode]??'fill'};
   if(v.transform){const [a,b,c,d,tx,ty]=v.transform;out.transform={m00:a,m01:c,m02:tx,m10:b,m11:d,m12:ty};}
   return out;
  }
  if(v.type==='gradient'){
   const stops=(v.colors??[]).map(s=>({offset:s.position,color:s.color})).sort((a,b)=>a.offset-b.offset);
   const rotation=v.rotation??0;
   const elliptical=v.gradientType==='radial'&&Math.abs((v.size?.width??1)-(v.size?.height??1))>1e-8;
   const nonDefaultLinear=v.gradientType==='linear'&&(Math.abs(rotation/90-Math.round(rotation/90))>1e-8||Math.abs((v.size?.height??1)-1)>1e-8||Math.abs((v.center?.x??.5)-.5)>1e-8||Math.abs((v.center?.y??.5)-.5)>.00000001);
   if(!isStroke&&(elliptical||nonDefaultLinear)){
    const grid=gradientMeshGrid(v);note(id,elliptical?'elliptical_radial_mesh':'linear_geometry_mesh','Editable '+grid+'×'+grid+' mesh retains source normalized center, length and aspect ratio. Original gradient parameters are stored in fill.explain.');
    return gradientMesh(v,grid);
   }
   if(v.gradientType==='radial'){
    const sx=v.size?.width??1,sy=v.size?.height??1;
    if(sx!==sy)note(id,'radial_gradient_aspect','Target exposes one radius; noncircular gradient needs render comparison.');
    return {...common,type:'radial_gradient',cx:v.center?.x??.5,cy:v.center?.y??.5,radius:Math.max(sx,sy)/2,stops};
   }
   if(v.gradientType&&v.gradientType!=='linear')note(id,'gradient_kind',v.gradientType);
   return {...common,type:'linear_gradient',angle:-(v.rotation??0),stops};
  }
  if(v.type==='solid')return {...v};
  throw new Error('Unsupported fill '+v.type+' on '+id);
 }).map((fill,index)=>{const original=values[index];if(original?.enabled!==false)return fill;note(id,'disabled_fill_preserved','Keep disabled paint color as an opacity-zero native fill. Original paint is retained in fill.explain.');return {...fill,opacity:0,explain:(fill.explain?fill.explain+'; ':'')+'Disabled Pencil paint: '+JSON.stringify(original)};}).reverse();
}
function constantAlphaPaint(fill,id){
 if(fill?.length!==1||fill[0].type!=='solid')return fill;
 const f=fill[0],m=f.color?.match(/^#([a-f0-9]{6})([a-f0-9]{2})$/i),alpha=(m?parseInt(m[2],16)/255:1)*(f.opacity??1);
 if(!(alpha>0&&alpha<1))return fill;
 const {color,type,...rest}=f;note(id,'constant_alpha_gradient','Equivalent constant-color gradient preserves alpha without a detached background layer.');
 return [{...rest,type:'linear_gradient',angle:0,stops:[{offset:0,color},{offset:1,color}],explain:'Constant-color paint: '+JSON.stringify(f)}];
}
function effects(value){
 return list(value).map(v=>v.type==='shadow'?{type:'shadow',inner:v.shadowType==='inner',visible:v.enabled!==false,offsetX:v.offset?.x??0,offsetY:v.offset?.y??0,blur:v.blur??0,spread:0,color:v.color??'#000000'}:{type:v.type,radius:v.radius??0,visible:v.enabled!==false});
}
function patch(input,base,row,partial=false){
 const out={};
 for(const [k,v] of Object.entries(input)){
  report.mappedProperties[k]=(report.mappedProperties[k]??0)+1;
  if(['children','id','type','ref','descendants','reusable'].includes(k))continue;
  if(k==='fill'){out.fill=fills(v,base.id);if(['frame','group','rectangle'].includes(base.type))out.fill=constantAlphaPaint(out.fill,base.id);continue;}
  if(k==='enabled'){out.enabled=v;if(typeof v==='boolean')out.visible=v;if(v===false){out.x=input.x??0;out.y=input.y??0;out.constraints={h:'left',v:'top'};}continue;}
  if((k==='width'||k==='height')&&typeof v==='string'&&/^(fit_content|fill_container)\([\d.]+\)$/.test(v)){
   const [,kind,size]=v.match(/^(fit_content|fill_container)\(([\d.]+)\)$/);
   const parent=rows.get(row.parent)?.node;
   if(kind==='fill_container'&&parent?.type==='frame'&&(parent.layout??'horizontal')!=='none'&&typeof parent[k]==='number'){
    out[k]=kind;note(base.id,'fill_fallback_resolved','Keep live '+k+' fill behavior; parent has a definite '+k+' so the source fallback '+size+' is not needed.');
   }else{out[k]=Number(size);note(base.id,'sizing_fallback','Preserve authored '+k+' '+v+' as '+size+' px; target does not implement the numeric fallback syntax.');}
   continue;
  }
  if(k==='stroke'){
   out.stroke={thickness:input.strokeWidth??base.strokeWidth??1,align:({inner:'inside',outer:'outside',center:'center'})[input.strokeAlignment??base.strokeAlignment??'center'],cap:({butt:'none',round:'round',square:'square'})[input.strokeLinecap??base.strokeLinecap??'butt'],join:input.strokeLinejoin??base.strokeLinejoin??'miter',fill:fills(v,base.id,true)};continue;
  }
  if(['strokeWidth','strokeAlignment','strokeLinecap','strokeLinejoin'].includes(k))continue;
  if(k==='effect'){out.effects=effects(v);continue;}
  if(k==='clip'){out.clipContent=v;continue;}
  if(k==='geometry'){out.d=v;continue;}
  if(k==='viewBox')continue;
  if(k==='context'){out.explain=v;continue;}
  if(k==='library'){out.iconFontFamily=v;continue;}
  if(k==='icon'){out.iconFontName=v;continue;}
  if(k==='weight')continue;
  if(k==='layoutPosition')continue;
  if(k==='rotation'){out.rotation=-v;continue;}
  if(k==='layoutIncludeStroke'){note(base.id,'layout_stroke','Source includes stroke in layout.');continue;}
  out[k]=structuredClone(v);
 }
 if(partial&&['strokeWidth','strokeAlignment','strokeLinecap','strokeLinejoin'].some(k=>own(input,k))&&!own(input,'stroke')&&base.stroke){
  out.stroke={thickness:input.strokeWidth??base.strokeWidth??1,align:({inner:'inside',outer:'outside',center:'center'})[input.strokeAlignment??base.strokeAlignment??'center'],cap:({butt:'none',round:'round',square:'square'})[input.strokeLinecap??base.strokeLinecap??'butt'],join:input.strokeLinejoin??base.strokeLinejoin??'miter',fill:fills(base.stroke,base.id,true)};
 }
 if(partial){
  const parent=row.parent?effective(rows.get(row.parent)?.node??{}):null;
  const absolute=(input.layoutPosition??base.layoutPosition)==='absolute';
  if(parent?.type==='frame'&&(parent.layout??'horizontal')!=='none'&&!absolute&&input.enabled!==false){delete out.x;delete out.y;}
 }
 if(['space_between','space_around'].includes(input.justifyContent??base.justifyContent)){out.gap=base.id==='JLvim'?-6:0;}
 if(!partial){
  const parent=row.parent?effective(rows.get(row.parent).node):null;
  const inFlow=parent?.type==='frame'&&(parent.layout??'horizontal')!=='none'&&input.layoutPosition!=='absolute';
  if(inFlow){delete out.x;delete out.y;}
  else if(row.parent!==null){out.x=input.x??0;out.y=input.y??0;}
  if(input.layoutPosition==='absolute'){out.x=input.x??0;out.y=input.y??0;out.constraints={h:'left',v:'top'};}
  if(!inFlow&&row.parent!==null)out.constraints={h:'left',v:'top'};
  if(input.enabled===false){out.x=input.x??0;out.y=input.y??0;out.constraints={h:'left',v:'top'};}
  if(input.type==='group'&&input.height==='fill_container'&&parent?.type==='frame'&&parent.height===undefined){out.x=row.bounds.x;out.y=row.bounds.y;out.constraints={h:'left',v:'top'};note(input.id,'cyclic_group_fill','Source fill-height group contributes no hug size; preserve its resolved position without expanding the hug parent.');}
 }
 if(!partial&&input.rotation&&typeof input.width==='number'&&typeof input.height==='number'&&own(out,'x')&&own(out,'y')){
  const angle=input.rotation*Math.PI/180,c=Math.cos(angle),sn=Math.sin(angle),w=input.width,h=input.height;
  out.x+=(c-1)*w/2+sn*h/2;out.y+=-sn*w/2+(c-1)*h/2;
  note(input.id,'rotation_origin','Translate the native center-based rotation so its paint transform equals Pencil top-left-based rotation. Numeric sizes and editable rotation are retained.');
 }
 return out;
}
function routePartialRef(base,value){
 if(base.type!=='ref')return value;
 const allowed=byKind.get('ref'),out={},rootPatch={};
 for(const [key,v] of Object.entries(value)){
  if(own(allowed,key))out[key]=v;else rootPatch[key]=v;
 }
 if(Object.keys(rootPatch).length)out.descendants={...(out.descendants??{}),[base.ref]:{...(out.descendants?.[base.ref]??{}),...rootPatch}};
 return out;
}
function setOverridePath(output,parts,value){
 const [head,...tail]=parts;
 if(!tail.length){output[head]={...(output[head]??{}),...value};return;}
 const base=rows.get(head)?.node;
 if(!base||base.type!=='ref')throw new Error('Nested override does not cross an instance: '+parts.join('/'));
 const existing=output[head]??{};
 const descendants=structuredClone(existing.descendants??overrides(base));
 setOverridePath(descendants,tail,value);
 output[head]={...existing,descendants};
}
function overrides(n){
 const out={};
 for(const [key,value] of Object.entries(n.descendants??{})){
  const refId=key.split('/').at(-1),base=rows.get(refId)?.node??{id:refId,type:value.type??'frame'};
  let converted=patch(value,base,rows.get(refId)??{parent:null},true);
  if(value.type){converted=convertInline(value);converted.fill??=[];converted.stroke??=null;converted.effects??=[];}
  else if(value.children)converted.children=value.children.map(child=>convertInline(child));
  if(base.type==='icon'&&base.library!=='lucide')converted=convertInline({...base,...value});
  else if(!value.type)converted=routePartialRef(base,converted);
  setOverridePath(out,key.split('/'),converted);
 }
 return out;
}
function convertInline(n){
 const row=rows.get(n.id)??{node:n,parent:null,bounds:{x:n.x??0,y:n.y??0,width:typeof n.width==='number'?n.width:0,height:typeof n.height==='number'?n.height:0},children:[]};
 return convertRow({...row,node:n},n.children??[]);
}
function convertRow(row,inlineChildren){
 const n=row.node,base=effective(n);
 let out={id:n.id,type:n.type==='icon'?'icon_font':n.type,...patch(n,base,row)};
 if(n.name===undefined)out.name=n.type+' · '+n.id;
 if(n.type==='ref'){
  out.ref=n.ref;out.descendants=overrides(n);
  const allowed=byKind.get('ref'),rootOverride={};
  for(const key of Object.keys(out))if(!own(allowed,key)){rootOverride[key]=out[key];delete out[key];}
  if(!own(out,'x'))rootOverride.x=null;
  if(!own(out,'y'))rootOverride.y=null;
  if(Object.keys(rootOverride).length)out.descendants[n.ref]={...(out.descendants[n.ref]??{}),...rootOverride};
  if(rows.get(n.ref)?.node.reusable&&rows.get(n.ref)?.node.type==='ref'){
   const root=out.descendants[n.ref];
   const nested=Object.fromEntries(Object.entries(out.descendants).filter(([id])=>id!==n.ref));
   const derived=rows.get(n.ref).node;
   const inherited=overrides(derived);
   out.descendants={...(root?{[n.ref]:root}:{}),[n.ref+'__derived_reference']:{descendants:{...inherited,...nested}}};
  }
  if(n.reusable){
   // Keep the template as a reusable wrapper around a live reference,
   // rather than detaching its content into an independent copy.
   const childId=n.id+'__derived_reference';
   const child={...out,id:childId,x:0,y:0,name:n.name+' · 关联模板'};
   const rootStyle=child.descendants[n.ref]??{};
   child.descendants[n.ref]={...rootStyle,width:'fill_container',height:'fill_container'};
   const size={width:n.width??row.bounds.width,height:n.height??row.bounds.height};
   out={id:n.id,type:'frame',name:n.name,reusable:true,layout:'none',...size,...('x'in out?{x:out.x,y:out.y}:{}),children:[child]};
   report.derivedComponents.push({id:n.id,base:n.ref,linkedChildId:childId});
   note(n.id,'derived_component_wrapper','Reusable ref represented by a reusable frame containing a linked ref.');
  }
 }else{
  if(n.reusable)out.reusable=true;
  if(n.type==='frame'){out.layout??='horizontal';out.width??='fit_content';out.height??='fit_content';out.clipContent??=false;}
  if(n.type==='group'){out.layout='none';out.width=row.bounds.width;out.height=row.bounds.height;}
  const children=inlineChildren??row.children.map(id=>rows.get(id));
  if(children.length){
   const converted=children.map(c=>c.node?convertRow(c):convertInline(c));
   if(out.layout==='none')out.children=converted.reverse();
   else {
    const isAbs=c=>c.constraints&&own(c,'x');
    const indices=converted.flatMap((c,i)=>isAbs(c)?[]:[i]);
    if(!indices.length)out.children=converted.reverse();
    else {
     const first=indices[0],last=indices.at(-1);
     const middle=converted.filter((c,i)=>isAbs(c)&&c.visible!==false&&i>first&&i<last);
     if(middle.length)note(n.id,'interleaved_overlay','Absolute overlays appear between flow children; needs dedicated paint-order review.');
     out.children=[...converted.filter((c,i)=>isAbs(c)&&i>=first).reverse(),...converted.filter(c=>!isAbs(c)),...converted.filter((c,i)=>isAbs(c)&&i<first).reverse()];
    }
   }
  }
 }
 // Pencil separates layout fallback height from the referenced card's paint
 // height. Model that explicitly with a no-paint sizing wrapper and a live ref.
 if(n.type==='ref'&&/^fit_content\([\d.]+\)$/.test(n.height??'')){
  const innerId=n.id+'__sizing_reference',inner={...out,id:innerId,x:0,y:0,constraints:{h:'left',v:'top'},name:n.name+' · 关联卡片'};
  inner.descendants=structuredClone(out.descendants);delete inner.descendants[n.ref].height;
  out={id:n.id,type:'frame',name:n.name,layout:'none',width:n.width??row.bounds.width,height:row.bounds.height,children:[inner]};
  const position=patch(n,base,row);for(const k of ['x','y','constraints','enabled','visible','rotation','opacity'])if(position[k]!==undefined)out[k]=position[k];
  note(n.id,'sizing_reference_wrapper','Keep layout fallback '+n.height+' while the linked component paints at its intrinsic height.');
 }
 if(n.type==='text'){
  out.content??='';
  if(n.fontFamily==='Inter'&&n.lineHeight===undefined)out.lineHeight=1.2;
  if(n.width==='fill_container')out.minWidth??=0;
 }
 // Preserve the source's overlapping month anchors without removing flow.
 if(n.id==='JLvim'){out.gap=-6;note(n.id,'overlapping_distribution','Native space_between clamps negative free space; encode its -6 px gap explicitly.');}
 // Keep overflow cards in real flex layout while excluding them from the
 // target-only post-layout expansion pass. The native solver places them correctly.
 if(n.type==='frame'&&n.clip!==true&&(typeof n.height==='number'||n.height==='fill_container')&&(n.layout??'horizontal')!=='none'){
  const flowChildren=row.children.map(id=>rows.get(id)).filter(r=>r&&r.node.enabled!==false&&r.node.layoutPosition!=='absolute');
  const pad=n.padding;const bottomPadding=typeof pad==='number'?pad:Array.isArray(pad)?(pad.length<3?pad[0]??0:pad[2]??0):0;
  if(flowChildren.some(r=>r.bounds.y+r.bounds.height>row.bounds.height-bottomPadding+.5)){
   for(const child of out.children??[])child.role='overlay';
   note(n.id,'overflow_repair_guard','Keep authored constrained height '+n.height+' (resolved '+row.bounds.height+' px) including its bottom padding, and overflowing flow children. Native flex still lays out children; role skips the extra target-only expansion/reflow repair.');
  }
 }
 // Source paints later flow siblings above earlier ones. Reverse the native
 // paint/flow order and mirror twice to preserve positions and upright content.
 // This container has symmetric padding and no own paint or effects.
 if(['Wqvlc','HT6ol'].includes(n.id)){out.children.reverse();out.flipY=!out.flipY;for(const child of out.children)child.flipY=!child.flipY;note(n.id,'flow_paint_order_bridge','Double mirror retains vertical Auto Layout and visual ordering for overlapping overflow cards. Tree insertion order is reversed in this compatibility bridge.');}
 if(n.type==='icon'&&n.library!=='lucide')out=vectorIcon(n,out,row);
 if(n.type==='path'&&n.viewBox){
  const [vx,vy,vw,vh]=n.viewBox,[x,y,x2,y2]=pathBounds[n.id];
  const width=typeof n.width==='number'?n.width:row.bounds.width,height=typeof n.height==='number'?n.height:row.bounds.height;
  const child={id:n.id+'__geometry',type:'path',name:n.name+' · 原始矢量轮廓',d:out.d,fill:out.fill,stroke:out.stroke,x:(x-vx)*width/vw,y:(y-vy)*height/vh,width:(x2-x)*width/vw,height:(y2-y)*height/vh,constraints:{h:'left',v:'top'}};
  delete out.d;delete out.fill;delete out.stroke;out={...out,type:'frame',layout:'none',width,height,children:[child]};
 }
 // A constant gradient preserves a translucent paint without the native
 // solid-fill alpha duplication. It remains attached to the real container,
 // so Auto Layout resizing needs no extra background geometry.
 if(['frame','group','rectangle'].includes(out.type)&&out.fill?.length===1&&out.fill[0].type==='solid'){
  const fill=out.fill[0],m=fill.color?.match(/^#([a-f0-9]{6})([a-f0-9]{2})$/i),alpha=(m?parseInt(m[2],16)/255:1)*(fill.opacity??1);
  if(alpha>0&&alpha<1){
   const {color,type,...rest}=fill;out.fill=[{...rest,type:'linear_gradient',angle:0,stops:[{offset:0,color},{offset:1,color}],explain:'Constant-color paint: '+JSON.stringify(fill)}];
   note(n.id,'constant_alpha_gradient','Equivalent constant-color gradient preserves alpha without a detached background layer.');
  }
 }
 // Preserve fixed unclipped containers: the native repair otherwise grows
 // numeric bounds when a frame has no paint at all. Transparent paint has no visual effect.
 if(['frame','group'].includes(out.type)&&(typeof out.width==='number'||typeof out.height==='number')&&!out.fill&&!out.stroke)out.fill=[{type:'solid',color:'#00000000'}];
 const allowed=byKind.get(out.type);
 if(!allowed)throw new Error('Unsupported target type '+out.type);
 for(const key of Object.keys(out))if(!own(allowed,key))throw new Error('Unmapped property '+key+' on '+n.id);
 return out;
}
const children=source.nodes.filter(r=>r.parent===null).map(r=>convertRow(r));
// Embedded op-image tokens in untyped descendant patches are not expanded by
// the native loader. Inline only those patch assets; regular fills stay deduplicated.
function inlinePatchImages(value,inPatch=false){
 if(!value||typeof value!=='object')return;
 if(inPatch&&value.type==='image'&&value.url?.startsWith('op-image:'))value.url=embeddedImages[value.url.slice(9)];
 for(const [key,v]of Object.entries(value))inlinePatchImages(v,inPatch||key==='descendants');
}
children.forEach(n=>inlinePatchImages(n));
const document={version:'1.2',formatVersion:'1.2',name:'龙城小程序',variables:source.variables.variables??{},images:embeddedImages,children};
if(!process.argv.includes('--single-page')){report.pageOrganization=organizePages(document);fs.writeFileSync('audit/page-organization.json',JSON.stringify(report.pageOrganization,null,2));}
const verticalText=bridgeVerticalText(document);report.verticalTextBoxes=verticalText.changes;
const preservedFile='audit/editor-preserved-overrides.json';
report.preservedEditorOverrides=fs.existsSync(preservedFile)?JSON.parse(fs.readFileSync(preservedFile,'utf8')):[];
for(const change of report.preservedEditorOverrides){let found=0;function apply(n){if(n.id===change.id){Object.assign(n,change.fields);found++;}(n.children??[]).forEach(apply)}(document.pages?.flatMap(p=>p.children)??document.children).forEach(apply);if(found!==1)throw Error('Cannot preserve editor edit '+change.id);}
fs.writeFileSync(targetFile,JSON.stringify(document,null,2));
fs.writeFileSync(reportFile,JSON.stringify(report,null,2));
console.log(JSON.stringify({target:targetFile,sourceNodes:report.sourceNodes,roots:children.length,derivedComponents:report.derivedComponents.length,assets:report.sourceAssets.length,missingAssets:report.missingAssets,notices:report.notices.length}));
