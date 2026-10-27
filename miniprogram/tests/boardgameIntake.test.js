const test=require('node:test'),assert=require('node:assert/strict');
const {runtime,event,plain}=require('./helpers/boardgameIntakeRuntime.cjs');
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
async function select(p) {p.inputQuery(event({},'桌游'));await p.search();}
test('back from search results returns directly to intake methods and clears the selection',async()=>{
 const {page:p,timers}=runtime(standard);await select(p);
 p.chooseVersion(event({id:701101}));p.goBack();
 assert.equal(p.data.stage,'intro');assert.equal(p.data.searchFocus,false);
 assert.equal(p.data.candidate,null);assert.equal(p.data.selection,null);
 assert.equal(p.data.preview,null);assert.equal(timers.size,0);
 p.openSearch();assert.equal(p.data.stage,'search');assert.equal(p.data.results.length,0);
 p.inputQuery(event({},'尚未搜索'));p.goBack();assert.equal(p.data.stage,'intro');
});
for (const pendingPath of ['/bgg/search','/boardgame-intake-previews','/items/1']) {
 test(`back during ${pendingPath} ignores the late response even after reopening search`,async()=>{
  let finish;const {page:p,timers}=runtime(r=>r.path.endsWith(pendingPath)?
    new Promise(resolve=>{finish=()=>resolve(standard(r));}):standard(r));
  const searching=select(p);await new Promise(setImmediate);
  p.goBack();assert.equal(p.data.stage,'intro');assert.equal(p.data.versionLoading,false);
  p.openSearch();finish();await searching;
  assert.equal(p.data.stage,'search');assert.equal(p.data.candidate,null);
  assert.equal(p.data.preview,null);assert.equal(p.data.results.length,0);
  assert.equal(p.data.searching,false);assert.equal(timers.size,0);
 });
}
test('owned Chinese edition retains picker label and remains read-only on repeat search',async()=>{
 const version={...editions[0],name:'Chinese second edition',display_name:'中文第二版',language_label:'中文'};
 const owner={id:'member:1',version_label:'中文第二版 · 2024'};
 const game={...item,owned_by_actor:true,owned_versions:[version],owned_version_label:owner.version_label,
   owner_count:1,owner_details:[owner],owners:[owner]};
 const {page:p,requests}=runtime(r=>r.path.endsWith('/items/1')?
   {game,versions:[version,editions[1]],total:2,next_offset:null}:standard(r));
 await select(p);
 assert.equal(p.data.candidate.ownedVersionLabel,'中文第二版 · 2024');
 assert.equal(p.data.selectedVersion.display_name,p.data.versions[0].display_name);
 p.openVersions();assert.equal(p.data.versionsOpen,true);
 p.chooseVersion(event({id:701201}));p.unspecifiedVersion();
 assert.equal(p.data.selection,'701101');
 p.openOwners();assert.equal(p.data.candidate.owner_details[0].version_label,'中文第二版 · 2024');
 await p.save();assert.ok(!requests.some(r=>r.path==='/boardgame-intakes'));
});
test('name search requires edition choice and only writes self-owned inventory on confirmation',async()=>{
 const {page:p,requests}=runtime(standard);await select(p);
 assert.equal(requests[0].timeout,15000);assert.equal(p.data.stage,'version');assert.equal(p.data.selection,null);
 await p.save();assert.match(p.data.formError,/请选择桌游版本/);
 assert.ok(!requests.some(r=>r.path==='/boardgame-intakes'));
 p.chooseVersion(event({id:701101}));await p.save();
 const save=requests.find(r=>r.path==='/boardgame-intakes');
 assert.equal(save.data.bgg_version_id,701101);
 assert.deepEqual(plain(save.data.inventory),{owner_type:'member',owner_user_id:1,quantity:1});
 assert.ok(!Object.hasOwn(save.data.inventory,'purchase_price'));assert.equal(p.data.stage,'success');
 p.newEntry();assert.equal(p.data.stage,'intro');assert.equal(p.data.query,'');
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
 await select(p);p.unspecifiedVersion();await p.save();
 assert.equal(p.data.submitUnknown,true);const before=plain(p.data.form);
 p.inputQuery(event({},'changed'));p.goBack();
 assert.deepEqual(p.data.form,before);assert.equal(p.data.stage,'version');await p.save();
 const writes=requests.filter(r=>r.path==='/boardgame-intakes');assert.equal(writes[0].key,writes[1].key);
 assert.deepEqual(writes[0].data,writes[1].data);assert.equal(p.data.stage,'success');
});

