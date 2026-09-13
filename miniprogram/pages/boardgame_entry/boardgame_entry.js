const api = require('../../services/boardgames');

const STATUSES = [
  {value:'unverified', label:'待确认'}, {value:'available', label:'可使用'},
  {value:'borrowed', label:'已借出'}, {value:'unavailable', label:'暂不可用'}, {value:'retired', label:'已退役'}
];
const blankForm = () => ({name:'', aliases:'', game_type:'base', owner_type:'', owner_user_id:null,
  owner_label:'', status:'unverified', available_for_activity:false, quantity:'1', purchased_on:null,
  purchase_price:'', purchase_currency:'CNY', edition_name:'', language:'', remark:''});
const pending = state => ['queued','fetching','parsing','retry_wait'].includes(state);
const versionView = v => ({...v, languageLabel:(v.languages || []).join(' / '), publisherLabel:(v.publishers || []).join(' / ')});

Page({
  data: {stage:'search', query:'', searched:false, results:[], total:0, offset:0, nextOffset:null,
    searching:false, error:'', preview:null, preparing:false, previewError:'', candidate:null,
    versions:[], versionQuery:'', versionTotal:0, versionNext:null, versionLoading:false,
    versionError:'', descriptionExpanded:false, selection:null, selectedVersion:null, includeInventory:true, source:'bgg',
    form:blankForm(), statuses:STATUSES, statusIndex:0, ownerOptions:[], ownerIndex:0,
    memberQuery:'', members:[], memberCursor:null, memberLoading:false, memberError:'',
    saving:false, submitUnknown:false, recoveryName:'', formError:'', dateOpen:false, dateValue:'', result:null},

  onLoad(options = {}) {
    this._account = String(wx.getStorageSync('userId'));
    this._generation = 0; this._versionGeneration = 0; this._memberGeneration = 0;
    const ownerOptions = [{label:'请选择归属', type:''}, {label:'我（当前账号）', type:'member', id:Number(this._account)}];
    if (wx.getStorageSync('userRole') === 'admin') ownerOptions.push(
      {label:'俱乐部', type:'club'}, {label:'其他成员', type:'lookup'}, {label:'其他归属', type:'external'});
    this.setData({ownerOptions, query:options.name || ''});
    this._pendingStorage = 'boardgames:intake:pending:v1:' + this._account;
    const saved = wx.getStorageSync(this._pendingStorage);
    if (saved && typeof saved.key === 'string' && saved.payload && ['bgg','manual'].includes(saved.payload.source)) {
      this._saveKey = saved.key; this._savePayload = saved.payload;
      this.setData({stage:'recover',submitUnknown:true,
        recoveryName:saved.payload.display_name || (saved.payload.game && saved.payload.game.name) || '上次选择的桌游'});
    }
  },
  onShow() {
    this._hidden = false;
    if (String(wx.getStorageSync('userId')) !== this._account) {
      this.onUnload(); this.setData({error:'账号已切换，请重新打开录入页面', stage:'search', results:[], preview:null}); return;
    }
    this.schedulePoll(this._generation);
  },
  onHide() { this._hidden = true; clearTimeout(this._poll); },
  onUnload() { this._dead = true; this._generation++; this._versionGeneration++; this._memberGeneration++; clearTimeout(this._poll); },
  current(generation) { return !this._dead && generation === this._generation && this._account === String(wx.getStorageSync('userId')); },
  locked() { return this.data.saving || this.data.submitUnknown; },
  dirty() { this._saveKey = null; this._savePayload = null; this.setData({formError:''}); },
  inputQuery(e) {
    if (this.locked()) return;
    this._generation++; clearTimeout(this._poll); this._prepareKey = null;
    this.setData({query:e.detail.value, searched:false, searching:false, results:[], preview:null, preparing:false, error:'', previewError:''});
  },
  search() { return this.fetchSearch(0); },
  nextSearch() { if (this.data.nextOffset !== null) return this.fetchSearch(this.data.nextOffset); },
  previousSearch() { return this.fetchSearch(Math.max(0, this.data.offset - 10)); },
  async fetchSearch(offset) {
    if (this.locked() || this.data.searching || this._dead) return;
    const q = this.data.query.trim();
    if (!q) return this.setData({error:'请先输入桌游名称'});
    const generation = ++this._generation;
    clearTimeout(this._poll); this._prepareKey = null;
    this.setData({query:q, searching:true, searched:true, stage:'search', results:[], preview:null,
      error:'', previewError:'', preparing:false, total:0, offset, nextOffset:null});
    try {
      const result = await api.get('/bgg/search', {q, offset, limit:10});
      if (!this.current(generation)) return;
      this.setData({results:result.items.map(i => ({...i, detail_state:'pending'})), total:result.total,
        nextOffset:result.next_offset, searching:false});
      if (result.items.length) await this.prepare(generation);
    } catch (error) { if (this.current(generation)) this.setData({error:api.message(error)}); }
    finally { if (this.current(generation)) this.setData({searching:false}); }
  },
  async prepare(generation = this._generation) {
    if (!this.current(generation) || this.data.preparing || !this.data.results.length) return;
    this._prepareKey = this._prepareKey || api.uuid();
    this.setData({preparing:true, previewError:''});
    try {
      const result = await api.send('/boardgame-intake-previews', 'POST',
        {bgg_ids:this.data.results.map(i => i.bgg_id)}, this._prepareKey);
      if (this.current(generation)) this.applyPreview(result, generation);
    } catch (error) { if (this.current(generation)) this.setData({previewError:api.message(error)}); }
    finally { if (this.current(generation)) this.setData({preparing:false}); }
  },
  applyPreview(preview, generation) {
    const byId = new Map(preview.items.map(i => [i.bgg_id, i]));
    this.setData({preview, previewError:preview.state === 'failed' ? 'BGG 资料暂未获取成功，请重试' : '',
      results:this.data.results.map(i => byId.has(i.bgg_id) ? {...i,...byId.get(i.bgg_id)} :
        {...i,detail_state:pending(preview.state) ? 'pending' : 'unavailable'})});
    if (preview.result) { this.setData({result:preview.result, stage:'success'}); return; }
    this.schedulePoll(generation);
  },
  schedulePoll(generation) {
    clearTimeout(this._poll);
    if (!this.current(generation) || this._hidden || !this.data.preview || !pending(this.data.preview.state)) return;
    this._poll = setTimeout(() => this.pollPreview(generation), 2000);
  },
  async pollPreview(generation = this._generation) {
    const preview = this.data.preview;
    if (!this.current(generation) || !preview) return;
    try {
      const result = await api.get(`/boardgame-intake-previews/${preview.id}`);
      if (this.current(generation)) this.applyPreview(result, generation);
    } catch (error) {
      // Stop on a transport error; the visible retry retains the existing preview.
      if (this.current(generation)) this.setData({previewError:api.message(error)});
    }
  },
  async retryPreview() {
    if (this.data.preparing || this.locked()) return;
    const preview = this.data.preview, generation = this._generation;
    if (!preview) return this.prepare(generation);
    if (preview.state !== 'failed') { this.setData({previewError:''}); return this.pollPreview(generation); }
    this.setData({preparing:true, previewError:''});
    try {
      const result = await api.send(`/boardgame-intake-previews/${preview.id}/retry`, 'POST', {expected_revision:preview.revision});
      if (this.current(generation)) this.applyPreview(result, generation);
    } catch (error) {
      if (this.current(generation)) { await this.pollPreview(generation); }
    } finally { if (this.current(generation)) this.setData({preparing:false}); }
  },
  async chooseCandidate(e) {
    if (this.locked()) return;
    const candidate = this.data.results.find(i => i.bgg_id === Number(e.currentTarget.dataset.id));
    if (!candidate || candidate.detail_state !== 'ready' || !this.data.preview || this.data.preview.state !== 'ready') return;
    this.dirty();
    this.setData({stage:'version', source:'bgg', candidate, versions:[], versionQuery:'', selection:null,
      selectedVersion:null, versionError:'', descriptionExpanded:false,
      form:{...blankForm(), name:candidate.local_game_name || candidate.name}, ownerIndex:0, statusIndex:0});
    await this.fetchVersions(false);
  },
  versionInput(e) {
    if (this.locked()) return;
    this._versionGeneration++;
    this.setData({versionQuery:e.detail.value, versions:[], versionNext:null, versionLoading:false, versionError:''});
  },
  searchVersions() { return this.fetchVersions(false); },
  moreVersions() { if (this.data.versionNext !== null) return this.fetchVersions(true); },
  async fetchVersions(more) {
    if (this.data.versionLoading || !this.data.candidate) return;
    const generation = this._generation, vg = ++this._versionGeneration;
    const preview = this.data.preview, candidate = this.data.candidate;
    this.setData({versionLoading:true, versionError:''});
    try {
      const result = await api.get(`/boardgame-intake-previews/${preview.id}/items/${candidate.item_id}`,
        {q:this.data.versionQuery.trim(), offset:more ? this.data.versionNext : 0, limit:20});
      if (!this.current(generation) || vg !== this._versionGeneration) return;
      this.setData({candidate:{...result.game, descriptionShort:(result.game.description || '').slice(0,120)},
        versions:[...(more ? this.data.versions : []),...result.versions.map(versionView)],
        versionTotal:result.total, versionNext:result.next_offset});
    } catch (error) { if (this.current(generation) && vg === this._versionGeneration) this.setData({versionError:api.message(error)}); }
    finally { if (this.current(generation) && vg === this._versionGeneration) this.setData({versionLoading:false}); }
  },
  chooseVersion(e) {
    if (this.locked()) return;
    const id = Number(e.currentTarget.dataset.id), version = this.data.versions.find(v => v.bgg_version_id === id);
    if (!version) return;
    this.dirty(); this.setData({selection:String(id), selectedVersion:version});
  },
  toggleDescription() { this.setData({descriptionExpanded:!this.data.descriptionExpanded}); },
  imageError(e) {
    const {kind,id} = e.currentTarget.dataset;
    if (kind === 'game' && this.data.candidate) this.setData({'candidate.cover_url':null});
    else if (kind === 'version') this.setData({versions:this.data.versions.map(v => v.bgg_version_id === Number(id) ? {...v,cover_url:null} : v)});
    else this.setData({results:this.data.results.map(i => i.bgg_id === Number(id) ? {...i,cover_url:null} : i)});
  },
  unspecifiedVersion() { if (!this.locked()) { this.dirty(); this.setData({selection:'unspecified', selectedVersion:null}); } },
  toggleInventory(e) {
    if (this.locked()) return;
    this.dirty(); this.setData({includeInventory:e.detail.value});
    if (e.detail.value && this.data.source === 'bgg' && this.data.stage === 'form' && !this.data.selection) this.setData({stage:'version'});
  },
  continueEntry() {
    if (this.locked()) return;
    if (this.data.includeInventory && !this.data.selection) return this.setData({formError:'请选择一个版本，或明确选择“版次未确定”'});
    this.setData({stage:'form', formError:''});
  },
  manualEntry() {
    if (this.locked() || !this.data.searched) return;
    clearTimeout(this._poll); this._generation++; this.dirty();
    this.setData({stage:'form', source:'manual', candidate:null, selectedVersion:null, selection:null,
      form:{...blankForm(),name:this.data.query.trim()}, ownerIndex:0, statusIndex:0});
  },
  back() {
    if (this.locked()) return;
    if (this.data.stage === 'form' && this.data.source === 'bgg') this.setData({stage:'version',formError:''});
    else { this._versionGeneration++; this.setData({stage:'search',versionLoading:false,formError:''}); this.schedulePoll(this._generation); }
  },
  field(e) { if (!this.locked()) { this.dirty(); this.setData({[`form.${e.currentTarget.dataset.key}`]:e.detail.value}); } },
  typeChange(e) { if (!this.locked()) { this.dirty(); this.setData({'form.game_type':e.detail.value ? 'expansion':'base'}); } },
  ownerChange(e) {
    if (this.locked()) return;
    const index = Number(e.detail.value), owner = this.data.ownerOptions[index];
    if (!owner) return;
    this.dirty(); this.setData({ownerIndex:index, 'form.owner_type':owner.type,
      'form.owner_user_id':owner.id || null, 'form.owner_label':'', memberError:''});
  },
  memberInput(e) {
    if (this.locked()) return;
    this._memberGeneration++; this.setData({memberQuery:e.detail.value, members:[], memberCursor:null, memberLoading:false, memberError:''});
  },
  async searchMembers(e) {
    if (this.locked() || this.data.memberLoading) return;
    const more = !!(e && e.currentTarget && e.currentTarget.dataset.more), generation = this._generation, mg = ++this._memberGeneration;
    this.setData({memberLoading:true, memberError:''});
    try {
      const result = await api.get('/boardgame-members', {q:this.data.memberQuery, limit:20, cursor:more ? this.data.memberCursor : null});
      if (this.current(generation) && mg === this._memberGeneration) this.setData({members:[...(more ? this.data.members:[]),...result.items], memberCursor:result.next_cursor});
    } catch (error) { if (this.current(generation) && mg === this._memberGeneration) this.setData({memberError:api.message(error)}); }
    finally { if (this.current(generation) && mg === this._memberGeneration) this.setData({memberLoading:false}); }
  },
  chooseMember(e) {
    if (this.locked()) return;
    const member = this.data.members.find(u => u.id === Number(e.currentTarget.dataset.id));
    if (!member) return;
    const options = this.data.ownerOptions.filter(o => !o.selectedMember);
    options.push({label:member.nickname, type:'member', id:member.id, selectedMember:true});
    this.setData({ownerOptions:options}); this.ownerChange({detail:{value:options.length-1}});
  },
  statusChange(e) {
    if (this.locked()) return;
    const index = Number(e.detail.value); this.dirty();
    this.setData({statusIndex:index, 'form.status':STATUSES[index].value,
      'form.available_for_activity':STATUSES[index].value === 'available' && this.data.form.available_for_activity});
  },
  availabilityChange(e) { if (!this.locked() && this.data.form.status === 'available') { this.dirty(); this.setData({'form.available_for_activity':e.detail.value}); } },
  chooseDate() { if (!this.locked()) this.setData({dateOpen:true,dateValue:this.data.form.purchased_on || api.today()}); },
  closeDate() { this.setData({dateOpen:false}); },
  dateConfirm(e) { if (!this.locked()) { this.dirty(); this.setData({'form.purchased_on':e.detail.dateValue,dateOpen:false}); } },
  clearDate() { if (!this.locked()) { this.dirty(); this.setData({'form.purchased_on':null}); } },
  payload() {
    const f = this.data.form, name = f.name.trim();
    if (!name) throw new Error('请填写桌游名称');
    let inventory = null;
    if (this.data.includeInventory) {
      if (!['member','club','external'].includes(f.owner_type) || (f.owner_type === 'member' && !f.owner_user_id)) throw new Error('请选择这盒游戏的归属');
      if (f.owner_type === 'external' && !f.owner_label.trim()) throw new Error('请填写归属名称');
      const quantity = Number(f.quantity), price = String(f.purchase_price).trim(), currency = f.purchase_currency.trim().toUpperCase();
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error('数量请填写 1–20 之间的整数');
      if (price && !/^\d{1,12}(\.\d{1,2})?$/.test(price)) throw new Error('价格请填写非负数，最多两位小数');
      if (price && !/^[A-Z]{3}$/.test(currency)) throw new Error('请填写三位币种代码，例如 CNY');
      if (f.purchased_on && f.purchased_on > api.today()) throw new Error('购入日期不能晚于今天');
      inventory = {owner_type:f.owner_type, owner_user_id:f.owner_type === 'member' ? f.owner_user_id : null,
        owner_label:f.owner_type === 'external' ? f.owner_label.trim() : null, quantity, status:f.status,
        available_for_activity:f.status === 'available' && f.available_for_activity, purchased_on:f.purchased_on,
        purchase_price:price === '' ? null : price, purchase_currency:price === '' ? null : currency,
        edition_name:this.data.selectedVersion ? null : f.edition_name.trim() || null,
        language:this.data.selectedVersion ? null : f.language.trim() || null, remark:f.remark.trim() || null};
    }
    if (this.data.source === 'manual') return {source:'manual', game:{name,game_type:f.game_type,
      set_overrides:{aliases:f.aliases.split(/[,，\n]/).map(s => s.trim()).filter(Boolean)}}, inventory};
    if (this.data.includeInventory && !this.data.selection) throw new Error('请返回选择版本');
    return {source:'bgg',preview_id:this.data.preview.id,item_id:this.data.candidate.item_id,
      expected_revision:this.data.candidate.revision,display_name:this.data.candidate.local_game_id ? null : name,
      bgg_version_id:inventory && this.data.selectedVersion ? this.data.selectedVersion.bgg_version_id : null,
      version_unspecified:!inventory || this.data.selection === 'unspecified', inventory};
  },
  async save() {
    if (this.data.saving || !this.current(this._generation)) return;
    try { if (!this._savePayload) this._savePayload = this.payload(); }
    catch (error) { this.setData({formError:api.message(error)}); return; }
    this._saveKey = this._saveKey || api.uuid();
    try { wx.setStorageSync(this._pendingStorage, {key:this._saveKey,payload:this._savePayload}); }
    catch (error) { this.setData({formError:'暂时无法保存录入进度，请稍后重试'}); return; }
    const generation = this._generation;
    const wasUncertain = this.data.submitUnknown;
    this.setData({saving:true,formError:''});
    try {
      const result = await api.send('/boardgame-intakes','POST',this._savePayload,this._saveKey);
      this.clearPending();
      if (this.current(generation)) this.setData({stage:'success',result,submitUnknown:false});
    } catch (error) {
      if (this.current(generation)) {
        const needsLogin = wasUncertain && [401,403].includes(error.statusCode);
        const uncertain = !error.statusCode || error.statusCode === 408 || error.statusCode >= 500 || needsLogin;
        if (!uncertain) { this.clearPending(); this._savePayload = null; }
        this.setData({submitUnknown:uncertain,formError:needsLogin ? api.message(error) + '，恢复账号权限后继续确认' :
          uncertain ? '保存结果暂未确认，请点击重试确认录入' : api.message(error)});
      }
    } finally { if (this.current(generation)) this.setData({saving:false}); }
  },
  clearPending() {
    // A late response may belong to an old page/account. Never clear another attempt.
    try {
      const saved = wx.getStorageSync(this._pendingStorage);
      if (saved && saved.key === this._saveKey) wx.removeStorageSync(this._pendingStorage);
    } catch (error) { /* Keeping a successful request is safe: it will replay on reopening. */ }
  },
  viewResult() { if (this.data.result) wx.redirectTo({url:`/pages/boardgame_detail/boardgame_detail?id=${this.data.result.game_id}`}); },
  newEntry() {
    if (this.locked()) return;
    this._generation++; clearTimeout(this._poll); this.dirty(); this._prepareKey = null;
    this.setData({stage:'search',query:'',searched:false,results:[],preview:null,result:null,error:'',previewError:'',
      candidate:null,selection:null,selectedVersion:null,includeInventory:true,searching:false,preparing:false});
  }
});
