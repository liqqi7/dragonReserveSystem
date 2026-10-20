import fs from 'node:fs';const p='tools/convert.mjs';let s=fs.readFileSync(p,'utf8');const anchor='function effects(value){';const helper=`function constantAlphaPaint(fill,id){
 if(fill?.length!==1||fill[0].type!=='solid')return fill;
 const f=fill[0],m=f.color?.match(/^#([a-f0-9]{6})([a-f0-9]{2})$/i),alpha=(m?parseInt(m[2],16)/255:1)*(f.opacity??1);
 if(!(alpha>0&&alpha<1))return fill;
 const {color,type,...rest}=f;note(id,'constant_alpha_gradient','Equivalent constant-color gradient preserves alpha without a detached background layer.');
 return [{...rest,type:'linear_gradient',angle:0,stops:[{offset:0,color},{offset:1,color}],explain:'Constant-color paint: '+JSON.stringify(f)}];
}
`;
if(!s.includes(anchor))throw Error('Fill helper insertion missing');s=s.replace(anchor,helper+anchor);const old="if(k==='fill'){out.fill=fills(v,base.id);continue;}";const next="if(k==='fill'){out.fill=fills(v,base.id);if(['frame','group','rectangle'].includes(base.type))out.fill=constantAlphaPaint(out.fill,base.id);continue;}";if(!s.includes(old))throw Error('Fill patch missing');s=s.replace(old,next);fs.writeFileSync(p,s);
fs.writeFileSync('audit/review-fixes-18.json',JSON.stringify({change:'Apply the verified constant-alpha gradient conversion to frame/rectangle fill overrides as well as full nodes.',evidence:'Six source instance overrides contain partial alpha: three separator izW20 fills and three home-indicator YsLLN fills. The previous full-node-only conversion missed those partial patches.',fonts:'Use the exact public font versions observed in Pencil cache. Imported source-static faces retain family names and authored weights; original VF files and OFL licenses are retained.'},null,2));