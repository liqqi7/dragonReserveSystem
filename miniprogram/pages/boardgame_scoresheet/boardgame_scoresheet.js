const api=require('../../services/boardgames');
const offline=require('../../services/boardgameOffline');
const FIELDS=['schema_version','template_key','template_id','template_family','template_version','sheet_type','scoring_method','apply_totals','groups','subjects','cells','recorded_totals'];
const METHODS=[{value:'best_total',label:'累计总分'},{value:'best_round',label:'最佳一轮'},{value:'rounds_won',label:'赢得轮数'},{value:'scores_only',label:'仅记录分数'}];
const KINDS=[{value:'number',label:'数值 / 算式'},{value:'radio',label:'单选一位玩家'},{value:'checkbox',label:'勾选得分'},{value:'choice',label:'选项得分'},{value:'text',label:'辅助文字'},{value:'subtotal',label:'分组小计'}];
function extract(sheet){const out={};FIELDS.forEach(k=>{if(sheet[k]!==undefined)out[k]=sheet[k];});return JSON.parse(JSON.stringify(out));}
Page({
  data:{id:null,isAdmin:false,maintenanceOpen:false,maintenanceKind:'template',maintenanceName:'',maintenanceVersion:'1',maintenanceReason:'',maintenanceRows:[],templateChoices:[],templateChoiceIndex:0,minPlayers:'',maxPlayers:'',play:null,loading:false,saving:false,error:'',notice:'',hasSheet:false,editable:false,templates:[],templateOpen:false,
    sheetRevision:0,playRevision:0,reason:'',methods:METHODS,methodIndex:0,groupIndex:0,groupOptions:[],rows:[],subjects:[],rowPage:0,subjectPage:0,
    hasMoreRows:false,hasMoreSubjects:false,totals:[],templateName:'',roundCount:1,builtin:'generic',newRowOpen:false,rowKinds:KINDS,rowKindIndex:0,rowForm:{label:'',value:'1',options:'',repeatable:true,contributes:true}},
  onLoad(options){this._importPath=options.job_id&&options.item_id?`/boardgame-imports/${options.job_id}/items/${options.item_id}/plays/${options.id}`:null;this.setData({id:Number(options.id),isAdmin:wx.getStorageSync('userRole')==='admin'});this._conflict=options.conflict||null;this.load();},
  async load(){this._serverView=false;this.setData({loading:true,error:''});try{
      const result=await api.get(this._importPath||`/boardgame-plays/${this.data.id}`),play=this._importPath?result.play:result;this.setData({play,playRevision:play.revision,editable:!this._importPath&&play.permissions.can_edit&&play.status!=='voided'});
      const r=this._importPath?{items:[]}:await api.get('/boardgame-score-templates',{game_id:play.game_id,play_id:play.id,limit:100});this.setData({templates:r.items});
      try{const sheet=await api.get((this._importPath||`/boardgame-plays/${play.id}`)+'/scoresheet');this._reviewMeta=sheet.template_review;this._sheet=extract(sheet);this._original=extract(sheet);
        this.setData({hasSheet:sheet.parse_status==='parsed',sheetRevision:sheet.revision,templateName:sheet.template_review?`模板版本 ${sheet.template_version||sheet.template_review.semantic_version}`:'自定义计分表'});
        if(sheet.parse_status!=='parsed')this.setData({notice:'来源计分表尚待核对，完整原件保存在导入任务中'});
      }catch(e){if(e.statusCode!==404)throw e;this._sheet=null;this.setData({hasSheet:false,sheetRevision:0});}
      if(this._conflict){const pending=offline.read().find(o=>o.operation_id===this._conflict);if(pending&&pending.payload.sheet){this._sheet=extract(pending.payload.sheet);this.setData({hasSheet:true,notice:'正在核对本机计分表。可切换查看服务器原表，确认后填写原因并保存。',reviewingConflict:true});}}
      this.renderSheet();
    }catch(e){this.setData({error:api.message(e)});}finally{this.setData({loading:false});}},
  label(subject){if(!subject)return '待核对的参与者';const play=this.data.play;if(subject.kind==='shared')return '共同得分';const row=subject.kind==='team'?play.teams.find(t=>t.id===subject.team_id):play.players.find(p=>p.id===subject.player_id);return row?(row.name||row.display_name_snapshot):'已移除参与者';},
  renderSheet(){const sheet=this._sheet;if(!sheet)return;const groups=sheet.groups,groupIndex=Math.min(this.data.groupIndex,Math.max(0,groups.length-1)),group=groups[groupIndex];
    const subjects=sheet.subjects.slice(this.data.subjectPage*5,this.data.subjectPage*5+5).map(s=>({...s,label:this.label(s)}));
    const map=new Map(sheet.cells.map(c=>[c.row_key+'|'+c.subject_key,c]));
    const rows=(group?group.rows:[]).slice(this.data.rowPage*20,this.data.rowPage*20+20).map(row=>({...row,optionLabels:['未选择',...(row.options||[]).map(o=>o.label)],
      cells:subjects.map(subject=>{const cell=map.get(row.key+'|'+subject.key)||{};return {...cell,row_key:row.key,subject_key:subject.key,
        input:cell.expression!==null&&cell.expression!==undefined?cell.expression:cell.value_number===null||cell.value_number===undefined?'':String(cell.value_number),
        optionIndex:Math.max(0,(row.options||[]).findIndex(o=>o.key===cell.option_key)+1)};})}));
    this.setData({groupIndex,groupOptions:groups.map(g=>({key:g.key,label:g.label})),rows,subjects,hasMoreRows:!!group&&group.rows.length>(this.data.rowPage+1)*20,
      hasMoreSubjects:sheet.subjects.length>(this.data.subjectPage+1)*5,methodIndex:Math.max(0,METHODS.findIndex(m=>m.value===sheet.scoring_method)),
      totals:sheet.recorded_totals.map(t=>({...t,label:this.label(sheet.subjects.find(s=>s.key===t.subject_key)),display:t.value_number===null?'未齐':t.value_number})),
      legacySheet:sheet.schema_version<2,lockedTemplate:!!sheet.template_id,sheetType:sheet.sheet_type,serverView:!!this._serverView});},
  groupChange(e){this.setData({groupIndex:Number(e.detail.value),rowPage:0});this.renderSheet();},
  pageRows(e){this.setData({rowPage:Math.max(0,this.data.rowPage+Number(e.currentTarget.dataset.step))});this.renderSheet();},
  pageSubjects(e){this.setData({subjectPage:Math.max(0,this.data.subjectPage+Number(e.currentTarget.dataset.step))});this.renderSheet();},
  clearCell(e){const {row,subject}=e.currentTarget.dataset;this.updateCell(row,subject,{});},
  updateCell(rowKey,subjectKey,values){if(!this.data.editable||this._serverView)return;const list=this._sheet.cells.filter(c=>!(c.row_key===rowKey&&c.subject_key===subjectKey));
    list.push({row_key:rowKey,subject_key:subjectKey,...values});this._sheet.cells=list;this.setData({notice:'内容已修改，计算预览后保存'});this.renderSheet();},
  input(e){const {row,subject,kind}=e.currentTarget.dataset;this.updateCell(row,subject,kind==='text'?{value_text:e.detail.value}:{expression:e.detail.value||null});},
  mark(e){const {row,subject,kind}=e.currentTarget.dataset,old=this._sheet.cells.find(c=>c.row_key===row&&c.subject_key===subject);const checked=!(old&&old.checked);
    if(kind==='radio'&&checked)this._sheet.cells=this._sheet.cells.map(c=>c.row_key===row?{...c,checked:false,value_number:null}:c);
    this.updateCell(row,subject,{checked});},
  option(e){const {row,subject}=e.currentTarget.dataset,r=this._sheet.groups.flatMap(g=>g.rows).find(r=>r.key===row),i=Number(e.detail.value);
    this.updateCell(row,subject,{option_key:i?r.options[i-1].key:null});},
  repeat(e){const group=this._sheet.groups[this.data.groupIndex],row=group.rows.find(r=>r.key===e.currentTarget.dataset.key);group.rows.push({...row,key:'repeat:'+api.uuid(),label:row.label.slice(0,230)+'（补记）',repeatable:false,repeat_of:row.key});this.renderSheet();},
  removeRepeat(e){const key=e.currentTarget.dataset.key,group=this._sheet.groups[this.data.groupIndex];group.rows=group.rows.filter(r=>r.key!==key);this._sheet.cells=this._sheet.cells.filter(c=>c.row_key!==key);this.renderSheet();},
  methodChange(e){this._sheet.scoring_method=METHODS[Number(e.detail.value)].value;this.renderSheet();},
  openTemplates(){if(this._serverView)return;this.setData({templateOpen:true,error:''});},closeTemplates(){if(!this.data.saving)this.setData({templateOpen:false});},
  builtin(e){this.setData({builtin:e.currentTarget.dataset.value});},rounds(e){this.setData({roundCount:Number(e.detail.value)||1});},reason(e){this.setData({reason:e.detail.value});},
  async useTemplate(e){if(this.data.saving)return;this.setData({saving:true,error:''});try{
      const templateId=Number(e.currentTarget.dataset.id)||null,body={expected_revision:this.data.playRevision,sheet_revision:this.data.sheetRevision,reason:this.data.reason||null,
        ...(templateId?{template_id:templateId}:{builtin:this.data.builtin,round_count:this.data.roundCount,scoring_method:METHODS[this.data.methodIndex].value})};
      await api.send(`/boardgame-plays/${this.data.id}/scoresheet/from-template`,'POST',body);this.setData({templateOpen:false,groupIndex:0,rowPage:0,subjectPage:0});await this.load();
    }catch(error){this.setData({error:api.message(error)});}finally{this.setData({saving:false});}},
  async preview(){if(this.data.saving||!this._sheet)return;this.setData({saving:true,error:''});try{const r=await api.send(`/boardgame-plays/${this.data.id}/scoresheet/preview`,'POST',
      {expected_revision:this.data.playRevision,sheet_revision:this.data.sheetRevision,sheet:extract(this._sheet)});this._sheet=extract(r.sheet);this.renderSheet();this.setData({notice:'预览已更新，保存后才会计入对局成绩'});
    }catch(error){this.setData({error:api.message(error)});}finally{this.setData({saving:false});}},
  async save(){if(this.data.saving||!this._sheet)return;this.setData({saving:true,error:''});try{const r=await offline.mutate('scoresheet.put',this.data.id,
      {expected_revision:this.data.playRevision,sheet_revision:this.data.sheetRevision,reason:this.data.reason||null,sheet:extract(this._sheet)});
      if(this._conflict){offline.remove(this._conflict);this._conflict=null;this.setData({reviewingConflict:false});}
      if(r.queued)this.setData({notice:'计分表已保存在本机，联网后同步'});else{await this.load();this.setData({notice:'计分表和最终成绩已保存',reason:''});}
    }catch(error){this.setData({error:api.message(error)});}finally{this.setData({saving:false});}},
  customize(){this._sheet.template_id=this._sheet.template_key=this._sheet.template_family=this._sheet.template_version=null;this._sheet.schema_version=2;this._sheet.apply_totals=true;this.setData({notice:'已建立自定义副本，核对计算预览后保存；跨局分项比较需管理员审核结构。'});this.renderSheet();},
  openRow(){this.setData({newRowOpen:true,rowForm:{label:'',value:'1',options:'',repeatable:true,contributes:true},rowKindIndex:0});},closeRow(){this.setData({newRowOpen:false});},
  rowField(e){this.setData({[`rowForm.${e.currentTarget.dataset.key}`]:e.detail.value});},rowKind(e){this.setData({rowKindIndex:Number(e.detail.value)});},
  addRow(){const f=this.data.rowForm,kind=KINDS[this.data.rowKindIndex].value;if(!f.label.trim())return this.setData({error:'请填写计分项名称'});
    const options=kind==='choice'?f.options.split(/[,，\n]/).filter(v=>v.trim()).map((v,i)=>{const parts=v.split(/[:：]/);return {key:`option:${i}`,label:parts[0].trim(),value:parts[1]?parts[1].trim():null};}):[];
    if(kind==='choice'&&(!options.length||options.some(o=>!o.label||o.value===null||o.value===''||!Number.isFinite(Number(o.value)))))return this.setData({error:'每个选项都要填写名称和分值，0 分请明确填 0'});
    if(!this._sheet.groups.length)this._sheet.groups.push({key:api.uuid(),label:'分项',kind:'category',rows:[]});
    const row={key:api.uuid(),label:f.label.trim(),kind,is_aggregate:kind==='subtotal',contributes:kind==='text'?false:!!f.contributes,selection_value:String(f.value===undefined?'1':f.value),options,repeatable:kind==='subtotal'?false:!!f.repeatable,repeat_of:null};
    this._sheet.groups[this.data.groupIndex].rows.push(row);this.setData({newRowOpen:false,error:''});this.renderSheet();},
  addRound(){const number=this._sheet.groups.length+1;this._sheet.groups.push({key:`round:${api.uuid()}`,label:`第 ${number} 轮`,kind:'round',rows:[{key:api.uuid(),label:'得分',kind:'number',is_aggregate:false,contributes:true,selection_value:'1',options:[],repeatable:true,repeat_of:null}]});
    this.setData({groupIndex:number-1,rowPage:0});this.renderSheet();},
  openMaintenance(e){if(!this.data.editable||this._serverView||!this._sheet)return;const kind=e.currentTarget.dataset.kind;if(kind!=='clear'&&!this.data.isAdmin)return;
    this._maintenanceKey=api.uuid();this._newFamily='custom:'+api.uuid();const families=new Map();this.data.templates.forEach(t=>{if(!families.has(t.template_family)||families.get(t.template_family).version_number<t.version_number)families.set(t.template_family,t);});
    const choices=[{label:'建立独立的新模板',family:null,version:1},...[...families.values()].map(t=>({label:`${t.name} · 新增第 ${t.version_number+1} 版`,family:t.template_family,version:t.version_number+1}))];
    const rows=this._sheet.groups.flatMap(g=>g.rows).filter(r=>r.contributes&&!r.is_aggregate&&r.kind!=='text'&&!r.repeat_of).map(r=>({...r,selected:kind==='review'&&!!this._reviewMeta&&(this._reviewMeta.additive_row_keys||[]).includes(r.key)}));
    this.setData({maintenanceOpen:true,maintenanceKind:kind,maintenanceName:this.data.play.game_snapshot.name+'计分表',maintenanceVersion:kind==='review'&&this._reviewMeta?this._reviewMeta.semantic_version:'1',maintenanceReason:'',maintenanceRows:rows,templateChoices:choices,templateChoiceIndex:0,minPlayers:'',maxPlayers:'',error:''});},
  closeMaintenance(){if(!this.data.saving)this.setData({maintenanceOpen:false});},maintenanceField(e){this._maintenanceKey=api.uuid();this.setData({[e.currentTarget.dataset.key]:e.detail.value});},templateChoice(e){this._maintenanceKey=api.uuid();this.setData({templateChoiceIndex:Number(e.detail.value)});},additive(e){this._maintenanceKey=api.uuid();this.setData({maintenanceRows:this.data.maintenanceRows.map(r=>r.key===e.currentTarget.dataset.key?{...r,selected:e.detail.value}:r)});},
  async saveMaintenance(){if(this.data.saving)return;this.setData({saving:true,error:''});try{const d=this.data,kind=d.maintenanceKind,reason=d.maintenanceReason.trim(),root=`/boardgame-plays/${d.id}/scoresheet`;
    if(kind!=='template'&&!reason)throw new Error('请填写核对原因');
    if(kind==='clear')await api.send(root+api.query({expected_revision:d.playRevision,sheet_revision:d.sheetRevision,reason}),'DELETE');
    else{if(JSON.stringify(this._sheet)!==JSON.stringify(this._original))throw new Error('请先保存本局计分表，再维护已保存的结构');const additive=['best_round','rounds_won'].includes(this._sheet.scoring_method)?[]:d.maintenanceRows.filter(r=>r.selected).map(r=>r.key);if(!d.maintenanceVersion.trim())throw new Error('请填写规则版本名称');
      if(kind==='review'){if(JSON.stringify(this._sheet)!==JSON.stringify(this._original))throw new Error('请先保存本局计分表，再审核已保存的结构');await api.send(root+'/review-template','POST',{expected_revision:d.playRevision,sheet_revision:d.sheetRevision,semantic_version:d.maintenanceVersion.trim(),additive_row_keys:additive,reason},this._maintenanceKey);}
      else{if(!d.maintenanceName.trim())throw new Error('请填写模板名称');const selected=d.templateChoices[d.templateChoiceIndex],definition=extract(this._sheet);definition.subjects=[];definition.cells=[];definition.recorded_totals=[];definition.template_id=null;definition.template_key=null;definition.template_family=null;definition.template_version=null;definition.schema_version=2;definition.groups=definition.groups.map(g=>({...g,rows:g.rows.filter(r=>!r.repeat_of)}));
        await api.send('/boardgame-score-templates','POST',{game_id:d.play.game_id,name:d.maintenanceName.trim(),template_family:selected.family||this._newFamily,version_number:selected.version,semantic_version:d.maintenanceVersion.trim(),definition,additive_row_keys:additive,selection:{expansion_ids:d.play.expansions.map(e=>e.expansion_game_id),variant_key:d.play.rules_snapshot.variant_key||'',mode:d.play.competition_mode,min_players:d.minPlayers===''?null:Number(d.minPlayers),max_players:d.maxPlayers===''?null:Number(d.maxPlayers)}},this._maintenanceKey);}}
    this.setData({maintenanceOpen:false});await this.load();this.setData({notice:kind==='clear'?'计分表已移除，最终成绩保留，可回到对局中更正':kind==='review'?'已审核计分结构，可按规则进行跨局比较':'已保存独立模板版本，可从模板列表选用'});
  }catch(e){this.setData({error:api.message(e)});}finally{this.setData({saving:false});}},
  toggleServer(){if(!this._original)return;if(this._serverView){this._sheet=this._localReview;this._serverView=false;}else{this._localReview=this._sheet;this._sheet=this._original;this._serverView=true;}this.setData({groupIndex:0,rowPage:0,subjectPage:0});this.renderSheet();}
});
