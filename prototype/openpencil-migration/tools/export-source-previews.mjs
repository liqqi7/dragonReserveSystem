import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const source=JSON.parse(fs.readFileSync('audit/source.json','utf8'));
const roots=source.nodes.filter(r=>r.parent===null);
fs.mkdirSync('audit/source-previews',{recursive:true});
for(let i=0;i<roots.length;i+=6){
 const batch=roots.slice(i,i+6);
 const request={tool:'execute',arguments:{filePath:'D:\\VibeCoding Project\\dragonReserveSystem\\prototype\\龙城小程序.pen',input:batch.map(r=>"Export(["+JSON.stringify(r.node.id)+"],'png','D:/VibeCoding Project/dragonReserveSystem/prototype/openpencil-migration/audit/source-previews',{scale:"+((r.bounds.width*r.bounds.height)>12000000?.25:1)+"})").join(';')}};
 const p='audit/source-export-batch-'+Math.floor(i/6)+'.json',out='audit/source-export-batch-'+Math.floor(i/6)+'-result.json';
 fs.writeFileSync(p,JSON.stringify(request));
 const result=spawnSync(process.execPath,['tools/design-rpc.mjs','pencil',p,out],{encoding:'utf8',windowsHide:true,timeout:180000});
 if(result.status!==0)throw new Error(result.stderr||result.stdout);
 console.log(JSON.stringify({exported:Math.min(i+6,roots.length),total:roots.length}));
}
fs.writeFileSync('audit/source-preview-manifest.json',JSON.stringify(roots.map(r=>({id:r.node.id,name:r.node.name,file:'source-previews/'+r.node.id+'.png',scale:r.bounds.width*r.bounds.height>12000000?.25:1,bounds:r.bounds})),null,2));
