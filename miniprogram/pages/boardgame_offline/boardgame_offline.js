const api=require('../../services/boardgames');
const offline=require('../../services/boardgameOffline');
const TITLES={'play.create':'新对局','play.patch':'对局更正','scoresheet.put':'计分表','preference.put':'游戏偏好','prior.put':'既往游玩',
  'inventory.patch':'实物信息','game_tags.put':'游戏标签','play_tags.put':'对局标签'};
function overview(data){
  if(!data)return '没有可对照的记录';
  if(data.play)data={...data.play,sheet:data.scoresheet};
  if(data.internal)data={...data,...data.internal};
  const lines=[];
  const names={played_on:'日期',duration_minutes:'时长（分钟）',round_count:'轮数',note:'备注',rating:'评分',wishlist:'愿望单',
    preordered:'预订',want_to_play:'长期想玩',played_before:'以前玩过',approximate_count:'大约次数',purchased_on:'购入日期',
    purchase_price:'购入价',purchase_currency:'币种',edition_name:'版本',storage_location:'存放位置',remark:'私人备注'};
  Object.keys(names).forEach(k=>{if(data[k]!==undefined)lines.push(`${names[k]}：${data[k]===null||data[k]===''?'未填写':typeof data[k]==='boolean'?data[k]?'是':'否':data[k]}`);});
  if(data.players)lines.push('参与者：'+data.players.map(p=>`${p.display_name||p.display_name_snapshot||'已选成员'}（${api.formatScore(p)}）`).join('、'));
  if(data.sheet)lines.push(`计分表：${(data.sheet.groups||[]).length} 个分组，${(data.sheet.cells||[]).length} 项记录`);
  if(data.items)lines.push('标签：'+data.items.map(t=>t.name).join('、'));
  if(data.tag_ids)lines.push(`已选 ${data.tag_ids.length} 个标签`);
  return lines.join('\n')||'这项更改请回到原页面核对';
}
Page({
  data:{items:[],busy:false,error:'',selected:null},
  onShow(){this.reload();},
  reload(){this.setData({items:offline.read().map(o=>({...o,title:TITLES[o.action],stateLabel:{pending:'等待联网',conflict:'需要核对',rejected:'未能保存'}[o.state],
    localText:overview(o.payload),remoteText:overview(o.result&&o.result.current),errorText:o.result?api.message(api.errorOf(o.result)):'',
    canResolve:o.state==='conflict'&&!!(o.result&&o.result.current)}))});},
  async retry(){if(this.data.busy)return;this.setData({busy:true,error:''});try{await offline.drain();}catch(e){this.setData({error:api.message(e)});}finally{this.setData({busy:false});this.reload();}},
  async refresh(e){if(this.data.busy)return;this.setData({busy:true,error:''});try{await offline.refreshConflict(e.currentTarget.dataset.id);}catch(error){this.setData({error:api.message(error)});}finally{this.setData({busy:false});this.reload();}},
  async useLocal(e){if(this.data.busy)return;this.setData({busy:true,error:''});try{await offline.resolve(e.currentTarget.dataset.id,true);}catch(error){this.setData({error:api.message(error)});}finally{this.setData({busy:false});this.reload();}},
  reviewSheet(e){const op=offline.read().find(o=>o.operation_id===e.currentTarget.dataset.id);if(op)wx.navigateTo({url:`/pages/boardgame_scoresheet/boardgame_scoresheet?id=${op.resource_id}&conflict=${op.operation_id}`});},
  discard(e){offline.remove(e.currentTarget.dataset.id);this.reload();}
});
