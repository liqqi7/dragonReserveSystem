const api=require('../../services/boardgames');const filters=require('../../utils/boardgameFilters');
Component({
  properties:{visible:Boolean,query:Object,kind:{type:String,value:'plays'}},
  data:{dateOpen:false,dateField:'from',dateValue:'',form:{},periods:filters.PERIODS,periodIndex:0,activities:[],people:[],locations:[],tags:[],error:'',search:'',listKind:'',list:[],listCursor:null,listOpen:false,
    modes:['不限','个人竞赛','团队竞赛','合作','单人','不计胜负'],modeIndex:0,environments:['全部','线下','线上','未知'],environmentIndex:0},
  observers:{visible(v){if(v){const now=new Date(),q=this.properties.query||{};this.setData({form:{...q,year:q.year||now.getFullYear(),month:q.month||now.getMonth()+1,quarter:q.quarter||Math.floor(now.getMonth()/3)+1},
    periodIndex:Math.max(0,filters.PERIODS.findIndex(p=>p.value===q.period)),modeIndex:Math.max(0,[null,'individual','team','cooperative','solo','unscored'].indexOf(q.mode)),environmentIndex:Math.max(0,['all','offline','online','unknown'].indexOf(q.environment)),error:''});this.loadLabels();}}},
  methods:{
    async loadLabels(){try{const tags=await api.get('/boardgame-tags',{limit:100});this.setData({tags:tags.items.map(t=>({...t,included:(this.data.form.tag_ids||[]).includes(t.id),excluded:(this.data.form.exclude_tag_ids||[]).includes(t.id)}))});}catch(e){this.setData({error:api.message(e)});}},
    close(){this.triggerEvent('close');},field(e){this.setData({[`form.${e.currentTarget.dataset.key}`]:e.detail.value});},
openDate(e){const key=e.currentTarget.dataset.key;this.setData({dateOpen:true,dateField:key,dateValue:this.data.form[key]||api.today()});},closeDate(){this.setData({dateOpen:false});},dateConfirm(e){this.setData({[`form.${this.data.dateField}`]:e.detail.dateValue,dateOpen:false});},
    period(e){const i=Number(e.detail.value);this.setData({periodIndex:i,'form.period':filters.PERIODS[i].value});},
    mode(e){const i=Number(e.detail.value);this.setData({modeIndex:i,'form.mode':[null,'individual','team','cooperative','solo','unscored'][i]});},
    environment(e){const i=Number(e.detail.value);this.setData({environmentIndex:i,'form.environment':['all','offline','online','unknown'][i]});},
    tag(e){const id=Number(e.currentTarget.dataset.id),exclude=e.currentTarget.dataset.kind==='exclude',key=exclude?'exclude_tag_ids':'tag_ids',other=exclude?'tag_ids':'exclude_tag_ids';let ids=this.data.form[key]||[];ids=ids.includes(id)?ids.filter(i=>i!==id):[...ids,id];this.setData({[`form.${key}`]:ids,[`form.${other}`]:(this.data.form[other]||[]).filter(i=>i!==id)});this.loadLabels();},
    async selectList(e){this.setData({listKind:e.currentTarget.dataset.kind,listOpen:true,list:[],listCursor:null,search:''});await this.searchList();},
    closeList(){this.setData({listOpen:false});},searchInput(e){this.setData({search:e.detail.value});},
    async searchList(e){try{const more=e&&e.currentTarget&&e.currentTarget.dataset.more,path={activity:'/boardgame-stats/activity-options',person:'/boardgame-people',location:'/boardgame-locations'}[this.data.listKind];const q={limit:50};if(more)q.cursor=this.data.listCursor;q.q=this.data.search;const r=await api.get(path,q);const key={activity:'activity_ids',person:'person_ids',location:'location_ids'}[this.data.listKind],ids=this.data.form[key]||[];this.setData({list:(more?[...this.data.list,...r.items]:r.items).map(i=>({...i,selected:ids.includes(i.id)})),listCursor:r.next_cursor});}catch(e){this.setData({error:api.message(e)});}},
    choose(e){const id=Number(e.currentTarget.dataset.id),kind=this.data.listKind,key={activity:'activity_ids',person:'person_ids',location:'location_ids'}[kind],old=this.data.form[key]||[];
      const ids=old.includes(id)?old.filter(v=>v!==id):[...old,id];this.setData({list:this.data.list.map(i=>({...i,selected:ids.includes(i.id)})),[`form.${key}`]:ids,[`form.${kind}_missing`]:null,...(kind==='person'?{'form.person_match':'all'}:{})});},
    clearRelated(){this.setData({'form.activity_ids':[],'form.person_ids':[],'form.location_ids':[],'form.person_match':null});},
    reset(){this.triggerEvent('apply',{query:{scope:this.data.form.scope||'all',period:'all',...(this.data.form.game_id?{game_id:this.data.form.game_id}:{})}});},
    apply(){const q=filters.clean(this.data.form);['year','month','quarter','player_count'].forEach(k=>{if(q[k]!==undefined)q[k]=Number(q[k]);});if(q.period==='custom'&&(!q.from||!q.to||q.from>q.to))return this.setData({error:'请填写有效的起止日期'});this.triggerEvent('apply',{query:q});}
  }
});
