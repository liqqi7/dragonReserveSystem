const api = require('../../services/boardgames');
const filters = require('../../utils/boardgameFilters');
const offline = require('../../services/boardgameOffline');
const QUICK = {all:{},mine:{owned:true},unplayed:{owned:true,played:false},wanted:{want_to_play:true}};
Page({...require('../../utils/boardgameMedia'),
  data: {games:[],loading:false,error:'',query:'',quick:'all',cursor:null,hasMore:false,filter:{},filterForm:{},
    moreOpen:false,filterCount:0,filterOpen:false,filterTags:[],savedOpen:false,savedName:'',savedNotice:'',pending:0,
    quickOptions:[{key:'all',label:'全部馆藏'},{key:'mine',label:'我的游戏'},{key:'unplayed',label:'拥有未玩'},{key:'wanted',label:'长期想玩'}]},
  onLoad(options) { if(options.query){const q=filters.load(options);delete q.scope;delete q.period;this.setData({filter:q,query:q.q||''});return;}this.setData({filter:options.owned ? {owned:options.owned === 'true', ...(options.played ? {played:options.played === 'true'}:{})}: {}}); },
  onShow() { this.setData({pending:offline.read().length}); this.reload(); },
  onUnload() { clearTimeout(this._search); this._generation = (this._generation || 0)+1; },
  onPullDownRefresh() { return this.reload().finally(() => wx.stopPullDownRefresh()); },
  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.fetch(false); },
  reload() { return this.fetch(true); },
  async fetch(reset) {
    const generation = reset ? (this._generation = (this._generation || 0)+1) : this._generation;
    this.setData({loading:true,error:''});
    try {
      const result = await api.get('/boardgames', {...this.data.filter, ...QUICK[this.data.quick], q:this.data.query, limit:20,
        cursor:reset ? null : this.data.cursor});
      if (generation !== this._generation) return;
      this.setData({games:reset ? result.items : [...this.data.games,...result.items], cursor:result.next_cursor,hasMore:result.has_more});
    } catch (error) { if (generation === this._generation) this.setData({error:api.message(error)}); }
    finally { if (generation === this._generation) this.setData({loading:false}); }
  },
  onSearch(e) { this.setData({query:e.detail.value}); clearTimeout(this._search); this._search=setTimeout(() => this.reload(),350); },
  onQuick(e) { this.setData({quick:e.currentTarget.dataset.key}); this.reload(); },
  openGame(e) { wx.navigateTo({url:`/pages/boardgame_detail/boardgame_detail?id=${e.currentTarget.dataset.id}`}); },
  openMore(){this.setData({moreOpen:true});},closeMore(){this.setData({moreOpen:false});},
  navigate(e) { this.setData({moreOpen:false});const p=e.currentTarget.dataset.page; wx.navigateTo({url:`/pages/${p}/${p}`}); },
  async openFilter() { this.setData({filterOpen:true,filterForm:{...this.data.filter}});try{const r=await api.get('/boardgame-tags',{limit:100});this.setData({filterTags:r.items});this.markTags();}catch(e){this.setData({error:api.message(e)});} },
  markTags(){this.setData({filterTags:this.data.filterTags.map(t=>({...t,included:(this.data.filterForm.tag_ids||[]).includes(t.id),excluded:(this.data.filterForm.exclude_tag_ids||[]).includes(t.id)}))});},
  tagFilter(e){const id=Number(e.currentTarget.dataset.id),key=e.currentTarget.dataset.exclude?'exclude_tag_ids':'tag_ids',other=key==='tag_ids'?'exclude_tag_ids':'tag_ids',old=this.data.filterForm[key]||[];this.setData({[`filterForm.${key}`]:old.includes(id)?old.filter(x=>x!==id):[...old,id],[`filterForm.${other}`]:(this.data.filterForm[other]||[]).filter(x=>x!==id)});this.markTags();},
  openSaveFilter(){this._filterKey=api.uuid();this.setData({moreOpen:false,savedOpen:true,savedName:'',error:''});},closeSaveFilter(){this.setData({savedOpen:false});},savedName(e){this._filterKey=api.uuid();this.setData({savedName:e.detail.value});},async saveFilter(){try{await api.send('/boardgame-saved-filters','POST',{name:this.data.savedName,target:'games',query:{...this.data.filter,...QUICK[this.data.quick],...(this.data.query?{q:this.data.query}:{})}},this._filterKey);this.setData({savedOpen:false,savedNotice:'已保存，可从我的收藏中再次打开'});}catch(e){this.setData({error:api.message(e)});}},
  closeFilter() { this.setData({filterOpen:false}); },
  filterField(e) { this.setData({[`filterForm.${e.currentTarget.dataset.key}`]:e.detail.value}); },
  applyFilter() {
    const form = this.data.filterForm, filter={...form};
    for (const key of ['player_count','max_minutes','min_complexity','max_complexity','min_rating']) {
      if (form[key] !== '' && form[key] !== undefined && form[key] !== null) filter[key]=Number(form[key]);else delete filter[key];
    }
    this.setData({filter,filterCount:Object.keys(filter).length,filterOpen:false}); this.reload();
  },
  resetFilter() { this.setData({filterForm:{},filter:{},moreOpen:false,filterCount:0,filterOpen:false,filterTags:[],savedOpen:false,savedName:'',savedNotice:'',quick:'all'}); this.reload(); },
  openAdd() { wx.navigateTo({url:'/pages/boardgame_entry/boardgame_entry'}); }
});
