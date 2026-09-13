const test=require('node:test'),assert=require('node:assert/strict');
const {runtime,event,plain}=require('./helpers/boardgameEntryRuntime.cjs');
const item={bgg_id:701001,item_id:1,revision:1,name:'测试桌游',detail_state:'ready',game_type:'base',version_count:2};
const preview={id:'preview-one',state:'ready',revision:2,items:[item],missing_ids:[]};
const editions=[{bgg_version_id:701101,name:'中文版',languages:['Chinese'],publishers:['出版商'],year_published:2024},
  {bgg_version_id:701201,name:'English edition',languages:['English'],publishers:[],year_published:2022}];
function standard(r) {
  if(r.path==='/bgg/search') return {items:[item],total:1,next_offset:null};
  if(r.path==='/boardgame-intake-previews') return preview;
  if(r.path.endsWith('/items/1')) return {game:item,versions:editions,total:2,next_offset:null};
  if(r.path==='/boardgame-intakes') return {game_id:1,inventory_ids:r.data.inventory?[1]:[]};
  throw new Error('Unexpected '+r.path);
}
async function select(p) {p.inputQuery(event({},'桌游'));await p.search();await p.chooseCandidate(event({id:701001}));}
test('name search fetches full candidates, requires edition choice and only writes on confirmation',async()=>{
 const {page:p,requests}=runtime(standard);await select(p);
 assert.equal(requests[0].timeout,45000);assert.equal(p.data.stage,'version');assert.equal(p.data.selection,null);
 p.continueEntry();assert.match(p.data.formError,/请选择一个版本/);
 p.chooseVersion(event({id:701101}));p.continueEntry();assert.equal(p.data.stage,'form');
 await p.save();assert.match(p.data.formError,/归属/);assert.ok(!requests.some(r=>r.path==='/boardgame-intakes'));
 p.ownerChange(event({},1));p.field(event({key:'purchase_price'},'0'));p.dateConfirm({detail:{dateValue:'2026-01-02'}});
 await p.save();const save=requests.find(r=>r.path==='/boardgame-intakes');
 assert.equal(save.data.bgg_version_id,701101);assert.equal(save.data.inventory.purchase_price,'0');
 assert.equal(save.data.inventory.purchased_on,'2026-01-02');assert.equal(p.data.stage,'success');
 p.viewResult();p.newEntry();assert.equal(p.data.stage,'search');assert.equal(p.data.query,'');
});
test('a stale search cannot replace a newer name and pagination is passed through',async()=>{
 let finish;const {page:p}=runtime(r=>r.path==='/bgg/search'&&r.query.q==='old'?new Promise(resolve=>{finish=resolve;}):
   r.path==='/bgg/search'?{items:[item],total:23,next_offset:Number(r.query.offset)+10<23?Number(r.query.offset)+10:null}:standard(r));
 p.inputQuery(event({},'old'));const old=p.search();await new Promise(setImmediate);
 p.inputQuery(event({},'new'));await p.search();finish({items:[{bgg_id:999,name:'old'}],total:1,next_offset:null});await old;
 assert.equal(p.data.results[0].bgg_id,701001);assert.equal(p.data.query,'new');
 await p.nextSearch();assert.equal(p.data.offset,10);assert.equal(p.data.total,23);
 await p.nextSearch();assert.equal(p.data.offset,20);assert.equal(p.data.nextOffset,null);
});
test('preview creation retries with the same key and polling stops while hidden or after unloading',async()=>{
 let attempts=0;const {page:p,requests,timers}=runtime(r=>{
  if(r.path==='/boardgame-intake-previews'&&++attempts===1)throw {};
  if(r.path==='/boardgame-intake-previews')return {...preview,state:'queued',items:[]};
  if(r.path==='/boardgame-intake-previews/preview-one')return preview;return standard(r);
 });
 p.inputQuery(event({},'game'));await p.search();assert.ok(p.data.previewError);await p.retryPreview();
 const keys=requests.filter(r=>r.path==='/boardgame-intake-previews').map(r=>r.key);assert.equal(keys[0],keys[1]);assert.equal(timers.size,1);
 p.onHide();assert.equal(timers.size,0);p.onShow();assert.equal(timers.size,1);await p.pollPreview();assert.equal(p.data.results[0].detail_state,'ready');
 p.onUnload();assert.equal(timers.size,0);
});
test('lost confirmation response locks edits and reuses the exact request until confirmed',async()=>{
 let attempts=0;const {page:p,requests}=runtime(r=>{if(r.path==='/boardgame-intakes'&&++attempts===1)throw {};return standard(r);});
 await select(p);p.unspecifiedVersion();p.continueEntry();p.ownerChange(event({},1));await p.save();
 assert.equal(p.data.submitUnknown,true);const before=plain(p.data.form);p.field(event({key:'name'},'changed'));p.back();
 assert.deepEqual(p.data.form,before);assert.equal(p.data.stage,'form');await p.save();
 const writes=requests.filter(r=>r.path==='/boardgame-intakes');assert.equal(writes[0].key,writes[1].key);
 assert.deepEqual(writes[0].data,writes[1].data);assert.equal(p.data.stage,'success');
});
test('manual fallback still works when BGG is disabled; library-only does not create an inventory',async()=>{
 const {page:p,requests}=runtime(r=>{if(r.path==='/bgg/search')throw {statusCode:503,body:{details:{reason:'source_disabled'}}};return standard(r);});
 p.inputQuery(event({},'本地桌游'));await p.search();assert.ok(p.data.error);p.manualEntry();
 p.toggleInventory(event({},false));await p.save();const data=requests.at(-1).data;
 assert.equal(data.source,'manual');assert.equal(data.inventory,null);assert.equal(data.game.name,'本地桌游');
});
test('edition pagination and filtering keep an explicit selection, catalog-only skips edition',async()=>{
 const {page:p}=runtime(r=>r.path.endsWith('/items/1')?{game:item,
   versions:r.query.q==='English'||Number(r.query.offset)===1?[editions[1]]:[editions[0]],total:2,next_offset:Number(r.query.offset)===0?1:null}:standard(r));
 await select(p);assert.equal(p.data.versions.length,1);await p.moreVersions();assert.equal(p.data.versions.length,2);
 p.chooseVersion(event({id:701101}));p.versionInput(event({},'English'));await p.searchVersions();assert.equal(p.data.selection,'701101');
 assert.equal(p.data.versions[0].bgg_version_id,701201);p.toggleInventory(event({},false));p.continueEntry();assert.equal(p.payload().version_unspecified,true);
 assert.equal(p.payload().bgg_version_id,null);assert.equal(p.payload().inventory,null);
});
test('ownership is explicit, admin member search pages, state changes disable activity use',async()=>{
 const {page:p}=runtime(r=>r.path==='/boardgame-members'?{items:[{id:r.query.cursor?8:7,nickname:'成员'}],next_cursor:r.query.cursor?null:'page-two'}:standard(r),{userRole:'admin'});
 await select(p);p.unspecifiedVersion();p.continueEntry();p.ownerChange(event({},3));await p.searchMembers();await p.searchMembers(event({more:true}));
 p.chooseMember(event({id:8}));p.statusChange(event({},1));p.availabilityChange(event({},true));p.statusChange(event({},2));
 assert.equal(p.payload().inventory.owner_user_id,8);assert.equal(p.payload().inventory.available_for_activity,false);
 p.field(event({key:'purchase_price'},'-1'));assert.throws(()=>p.payload(),/价格/);
 p.field(event({key:'purchase_price'},''));p.field(event({key:'quantity'},'21'));assert.throws(()=>p.payload(),/数量/);
});
test('switching account or unloading ignores asynchronous responses',async()=>{
 let finish;const {page:p,storage}=runtime(()=>new Promise(resolve=>{finish=resolve;}));
 p.inputQuery(event({},'search'));const search=p.search();await new Promise(setImmediate);
 storage.set('userId',2);p.onShow();finish({items:[item],total:1,next_offset:null});await search;
 assert.equal(p.data.results.length,0);assert.match(p.data.error,/账号已切换/);
});

test('closing after an uncertain save resumes the same confirmation and is isolated by account',async()=>{
 const first=runtime(r=>{if(r.path==='/boardgame-intakes')throw {};return standard(r);});
 await select(first.page);first.page.unspecifiedVersion();first.page.continueEntry();first.page.ownerChange(event({},1));await first.page.save();
 const stored=Object.fromEntries(first.storage);first.page.onUnload();
 const next=runtime(standard,stored);assert.equal(next.page.data.stage,'recover');await next.page.save();
 assert.equal(next.requests[0].key,first.requests.at(-1).key);assert.deepEqual(next.requests[0].data,first.requests.at(-1).data);
 assert.equal(next.page.data.stage,'success');assert.equal(next.storage.has('boardgames:intake:pending:v1:1'),false);
 const other=runtime(standard,{...stored,userId:2});assert.equal(other.page.data.stage,'search');
 const expired=runtime(()=>{throw {statusCode:401};},stored);await expired.page.save();
 assert.equal(expired.page.data.submitUnknown,true);assert.ok(expired.storage.has('boardgames:intake:pending:v1:1'));
 assert.match(expired.page.data.formError,/登录已过期/);
});
