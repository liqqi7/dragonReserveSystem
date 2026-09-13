/* Actual entry controller and request.js against the disposable FastAPI bridge. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const {runtime,event}=require('../helpers/boardgameEntryRuntime.cjs');
const input=JSON.parse(fs.readFileSync(0,'utf8'));
async function run(){
 const {page:p,requests}=runtime(async r=>{
   const query=new URLSearchParams(r.query).toString();
   const response=await fetch(input.base+'/api/v1'+r.path+(query?'?'+query:''),{
     method:r.method,headers:{'Content-Type':'application/json',...(r.key?{'Idempotency-Key':r.key}:{})},
     body:r.data===undefined?undefined:JSON.stringify(r.data)});
   const data=await response.json();if(!response.ok)throw {statusCode:response.status,body:data};return data;
 },{userId:input.userId});
 const clean=()=>assert.equal(p.data.error||p.data.formError||p.data.versionError||p.data.previewError,'');
 p.inputQuery(event({},'合成桌游'));await p.search();clean();assert.equal(p.data.preview.state,'queued');
 await p.pollPreview();clean();assert.equal(p.data.preview.state,'ready');
 await p.chooseCandidate(event({id:701001}));clean();assert.equal(p.data.versions.length,2);
 assert.equal(p.data.candidate.description,'Synthetic description');
 p.chooseVersion(event({id:701101}));p.continueEntry();p.ownerChange(event({},1));
 p.field(event({key:'purchase_price'},'0'));p.field(event({key:'quantity'},'2'));
 p.dateConfirm({detail:{dateValue:'2026-01-02'}});await p.save();clean();
 assert.equal(p.data.stage,'success');assert.equal(p.data.result.inventory_ids.length,2);
 assert.ok(p.data.result.inventory.every(b=>b.bgg_version_id===701101&&b.bgg_version.year_published===2024&&b.internal.purchase_price==='0.00'));
 p.newEntry();p.inputQuery(event({},'合成桌游'));await p.search();await p.pollPreview();
 await p.chooseCandidate(event({id:701001}));assert.ok(p.data.candidate.local_game_id);
 p.toggleInventory(event({},false));p.continueEntry();await p.save();clean();assert.equal(p.data.result.inventory_ids.length,0);
 p.newEntry();p.inputQuery(event({},'本地桌游'));await p.search();p.manualEntry();p.ownerChange(event({},1));
 p.typeChange(event({},true));await p.save();clean();assert.equal(p.data.result.game.game_type,'expansion');
 p.onUnload();console.log(JSON.stringify({status:'passed',requests:requests.length,controllerPages:1}));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
