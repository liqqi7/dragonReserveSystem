const api=require('./boardgames');
const form=require('../utils/boardgamePlayForm');
const prefix='boardgames:import-segments:v1:';
function owner(){return String(wx.getStorageSync('userId')||'');}
function key(jobId,itemId){return `${prefix}${owner()}:${jobId}:${itemId}`;}
function read(storageKey){if(!storageKey.startsWith(prefix+owner()+':')||!owner())throw new Error('请使用核对这份文件的账号继续');const value=wx.getStorageSync(storageKey);return value&&value.owner===owner()?value:null;}
function write(storageKey,value){if(!owner()||!storageKey.startsWith(prefix+owner()+':'))throw new Error('账号已切换，请重新进入导入任务');wx.setStorageSync(storageKey,{...value,owner:owner()});}
function prepare(jobId,item,review,game){
  const storageKey=key(jobId,item.id),previous=read(storageKey),count=Number(review.normalized.quantity||1);
  if(!Number.isInteger(count)||count<2||count>100)throw new Error('这条来源不需要拆分，或场次数量超出支持范围');
  if(previous&&previous.sourceHash===JSON.stringify(review.normalized)&&previous.game.id===game.id&&previous.entries.length===count)return {key:storageKey,bundle:previous};
  const n=review.normalized,entries=Array.from({length:count},(_,index)=>{
    let value=form.initial(game,null,null,null);value.played_on=n.played_on||api.today();value.location_label=n.location_name||null;
    value.players=(n.players||[]).map((p,i)=>({guest_key:api.uuid(),display_name:p.name||'待匹配玩家',source_slot:p.source_slot,
      participant_kind:p.participant_kind||'human',seat_order:i+1,score:null,score_status:'unrecorded',rank:null,outcome:null,is_start_player:false,is_new_to_player:null}));
    value=form.changeMode(value,n.competition_mode||'unscored');
    return {index,form:value,confirmed:false,payload:null,slots:[]};
  });
  const bundle={version:1,owner:owner(),sourceHash:JSON.stringify(review.normalized),revision:item.revision,game,entries};write(storageKey,bundle);return {key:storageKey,bundle};
}
function save(storageKey,index,value,payload){const bundle=read(storageKey);if(!bundle||!bundle.entries[index])throw new Error('分局草稿已失效，请回到来源条目重新核对');
  bundle.entries[index]={index,form:value,confirmed:true,payload,slots:value.players.map(p=>Number.isInteger(p.source_slot)?p.source_slot:null)};write(storageKey,bundle);}
function summary(bundle){return bundle?bundle.entries.map(e=>({index:e.index,confirmed:e.confirmed,date:e.form.played_on,players:e.form.players.length,
  status:e.payload&&e.payload.status==='abandoned'?'中途结束':e.confirmed?'已逐局核对':'尚未核对'})):[];}
function clear(storageKey){if(storageKey&&storageKey.startsWith(prefix+owner()+':'))wx.removeStorageSync(storageKey);}
module.exports={key,read,write,prepare,save,summary,clear};
