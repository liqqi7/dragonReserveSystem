const base = require('./controller');
// Independent page: retain the proven intake transaction and recovery contract.
Page({
  ...base,
  data: {...base.data, stage:'intro', cameraOpen:false, versionsOpen:false, ownersOpen:false, statusBarHeight:0, navHeight:44},
  onLoad(options = {}) {
    base.onLoad.call(this, options);
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const capsule = wx.getMenuButtonBoundingClientRect();
      this.setData({statusBarHeight:info.statusBarHeight || 0,
        navHeight:capsule.top && capsule.height ? (capsule.top - info.statusBarHeight) * 2 + capsule.height : 44});
    } catch (_) {}
    if (this.data.stage !== 'recover') this.setData({stage:options.name ? 'search' : 'intro', searchFocus:!!options.name});
  },
  openSearch() { if (!this.locked()) this.setData({stage:'search', searchFocus:true, cameraOpen:false}); },
  openCamera() { wx.showToast({title:'子奇正在加班，别催',icon:'none'}); },
  closeCamera() { this.setData({cameraOpen:false}); },
  clearSearch() { this.inputQuery({detail:{value:''}}); },
  inputQuery(e) {
    if (this.locked()) return;
    base.inputQuery.call(this,e);
    this._versionGeneration++;
    this.setData({stage:'search',searchFocus:true,candidate:null,selectedVersion:null,selection:null,versionLoading:false});
  },
  async applyPreview(preview, generation) {
    if (!this.current(generation)) return;
    base.applyPreview.call(this, preview, generation);
    const first = this.data.results.find(item => item.detail_state === 'ready');
    if (this.data.stage === 'search' && preview.state === 'ready' && first && first.detail_state === 'ready') {
      await this.chooseCandidate({currentTarget:{dataset:{id:first.bgg_id}}});
    }
  },
  async chooseCandidate(e) {
    if (this.locked()) return;
    const item=this.data.results.find(i=>i.bgg_id===Number(e.currentTarget.dataset.id));
    if (!item || item.detail_state!=='ready' || !this.data.preview || this.data.preview.state!=='ready') return;
    // A second candidate can be chosen while the first one's detail is in flight.
    this._generation++; this._versionGeneration++; clearTimeout(this._poll);
    this.setData({versionLoading:false, versionsOpen:false, preparing:false});
    await base.chooseCandidate.call(this,e);
  },
  openVersions() { if (!this.locked()) this.setData({versionsOpen:true}); },
  closeVersions() { this.setData({versionsOpen:false}); },
  openOwners() { if (this.data.candidate && this.data.candidate.owner_count) this.setData({ownersOpen:true}); },
  closeOwners() { this.setData({ownersOpen:false}); },
  chooseVersion(e) {
    if (this.locked() || (this.data.candidate && this.data.candidate.owned_by_actor)) return;
    const id = Number(e.currentTarget.dataset.id);
    const version = this.data.versions.find(v => v.bgg_version_id === id);
    if (!version) return;
    this.dirty();
    this.closeVersions();
    this.setData({selection:String(id), selectedVersion:version});
  },
  unspecifiedVersion() {
    if (this.locked() || (this.data.candidate && this.data.candidate.owned_by_actor)) return;
    this.dirty();
    this.closeVersions();
    this.setData({selection:'unspecified', selectedVersion:null});
  },
  goBack() {
    if (this.locked()) return wx.showToast({title:'请先确认本次保存结果',icon:'none'});
    if (this.data.stage==='intro' || this.data.stage==='success') {
      if (getCurrentPages().length>1) wx.navigateBack();
      else wx.redirectTo({url:'/pages/boardgame_library/boardgame_library'});
    } else if (this.data.stage==='search' || this.data.stage==='version') {
      this._versionGeneration++;
      this.newEntry();
      this.setData({versionLoading:false});
    } else base.back.call(this);
  },
  newEntry() { base.newEntry.call(this); this.setData({stage:'intro',searchFocus:false,versionsOpen:false,ownersOpen:false}); }
});