test('disabled BGG reports an error without creating an unsupported manual entry',async()=>{
 const {page:p,requests}=runtime(r=>{if(r.path==='/bgg/search')throw {statusCode:503,body:{details:{reason:'source_disabled'}}};return standard(r);});
 p.inputQuery(event({},'本地桌游'));await p.search();assert.ok(p.data.error);
 assert.equal(p.data.candidate,null);await p.save();assert.match(p.data.formError,/请先选择桌游/);
 assert.equal(p.manualEntry,undefined);assert.ok(!requests.some(r=>r.path==='/boardgame-intakes'));
});

test('edition pagination and retry preserve the selected edition without writing inventory',async()=>{
 const {page:p,requests}=runtime(r=>r.path.endsWith('/items/1')?{game:item,
   versions:Number(r.query.offset)===1?[editions[1]]:[editions[0]],total:2,next_offset:Number(r.query.offset)===0?1:null}:standard(r));
 await select(p);assert.equal(p.data.versions.length,1);await p.moreVersions();assert.equal(p.data.versions.length,2);
 p.chooseVersion(event({id:701201}));await p.searchVersions();assert.equal(p.data.selection,'701201');
 assert.equal(p.payload().bgg_version_id,701201);assert.equal(p.payload().version_unspecified,false);
 assert.deepEqual(requests.filter(r=>r.path.endsWith('/items/1')).map(r=>Number(r.query.offset)),[0,1,0]);
 assert.ok(!requests.some(r=>r.path==='/boardgame-intakes'));
});

test('intake ownership stays with the signed-in member even for admin users',async()=>{
 const {page:p}=runtime(standard,{userRole:'admin'});await select(p);p.unspecifiedVersion();
 p.data.form.owner_user_id=8;p.data.form.quantity='21';p.data.form.purchase_price='-1';
 assert.deepEqual(plain(p.payload().inventory),{owner_type:'member',owner_user_id:1,quantity:1});
});

test('switching account or unloading ignores asynchronous responses',async()=>{
 let finish;const {page:p,storage}=runtime(()=>new Promise(resolve=>{finish=resolve;}));
 p.inputQuery(event({},'search'));const search=p.search();await new Promise(setImmediate);
 storage.set('userId',2);p.onShow();finish({items:[item],total:1,next_offset:null});await search;
 assert.equal(p.data.results.length,0);assert.match(p.data.error,/账号已切换/);
});

test('closing after an uncertain save resumes the same confirmation and is isolated by account',async()=>{
 const first=runtime(r=>{if(r.path==='/boardgame-intakes')throw {};return standard(r);});
 await select(first.page);first.page.unspecifiedVersion();await first.page.save();
 const stored=Object.fromEntries(first.storage);first.page.onUnload();
 const next=runtime(standard,stored);assert.equal(next.page.data.stage,'recover');await next.page.save();
 assert.equal(next.requests[0].key,first.requests.at(-1).key);assert.deepEqual(next.requests[0].data,first.requests.at(-1).data);
 assert.equal(next.page.data.stage,'success');assert.equal(next.storage.has('boardgames:intake:pending:v1:1'),false);
 const other=runtime(standard,{...stored,userId:2});assert.equal(other.page.data.stage,'intro');
 const expired=runtime(()=>{throw {statusCode:401};},stored);await expired.page.save();
 assert.equal(expired.page.data.submitUnknown,true);assert.ok(expired.storage.has('boardgames:intake:pending:v1:1'));
 assert.match(expired.page.data.formError,/登录已过期/);
});

test('new page opens on the prototype entry and the camera fallback makes no API call',()=>{
 const {page:p,requests,toasts}=runtime(standard);
 assert.equal(p.data.stage,'intro');
 p.openCamera();assert.equal(toasts.length,1);assert.equal(p.data.stage,'intro');
 p.openSearch();assert.equal(p.data.stage,'search');
 assert.equal(requests.length,0);
});
test('late details from a previous candidate cannot overwrite the current candidate',async()=>{
 let finish;
 const second={...item,bgg_id:701002,item_id:2,name:'第二款'};
 const {page:p}=runtime(r=>{
  if(r.path==='/bgg/search')return {items:[item,second],total:2,next_offset:null};
  if(r.path==='/boardgame-intake-previews')return {...preview,items:[item,second]};
  if(r.path.endsWith('/items/1'))return new Promise(resolve=>{finish=resolve});
  if(r.path.endsWith('/items/2'))return {game:second,versions:[],total:0,next_offset:null};
  return standard(r);
 });
 p.inputQuery(event({},'桌游'));const first=p.search();await new Promise(setImmediate);
 await p.chooseCandidate(event({id:second.bgg_id}));
 finish({game:item,versions:editions,total:2,next_offset:null});await first;
 assert.equal(p.data.candidate.bgg_id,second.bgg_id);assert.equal(p.data.versions.length,0);
 p.openVersions();assert.equal(p.data.versionsOpen,true);assert.equal(p.data.stage,'version');
 p.unspecifiedVersion();assert.equal(p.data.versionsOpen,false);assert.equal(p.payload().version_unspecified,true);
});

