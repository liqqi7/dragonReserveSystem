const api = require('../../services/boardgames');
const KINDS = [{value:'reports',label:'对局反馈'},{value:'inventory',label:'实物馆藏'},
  {value:'games',label:'游戏资料'},{value:'people',label:'玩家身份'},{value:'locations',label:'游玩地点'}];
const PATHS = {games:'/boardgames',inventory:'/boardgame-inventory',people:'/boardgame-people',locations:'/boardgame-locations'};
const STATUS = {open:'待处理',resolved:'已解决',dismissed:'无需更改'};
const CONFLICTS = {distinct_game_identity:'两条记录属于不同游戏，不能合并',distinct_accounts:'两位玩家绑定了不同账号，不能合并',same_play_people:'两位玩家在同一局出现，不能合并'};
function rowView(row,kind) {
  return {...row,original_name:(row.game||row).original_name,label:kind==='reports'?row.game.name:kind==='inventory'?row.game.name:row.display_name||row.name,
    caption:kind==='reports'?`${row.played_on} · ${STATUS[row.status]}`:kind==='inventory'?`${row.owner.display_name} · ${row.edition_label||row.edition_name||'未标版本'}`:
      kind==='people'?(row.user?'已匹配 '+row.user.nickname:'未匹配小程序账号'):row.archived_at?'已归档':'使用中'};
}
function impactRows(preview) {
  const labels={boardgame_inventory:'实物馆藏',activity_game_plans:'游戏安排',activity_game_plan_expansions:'安排中的扩展',
    boardgame_plays:'实际对局',boardgame_play_expansions:'对局中的扩展',boardgame_play_players:'玩家成绩',
    activity_game_nominations:'活动提名',activity_game_nomination_expansions:'提名扩展',boardgame_people:'玩家身份',
    boardgame_game_preferences:'游戏偏好',boardgame_prior_plays:'既往游玩',boardgame_rulesets:'玩法规则'};
  return Object.entries(preview.references||{}).filter(([,v])=>(typeof v==='number'?v:v.count)>0).map(([key,v],i)=>({
    key,label:labels[key.split('.')[0]]||`相关记录 ${i+1}`,count:typeof v==='number'?v:v.count}));
}
Page({...require('../../utils/boardgameMedia'),
  data:{kind:'reports',kinds:KINDS,isAdmin:false,query:'',archived:false,scope:'actionable',status:'open',
    rows:[],cursor:null,loading:false,error:'',notice:'',gameId:null,
    formOpen:false,action:'',actionTitle:'',selected:null,target:null,reason:'',name:'',resolution:'',resolveIndex:0,
    resolveOptions:[{value:'resolved',label:'已核对并解决'},{value:'dismissed',label:'无需更改，说明原因'}],
    saving:false,formError:'',preview:null,impacts:[],conflicts:[],pickerOpen:false,pickerQuery:'',pickerItems:[],pickerCursor:null,pickerLoading:false},
  onLoad(options){const isAdmin=wx.getStorageSync('userRole')==='admin';const kinds=KINDS.filter(k=>isAdmin||!['people','locations'].includes(k.value));
    this.setData({isAdmin,kinds,kind:kinds.some(k=>k.value===options.kind)?options.kind:'reports',gameId:Number(options.game_id)||null});},
  onShow(){this.load();},onUnload(){this._generation=(this._generation||0)+1;this._pickerGeneration=(this._pickerGeneration||0)+1;},
  onReachBottom(){if(this.data.cursor&&!this.data.loading)this.load(true);},
  async load(more=false){more=more===true;const generation=this._generation=(this._generation||0)+1,kind=this.data.kind;
    this.setData({loading:true,error:''});
    try{const r=await api.get(kind==='reports'?'/boardgame-play-reports':'/boardgame-management/resources',{
      ...(kind==='reports'?{scope:this.data.scope,status:this.data.status}:{kind,archived:this.data.archived,q:this.data.query,game_id:this.data.gameId}),
      limit:20,cursor:more?this.data.cursor:null});
      if(generation===this._generation)this.setData({rows:more?[...this.data.rows,...r.items.map(r=>rowView(r,kind))]:r.items.map(r=>rowView(r,kind)),cursor:r.next_cursor});
    }catch(e){if(generation===this._generation)this.setData({error:api.message(e)});}finally{if(generation===this._generation)this.setData({loading:false});}},
  kind(e){this.setData({kind:e.currentTarget.dataset.kind,rows:[],cursor:null,query:'',archived:false,gameId:null});this.load();},
  input(e){this.setData({query:e.detail.value});},archived(e){this.setData({archived:e.detail.value});this.load();},
  scope(e){this.setData({scope:e.currentTarget.dataset.scope});this.load();},status(e){this.setData({status:e.currentTarget.dataset.status});this.load();},
  view(e){const r=this.data.rows.find(r=>r.id===Number(e.currentTarget.dataset.id));if(!r)return;
    const page=this.data.kind==='reports'?'boardgame_play':'boardgame_detail',id=this.data.kind==='reports'?r.play_id:this.data.kind==='inventory'?r.game_id:r.id;
    if(['reports','inventory','games'].includes(this.data.kind))wx.navigateTo({url:`/pages/${page}/${page}?id=${id}`});},
  openAction(e){const selected=this.data.rows.find(r=>r.id===Number(e.currentTarget.dataset.id)),action=e.currentTarget.dataset.action;if(!selected)return;
    if(action==='resolve'?!selected.permissions.can_resolve:!selected.permissions.can_edit)return;
    this._key=api.uuid();this.setData({formOpen:true,selected,action,target:null,reason:'',name:selected.label,resolution:'',resolveIndex:0,
      preview:null,impacts:[],conflicts:[],formError:'',actionTitle:{archive:'归档记录',restore:'恢复记录',merge:'合并重复记录',correct:'更正实物对应游戏',binding:'匹配小程序账号',rename:'修改名称',resolve:'处理对局反馈'}[action]});},
  closeForm(){if(!this.data.saving)this.setData({formOpen:false});},
  field(e){if(this.data.saving)return;this._key=api.uuid();this.setData({[e.currentTarget.dataset.key]:e.detail.value});},
  resolve(e){this.setData({resolveIndex:Number(e.detail.value)});},
  async openPicker(){this.setData({pickerOpen:true,pickerItems:[],pickerQuery:'',pickerCursor:null,formError:''});await this.searchPicker();},
  closePicker(){if(!this.data.saving){this._pickerGeneration=(this._pickerGeneration||0)+1;this.setData({pickerOpen:false});}},
  pickerInput(e){this.setData({pickerQuery:e.detail.value});},
  async searchPicker(e){const more=!!(e&&e.currentTarget&&e.currentTarget.dataset.more),generation=this._pickerGeneration=(this._pickerGeneration||0)+1;
    const path=this.data.action==='binding'?'/boardgame-members':this.data.kind==='people'?'/boardgame-people':'/boardgames';
    this.setData({pickerLoading:true});try{const r=await api.get(path,{q:this.data.pickerQuery,limit:50,cursor:more?this.data.pickerCursor:null});
      if(generation!==this._pickerGeneration)return;const items=r.items.filter(r=>this.data.action!=='merge'||r.id!==this.data.selected.id).map(r=>({...r,label:r.name||r.display_name||r.nickname}));
      this.setData({pickerItems:more?[...this.data.pickerItems,...items]:items,pickerCursor:r.next_cursor});
    }catch(e){if(generation===this._pickerGeneration)this.setData({formError:api.message(e)});}finally{if(generation===this._pickerGeneration)this.setData({pickerLoading:false});}},
  async choose(e){const target=this.data.pickerItems.find(r=>r.id===Number(e.currentTarget.dataset.id));if(!target)return;
    this._key=api.uuid();this.setData({target,pickerOpen:false,preview:null,impacts:[],conflicts:[],formError:''});
    if(['merge','correct'].includes(this.data.action))await this.preview();},
  unbind(){this._key=api.uuid();this.setData({target:{id:null,label:'解除现有账号关联'}});},
  async preview(){if(this.data.saving||!this.data.target)return;this.setData({saving:true,formError:'',preview:null});
    try{const root=PATHS[this.data.kind],id=this.data.selected.id,correction=this.data.action==='correct';
      const preview=await api.get(`${root}/${id}/${correction?'game-correction-preview':'merge-preview'}`,correction?{target_game_id:this.data.target.id}:{target_id:this.data.target.id});
      this.setData({preview,impacts:impactRows(preview),conflicts:(preview.conflicts||[]).map(c=>CONFLICTS[c]||'存在重复关联，请先整理相关记录')});
    }catch(e){this.setData({formError:api.message(e)});}finally{this.setData({saving:false});}},
  async save(){if(this.data.saving)return;const d=this.data,r=d.selected;if(!r)return;
    this.setData({saving:true,formError:''});
    try{let path=`${PATHS[d.kind]}/${r.id}`,method='POST',body={expected_revision:r.revision,reason:d.reason.trim()};
      if(d.action==='resolve'){if(!d.resolution.trim())throw new Error('请填写处理说明');path=`/boardgame-play-reports/${r.id}`;method='PATCH';body={expected_revision:r.revision,status:d.resolveOptions[d.resolveIndex].value,resolution:d.resolution.trim()};}
      else{if(!body.reason)throw new Error('请填写原因，方便之后追溯');
        if(['archive','restore'].includes(d.action))path+='/'+d.action;
        else if(d.action==='rename'){if(!d.name.trim())throw new Error('名称不能为空');method='PATCH';body[d.kind==='people'?'display_name':'name']=d.name.trim();}
        else if(d.action==='binding'){if(!d.target)throw new Error('请选择小程序账号');method='POST';path+='/account-binding';body.user_id=d.target.id;}
        else if(['merge','correct'].includes(d.action)){if(!d.target||!d.preview)throw new Error('请先选择目标并预览影响');if(d.conflicts.length)throw new Error('先处理预览中的冲突，才能合并');
          path+=d.action==='merge'?'/merge':'/game-correction';body=d.action==='merge'?{target_id:d.target.id,source_revision:d.preview.source_revision,target_revision:d.preview.target_revision,preview_hash:d.preview.preview_hash,reason:body.reason}:{...body,target_game_id:d.target.id,preview_hash:d.preview.preview_hash};}
        else throw new Error('请选择操作');}
      await api.send(path,method,body,this._key);this.setData({formOpen:false,notice:'已保存，相关记录已更新'});await this.load();
    }catch(e){this.setData({formError:api.message(e)});}finally{this.setData({saving:false});}}
});
