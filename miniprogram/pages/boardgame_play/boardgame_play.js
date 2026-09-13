const api=require('../../services/boardgames');
const offline=require('../../services/boardgameOffline');
const segments=require('../../services/boardgameImportSegments');
const f=require('../../utils/boardgamePlayForm');
const RESULT=[{value:'auto',label:'按分数判定'},{value:'manual_winner',label:'只指定赢家'},{value:'manual_rank',label:'手动名次'},{value:'tiebreak',label:'同分手动决胜'}];
const DIRECTIONS=[{value:'high',label:'高分获胜'},{value:'low',label:'低分获胜'},{value:'manual',label:'不按分数判定'}];
const EXCLUSIONS=[{value:'none',label:'正常统计'},{value:'wins',label:'不计胜负'},{value:'all',label:'不计全部统计'}];
Page({...require('../../utils/boardgameMedia'),
  data:{id:null,game:null,play:null,form:null,segmentMode:false,segmentNumber:0,detailsOpen:false,playerOptionsOpen:false,timingOpen:false,advancedOpen:false,actionOpen:false,playAction:'',actionTitle:'',actionReason:'',actionError:'',historyOpen:false,historyRows:[],historyCursor:null,restoreIndex:0,restoreOptions:[{value:'draft',label:'待核对草稿'},{value:'completed',label:'已完成对局'},{value:'abandoned',label:'中途结束'}],loading:false,saving:false,error:'',notice:'',editing:true,reason:'',
    modes:f.MODES,statuses:f.STATUSES,personalStatuses:f.STATUSES.filter(s=>s.value!=='recorded'),environments:[{value:'offline',label:'线下'},{value:'online',label:'线上'},{value:'unknown',label:'未知'}],environmentIndex:0,dateMode:'date',dateTitle:'对局日期',dateValue:'',results:RESULT,directions:DIRECTIONS,exclusions:EXCLUSIONS,modeIndex:0,resultIndex:0,directionIndex:0,exclusionIndex:0,
    newFlags:['未记录','第一次玩','玩过了'],sharedResults:['结果未知','成功','失败'],sharedResultIndex:0,sharedStatusIndex:0,
    locationOpen:false,locationQuery:'',locations:[],locationCursor:null,locationError:'',locationSaving:false,dateOpen:false,memberOpen:false,memberRole:'player',memberQuery:'',members:[],memberCursor:null,gameOpen:false,gameQuery:'',games:[],
    expansions:[],expansionOpen:false,boxes:[],boxIndex:0,duplicates:[],duplicateOpen:false,endOpen:false,timerText:'00:00:00',dirty:false},
  onLoad(options){this._options=options;this._segmentKey=options.segment_key||null;this._segmentIndex=Number(options.segment_index)||0;this.setData({segmentMode:!!this._segmentKey,segmentNumber:this._segmentIndex+1});this._importPath=options.job_id&&options.item_id?`/boardgame-imports/${options.job_id}/items/${options.item_id}/plays/${options.id}`:null;this.setData({importedHeld:!!this._importPath});this.setData({id:options.id?Number(options.id):null});},
  onShow(){this.load();},
  onHide(){this.stopTicker();},
  onUnload(){this.stopTicker();clearTimeout(this._memberSearch);},
  cacheKey(){return `boardgames:play-cache:v1:${wx.getStorageSync('userId')}:${this.data.id}`;},
  applyForm(form, extra={}){const value=f.decorate(form);this.setData({form:value,modeIndex:Math.max(0,f.MODES.findIndex(m=>m.value===value.competition_mode)),
    resultIndex:Math.max(0,RESULT.findIndex(r=>r.value===value.result_source)),directionIndex:Math.max(0,DIRECTIONS.findIndex(d=>d.value===value.score_direction)),
    exclusionIndex:Math.max(0,EXCLUSIONS.findIndex(x=>x.value===value.stats_exclusion)),sharedResultIndex:value.cooperative_result==='success'?1:value.cooperative_result==='failure'?2:0,
    environmentIndex:Math.max(0,this.data.environments.findIndex(e=>e.value===value.play_environment)),sharedStatusIndex:Math.max(0,f.STATUSES.findIndex(s=>s.value===value.shared_score_status)),...extra});},
  async load(){
    if(this.data.dirty){this.startTicker();return;}
    this.setData({loading:true,error:''});
    try{
      if(this._segmentKey){const bundle=segments.read(this._segmentKey);if(!bundle||!bundle.entries[this._segmentIndex])throw new Error('分局草稿已失效，请回到来源条目重新核对');this.applyForm(bundle.entries[this._segmentIndex].form,{game:bundle.game,editing:true,dirty:true});await this.loadGameOptions();return;}
      if(this.data.id){const r=await api.get(this._importPath||`/boardgame-plays/${this.data.id}`),play=this._importPath?r.play:r,game=await api.get(`/boardgames/${play.game_id}`);this._importItemRevision=r.item_revision;
        this.applyForm(f.fromDetail(play),{play,game,editing:false});
        try{this._sheet=await api.get((this._importPath||`/boardgame-plays/${this.data.id}`)+'/scoresheet');this.setData({hasSheet:true});}catch(e){if(e.statusCode!==404)throw e;this._sheet=null;this.setData({hasSheet:false});}
        try{wx.setStorageSync(this.cacheKey(),{play,game,sheet:this._sheet});}catch(e){}
      }else{const game=this._options.game_id?await api.get(`/boardgames/${this._options.game_id}`):{id:null,name:'选择游戏',default_rules:{}};
        const self={id:Number(wx.getStorageSync('userId')),nickname:wx.getStorageSync('userNickname')||'我',avatar_url:wx.getStorageSync('userAvatarUrl')||null};
        this.applyForm(f.initial(game,self,Number(this._options.activity_id),Number(this._options.plan_id)),{game,editing:true});}
      if(!this.data.id&&this._options.plan_id&&this._options.activity_id){const a=await api.get(`/activities/${this._options.activity_id}/boardgames`),plan=a.plans.find(p=>p.id===Number(this._options.plan_id));if(plan)this.applyForm({...this.data.form,inventory_id:plan.inventory_id,expansions:plan.expansions.map(e=>({...e}))});}await this.loadGameOptions();this.startTicker();
    }catch(error){const cache=this.data.id&&wx.getStorageSync(this.cacheKey());if(error.statusCode===0&&cache){this._sheet=cache.sheet||null;this.setData({hasSheet:!!this._sheet});this.applyForm(f.fromDetail(cache.play),{play:cache.play,game:cache.game,editing:false,notice:'正在查看本机缓存，联网后将重新核对版本'});}else this.setData({error:api.message(error)});}
    finally{this.setData({loading:false});}
  },
  async loadGameOptions(){if(!this.data.form.game_id)return;const [exp,boxes]=await Promise.all([api.get(`/boardgames/${this.data.form.game_id}/expansions`),api.get('/boardgame-inventory',{game_id:this.data.form.game_id,limit:100})]);
    this.setData({expansions:exp.items.map(e=>({...e,selected:this.data.form.expansions.some(x=>x.game_id===e.game.id)})),
      boxes:[{id:null,label:'未指定使用哪一盒'},...boxes.items.map(b=>({...b,label:`${b.owner.display_name} · ${b.edition_name||'未标版本'}`}))],
      boxIndex:Math.max(0,boxes.items.findIndex(b=>b.id===this.data.form.inventory_id)+1)});},
  toggleSection(e){const k=e.currentTarget.dataset.key;if(['detailsOpen','playerOptionsOpen','timingOpen','advancedOpen'].includes(k))this.setData({[k]:!this.data[k]});},
  edit(){if(this.data.play&&!this.data.play.permissions.can_edit)return;this.setData({editing:true});},
  field(e){const key=e.currentTarget.dataset.key,value=e.detail.value;const extra=key==='shared_score'?{'form.shared_score_status':value===''?'unrecorded':'recorded'}:{};this.setData({[`form.${key}`]:value,dirty:true,...extra});},
  reason(e){this.setData({reason:e.detail.value});},
  modeChange(e){this.applyForm(f.changeMode(this.data.form,f.MODES[Number(e.detail.value)].value),{dirty:true});},
  resultChange(e){const index=Number(e.detail.value);this.setData({resultIndex:index,'form.result_source':RESULT[index].value,dirty:true});},
  directionChange(e){const index=Number(e.detail.value);this.setData({directionIndex:index,'form.score_direction':DIRECTIONS[index].value,dirty:true});},
  exclusionChange(e){const index=Number(e.detail.value);this.setData({exclusionIndex:index,'form.stats_exclusion':EXCLUSIONS[index].value,dirty:true});},
  boxChange(e){const index=Number(e.detail.value);this.setData({boxIndex:index,'form.inventory_id':this.data.boxes[index].id,dirty:true});},
  playerField(e){const {index,key,kind='players'}=e.currentTarget.dataset;const rows=this.data.form[kind].map(p=>({...p}));rows[index][key]=e.detail.value;
    if(key==='score'){rows[index].score_status=e.detail.value===''?'unrecorded':'recorded';rows[index].rank=null;if(['auto','source'].includes(this.data.form.result_source))rows[index].outcome=null;}
    if(key==='is_start_player'&&e.detail.value)rows.forEach((p,i)=>{p.is_start_player=i===Number(index);});
    this.applyForm({...this.data.form,[kind]:rows},{dirty:true});},
  statusChange(e){const {index,kind='players'}=e.currentTarget.dataset,state=(kind==='players'&&this.data.form.competition_mode!=='individual'?this.data.personalStatuses:f.STATUSES)[Number(e.detail.value)].value,rows=this.data.form[kind].map(p=>({...p}));rows[index].score_status=state;
    if(state!=='recorded')rows[index].score=null;if(state==='gave_up'){rows[index].outcome=null;rows[index].rank=null;}
    this.applyForm({...this.data.form,[kind]:rows},{dirty:true});},
  newChange(e){const i=Number(e.currentTarget.dataset.index),v=Number(e.detail.value);this.setData({[`form.players[${i}].is_new_to_player`]:v===0?null:v===1,[`form.players[${i}].newIndex`]:v,dirty:true});},
  teamChange(e){const i=Number(e.currentTarget.dataset.index),v=Number(e.detail.value);this.setData({[`form.players[${i}].team_key`]:this.data.form.teams[v].client_key,[`form.players[${i}].teamIndex`]:v,dirty:true});},
  winner(e){const {kind,index}=e.currentTarget.dataset,rows=this.data.form[kind].map(p=>({...p}));if(['gave_up','unfinished','table_flip'].includes(rows[index].score_status))return;
    rows[index].outcome=rows[index].outcome==='win'?null:'win';this.applyForm({...this.data.form,[kind]:rows},{dirty:true});},
  sharedResult(e){const v=Number(e.detail.value);this.setData({sharedResultIndex:v,'form.cooperative_result':v===1?'success':v===2?'failure':null,dirty:true});},
  sharedStatus(e){const i=Number(e.detail.value),state=f.STATUSES[i].value;this.setData({sharedStatusIndex:i,'form.shared_score_status':state,...(state!=='recorded'?{'form.shared_score':null}:{}),dirty:true});},
  removePlayer(e){const i=Number(e.currentTarget.dataset.index),kind=e.currentTarget.dataset.kind||'players';const rows=this.data.form[kind].filter((_,n)=>n!==i);if(kind==='players')rows.forEach((p,n)=>{p.seat_order=n+1;});this.applyForm({...this.data.form,[kind]:rows},{dirty:true});},
  addTeam(){const teams=[...this.data.form.teams,{client_key:api.uuid(),name:`${this.data.form.teams.length+1} 队`,score:null,score_status:'unrecorded',sort_order:this.data.form.teams.length}];this.applyForm({...this.data.form,teams},{dirty:true});},
  removeTeam(e){const i=Number(e.currentTarget.dataset.index),team=this.data.form.teams[i];if(this.data.form.players.some(p=>p.team_key===team.client_key))return wx.showToast({title:'先将队员调整到其他队伍',icon:'none'});this.applyForm({...this.data.form,teams:this.data.form.teams.filter((_,n)=>n!==i)},{dirty:true});},
  async openMembers(e){this.setData({memberOpen:true,memberRole:e.currentTarget.dataset.role||'player',memberQuery:'',members:[],error:''});await this.searchMembers();},
  closeMembers(){this.setData({memberOpen:false});},
  memberInput(e){this.setData({memberQuery:e.detail.value});clearTimeout(this._memberSearch);this._memberSearch=setTimeout(()=>this.searchMembers(),300);},
  async searchMembers(){try{const r=await api.get('/boardgame-members',{q:this.data.memberQuery,limit:100});this.setData({members:r.items,memberCursor:r.next_cursor});}catch(e){this.setData({error:api.message(e)});}},
  async moreMembers(){try{const r=await api.get('/boardgame-members',{q:this.data.memberQuery,limit:100,cursor:this.data.memberCursor});this.setData({members:[...this.data.members,...r.items],memberCursor:r.next_cursor});}catch(e){this.setData({error:api.message(e)});}},
  chooseMember(e){const user=this.data.members.find(u=>u.id===Number(e.currentTarget.dataset.id)),form=this.data.form;if(!user)return;
    if([...form.players,...form.observers].some(p=>p.user_id===user.id))return wx.showToast({title:'这位成员已在本局',icon:'none'});
    if(this.data.memberRole==='player'){const player=f.member(user,form.players.length+1);if(form.competition_mode==='team')player.team_key=form.teams[0].client_key;this.applyForm({...form,players:[...form.players,player]},{dirty:true});}
    else this.applyForm({...form,observers:[...form.observers,{user_id:user.id,display_name:user.nickname,observer_role:this.data.memberRole}]},{dirty:true});
    this.setData({memberOpen:false});},
  addAutoma(){const form=this.data.form,p={guest_key:api.uuid(),display_name:'Automa',participant_kind:'automa',seat_order:form.players.length+1,score:null,score_status:'unrecorded',rank:null,outcome:null,is_new_to_player:null,is_start_player:false,team_key:form.competition_mode==='team'?form.teams[0].client_key:null};this.applyForm({...form,players:[...form.players,p]},{dirty:true});},
  async openLocations(){this._locationKey=api.uuid();this.setData({locationOpen:true,locationQuery:'',locations:[],locationCursor:null,locationError:''});await this.searchLocations();},closeLocations(){if(!this.data.locationSaving)this.setData({locationOpen:false});},locationInput(e){this._locationKey=api.uuid();this.setData({locationQuery:e.detail.value});},
  async searchLocations(e){const more=e&&e.currentTarget&&e.currentTarget.dataset.more;try{const r=await api.get('/boardgame-locations',{q:this.data.locationQuery,limit:50,cursor:more?this.data.locationCursor:null});this.setData({locations:more?[...this.data.locations,...r.items]:r.items,locationCursor:r.next_cursor,locationError:''});}catch(e){this.setData({locationError:api.message(e)});}},
  chooseLocation(e){const loc=this.data.locations.find(l=>l.id===Number(e.currentTarget.dataset.id));if(loc)this.setData({'form.location_id':loc.id,'form.location_label':loc.name,dirty:true,locationOpen:false});},
  async createLocation(){if(this.data.segmentMode||this._importPath){this.setData({'form.location_id':null,'form.location_label':this.data.locationQuery.trim()||null,locationOpen:false,dirty:true});return;}if(this.data.locationSaving)return;const name=this.data.locationQuery.trim();if(!name){this.setData({locationError:'先填写地点名称'});return;}this.setData({locationSaving:true,locationError:''});try{const loc=await api.send('/boardgame-locations','POST',{name},this._locationKey);this.setData({'form.location_id':loc.id,'form.location_label':loc.name,dirty:true,locationOpen:false});}catch(e){this.setData({locationError:api.message(e)});}finally{this.setData({locationSaving:false});}},
  openDate(){this.setData({dateOpen:true,dateMode:'date',dateTitle:'对局日期',dateValue:this.data.form.played_on});},openStart(){this.setData({dateOpen:true,dateMode:'datetime',dateTitle:'开始时间（北京时间）',dateValue:this.data.form.started_at?this.data.form.started_at_label:this.data.form.played_on+' 12:00'});},clearStart(){this.applyForm({...this.data.form,started_at:null},{dirty:true});},environment(e){const i=Number(e.detail.value);this.setData({environmentIndex:i,'form.play_environment':this.data.environments[i].value,dirty:true});},location(e){this.setData({'form.location_id':null,'form.location_label':e.detail.value,dirty:true});},closeDate(){this.setData({dateOpen:false});},dateConfirm(e){this.applyForm({...this.data.form,played_on:e.detail.dateValue,started_at:this.data.dateMode==='datetime'?`${e.detail.dateValue}T${e.detail.timeValue}:00+08:00`:null},{dateOpen:false,dirty:true});},
  async openExpansions(){this.setData({expansionOpen:true});try{const rows=await Promise.all(this.data.expansions.map(async e=>{const r=await api.get('/boardgame-inventory',{game_id:e.game.id,limit:100}),selected=this.data.form.expansions.find(x=>x.game_id===e.game.id)||{};const boxes=[{id:null,label:'未指定实物'},...r.items.map(b=>({...b,label:`${b.owner.display_name} · ${b.edition_name||'未标版本'}`}))];return {...e,modules_note:selected.modules_note||'',compatibility_note:selected.compatibility_note||'',boxes,boxIndex:Math.max(0,boxes.findIndex(b=>b.id===selected.inventory_id))};}));this.setData({expansions:rows});}catch(e){this.setData({error:api.message(e)});}},closeExpansions(){this.setData({expansionOpen:false});},
  expansionToggle(e){const id=Number(e.currentTarget.dataset.id),selected=e.detail.value;let list=this.data.form.expansions.filter(x=>x.game_id!==id);if(selected)list.push({game_id:id,game_name:(this.data.expansions.find(e=>e.game.id===id)||{game:{}}).game.name,modules_note:null,compatibility_note:null,inventory_id:null});
    this.setData({'form.expansions':list,expansions:this.data.expansions.map(x=>({...x,selected:list.some(r=>r.game_id===x.game.id)})),dirty:true});},
  expansionBox(e){const id=Number(e.currentTarget.dataset.id),index=Number(e.detail.value),entry=this.data.expansions.find(x=>x.game.id===id);this.setData({'form.expansions':this.data.form.expansions.map(x=>x.game_id===id?{...x,inventory_id:entry.boxes[index].id}:x),expansions:this.data.expansions.map(x=>x.game.id===id?{...x,boxIndex:index}:x),dirty:true});},
  expansionNote(e){const id=Number(e.currentTarget.dataset.id),key=e.currentTarget.dataset.key;this.setData({'form.expansions':this.data.form.expansions.map(x=>x.game_id===id?{...x,[key]:e.detail.value}:x),dirty:true});},
  async openGamePicker(){this.setData({gameOpen:true});await this.searchGames();},closeGames(){this.setData({gameOpen:false});},gameInput(e){this.setData({gameQuery:e.detail.value});},
  async searchGames(){try{const r=await api.get('/boardgames',{q:this.data.gameQuery,limit:100});this.setData({games:r.items});}catch(e){this.setData({error:api.message(e)});}},
  async chooseGame(e){if(this.data.segmentMode)return;try{const game=await api.get(`/boardgames/${e.currentTarget.dataset.id}`);this.applyForm({...this.data.form,game_id:game.id,inventory_id:null,expansions:[],plan_id:null,ruleset_id:null,rules_snapshot:{variant_key:'',rules_version:'1'}},{game,dirty:true,gameOpen:false});await this.loadGameOptions();}catch(error){this.setData({error:api.message(error)});}},
  async persist(status, acknowledged=[]){
    if(this.data.segmentMode){const payload=f.toPayload(this.data.form,status);if(!payload.game_id||!payload.players.length)throw new Error('请保留至少一名实际玩家');await api.send('/boardgame-plays/result-preview','POST',payload);segments.save(this._segmentKey,this._segmentIndex,this.data.form,payload);this.setData({dirty:false,notice:'已保存本机分局草稿，返回来源条目后确认导入'});wx.navigateBack();return {segment_saved:true};}
    if(!this.data.form.game_id)throw new Error('请先选择游戏');
    if(this.data.form.competition_mode==='solo'&&this.data.form.players.length!==1)throw new Error('单人模式请保留一名玩家');
    const payload=f.toPayload(this.data.form,status);if(acknowledged.length)payload.duplicate_ack_ids=acknowledged;
    if(this.data.id){payload.expected_revision=this.data.play.revision;payload.reason=this.data.reason||null;}
    if(this.data.id&&this._sheet&&this._sheet.schema_version===2&&this._sheet.apply_totals){
      const old=f.fromDetail(this.data.play),changed=JSON.stringify(old.players.map(p=>p.score_status))!==JSON.stringify(payload.players.map(p=>p.score_status))||
        JSON.stringify(old.teams.map(p=>p.score_status))!==JSON.stringify(payload.teams.map(p=>p.score_status))||old.shared_score_status!==payload.shared_score_status;
      if(changed){payload.sheet={};['schema_version','template_key','template_id','template_family','template_version','sheet_type','scoring_method','apply_totals','groups','subjects','cells','recorded_totals'].forEach(k=>{payload.sheet[k]=this._sheet[k];});payload.sheet_revision=this._sheet.revision;}
    }
    let saved;try{if(this._importPath){if(this.data.clearImportedSheet&&this._sheet){payload.clear_scoresheet=true;payload.sheet_revision=this._sheet.revision;delete payload.sheet;}const item=await api.send(this._importPath,'PATCH',{expected_revision:this._importItemRevision,play:payload});this._importItemRevision=item.revision;saved=item.plays.find(p=>p.id===this.data.id);if(payload.clear_scoresheet){this._sheet=null;this.setData({hasSheet:false,clearImportedSheet:false});}}else saved=await offline.mutate(this.data.id?'play.patch':'play.create',this.data.id,payload);}catch(error){
      if(error.operation_id&&error.body&&error.body.details&&error.body.details.reason==='duplicate_confirmation_required')offline.remove(error.operation_id);throw error;}
    if(saved.queued){this.setData({notice:'已保存在本机，联网后同步。请到待同步记录查看进度。',dirty:false,editing:false});return saved;}
    this.applyForm(f.fromDetail(saved),{id:saved.id,play:saved,dirty:false,editing:false,reason:'',notice:'已保存'});
    try{wx.setStorageSync(this.cacheKey(),{play:saved,game:this.data.game,sheet:this._sheet});}catch(e){}if(payload.sheet){try{this._sheet=await api.get(`/boardgame-plays/${saved.id}/scoresheet`);}catch(e){this._sheet=null;this.setData({notice:'对局已保存，请联网刷新计分表后继续修改'});}}this.startTicker();return saved;
  },
  async save(e){if(this.data.saving)return;const status=e&&e.currentTarget?e.currentTarget.dataset.status||'completed':'completed';this._saveStatus=status;this.setData({saving:true,error:''});
    try{await this.persist(status);}catch(error){const details=error.body&&error.body.details;if(details&&details.reason==='duplicate_confirmation_required'){this.setData({duplicateOpen:true,duplicates:details.candidates||[]});}else this.setData({error:api.message(error)});}finally{this.setData({saving:false});}},
  closeDuplicates(){this.setData({duplicateOpen:false});},
  openEnd(){this.setData({endOpen:true});},closeEnd(){this.setData({endOpen:false});},
  endReason(e){this.setData({'form.end_reason':e.currentTarget.dataset.value,dirty:true});},
  async confirmEnd(){await this.save({currentTarget:{dataset:{status:'abandoned'}}});if(!this.data.error)this.setData({endOpen:false});},
  async confirmDuplicate(){this.setData({saving:true,error:''});try{await this.persist(this._saveStatus,this.data.duplicates.map(p=>p.id));this.setData({duplicateOpen:false});}catch(e){this.setData({error:api.message(e)});}finally{this.setData({saving:false});}},
  openExisting(e){this.setData({duplicateOpen:false});wx.navigateTo({url:`/pages/boardgame_play/boardgame_play?id=${e.currentTarget.dataset.id}`});},
  clearImported(e){this.setData({clearImportedSheet:e.detail.value,dirty:true});},
  tags(){wx.navigateTo({url:`/pages/boardgame_collection/boardgame_collection?play_id=${this.data.id}`});},
  async scoresheet(){if(this.data.segmentMode)return;if(this.data.saving)return;this.setData({saving:true,error:''});try{const p=this.data.id&&!this.data.dirty?this.data.play:await this.persist(this.data.play?this.data.play.status:'draft');if(p.queued)throw new Error('联网同步对局后即可填写计分表');
      wx.navigateTo({url:`/pages/boardgame_scoresheet/boardgame_scoresheet?id=${p.id}`+(this._importPath?`&job_id=${this._options.job_id}&item_id=${this._options.item_id}`:'')});}catch(e){this.setData({error:api.message(e)});}finally{this.setData({saving:false});}},
  async timer(e){if(this.data.segmentMode)return;if(this._importPath){this.setData({error:'待核对历史请直接填写时长，计时用于现场对局'});return;}if(this.data.saving)return;this.setData({saving:true,error:''});try{const p=this.data.id&&!this.data.dirty?this.data.play:await this.persist(this.data.play&&this.data.play.status==='completed'?'completed':'draft');if(p.queued)throw new Error('联网同步对局后即可开始计时');
      const r=await api.send(`/boardgame-plays/${p.id}/timer`,'POST',{expected_revision:p.revision,action:e.currentTarget.dataset.action,reason:p.status==='draft'?null:this.data.reason||'调整对局计时'});
      this.applyForm(f.fromDetail(r),{play:r});this.startTicker();}catch(error){this.setData({error:api.message(error)});}finally{this.setData({saving:false});}},
  startTicker(){this.stopTicker();const p=this.data.play;if(!p)return;const start=Date.now(),base=p.timer_current_seconds||p.timer_elapsed_seconds||0;
    const tick=()=>{const seconds=base+(p.timer_status==='running'?Math.max(0,Math.floor((Date.now()-start)/1000)):0);this.setData({timerText:[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':')});};tick();if(p.timer_status==='running')this._ticker=setInterval(tick,1000);},
  stopTicker(){if(this._ticker)clearInterval(this._ticker);this._ticker=null;},
  openAction(e){const action=e.currentTarget.dataset.action,p=this.data.play;if(!p||this._importPath)return;
    if(action==='report'?!p.permissions.can_report:['void','restore'].includes(action)&&!p.permissions.can_edit)return;
    this._actionKey=api.uuid();this.setData({actionOpen:true,playAction:action,actionTitle:{report:'反馈对局问题',void:'作废这局记录',restore:'恢复对局',copy:'再记一局'}[action],actionReason:'',actionError:'',restoreIndex:0});},
  closeAction(){if(!this.data.saving)this.setData({actionOpen:false});},actionReason(e){this._actionKey=api.uuid();this.setData({actionReason:e.detail.value});},restoreStatus(e){this.setData({restoreIndex:Number(e.detail.value)});},
  async saveAction(){if(this.data.saving)return;this.setData({saving:true,actionError:''});try{const action=this.data.playAction,p=this.data.play,reason=this.data.actionReason.trim();
    if(action!=='copy'&&!reason)throw new Error(action==='report'?'请说明需要核对的问题':'请填写操作原因');
    const body=action==='report'?{message:reason}:action==='copy'?{activity_id:null}:{expected_revision:p.revision,reason,...(action==='restore'?{target_status:this.data.restoreOptions[this.data.restoreIndex].value}:{})};
    const r=await api.send(`/boardgame-plays/${p.id}/${action==='report'?'reports':action}`,'POST',body,this._actionKey);
    this.setData({actionOpen:false,notice:action==='report'?'反馈已提交，可在桌游管理中查看处理结果':'已保存'});
    if(action==='copy')wx.navigateTo({url:`/pages/boardgame_play/boardgame_play?id=${r.id}`});else await this.load();
  }catch(e){this.setData({actionError:api.message(e)});}finally{this.setData({saving:false});}},
  async openHistory(){this.setData({historyOpen:true,historyRows:[],historyCursor:null,actionError:''});await this.moreHistory();},closeHistory(){this.setData({historyOpen:false});},
  async moreHistory(){try{const r=await api.get(`/boardgame-plays/${this.data.id}/history`,{limit:30,cursor:this.data.historyCursor});const names={create:'创建记录',edit:'更正记录',void:'作废记录',restore:'恢复记录',identity_merged:'合并身份',timer_start:'开始计时',timer_pause:'暂停计时',timer_resume:'继续计时',timer_stop:'结束计时',timer_restore:'恢复计时',scoresheet_save:'更新计分表'};
    this.setData({historyRows:[...this.data.historyRows,...r.items.map(i=>({...i,label:names[i.action]||'更新记录'}))],historyCursor:r.next_cursor});}catch(e){this.setData({actionError:api.message(e)});}},
  offline(){wx.navigateTo({url:'/pages/boardgame_offline/boardgame_offline'});}
});
