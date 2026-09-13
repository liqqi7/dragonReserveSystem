const api = require('../services/boardgames');
const MODES = [{value:'individual',label:'个人竞赛'},{value:'team',label:'团队竞赛'},{value:'cooperative',label:'合作'},
  {value:'solo',label:'单人'},{value:'unscored',label:'不计胜负'}];
const STATUSES = [{value:'unrecorded',label:'未填写'},{value:'recorded',label:'已记分'},{value:'gave_up',label:'摆烂不算分了'},
  {value:'unfinished',label:'没开完'},{value:'table_flip',label:'掀桌了'}];
function pick(source, keys) { const out={};keys.forEach(k=>{if(source[k]!==undefined)out[k]=source[k];});return out; }
function member(user, order) { return {user_id:Number(user.user_id||user.id),display_name:user.nickname,avatar_url:user.avatar_url||null,seat_order:order,
  score:null,score_status:'unrecorded',rank:null,outcome:null,team_key:null,is_start_player:false,is_new_to_player:null,role_label:null,participant_kind:'human'}; }
function initial(game, user, activityId, planId) {
  const rules=game.default_rules||{};
  const form={game_id:game.id,activity_id:activityId||null,plan_id:planId||null,inventory_id:null,played_on:api.today(),started_at:null,
    duration_minutes:null,round_count:null,location_id:null,location_label:null,play_environment:'offline',status:'draft',
    competition_mode:rules.competition_mode||'individual',score_direction:rules.score_direction||'high',result_status:'unknown',
    result_source:'auto',result_reason:null,tie_policy:'shared_win',shared_score:null,shared_score_status:'unrecorded',cooperative_result:null,
    rules_snapshot:{variant_key:rules.variant_key||'',rules_version:rules.rules_version||'1'},note:null,players:user?[member(user,1)]:[],
    teams:[],observers:[],expansions:[],stats_exclusion:'none',exclusion_reason:null,end_reason:null};
  return form.competition_mode==='team'?changeMode(form,'team'):form;
}
function fromDetail(play) {
  const out=pick(play,['game_id','activity_id','plan_id','inventory_id','played_on','duration_minutes','round_count','location_id',
    'location_label','play_environment','status','competition_mode','score_direction','result_status','result_source','result_reason','tie_policy',
    'shared_score','shared_score_status','cooperative_result','note','stats_exclusion','exclusion_reason','end_reason']);
  out.started_at=play.started_at ? /(?:Z|[+-]\d{2}:\d{2})$/.test(play.started_at)?play.started_at:`${play.started_at}+08:00` : null;
  out.ruleset_id=(play.rules_snapshot||{}).ruleset_id||null;
  out.rules_snapshot=pick(play.rules_snapshot||{},['variant_key','rules_version','competition_mode','score_direction']);
  out.players=play.players.map(p=>({ ...pick(p,['id','guest_key','seat_order','score','score_status','rank','outcome','is_start_player',
    'role_label','is_new_to_player','participant_kind']), ...(p.user_id?{user_id:p.user_id}:p.person_id?{person_id:p.person_id}:{}),
    display_name:p.user?p.user.nickname:p.display_name_snapshot,avatar_url:p.user?p.user.avatar_url:null,team_key:p.team_id?String(p.team_id):null}));
  out.teams=play.teams.map(t=>({...pick(t,['id','name','score','score_status','rank','outcome','sort_order']),client_key:String(t.id)}));
  out.observers=(play.observers||[]).map(o=>({...pick(o,['id','person_id','guest_key','observer_role']),display_name:o.display_name_snapshot}));
  out.expansions=play.expansions.map(e=>({...pick(e,['inventory_id','modules_note','compatibility_note','sort_order']),game_id:e.expansion_game_id,game_name:(e.game_snapshot||{}).name||e.game_name||'已选择的扩展'}));
  return out;
}
function decorate(form) {
  form=JSON.parse(JSON.stringify(form));
  form.started_at_label=form.started_at?new Date(new Date(form.started_at).getTime()+8*3600000).toISOString().slice(0,16).replace('T',' '):'';
  form.players.forEach(p=>{p.clientIdentity=p.user_id?`u:${p.user_id}`:p.person_id?`p:${p.person_id}`:`g:${p.guest_key}`;p.statusIndex=Math.max(0,STATUSES.findIndex(s=>s.value===p.score_status));p.newIndex=p.is_new_to_player===null?0:p.is_new_to_player?1:2;
    p.personalStatusIndex=Math.max(0,STATUSES.filter(s=>s.value!=='recorded').findIndex(s=>s.value===p.score_status));p.teamIndex=Math.max(0,form.teams.findIndex(t=>t.client_key===p.team_key));p.resultLabel=p.outcome==='win'?'获胜':p.outcome==='draw'?'平局':p.outcome==='loss'?'未获胜':'结果未知';p.scoreLabel=api.formatScore(p);});
  form.teams.forEach(t=>{t.statusIndex=Math.max(0,STATUSES.findIndex(s=>s.value===t.score_status));t.scoreLabel=api.formatScore(t);});
  return form;
}
function changeMode(form, mode) {
  const out=JSON.parse(JSON.stringify(form));
  out.competition_mode=mode;out.result_status='unknown';out.result_source='auto';out.result_reason=null;
  out.shared_score=null;out.shared_score_status='unrecorded';out.cooperative_result=null;
  out.score_direction=mode==='unscored'?'none':mode==='cooperative'||mode==='solo'?'high':'high';
  out.teams=mode==='team'?[{client_key:api.uuid(),name:'A 队',score:null,score_status:'unrecorded',sort_order:0},
    {client_key:api.uuid(),name:'B 队',score:null,score_status:'unrecorded',sort_order:1}]:[];
  out.players=out.players.map((p,i)=>({...p,score:null,score_status:'unrecorded',rank:null,outcome:null,
    team_key:mode==='team'?out.teams[i%2].client_key:null}));
  // Never silently discard people when choosing solo; the editor asks the user to remove extras.
  return decorate(out);
}
function toPayload(form, status) {
  const out=pick(form,['game_id','activity_id','plan_id','inventory_id','played_on','started_at','duration_minutes','round_count','location_id',
    'location_label','play_environment','competition_mode','score_direction','result_status','result_source','result_reason','tie_policy',
    'shared_score','shared_score_status','cooperative_result','ruleset_id','rules_snapshot','note','stats_exclusion','exclusion_reason','end_reason']);
  out.status=status;
  for(const k of ['duration_minutes','round_count'])out[k]=out[k]===''||out[k]===undefined||out[k]===null?null:Number(out[k]);
  const score=row=>{const value=pick(row,['score','score_status','rank','outcome']);value.score=row.score_status==='recorded'&&row.score!==''&&row.score!==null?String(row.score):null;
    value.rank=['manual_rank','source'].includes(out.result_source)?(row.rank?Number(row.rank):null):null;
    value.outcome=['manual_winner','tiebreak','manual_rank','source'].includes(out.result_source)?row.outcome:null;return value;};
  out.players=form.players.map(p=>({...pick(p,['id','user_id','person_id','guest_key','display_name','participant_kind','seat_order','team_key',
    'is_start_player','role_label','is_new_to_player']),...score(p)}));
  out.teams=form.teams.map(t=>({...pick(t,['id','client_key','name','sort_order']),...score(t)}));
  out.observers=form.observers.map(o=>pick(o,['id','user_id','person_id','guest_key','display_name','observer_role']));
  out.expansions=form.expansions.map(e=>pick(e,['game_id','inventory_id','modules_note','compatibility_note','sort_order']));
  if(out.competition_mode!=='individual')out.players.forEach(p=>{p.score=null;p.rank=null;p.outcome=null;if(p.score_status==='recorded')p.score_status='unrecorded';});
  if(out.competition_mode==='unscored'){out.result_status='unknown';out.result_source='unknown';}
  else if(['individual','team'].includes(out.competition_mode)){
    const units=out.competition_mode==='team'?out.teams:out.players;
    out.result_status=out.result_source==='source'?form.result_status:out.result_source==='manual_rank'?
      (units.length>=2&&units.every(u=>u.score_status==='gave_up'||u.rank!==null)?'resolved':'unknown'):
      out.result_source==='manual_winner'||out.result_source==='tiebreak'?
      (units.some(u=>u.outcome==='win'||u.outcome==='draw')?'resolved':'unknown'):
      (['high','low'].includes(out.score_direction)&&units.length>=2&&units.every(u=>u.score_status==='gave_up'||u.score!==null)?'resolved':'unknown');
  }else out.result_status=out.cooperative_result?'resolved':'unknown';
  out.shared_score=out.shared_score_status==='recorded'&&out.shared_score!==''&&out.shared_score!==null?String(out.shared_score):null;
  if(status==='abandoned'){out.result_status='unknown';out.result_source='unknown';out.cooperative_result=null;out.players.concat(out.teams).forEach(u=>{u.rank=null;u.outcome=null;});out.end_reason=out.end_reason||'unfinished';}
  else out.end_reason=null;
  return out;
}
module.exports={MODES,STATUSES,member,initial,fromDetail,decorate,changeMode,toPayload};
