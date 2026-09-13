const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const plain=value=>JSON.parse(JSON.stringify(value));

function runtime(transport){
  const storage=new Map([['userId','1'],['accessToken','synthetic-token']]);
  const cache=new Map();const listeners=[];const calls=[];
  const wx={getStorageSync:k=>storage.has(k)?plain(storage.get(k)):'',setStorageSync:(k,v)=>storage.set(k,plain(v)),
    removeStorageSync:k=>storage.delete(k),onNetworkStatusChange:fn=>listeners.push(fn),request:options=>{calls.push(options);transport(options);}};
  function load(relative){
    const file=path.resolve(root,relative);if(cache.has(file))return cache.get(file);
    if(file===path.join(root,'services/config.js'))return {getApiBaseUrl:()=> 'https://synthetic.invalid/api/v1'};
    if(file===path.join(root,'services/logger.js'))return {createTraceId:()=> 'test-trace',logInfo(){},logError(){},summarizeError(){},logRequestTransportFail(){}};
    const module={exports:{}};cache.set(file,module.exports);
    const sandbox={module,exports:module.exports,wx,Promise,Map,Set,Date,Math,Error,console,setTimeout,clearTimeout,setInterval,clearInterval,
      require:name=>load(path.relative(root,path.resolve(path.dirname(file),name.endsWith('.js')?name:name+'.js')))};
    vm.runInNewContext(fs.readFileSync(file,'utf8'),sandbox,{filename:file});cache.set(file,module.exports);return module.exports;
  }
  return {load,storage,wx,listeners,calls};
}

test('request attaches idempotency without changing authentication or trace headers',async()=>{
  const r=runtime(o=>o.success({statusCode:200,data:{ok:true},header:{}}));
  await r.load('services/request.js').request({url:'/boardgames',method:'POST',data:{name:'测试'},idempotencyKey:'synthetic-key'});
  assert.equal(r.calls[0].header['Idempotency-Key'],'synthetic-key');
  assert.equal(r.calls[0].header.Authorization,'Bearer synthetic-token');
  assert.equal(r.calls[0].header['X-Request-Id'],'test-trace');
});

test('native score forms preserve zero, unknown, exceptional states and manual ranks',()=>{
  const r=runtime(()=>{}),forms=r.load('utils/boardgamePlayForm.js');
  let form=forms.initial({id:4,default_rules:{competition_mode:'individual',score_direction:'high'}},{id:1,nickname:'甲'});
  form.players.push(forms.member({id:2,nickname:'乙'},2));form.players[0].score_status='recorded';form.players[0].score=0;
  form.players[1].score_status='gave_up';
  let out=plain(forms.toPayload(forms.decorate(form),'completed'));
  assert.equal(out.players[0].score,'0');assert.equal(out.players[1].score,null);assert.equal(out.result_status,'resolved');
  assert.equal(out.players[1].score_status,'gave_up');assert.equal(out.players[1].statusIndex,undefined);
  form.players[1].score_status='unrecorded';out=plain(forms.toPayload(form,'completed'));assert.equal(out.result_status,'unknown');
  form.result_source='manual_winner';form.players[0].outcome='win';out=plain(forms.toPayload(form,'completed'));
  assert.equal(out.result_status,'resolved');assert.equal(out.players[1].score,null);assert.equal(out.players[0].rank,null);
  form.result_source='manual_rank';form.players[0].rank=1;form.players[1].rank=2;
  out=plain(forms.toPayload(form,'completed'));assert.deepEqual(out.players.map(p=>p.rank),[1,2]);
  const solo=forms.changeMode(form,'solo');assert.equal(solo.players.length,2,'mode selection must not delete other participants');
  const team=forms.changeMode(form,'team');out=plain(forms.toPayload(team,'completed'));assert.equal(out.teams.length,2);
  assert.ok(out.players.every(p=>p.score===null&&p.team_key));
  out=plain(forms.toPayload({...form,end_reason:'table_flip'},'abandoned'));assert.equal(out.result_status,'unknown');assert.equal(out.end_reason,'table_flip');
});

test('lost response keeps the same operation id and reconnect safely replays it',async()=>{
  let online=false;const seen=[];
  const r=runtime(o=>{
    seen.push(o.data.operations.map(p=>p.operation_id));
    if(!online)return o.fail({errMsg:'offline'});
    o.success({statusCode:200,header:{},data:{items:o.data.operations.map(p=>({operation_id:p.operation_id,status:'applied',http_status:200,resource:{revision:1}}))}});
  });
  const offline=r.load('services/boardgameOffline.js');
  const queued=await offline.mutate('preference.put',8,{expected_revision:0,wishlist:true});
  assert.equal(queued.queued,true);assert.equal(offline.read().length,1);online=true;
  await offline.drain();assert.equal(offline.read().length,0);assert.deepEqual(seen[0],seen[1]);
});

