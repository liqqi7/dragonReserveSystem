import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const [mode,requestPath,outputPath]=process.argv.slice(2);
if(!['pencil','openpencil'].includes(mode)||!requestPath||!outputPath)throw new Error('Usage: node design-rpc.mjs pencil|openpencil request.json output.json');
const request=JSON.parse(await readFile(requestPath,'utf8'));
let rpc,child,nextId=0;
const pending=new Map();
try{
 if(mode==='pencil'){
  child=spawn('D:\\Pencil\\resources\\app.asar.unpacked\\out\\mcp-server-windows-x64.exe',['--app','desktop','--agent','codexCLI'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  createInterface({input:child.stdout}).on('line',line=>{
   let reply;try{reply=JSON.parse(line);}catch{return;}
   const entry=pending.get(reply.id);if(!entry)return;
   pending.delete(reply.id);clearTimeout(entry.timer);
   if(reply.error)entry.reject(new Error(JSON.stringify(reply.error)));else entry.resolve(reply.result);
  });
  const fail=error=>{for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(error);}pending.clear();};
  child.on('error',fail);child.on('exit',code=>fail(new Error('MCP exited '+code)));child.stderr.on('data',()=>{});
  rpc=(method,params)=>new Promise((resolve,reject)=>{
   const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(new Error('MCP timed out: '+method));},60000);
   pending.set(id,{resolve,reject,timer});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
  });
  await rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'Codex-design-migration',version:'1.0'}});
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
 }else{
  rpc=async(method,params)=>{
   const response=await fetch('http://127.0.0.1:3100/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:++nextId,method,params}),signal:AbortSignal.timeout(60000)});
   if(!response.ok)throw new Error('MCP HTTP '+response.status+' '+await response.text());
   const reply=await response.json();if(reply.error)throw new Error(JSON.stringify(reply.error));return reply.result;
  };
 }
 const method=request.method??'tools/call';
 const params=request.params??{name:request.tool,arguments:request.arguments??{}};
 const result=await rpc(method,params);
 await mkdir(path.dirname(path.resolve(outputPath)),{recursive:true});
 await writeFile(outputPath,JSON.stringify(result,null,2),'utf8');
 if(result?.isError)throw new Error('Tool failed; see '+outputPath);
 console.log(JSON.stringify({ok:true,mode,tool:params.name??method,output:path.resolve(outputPath),bytes:Buffer.byteLength(JSON.stringify(result))}));
}finally{if(child){child.stdin.end();child.kill();}}
