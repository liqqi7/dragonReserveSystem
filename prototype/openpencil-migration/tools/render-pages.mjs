import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const [input,prefix]=process.argv.slice(2);if(!input||!prefix)throw Error('Usage: render-pages.mjs input.op audit/prefix');
const doc=JSON.parse(fs.readFileSync(input,'utf8')),exe='D:/Applications/OpenPencil/openpencil-desktop.exe';fs.mkdirSync(prefix+'-previews',{recursive:true});
for(let i=0;i<doc.pages.length;i++){
 doc.editorMeta={activePageIndex:i,preserveAuthoredGeometry:false};const temp=prefix+'-render.op';fs.writeFileSync(temp,JSON.stringify(doc));
 for(const dump of [false,true]){const env={...process.env,OPENPENCIL_RENDER_MARGIN:'0'};delete env.OPENPENCIL_DUMP_LAYOUT;if(dump)env.OPENPENCIL_DUMP_LAYOUT='1';const started=Date.now();const result=spawnSync(exe,['--render-shots',path.resolve(temp),path.resolve(prefix+'-previews'),'.5'],{windowsHide:true,encoding:'utf8',timeout:120000,maxBuffer:32*1024*1024,env});fs.writeFileSync(prefix+(dump?'-layout-':'-render-')+i+(dump?'.jsonl':'.log'),result.stdout??'');fs.writeFileSync(prefix+'-stderr-'+i+'-'+dump+'.log',result.stderr??'');if(result.status!==0)throw Error('Page '+i+': '+result.stderr+' '+result.error);if(!dump)for(const root of doc.pages[i].children){const f=prefix+'-previews/'+root.id+'.png';if(!fs.existsSync(f)||fs.statSync(f).mtimeMs<started-2000)throw Error('No fresh raster: '+root.id);}}
 console.log('Rendered and measured '+doc.pages[i].name+' ('+i+')');
}
