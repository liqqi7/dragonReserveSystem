const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.resolve(__dirname, '..');

function page(name, api={}) {
  let definition;
  const navigations=[];
  const wx={navigateTo:o=>navigations.push(o.url),redirectTo:o=>navigations.push(o.url)};
  vm.runInNewContext(fs.readFileSync(path.join(root,'pages',name,name+'.js'),'utf8'), {
    Page:v=>definition=v, getApp:()=>({globalData:{}}), wx, console,
    require:key=>key==='../../services/boardgames'?api:{},
  });
  const p={...definition,data:JSON.parse(JSON.stringify(definition.data))};
  p.setData=values=>Object.assign(p.data,values);
  return {p,navigations};
}

test('activity detail opens nominations using route identity, not its enriched view model',()=>{
  const {p,navigations}=page('activity_detail');
  p.data.activityId='17';p.data.activity={title:'测试活动'}; // Same shape: no id on the display model.
  p.openBoardGames();
  assert.equal(navigations[0],'/pages/boardgame_activity/boardgame_activity?id=17');
  p.data.activityId='undefined';p.openBoardGames();
  assert.equal(navigations.length,1);
});

test('invalid activity links stay recoverable and never send undefined/NaN API requests',async()=>{
  const requests=[];
  const {p,navigations}=page('boardgame_activity',{
    get:async url=>{requests.push(url);return [{id:17,name:'测试活动',status:'未开始'}];},
    query:({id})=>'?id='+id,message:()=> '加载失败',
  });
  for(const value of [undefined,'undefined','NaN','0','-1','1.2']) {
    p.onLoad({id:value});await p.load();assert.equal(p.data.id,null);assert.equal(p.data.summary,null);
  }
  assert.deepEqual(requests,[]);
  await p.openActivities();assert.equal(p.data.activityItems[0].name,'测试活动');
  p.chooseActivity({currentTarget:{dataset:{id:17}}});
  assert.equal(navigations[0],'/pages/boardgame_activity/boardgame_activity?id=17');
});

test('activity context loads permissions and empty nominations, and failed loads can retry',async()=>{
  let fail=false;
  const summary={nominations:[],plans:[],permissions:{can_nominate:true}};
  const {p}=page('boardgame_activity',{
    get:async url=>{if(fail)throw new Error('offline');return url.endsWith('/boardgames')?summary:{name:'测试活动'};},
    message:()=> '网络暂时不可用',
  });
  p.onLoad({activity_id:'17'});await p.onShow();
  assert.equal(p.data.name,'测试活动');assert.equal(p.data.summary.permissions.can_nominate,true);
  assert.equal(p.data.loading,false);
  fail=true;await p.load();assert.equal(p.data.summary,null);assert.equal(p.data.error,'网络暂时不可用');
  fail=false;await p.load();assert.equal(p.data.error,'');assert.equal(p.data.summary.nominations.length,0);
});

test('choosing a withdrawn nomination reuses its current revision and module choices',async()=>{
  const previous={game_id:5,state:'withdrawn',revision:4,note:'想玩基础模块',expansions:[{game_id:6,modules_note:'只用海洋模块'}]};
  const {p}=page('boardgame_activity',{get:async url=>({items:url.endsWith('/expansions')?[{game:{id:6}}]:[]})});
  p.data.summary={nominations:[],my_nominations:[previous],plans:[]};p.data.games=[{id:5,name:'测试游戏'}];
  await p.chooseGame({currentTarget:{dataset:{id:5}}});
  assert.equal(p.data.form.expected_revision,4);assert.equal(p.data.form.note,previous.note);
  assert.equal(p.data.expansions[0].selected,true);assert.equal(p.data.expansions[0].modules_note,'只用海洋模块');
});

test('quick record links carry activity and source context and respect recording permission',()=>{
  const {p,navigations}=page('boardgame_activity',{query:o=>'?'+Object.entries(o).filter(([,v])=>v!=null).map(([k,v])=>k+'='+v).join('&')});
  p.data.id=17;p.data.summary={permissions:{can_record:false},nominations:[{game:{id:5}}],plans:[{id:9,game_id:5}]};
  const event=(kind,id)=>({currentTarget:{dataset:{kind,id}}});
  p.record(event('nomination',5));assert.equal(navigations.length,0);
  p.data.summary.permissions.can_record=true;p.record(event('nomination',5));
  let options=new URL('https://local.invalid'+navigations[0]).searchParams;
  assert.equal(options.get('activity_id'),'17');assert.equal(options.get('game_id'),'5');
  assert.equal(options.get('from_nomination'),'1');assert.equal(options.has('plan_id'),false);
  p.record(event('plan',9));options=new URL('https://local.invalid'+navigations[1]).searchParams;
  assert.equal(options.get('plan_id'),'9');assert.equal(options.get('quick_start'),'1');
  p.record(event('plan',999));assert.equal(navigations.length,2);assert.match(p.data.error,/已变化/);
});