test('ready results automatically select the first search result, even when preview order differs',async()=>{
 const second={...item,bgg_id:701002,item_id:2};
 const {page:p,requests}=runtime(r=>r.path==='/bgg/search'?{items:[item,second],total:2,next_offset:null}:
  r.path==='/boardgame-intake-previews'?{...preview,items:[second,item]}:standard(r));
 await select(p);
 assert.equal(p.data.candidate.bgg_id,item.bgg_id);assert.equal(p.data.stage,'version');
 assert.equal(p.data.preparing,false);assert.equal(p.data.searchFocus,false);
 assert.equal(p.data.versions.length,2);assert.equal(p.data.selection,null);
 assert.equal(requests.filter(r=>r.path.endsWith('/items/1')).length,1);
 assert.ok(!requests.some(r=>r.path==='/boardgame-intakes'));
});

test('queued preview selects the first result when polling finishes and does not reset a chosen edition',async()=>{
 const {page:p}=runtime(r=>r.path==='/boardgame-intake-previews'?{...preview,state:'queued',items:[]}:
  r.path==='/boardgame-intake-previews/preview-one'?preview:standard(r));
 await select(p);assert.equal(p.data.stage,'search');assert.equal(p.data.candidate,null);
 await p.pollPreview();assert.equal(p.data.stage,'version');assert.equal(p.data.candidate.bgg_id,item.bgg_id);
 p.chooseVersion(event({id:701101}));await p.applyPreview(preview,p._generation);
 assert.equal(p.data.selection,'701101');assert.equal(p.data.preparing,false);
});

test('edition selection stays reviewable, supports replacement, and writes only on explicit save',async()=>{
 const {page:p,requests}=runtime(standard);await select(p);p.openVersions();p.chooseVersion(event({id:701101}));
 assert.equal(p.data.stage,'version');assert.equal(p.data.versionsOpen,false);
 assert.equal(p.data.selectedVersion.year_published,2024);
 p.openVersions();p.chooseVersion(event({id:701201}));
 assert.equal(p.data.selectedVersion.name,'English edition');
 assert.ok(!requests.some(r=>r.path==='/boardgame-intakes'));
 await p.save();assert.equal(p.data.stage,'success');
 assert.equal(requests.filter(r=>r.path==='/boardgame-intakes').length,1);
 assert.equal(requests.at(-1).data.bgg_version_id,701201);
});

test('a new search clears the old selection and empty or unavailable results never select stale data',async()=>{
 let empty=false;
 const {page:p}=runtime(r=>r.path==='/bgg/search'&&empty?{items:[],total:0,next_offset:null}:standard(r));
 await select(p);p.chooseVersion(event({id:701101}));empty=true;await p.search();
 assert.equal(p.data.stage,'search');assert.equal(p.data.candidate,null);assert.equal(p.data.selectedVersion,null);
 assert.equal(p.data.selection,null);assert.equal(p.data.results.length,0);
 const unavailable=runtime(r=>r.path==='/boardgame-intake-previews'?{...preview,items:[{...item,detail_state:'unavailable'}]}:standard(r));
 await select(unavailable.page);assert.equal(unavailable.page.data.candidate,null);
});

test('a new query cancels the previous automatically selected detail response',async()=>{
 let finish;
 const {page:p}=runtime(r=>r.path.endsWith('/items/1')?new Promise(resolve=>{finish=resolve;}):standard(r));
 p.inputQuery(event({},'first'));const old=p.search();await new Promise(setImmediate);
 assert.equal(p.data.stage,'version');p.inputQuery(event({},'new query'));
 finish({game:item,versions:editions,total:2,next_offset:null});await old;
 assert.equal(p.data.stage,'search');assert.equal(p.data.candidate,null);assert.equal(p.data.selectedVersion,null);
});

test('expansion selections retain owned defaults, save selected ids and reset with a new query',async()=>{
 const game={...item,expansion_links:[{bgg_id:9001,owned_by_actor:true},{bgg_id:9002,owned_by_actor:false}]};
 const {page:p,requests}=runtime(r=>r.path==='/boardgame-intake-previews'?{...preview,items:[game]}:
   r.path.endsWith('/items/1')?{game,versions:editions,total:2,next_offset:null}:standard(r));
 await select(p);assert.deepEqual(plain(p.data.expansionSelected),[9001]);
 p.toggleExpansion(event({bgg:9002}));p.unspecifiedVersion();await p.save();
 assert.deepEqual(requests.find(r=>r.path==='/boardgame-intakes').data.expansion_bgg_ids,[9001,9002]);
 p.newEntry();assert.deepEqual(plain(p.data.expansionOptions),[]);assert.deepEqual(plain(p.data.expansionSelected),[]);
});
