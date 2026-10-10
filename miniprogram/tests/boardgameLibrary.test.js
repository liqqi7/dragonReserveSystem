const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

function page(name, api) {
  let definition;
  const storage = {userId:7};
  const wx = {getStorageSync:k=>storage[k],setStorageSync:(k,v)=>storage[k]=v,removeStorageSync:k=>delete storage[k],
    getWindowInfo:()=>({statusBarHeight:44}),getMenuButtonBoundingClientRect:()=>({top:48,height:32}),
    showToast:o=>{wx.toast=o;},navigateTo:o=>{wx.navigation=o;}};
  const load = file => {
    const module={exports:{}};
    const context={module,exports:module.exports,Page:d=>{definition=d;},wx,
      require:p=>p.includes('services/boardgames')?api:p==='./controller'?load(path.join(path.dirname(file),'controller.js')):{},
      setTimeout:()=>1,clearTimeout:()=>{},getCurrentPages:()=>[{},{}]};
    vm.runInNewContext(fs.readFileSync(file,'utf8'),context,{filename:file});return module.exports;
  };
  load(path.join(root,'pages',name,name+'.js'));
  const instance={...definition,data:JSON.parse(JSON.stringify(definition.data)),setData(update){
    for(const [key,value] of Object.entries(update)) {
      const keys=key.split('.');let target=this.data;
      keys.slice(0,-1).forEach(k=>target=target[k]);target[keys.at(-1)]=value;
    }
  }};
  instance.onLoad({id:'1'});
  return {instance,wx,storage};
}
const item={bgg_id:224517,item_id:1,revision:1,name:'伯明翰',detail_state:'ready',bgg_rating:'8.56',bgg_rank:1,complexity:'3.87'};
const edition={bgg_version_id:101,name:'Chinese edition',display_name:'中文版',language_label:'中文',year_published:2020};
const event=id=>({currentTarget:{dataset:{id}}});
function intakeApi(owned=false) {
  const calls=[];
  return {calls,uuid:()=> 'stable-key',message:e=>e.message || 'failed',
    get:async (url)=>{calls.push(url);return url==='/bgg/search'?{items:[item],total:1,next_offset:null}:
      {game:{...item,owned_by_actor:owned,owned_versions:owned?[edition]:[],owner_details:[]},versions:[edition],total:1,next_offset:null};},
    send:async(url,method,data,key)=>{calls.push({url,method,data,key});return url==='/boardgame-intake-previews'?
      {id:'preview-1',state:'ready',items:[item]}:{game_id:1,game:item};}};
}
test('search selects the first result, preserves stats and saves only own chosen edition',async()=>{
  const api=intakeApi(),{instance:p}=page('boardgame_intake',api);
  p.inputQuery({detail:{value:'伯明翰'}});await p.search();
  assert.equal(p.data.stage,'version');assert.equal(p.data.candidate.bgg_rank,1);
  p.chooseVersion(event(101));await p.save();
  const sent=api.calls.find(c=>c.url==='/boardgame-intakes');
  assert.equal(sent.data.bgg_version_id,101);assert.equal(sent.data.inventory.owner_user_id,7);
  assert.equal(Object.hasOwn(p.data.form,'remark'),false);
  assert.deepEqual(Object.keys(sent.data.inventory).sort(),['owner_type','owner_user_id','quantity']);
  assert.equal(p.data.stage,'success');
  p.newEntry();
  assert.equal(p.data.stage,'intro');
  assert.equal(p.data.candidate,null);
});
test('search automatically selects a ready candidate when the first BGG item is unavailable',async()=>{
  const api=intakeApi();const get=api.get,send=api.send;
  const unavailable={...item,bgg_id:999,item_id:2,detail_state:'unavailable'};
  api.get=async(url,...args)=>url==='/bgg/search'?{items:[unavailable,item],total:2,next_offset:null}:get(url,...args);
  api.send=async(url,...args)=>url==='/boardgame-intake-previews'?{id:'preview-1',state:'ready',items:[unavailable,item]}:send(url,...args);
  const {instance:p}=page('boardgame_intake',api);p.data.query='伯明翰';await p.search();
  assert.equal(p.data.stage,'version');assert.equal(p.data.candidate.bgg_id,224517);
});
test('owned editions stay readonly during intake and cannot be submitted again',async()=>{
  const api=intakeApi(true),{instance:p}=page('boardgame_intake',api);
  p.data.query='伯明翰';await p.search();p.chooseVersion(event(999));p.unspecifiedVersion();await p.save();
  assert.equal(p.data.selection,'101');assert.match(p.data.candidate.ownedVersionLabel,/中文版/);
  assert.equal(api.calls.filter(c=>c.url==='/boardgame-intakes').length,0);
  p.openVersions();assert.equal(p.data.versionsOpen,true);
});
test('back during search invalidates late responses and returns to method selection',async()=>{
  let resolve;const api=intakeApi();api.get=()=>new Promise(r=>resolve=r);
  const {instance:p,wx}=page('boardgame_intake',api);p.data.query='伯明翰';const search=p.search();
  p.goBack();resolve({items:[item],total:1,next_offset:null});await search;
  assert.equal(p.data.stage,'intro');assert.equal(p.data.results.length,0);
  p.openCamera();assert.equal(wx.toast.title,'子奇正在加班，别催');
});
test('uncertain saves replay the same idempotency key and edition after reopening',async()=>{
  const api=intakeApi(),{instance:p,storage}=page('boardgame_intake',api);p.data.query='伯明翰';await p.search();p.chooseVersion(event(101));
  const send=api.send;api.send=async(url,...args)=>{if(url==='/boardgame-intakes')throw {statusCode:0};return send(url,...args);};
  await p.save();assert.equal(p.data.submitUnknown,true);const saved=storage[p._pendingStorage];
  api.send=send;await p.save();const sent=api.calls.find(c=>c.url==='/boardgame-intakes');
  assert.equal(sent.key,saved.key);assert.equal(sent.data.bgg_version_id,101);assert.equal(p.data.stage,'success');
});
test('details do not depend on gallery availability or any excluded endpoint',async()=>{
  const calls=[];let resolveGallery;
  const api={get:async url=>{calls.push(url);if(url.endsWith('/images'))return new Promise(r=>resolveGallery=r);
    if(url==='/boardgame-inventory')return {items:[],next_cursor:null};
    return {name:'伯明翰',complexity:'3.87',owner_count:25,my_versions:[{id:2,bgg_version_id:101,revision:4,owner:{id:7}}],version_options:[edition,{...edition,bgg_version_id:102}]};},message:()=> 'failed'};
  const {instance:p}=page('boardgame_detail',api);await p.load();
  assert.equal(p.data.game.bgg_weight_display,'3.9');assert.equal(p.data.loading,false);
  assert.equal(p.data.myVersions[0].id,2);assert.equal(p.data.ownerCount,25);
  assert.ok(calls.every(url=>['/boardgames/1','/boardgames/1/images','/boardgame-inventory'].includes(url)));
  resolveGallery({items:[]});await Promise.resolve();
});
test('detail edition change uses ownership record and current revision',async()=>{
  let sent;const api={get:async()=>({items:[]}),send:async(url,method,data)=>{sent={url,method,data};return {id:2,revision:5,bgg_version_id:102};},message:()=> 'failed'};
  const {instance:p}=page('boardgame_detail',api);p.setData({myVersions:[{id:2,revision:4,bgg_version_id:101}],versionOptions:[edition,{...edition,bgg_version_id:102}]});
  p.openBox();p.chooseDetailVersion(event(102));assert.equal(p.data.currentVersionId,101);
  await p.changeDetailVersion();assert.equal(sent.url,'/boardgame-inventory/2/version');assert.equal(sent.data.expected_revision,4);
  assert.equal(p.data.myVersions[0].bgg_version_id,102);assert.equal(p.data.inventoryOpen,false);
});
test('legacy detail reads actual owner records, deduplicates people and keeps the latest own edition',async()=>{
  const api={get:async url=>url==='/boardgame-inventory'?{items:[
    {id:5,status:'unverified',owner:{id:7},bgg_version_id:101},
    {id:13,status:'unverified',owner:{id:7},bgg_version_id:102},
    {id:14,status:'retired',owner:{id:8}},
    {id:15,archived_at:'2026-10-08',owner:{id:9}}
  ]}:url.endsWith('/images')?{items:[]}:{name:'伯明翰',inventory_summary:{total:4}},message:()=> 'failed'};
  const {instance:p}=page('boardgame_detail',api);await p.load();await Promise.resolve();
  assert.equal(p.data.ownerCount,1);assert.equal(p.data.ownerPreview.length,1);
  assert.equal(p.data.ownerRows[0].id,13);assert.equal(p.data.myVersions[0].bgg_version_id,102);
});
test('an unowned detail never opens a version editor or an intake entry',async()=>{
  const api={get:async url=>url==='/boardgame-inventory'?{items:[{id:5,owner:{id:8}}]}:
    url.endsWith('/images')?{items:[]}:{name:'伯明翰',owner_count:1,my_versions:[]},message:()=> 'failed'};
  const {instance:p,wx}=page('boardgame_detail',api);await p.load();await Promise.resolve();p.openBox();
  assert.equal(p.data.myVersions.length,0);assert.equal(p.data.inventoryOpen,false);
  assert.equal(wx.navigation,undefined);assert.equal(p.data.ownerCount,1);
});
test('failed optional gallery clears old pictures without blocking the detail',async()=>{
  const api={get:async()=>{throw new Error('404');},message:()=> 'failed'};
  const {instance:p}=page('boardgame_detail',api);p.setData({detailImages:[{id:'old',url:'https://cf.geekdo-images.com/old.jpg'}]});
  await p.loadGallery();assert.equal(p.data.detailImages.length,0);assert.equal(p.data.galleryLoading,false);
  assert.equal(p.data.error,'');assert.equal(p.data.detailGalleryPosition,'');
});
test('a removed library game cannot keep displaying stale ownership data',async()=>{
  const api={get:async()=>{throw {statusCode:404};},message:()=> '桌游不存在'};
  const {instance:p}=page('boardgame_detail',api);
  p.setData({game:{name:'伯明翰'},myVersions:[{id:2}],ownerRows:[{id:2}],ownerPreview:[{id:2}],ownerCount:1});
  await p.load();
  assert.equal(p.data.game,null);assert.equal(p.data.myVersions.length,0);
  assert.equal(p.data.ownerCount,0);assert.equal(p.data.ownerRows.length,0);
});
test('description toggle expands and then restores the collapsed state',()=>{
  const {instance:p}=page('boardgame_detail',{});
  assert.equal(p.data.descriptionOpen,false);
  p.toggleDescription();assert.equal(p.data.descriptionOpen,true);
  p.toggleDescription();assert.equal(p.data.descriptionOpen,false);
});
test('cancelled filter changes do not affect applied filters or trigger removed tag API',()=>{
  let calls=0;const {instance:p}=page('boardgame_library',{get:()=>{calls++;}});
  p.setData({filterForm:{player_count:4}});p.openFilter();p.filterField({currentTarget:{dataset:{key:'player_count'}},detail:{value:'2'}});p.closeFilter();
  assert.equal(p.data.filterForm.player_count,4);assert.equal(calls,0);
});
