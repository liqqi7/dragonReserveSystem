const api=require('../../services/boardgames');
const offline=require('../../services/boardgameOffline');
const STATUS=[{value:'unverified',label:'待确认'},{value:'available',label:'可使用'},{value:'borrowed',label:'已借出'},{value:'unavailable',label:'暂不可用'},{value:'retired',label:'已退役'}];
Page({...require('../../utils/boardgameMedia'),
  data:{id:null,game:null,expansions:[],inventory:[],inventoryCursor:null,preference:{},prior:{},tags:[],loading:false,error:'',tab:'info',
    prefOpen:false,prefForm:{},priorForm:{},inventoryOpen:false,box:{},boxId:null,boxRevision:0,boxStatusIndex:0,statuses:STATUS,
    saving:false,formError:'',dateOpen:false,dateValue:'',pendingMessage:'',descriptionOpen:false,isAdmin:false,ownerOptions:[],ownerIndex:0,editOpen:false,editForm:{},compatOpen:false,compatQuery:'',compatItems:[],compatCursor:null,compatChosen:null,compatDecision:0,compatOptions:[{value:'allow',label:'已确认兼容'},{value:'block',label:'不兼容'},{value:'inherit',label:'沿用来源建议'}],compatNote:'',ownerOpen:false,ownerQuery:'',ownerMembers:[],ownerCursor:null},
  onLoad(options){this.setData({id:Number(options.id),isAdmin:wx.getStorageSync('userRole')==='admin'});},
  onShow(){this.load();},
  async load(){
    if(!this.data.id)return; this.setData({loading:true,error:''});
    try{
      const root=`/boardgames/${this.data.id}`;
      const [game,expansions,inventory,preference,prior,tags]=await Promise.all([
        api.get(root),api.get(root+'/expansions'),api.get('/boardgame-inventory',{game_id:this.data.id,limit:100}),
        api.get(root+'/my-preference'),api.get(root+'/my-prior-plays'),api.get(`/boardgame-tags/games/${this.data.id}`)]);
      this.setData({game,expansions:expansions.items,inventory:this.boxes(inventory.items),inventoryCursor:inventory.next_cursor,
        preference,prior,tags:tags.items}); wx.setNavigationBarTitle({title:game.name});
    }catch(error){this.setData({error:api.message(error)});}finally{this.setData({loading:false});}
  },
  boxes(items){return items.map(b=>({...b,statusLabel:(STATUS.find(s=>s.value===b.status)||{}).label}));},
  async moreBoxes(){if(!this.data.inventoryCursor)return;try{const r=await api.get('/boardgame-inventory',{game_id:this.data.id,limit:100,cursor:this.data.inventoryCursor});this.setData({inventory:[...this.data.inventory,...this.boxes(r.items)],inventoryCursor:r.next_cursor});}catch(e){this.setData({error:api.message(e)});}},
  toggleDescription(){this.setData({descriptionOpen:!this.data.descriptionOpen});},
  manage(e){wx.navigateTo({url:'/pages/boardgame_manage/boardgame_manage'+api.query({kind:e.currentTarget.dataset.kind||'games',game_id:this.data.id})});},
  setTab(e){this.setData({tab:e.currentTarget.dataset.tab});},
  openGame(e){wx.navigateTo({url:`/pages/boardgame_detail/boardgame_detail?id=${e.currentTarget.dataset.id}`});},
  history(){wx.navigateTo({url:`/pages/boardgame_history/boardgame_history?game_id=${this.data.id}`});},
  statistics(){wx.navigateTo({url:`/pages/boardgame_stats/boardgame_stats?game_id=${this.data.id}`});},
  record(){wx.navigateTo({url:`/pages/boardgame_play/boardgame_play?game_id=${this.data.id}`});},
  collection(){wx.navigateTo({url:`/pages/boardgame_collection/boardgame_collection?game_id=${this.data.id}`});},
  openPreference(){this.setData({prefOpen:true,prefForm:{...this.data.preference},priorForm:{...this.data.prior},formError:''});},
  closePreference(){if(!this.data.saving)this.setData({prefOpen:false});},
  prefField(e){const key=e.currentTarget.dataset.key;this.setData({[`prefForm.${key}`]:e.detail.value});},
  priorField(e){this.setData({[`priorForm.${e.currentTarget.dataset.key}`]:e.detail.value});},
  async savePreference(){
    if(this.data.saving)return;this.setData({saving:true,formError:''});
    try{
      const f=this.data.prefForm,p=this.data.priorForm;
      const pref=await offline.mutate('preference.put',this.data.id,{expected_revision:f.revision,rating:f.rating===''||f.rating===null?null:String(f.rating),
        wishlist:!!f.wishlist,preordered:!!f.preordered,want_to_play:!!f.want_to_play,note:f.note||null});
      if(!pref.queued){this.setData({preference:pref,'prefForm.revision':pref.revision});}
      let previous={};
      if(p.played_before!==this.data.prior.played_before||String(p.approximate_count||'')!==String(this.data.prior.approximate_count||'')){
        previous=await offline.mutate('prior.put',this.data.id,{expected_revision:p.revision,played_before:!!p.played_before,
          approximate_count:p.approximate_count?Number(p.approximate_count):null,note:p.note||null});
        if(!previous.queued)this.setData({prior:previous});
      }
      this.setData({prefOpen:false,pendingMessage:pref.queued||previous.queued?'已保存在本机，联网后同步':''});
      wx.showToast({title:pref.queued||previous.queued?'已存本机':'已保存',icon:'none'});
    }catch(error){this.setData({formError:api.message(error)});}finally{this.setData({saving:false});}
  },
  async openBox(e){
    const id=Number(e.currentTarget.dataset.id)||null,b=this.data.inventory.find(r=>r.id===id);
    if(b&&!b.permissions.can_edit)return;
    const box=b?{...b,...b.internal,owner_type:b.owner.type,owner_user_id:b.owner.id,owner_label:b.owner.type==='external'?b.owner.display_name:null}:
      {owner_type:'member',owner_user_id:Number(wx.getStorageSync('userId')),status:'available',available_for_activity:false,purchased_on:null,purchase_price:'',purchase_currency:'CNY',edition_name:'',language:'',storage_location:'',remark:'',quantity:1,sort_order:0};
    this._boxKey=api.uuid();
    this.setData({inventoryOpen:true,box,boxId:id,boxRevision:b?b.revision:0,boxStatusIndex:Math.max(0,STATUS.findIndex(s=>s.value===box.status)),formError:''});
    if(this.data.isAdmin){try{const r=await api.get('/boardgame-members',{limit:100});const options=[{id:null,type:'club',nickname:'俱乐部'},{id:null,type:'external',nickname:'其他归属'},...r.items.map(u=>({...u,type:'member'}))];if(box.owner_type==='member'&&!options.some(o=>o.id===box.owner_user_id))options.push({id:box.owner_user_id,type:'member',nickname:b?b.owner.display_name:'我'});this.setData({ownerOptions:options,ownerIndex:Math.max(0,options.findIndex(o=>o.id===box.owner_user_id&&o.type===box.owner_type))});}catch(e){this.setData({formError:api.message(e)});}}
  },
  async openOwner(){this.setData({ownerOpen:true,ownerQuery:'',ownerMembers:[],ownerCursor:null});await this.searchOwner();},closeOwner(){this.setData({ownerOpen:false});},ownerInput(e){this.setData({ownerQuery:e.detail.value});},async searchOwner(e){try{const more=e&&e.currentTarget&&e.currentTarget.dataset.more,r=await api.get('/boardgame-members',{q:this.data.ownerQuery,limit:100,cursor:more?this.data.ownerCursor:null});this.setData({ownerMembers:more?[...this.data.ownerMembers,...r.items]:r.items,ownerCursor:r.next_cursor});}catch(e){this.setData({formError:api.message(e)});}},chooseOwner(e){const u=this.data.ownerMembers.find(u=>u.id===Number(e.currentTarget.dataset.id));if(!u)return;const options=this.data.ownerOptions.filter(o=>o.id!==u.id||o.type!=='member');options.push({...u,type:'member'});this.setData({ownerOptions:options,ownerOpen:false});this.ownerChange({detail:{value:options.length-1}});},
  clearDate(){this._boxKey=api.uuid();this.setData({'box.purchased_on':null});},
  async openCompatibility(){this.setData({compatOpen:true,compatQuery:'',compatChosen:null,compatItems:[],compatCursor:null,compatNote:'',compatDecision:0,formError:''});await this.searchCompatibility();},closeCompatibility(){if(!this.data.saving)this.setData({compatOpen:false});},compatInput(e){this.setData({compatQuery:e.detail.value});},async searchCompatibility(e){try{const more=e&&e.currentTarget&&e.currentTarget.dataset.more,r=await api.get('/boardgames',{game_type:'expansion',q:this.data.compatQuery,limit:50,cursor:more?this.data.compatCursor:null});this.setData({compatItems:(more?[...this.data.compatItems,...r.items]:r.items).filter(g=>g.id!==this.data.id),compatCursor:r.next_cursor});}catch(e){this.setData({formError:api.message(e)});}},chooseCompatibility(e){const g=this.data.compatItems.find(g=>g.id===Number(e.currentTarget.dataset.id)),old=this.data.expansions.find(r=>r.expansion_game_id===g.id);this.setData({compatChosen:g,compatDecision:old?Math.max(0,this.data.compatOptions.findIndex(o=>o.value===old.manual_decision)):0,compatNote:old?old.note||'':''});},compatDecision(e){this.setData({compatDecision:Number(e.detail.value)});},compatNote(e){this.setData({compatNote:e.detail.value});},async saveCompatibility(){if(this.data.saving||!this.data.compatChosen)return;this.setData({saving:true,formError:''});try{const old=this.data.expansions.find(r=>r.expansion_game_id===this.data.compatChosen.id);await api.send(`/boardgames/${this.data.id}/expansions/${this.data.compatChosen.id}`,'PUT',{expected_revision:old?old.revision:0,manual_decision:this.data.compatOptions[this.data.compatDecision].value,note:this.data.compatNote||null});this.setData({compatOpen:false});await this.load();}catch(e){this.setData({formError:api.message(e)});}finally{this.setData({saving:false});}},
  closeBox(){if(!this.data.saving)this.setData({inventoryOpen:false});},
  boxField(e){this._boxKey=api.uuid();this.setData({[`box.${e.currentTarget.dataset.key}`]:e.detail.value});},
  boxStatus(e){const i=Number(e.detail.value);this._boxKey=api.uuid();this.setData({boxStatusIndex:i,'box.status':STATUS[i].value,...(STATUS[i].value!=='available'?{'box.available_for_activity':false}:{})});},
  ownerChange(e){const i=Number(e.detail.value),o=this.data.ownerOptions[i];this._boxKey=api.uuid();this.setData({ownerIndex:i,'box.owner_type':o.type,'box.owner_user_id':o.id,'box.owner_label':o.type==='external'?this.data.box.owner_label||'':null});},
  chooseDate(){this.setData({dateOpen:true,dateValue:this.data.box.purchased_on||api.today()});},
  closeDate(){this.setData({dateOpen:false});},
  dateConfirm(e){this._boxKey=api.uuid();this.setData({'box.purchased_on':e.detail.dateValue,dateOpen:false});},
  async saveBox(){
    if(this.data.saving)return;this.setData({saving:true,formError:''});
    try{
      const b=this.data.box,fields=['owner_type','owner_user_id','owner_label','status','available_for_activity','purchased_on','edition_name','language','storage_location','remark'];
      const data={};fields.forEach(k=>{data[k]=b[k]===''?null:b[k];});
      data.purchase_price=b.purchase_price===''||b.purchase_price===null||b.purchase_price===undefined?null:String(b.purchase_price);
      data.purchase_currency=data.purchase_price===null?null:String(b.purchase_currency||'CNY').toUpperCase();
      data.sort_order=Number(b.sort_order)||0;
      const result=this.data.boxId?await offline.mutate('inventory.patch',this.data.boxId,{...data,expected_revision:this.data.boxRevision}):
        await api.send('/boardgame-inventory','POST',{...data,game_id:this.data.id,quantity:Number(b.quantity)||1},this._boxKey);
      this.setData({inventoryOpen:false,pendingMessage:result.queued?'已保存在本机，联网后同步':''});await this.load();
    }catch(error){this.setData({formError:api.message(error)});}finally{this.setData({saving:false});}
  },
  async archiveBox(){
    if(!this.data.boxId||this.data.saving)return;this.setData({saving:true,formError:''});
    try{await api.send(`/boardgame-inventory/${this.data.boxId}/archive`,'POST',{expected_revision:this.data.boxRevision,reason:'由拥有者归档实物'});
      this.setData({inventoryOpen:false});await this.load();}catch(e){this.setData({formError:api.message(e)});}finally{this.setData({saving:false});}
  },
  openEdit(){const g=this.data.game;this.setData({editOpen:true,formError:'',editForm:{is_standalone:g.is_standalone,name:g.name,aliases:g.aliases.join('，'),min_players:g.min_players||'',max_players:g.max_players||'',max_playtime_minutes:g.max_playtime_minutes||'',complexity:g.complexity||'',description:g.description||''}});},
  closeEdit(){if(!this.data.saving)this.setData({editOpen:false});},
  editField(e){this.setData({[`editForm.${e.currentTarget.dataset.key}`]:e.detail.value});},
  async saveEdit(){if(this.data.saving)return;this.setData({saving:true,formError:''});try{const f=this.data.editForm,set={is_standalone:!!f.is_standalone,name:f.name,aliases:f.aliases.split(/[,，\n]/).map(v=>v.trim()).filter(Boolean),description:f.description||null};
      ['min_players','max_players','max_playtime_minutes','complexity'].forEach(k=>{set[k]=f[k]===''?null:Number(f[k]);});
      await api.send(`/boardgames/${this.data.id}`,'PATCH',{expected_revision:this.data.game.revision,set_overrides:set,reason:'补充游戏资料'});
      this.setData({editOpen:false});await this.load();}catch(e){this.setData({formError:api.message(e)});}finally{this.setData({saving:false});}}
});