test('version conflict waits for explicit resolution and never rewrites an existing operation',async()=>{
  let conflict=true;const operations=[];
  const r=runtime(o=>{const op=o.data.operations[0];operations.push(plain(op));o.success({statusCode:200,header:{},data:{items:[{
    operation_id:op.operation_id,status:conflict?'conflict':'applied',http_status:conflict?409:200,
    error:{reason:'revision_mismatch'},current:{revision:4,note:'另一台设备'},resource:{revision:5,note:op.payload.note}}]}});});
  const offline=r.load('services/boardgameOffline.js');
  await assert.rejects(offline.mutate('preference.put',8,{expected_revision:2,note:'本机修改'}),e=>e.statusCode===409);
  assert.equal(offline.read()[0].state,'conflict');await offline.drain();assert.equal(operations.length,1);
  conflict=false;await offline.resolve(offline.read()[0].operation_id,true);
  assert.notEqual(operations[0].operation_id,operations[1].operation_id);assert.equal(operations[1].payload.expected_revision,4);
  assert.equal(operations[1].payload.note,'本机修改');assert.equal(offline.read().length,0);
});

test('logout during a request never clears or overwrites another account queue',async()=>{
  let pending;const r=runtime(o=>{pending=o;});const offline=r.load('services/boardgameOffline.js');
  const done=offline.mutate('prior.put',9,{expected_revision:0,played_before:true});
  r.storage.set('userId','2');r.storage.set('boardgames:offline:v1:2',[{operation_id:'other',state:'pending',action:'prior.put',resource_id:10,payload:{}}]);
  pending.success({statusCode:200,header:{},data:{items:[{operation_id:pending.data.operations[0].operation_id,status:'applied',http_status:200,resource:{revision:1}}]}});
  await done;assert.equal(offline.read()[0].operation_id,'other');assert.equal(r.storage.get('boardgames:offline:v1:1').length,0);
});

test('query encoding retains repeated ids, false and zero without coercing empty values',()=>{
  const api=runtime(()=>{}).load('services/boardgames.js');
  assert.equal(api.query({person_ids:[1,2],owned:false,rating:0,q:'龙 & 城',cursor:null}), '?person_ids=1&person_ids=2&owned=false&rating=0&q=%E9%BE%99%20%26%20%E5%9F%8E');
});

test('split import preserves reviewed drafts but never duplicates aggregate scores or time',()=>{
  const r=runtime(()=>{}),segments=r.load('services/boardgameImportSegments.js'),forms=r.load('utils/boardgamePlayForm.js');
  const item={id:9,revision:1},game={id:4,name:'合成分局游戏'};
  const review={normalized:{quantity:2,played_on:'2026-09-01',duration_minutes:80,competition_mode:'individual',
    players:[{name:'合成来源玩家',source_slot:0,score:'99'}]}};
  const prepared=segments.prepare('job',item,review,game);
  assert.equal(prepared.bundle.entries.length,2);
  for(const entry of prepared.bundle.entries){assert.equal(entry.form.players[0].score,null);assert.equal(entry.form.players[0].score_status,'unrecorded');assert.ok(!entry.form.duration_minutes);}
  const first=prepared.bundle.entries[0].form;first.duration_minutes=20;first.players[0].score_status='recorded';first.players[0].score=0;
  segments.save(prepared.key,0,first,forms.toPayload(first,'completed'));
  const reopened=segments.prepare('job',{...item,revision:3},review,game);
  assert.ok(reopened.bundle.entries[0].confirmed);assert.equal(reopened.bundle.entries[0].payload.players[0].score,'0');
  assert.equal(reopened.bundle.entries[0].payload.duration_minutes,20);assert.deepEqual(plain(reopened.bundle.entries[0].slots),[0]);
  assert.equal(reopened.bundle.entries[1].confirmed,false);
  const changed=segments.prepare('job',item,{normalized:{...review.normalized,played_on:'2026-09-02'}},game);
  assert.equal(changed.bundle.entries[0].confirmed,false);assert.equal(changed.bundle.entries[0].form.played_on,'2026-09-02');
});

test('split import drafts cannot be read, overwritten or removed from another account',()=>{
  const r=runtime(()=>{}),segments=r.load('services/boardgameImportSegments.js');
  const prepared=segments.prepare('job',{id:9,revision:1},{normalized:{quantity:2,players:[]}},{id:4});
  r.storage.set('userId','2');
  assert.throws(()=>segments.read(prepared.key),/账号/);assert.throws(()=>segments.write(prepared.key,{}),/账号/);
  segments.clear(prepared.key);assert.ok(r.storage.has(prepared.key));
  r.storage.set('userId','');assert.throws(()=>segments.write(segments.key('job',9),{}),/账号/);
  r.storage.set('userId','1');segments.clear(prepared.key);assert.equal(segments.read(prepared.key),null);
});

test('failed covers and avatars clear presentation URLs without modifying form fields',()=>{
  const r=runtime(()=>{}),media=r.load('utils/boardgameMedia.js'),changes=[];
  const page={data:{games:[{cover_url:'https://synthetic.invalid/cover.png'}],form:{players:[{avatar_url:'/missing.png',score:0}]}},setData:v=>changes.push(plain(v))};
  for(const path of ['games[0].cover_url','form.players[0].avatar_url','form.players[0].score','__proto__.avatar_url','games[9].cover_url'])media.imageError.call(page,{currentTarget:{dataset:{path}}});
  assert.deepEqual(changes,[{'games[0].cover_url':null},{'form.players[0].avatar_url':null}]);
  assert.equal(page.data.form.players[0].score,0);
});
