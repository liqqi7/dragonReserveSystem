const api = require('./boardgames');
const MAX_PENDING = 80;
const MAX_BYTES = 1024 * 1024;
const flights = {};
const actor = () => String(wx.getStorageSync('userId') || '');
const key = id => `boardgames:offline:v1:${id}`;
function read(id = actor()) {
  const rows = wx.getStorageSync(key(id));
  return Array.isArray(rows) ? rows : [];
}
function write(rows, id = actor()) {
  if (rows.length > MAX_PENDING || JSON.stringify(rows).length * 2 > MAX_BYTES) {
    throw new Error('离线记录较多，请先连接网络同步');
  }
  wx.setStorageSync(key(id), rows);
}
function device() {
  const existing = wx.getStorageSync('boardgames:client:v1');
  if (existing) return existing;
  const value = api.uuid();
  wx.setStorageSync('boardgames:client:v1', value);
  return value;
}
function remove(operationId, id = actor()) { write(read(id).filter(r => r.operation_id !== operationId), id); }
function drain() {
  const id = actor();
  if (!id) return Promise.reject(new Error('请先登录'));
  if (flights[id]) return flights[id];
  flights[id] = (async () => {
    const results = [];
    while (actor() === id) {
      const batch = read(id).filter(r => r.state === 'pending').slice(0,20);
      if (!batch.length) break;
      const response = await api.send('/boardgame-sync', 'POST', {
        client_id: device(), operations: batch.map(({operation_id, action, resource_id, payload}) => ({operation_id, action, resource_id, payload}))
      });
      // A logout while the request is in flight must never write into the next account's queue.
      const outcomes = new Map(response.items.map(r => [r.operation_id, r]));
      write(read(id).flatMap(row => {
        const result = outcomes.get(row.operation_id);
        if (!result) return [row];
        if (result.status === 'applied') return [];
        return [{...row, state:result.status, result}];
      }), id);
      results.push(...response.items);
    }
    return results;
  })().finally(() => { delete flights[id]; });
  return flights[id];
}
async function mutate(action, resourceId, payload) {
  const id = actor();
  if (!id) throw new Error('请先登录');
  const operation = {operation_id:api.uuid(), action, resource_id:resourceId || null, payload,
    state:'pending', created_at:new Date().toISOString()};
  write([...read(id), operation], id);
  try {
    const outcomes = await drain();
    const result = outcomes.find(r => r.operation_id === operation.operation_id);
    if (!result) return {queued:true, operation_id:operation.operation_id};
    if (result.status !== 'applied') {
      if(result.status==='rejected')remove(operation.operation_id,id);
      throw api.errorOf(result);
    }
    return result.resource;
  } catch (error) {
    if (error.statusCode === 0) return {queued:true, operation_id:operation.operation_id};
    throw error;
  }
}
async function resolve(operationId, useLocal) {
  const id = actor();
  const op = read(id).find(r => r.operation_id === operationId);
  if (!op) throw new Error('记录不存在');
  if (!useLocal) { remove(operationId, id); return; }
  if (!op.result || op.result.status !== 'conflict' || !op.result.current) throw new Error('请回到原页面核对内容');
  const payload = {...op.payload};
  const current = op.result.current;
  if (op.action === 'scoresheet.put') {
    payload.expected_revision = current.play.revision;
    payload.sheet_revision = current.scoresheet ? current.scoresheet.revision : 0;
  } else if (op.action.endsWith('_tags.put')) {
    payload.expected_hash = current.revision_hash;
  } else payload.expected_revision = current.revision;
  // Keep the original conflict until its replacement has been durably stored locally.
  const next = {...op, operation_id:api.uuid(), payload, state:'pending'};
  delete next.result;
  write(read(id).map(r => r.operation_id === operationId ? next : r), id);
  return drain();
}
async function refreshConflict(operationId) {
  const id=actor(),op=read(id).find(r=>r.operation_id===operationId);
  if(!op||!op.result||op.result.status!=='conflict')throw new Error('没有待核对的冲突');
  let current;
  if(op.action==='scoresheet.put'){
    const play=await api.get(`/boardgame-plays/${op.resource_id}`);let scoresheet=null;
    try{scoresheet=await api.get(`/boardgame-plays/${op.resource_id}/scoresheet`);}catch(e){if(e.statusCode!==404)throw e;}
    current={play,scoresheet};
  }else{
    const paths={'play.patch':`/boardgame-plays/${op.resource_id}`,'preference.put':`/boardgames/${op.resource_id}/my-preference`,
      'prior.put':`/boardgames/${op.resource_id}/my-prior-plays`,'inventory.patch':`/boardgame-inventory/${op.resource_id}`,
      'game_tags.put':`/boardgame-tags/games/${op.resource_id}`,'play_tags.put':`/boardgame-tags/plays/${op.resource_id}`};
    if(!paths[op.action])throw new Error('请回到原页面核对');current=await api.get(paths[op.action]);
  }
  write(read(id).map(row=>row.operation_id===operationId?{...row,result:{...row.result,current}}:row),id);
  return current;
}
let listening=false;
function listen(){
  if(listening||typeof wx.onNetworkStatusChange!=='function')return;
  listening=true;
  wx.onNetworkStatusChange(({isConnected})=>{if(isConnected&&actor()&&read().some(r=>r.state==='pending'))drain().catch(()=>{});});
}
listen();
module.exports = { read, mutate, drain, resolve, remove, refreshConflict, MAX_PENDING };
