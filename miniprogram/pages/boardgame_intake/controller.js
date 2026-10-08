const api = require('../../services/boardgames');

const blankForm = () => ({name:''});
const pending = state => ['queued','fetching','parsing','retry_wait'].includes(state);
const versionView = v => ({...v, languageLabel:v.language_label || (v.languages || []).join(' / '), publisherLabel:(v.publishers || []).join(' / ')});
const successMeta = game => {
  if (!game) return '资料已同步';
  const parts = [];
  const rating = game.bgg_rating ?? game.rating;
  if (rating !== null && rating !== undefined && rating !== '') parts.push(`BGG ${rating}`);
  if (game.min_players && game.max_players) parts.push(`${game.min_players}–${game.max_players} 人`);
  const complexity = Number(game.complexity);
  if (Number.isFinite(complexity)) parts.push(complexity >= 3.75 ? '重度' : complexity >= 2.5 ? '中度' : '轻度');
  return parts.join('  ·  ') || '资料已同步';
};

module.exports = {
  data: {stage:'search', query:'', searchFocus:false, searched:false, results:[], total:0, offset:0, nextOffset:null,
    searching:false, error:'', preview:null, preparing:false, previewError:'', candidate:null,
    versions:[], versionQuery:'', versionTotal:0, versionNext:null, versionLoading:false,
    versionError:'', descriptionExpanded:false, selection:null, selectedVersion:null, includeInventory:true, source:'bgg',
    form:blankForm(), successMeta:'',
    saving:false, submitUnknown:false, recoveryName:'', formError:'', result:null},

  onLoad(options = {}) {
    this._account = String(wx.getStorageSync('userId'));
    this._generation = 0; this._versionGeneration = 0;
    this.setData({query:options.name || ''});
    this._pendingStorage = 'boardgames:intake:pending:v1:' + this._account;
    const saved = wx.getStorageSync(this._pendingStorage);
    if (saved && typeof saved.key === 'string' && saved.payload && saved.payload.source === 'bgg') {
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
  onUnload() { this._dead = true; this._generation++; this._versionGeneration++; clearTimeout(this._poll); },
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
    this._pollCount = 0;
    clearTimeout(this._poll); this._prepareKey = null;
    this.setData({query:q, searching:true, searched:true, stage:'search', results:[], preview:null,
      error:'', previewError:'', preparing:false, total:0, offset, nextOffset:null,
      candidate:null, selectedVersion:null, selection:null, versions:[], versionLoading:false});
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
      if (this.current(generation)) await this.applyPreview(result, generation);
    } catch (error) { if (this.current(generation)) this.setData({previewError:api.message(error)}); }
    finally { if (this.current(generation)) this.setData({preparing:false}); }
  },
  applyPreview(preview, generation) {
    const byId = new Map(preview.items.map(i => [i.bgg_id, i]));
    this.setData({preview, previewError:preview.state === 'failed' ? 'BGG 资料暂未获取成功，请重试' : '',
      results:this.data.results.map(i => byId.has(i.bgg_id) ? {...i,...byId.get(i.bgg_id)} :
        {...i,detail_state:pending(preview.state) ? 'pending' : 'unavailable'})});
    if (preview.result) { this.setData({result:preview.result, successMeta:successMeta(preview.result.game), stage:'success'}); return; }
    this.schedulePoll(generation);
  },
  schedulePoll(generation) {
    clearTimeout(this._poll);
    if (!this.current(generation) || this._hidden || !this.data.preview || !pending(this.data.preview.state)) return;
    this._pollCount = (this._pollCount || 0) + 1;
    if (this._pollCount > 95) {
      this.setData({previewError:'资料获取超时，请点击重试'});
      return;
    }
    this._poll = setTimeout(() => this.pollPreview(generation), 1000);
  },
  async pollPreview(generation = this._generation) {
    const preview = this.data.preview;
    if (!this.current(generation) || !preview) return;
    try {
      const result = await api.get(`/boardgame-intake-previews/${preview.id}`);
      if (this.current(generation)) await this.applyPreview(result, generation);
    } catch (error) {
      // Stop on a transport error; the visible retry retains the existing preview.
      if (this.current(generation)) this.setData({previewError:api.message(error)});
    }
  },
  async retryPreview() {
    if (this.data.preparing || this.locked()) return;
    const preview = this.data.preview, generation = this._generation;
    if (!preview) return this.prepare(generation);
    if (preview.state !== 'failed') { this._pollCount = 0; this.setData({previewError:''}); return this.pollPreview(generation); }
    this.setData({preparing:true, previewError:''});
    this._pollCount = 0;
    try {
      const result = await api.send(`/boardgame-intake-previews/${preview.id}/retry`, 'POST', {expected_revision:preview.revision});
      if (this.current(generation)) await this.applyPreview(result, generation);
    } catch (error) {
      if (this.current(generation)) { await this.pollPreview(generation); }
    } finally { if (this.current(generation)) this.setData({preparing:false}); }
  },
  async chooseCandidate(e) {
    if (this.locked()) return;
    const candidate = this.data.results.find(i => i.bgg_id === Number(e.currentTarget.dataset.id));
    if (!candidate || candidate.detail_state !== 'ready' || !this.data.preview || this.data.preview.state !== 'ready') return;
    this.dirty();
    this.setData({stage:'version', searchFocus:false, source:'bgg', candidate, versions:[], versionQuery:'', selection:null,
      selectedVersion:null, versionError:'', descriptionExpanded:false,
      form:{...blankForm(), name:candidate.local_game_name || candidate.name}});
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
      // Keep statistics from the preview item when an older/partial detail
      // response does not include them. The detail request must not erase
      // values that were already rendered on the selected result.
      const detailGame = result.game || {};
      const detailStats = detailGame.statistics || detailGame.stats || {};
      const ownerRows = detailGame.owner_details || detailGame.owners || candidate.owner_details || candidate.owners || [];
      const actorOwner = ownerRows.find(owner => owner.id === `member:${this._account}`);
      const actorOwned = detailGame.owned_by_actor === true || !!actorOwner;
      const mergedCandidate = {...candidate, ...detailGame,
        bgg_rating: detailGame.bgg_rating ?? detailGame.rating ?? detailStats.bgg_rating ?? detailStats.rating,
        bgg_rank: detailGame.bgg_rank ?? detailGame.rank ?? detailStats.bgg_rank ?? detailStats.rank,
        complexity: detailGame.complexity ?? detailGame.weight ?? detailStats.complexity ?? detailStats.weight,
        owned_by_actor: actorOwned};
      const ownedVersions = mergedCandidate.owned_versions || [];
      if (mergedCandidate.owned_by_actor && ownedVersions.length) {
        const labels = ownedVersions.map(v => {
          const name = v.display_name || v.name || (v.bgg_version_id ? `BGG 版次 ${v.bgg_version_id}` : '版本未知');
          return `${name}${v.year_published ? ` · ${v.year_published}` : ''}`;
        }).filter(Boolean);
        mergedCandidate.ownedVersionLabel = labels.join('、') || detailGame.owned_version_label || candidate.owned_version_label;
      } else if (mergedCandidate.owned_by_actor && (detailGame.owned_version_label || candidate.owned_version_label)) {
        mergedCandidate.ownedVersionLabel = detailGame.owned_version_label || candidate.owned_version_label;
      } else if (mergedCandidate.owned_by_actor && actorOwner && actorOwner.version_label) {
        mergedCandidate.ownedVersionLabel = actorOwner.version_label;
      }
      ['bgg_rating', 'bgg_rank', 'complexity'].forEach(key => {
        if (mergedCandidate[key] === null || mergedCandidate[key] === undefined || mergedCandidate[key] === '') {
          mergedCandidate[key] = candidate[key];
        }
      });
      this.setData({candidate:{...mergedCandidate, descriptionShort:(detailGame.description || '').slice(0,120)},
        selection:mergedCandidate.owned_by_actor ? (ownedVersions.length ? String(ownedVersions[0].bgg_version_id) : 'unspecified') : this.data.selection,
        selectedVersion:mergedCandidate.owned_by_actor && ownedVersions.length ? ownedVersions[0] : this.data.selectedVersion,
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
  back() { if (!this.locked()) this.newEntry(); },
  payload() {
    if (!this.data.candidate || !this.data.preview) throw new Error('请先选择桌游');
    if (!this.data.selection) throw new Error('请选择桌游版本');
    return {source:'bgg', preview_id:this.data.preview.id, item_id:this.data.candidate.item_id,
      expected_revision:this.data.candidate.revision,
      display_name:this.data.candidate.local_game_id ? null : this.data.form.name.trim(),
      bgg_version_id:this.data.selectedVersion ? this.data.selectedVersion.bgg_version_id : null,
      version_unspecified:this.data.selection === 'unspecified',
      inventory:{owner_type:'member', owner_user_id:Number(this._account), quantity:1}};
  },
  async save() {
    if (this.data.saving || !this.current(this._generation)) return;
    if (this.data.source === 'bgg' && this.data.candidate && this.data.candidate.owned_by_actor) return;
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
      if (this.current(generation)) this.setData({stage:'success',result,successMeta:successMeta(result.game),submitUnknown:false});
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
    this.setData({stage:'search',searchFocus:true,query:'',searched:false,results:[],preview:null,result:null,error:'',previewError:'',
      candidate:null,selection:null,selectedVersion:null,includeInventory:true,searching:false,preparing:false});
  }
};
