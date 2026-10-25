const api = require('../../services/boardgames');
const versionView = v => ({...v, languageLabel:v.language_label || (v.languages || []).join(' / '), publisherLabel:(v.publishers || []).join(' / ')});
const boxes = items => items.map(item => ({...item, ownerInitial:(item.owner?.display_name || '？').slice(0,1)}));
const owners = items => {
  const unique = new Map();
  for (const item of items) {
    const key = `${item.owner?.type || 'member'}:${item.owner?.id || item.owner?.display_name || item.id}`;
    if (!unique.has(key) || Number(item.id) > Number(unique.get(key).id)) unique.set(key, item);
  }
  return Array.from(unique.values());
};
Page({
  data:{id:null,game:null,inventory:[],myVersions:[],versionOptions:[],ownerRows:[],ownerPreview:[],ownerCount:0,
    detailImages:[],detailGalleryPosition:'',galleryLoading:false,galleryError:'',inventoryCursor:null,
    loading:false,error:'',statusBarHeight:0,navHeight:44,inventoryOpen:false,ownerOpen:false,expansionsOpen:false,expansionOptions:[],expSaving:false,expError:'',
    selectedVersionId:null,currentVersionId:null,saving:false,formError:'',ownerError:'',ownersLoading:false,descriptionOpen:false,ownerAccess:false,deleteDialogOpen:false,deleteSoleOwner:false,deleting:false,deleteDone:false},
  onLoad(options) {
    this._account = String(wx.getStorageSync('userId'));
    this._generation = 0;
    const role = String(wx.getStorageSync('userRole') || '');
    this._member = !!wx.getStorageSync('isAuthenticated') && ['user','admin'].includes(role);
    this.setData({ownerAccess:this._member});
    this.setData({id:Number(options.id)});
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const capsule = wx.getMenuButtonBoundingClientRect();
      this.setData({statusBarHeight:info.statusBarHeight || 0,
        navHeight:capsule.top && capsule.height ? (capsule.top - info.statusBarHeight)*2 + capsule.height : 44});
    } catch (_) {}
  },
  openExpansions() {
    if (!this.data.game || !this.data.game.expansions) return;
    this.setData({expansionOptions:(this.data.game.expansions || []).map(e => ({...e, checked: !!e.owned_by_actor})), expError:'', expansionsOpen:true});
  },
  closeExpansions() { this.setData({expansionsOpen:false}); },
  toggleExpansion(e) {
    if (!this.data.ownerAccess) return;
    const id = Number(e.currentTarget.dataset.id);
    const target = this.data.expansionOptions.find(o => o.id === id);
    if (!target) return;  // 全集可勾：勾选=改为已拥有，取消=我没有
    
    this.setData({expansionOptions:this.data.expansionOptions.map(o => o.id === id ? {...o, checked:!o.checked} : o)});
  },
  async saveExpansions() {
    if (this.data.expSaving || !this.data.ownerAccess) return;
    const generation = this._generation;
    this.setData({expSaving:true, expError:''});
    try {
      const ids = this.data.expansionOptions.filter(o => o.checked).map(o => o.bgg_id);
      const result = await api.send(`/boardgames/${this.data.id}/my-expansions`, 'PUT', {expansion_game_ids: ids});
      if (!this.current(generation)) return;
      this.setData({game:{...this.data.game, expansions:((result && result.items) || [])}, expansionsOpen:false});
      wx.showToast({title:'更换成功', icon:'success'});
    } catch (error) {
      if (this.current(generation)) this.setData({expError:api.message(error)});
      if (error && (error.statusCode === 404 || error.statusCode === 409)) this.load();
    } finally {
      if (this.current(generation)) this.setData({expSaving:false});
    }
  },
  onShow() { this.load(); },
  onUnload() { this._dead = true; this._generation++; },
  current(generation) { return !this._dead && generation === this._generation && this._account === String(wx.getStorageSync('userId')); },
  async load() {
    if (!this.data.id) return this.setData({error:'桌游不存在'});
    if (this._account !== String(wx.getStorageSync('userId'))) return this.setData({game:null,error:'账号已切换，请重新打开桌游'});
    const generation = ++this._generation;
    this.setData({loading:true,error:'',detailImages:[],descriptionOpen:false});
    try {
      const game = await api.get(`/boardgames/${this.data.id}`);
      if (!this.current(generation)) return;
      this._hasMyVersions = Array.isArray(game.my_versions);
      this.setData({game:{...game,bgg_weight_display:Number(game.complexity)>0 ? Number(game.complexity).toFixed(1) : game.bgg_weight_display},
        myVersions:boxes(game.my_versions || []), versionOptions:(game.version_options || []).map(versionView),
        inventory:[],ownerRows:[],ownerPreview:[],inventoryCursor:null,ownerCount:Number(game.owner_count) || 0});
      // Optional photos and owners never delay the saved game data.
      if (this._member) this.loadOwners(false, generation);
      this.loadGallery(generation);
    } catch (error) { if (this.current(generation)) this.setData({game:null,myVersions:[],inventory:[],ownerRows:[],ownerPreview:[],ownerCount:0,error:api.message(error)}); }
    finally { if (this.current(generation)) this.setData({loading:false}); }
  },
  async loadGallery(generation = this._generation) {
    this.setData({galleryLoading:true,galleryError:''});
    try {
      const result = await api.get(`/boardgames/${this.data.id}/images`);
      if (this.current(generation)) this.setData({detailImages:result.items || [],detailGalleryPosition:result.items?.length ? `1 / ${result.items.length}` : ''});
    } catch (_) { if (this.current(generation)) this.setData({detailImages:[],detailGalleryPosition:'',galleryError:'实体预览暂未加载成功'}); }
    finally { if (this.current(generation)) this.setData({galleryLoading:false}); }
  },
  retryGallery() { this.loadGallery(); },
  async loadOwners(more = false, generation = this._generation) {
    if (more && (!this.data.inventoryCursor || this.data.ownersLoading)) return;
    this.setData({ownersLoading:true,ownerError:''});
    try {
      const result = await api.get('/boardgame-inventory',{game_id:this.data.id,limit:20,cursor:more ? this.data.inventoryCursor : null});
      if (!this.current(generation)) return;
      const inventory = [...(more ? this.data.inventory : []),...boxes(result.items || [])].filter(item=>item.status !== 'retired' && !item.archived_at);
      const ownerRows = owners(inventory);
      const update = {inventory,ownerRows,ownerPreview:ownerRows.slice(0,5),
        ownerCount:Math.max(Number(this.data.game?.owner_count) || 0,ownerRows.length),inventoryCursor:result.next_cursor || null};
      // Older local APIs omit my_versions; use real ownership records until they are updated.
      if (!this._hasMyVersions) update.myVersions = inventory.filter(item=>String(item.owner?.id) === this._account).sort((a,b)=>Number(b.id)-Number(a.id));
      this.setData(update);
    } catch (error) { if (this.current(generation)) this.setData({ownerError:api.message(error)}); }
    finally { if (this.current(generation)) this.setData({ownersLoading:false}); }
  },
  moreOwners() { this.loadOwners(true); },
  retryOwners() { this.loadOwners(false); },
  goBack() { if (getCurrentPages().length>1) wx.navigateBack(); else wx.redirectTo({url:'/pages/boardgame_library/boardgame_library'}); },
  galleryChanged(e) { this.setData({detailGalleryPosition:`${Number(e.detail.current)+1} / ${this.data.detailImages.length}`}); },
  previewImage(e) { const i=Number(e.currentTarget.dataset.index); const urls=this.data.detailImages.map(item=>item.full_url || item.url); wx.previewImage({current:urls[i],urls}); },
  imageError() { this.setData({'game.cover_url':null}); },
  toggleDescription() { this.setData({descriptionOpen:!this.data.descriptionOpen}); },
  openOwner() {
    if (!this._member) {
      const app = getApp();
      app.globalData.pendingCreateAccessAction = wx.getStorageSync('accessToken') ? 'permission' : 'login';
      wx.switchTab({url:'/pages/profile/profile'});
      return;
    }
    this.setData({ownerOpen:true});
  },
  closeOwner() { this.setData({ownerOpen:false}); },
  openBox() {
    const box=this.data.myVersions[0];
    if (!box) return;
    this.setData({inventoryOpen:true,currentVersionId:box.bgg_version_id,selectedVersionId:box.bgg_version_id,formError:''});
  },
  closeBox() { if (!this.data.saving) this.setData({inventoryOpen:false}); },
  chooseDetailVersion(e) {
    if (this.data.saving) return;
    const id=Number(e.currentTarget.dataset.id);
    if (this.data.versionOptions.some(v=>v.bgg_version_id===id)) this.setData({selectedVersionId:id,formError:''});
  },
  async changeDetailVersion() {
    const box=this.data.myVersions[0], id=this.data.selectedVersionId, generation=this._generation;
    if (!box || this.data.saving || !id || id===this.data.currentVersionId) return;
    this.setData({saving:true,formError:''});
    try {
      const result=await api.send(`/boardgame-inventory/${box.id}/version`,'PUT',{expected_revision:box.revision,bgg_version_id:id});
      if (!this.current(generation)) return;
      this.setData({myVersions:boxes([result]),currentVersionId:id,inventoryOpen:false});
      this.loadOwners(false,generation);
    } catch (error) {
      if (this.current(generation)) {
        this.setData({formError:api.message(error)});
        if (error.statusCode===409) {
          try { const latest=await api.get(`/boardgame-inventory/${box.id}`); if(this.current(generation)) this.setData({myVersions:boxes([latest]),currentVersionId:latest.bgg_version_id}); } catch (_) {}
        }
      }
    } finally { if(this.current(generation)) this.setData({saving:false}); }
  },
  noop() {},
  recordPlay() {
    if (!this.data.id) return;
    wx.navigateTo({url:`/pages/boardgame_plays/boardgame_plays?id=${this.data.id}&name=${encodeURIComponent(this.data.game?.chinese_name || this.data.game?.name || '')}`});
  },
  openDeleteDialog() {
    if (!this.data.myVersions.length || this.data.deleting) return;
    this.setData({deleteDialogOpen:true, deleteSoleOwner:Number(this.data.ownerCount) <= 1});
  },
  closeDeleteDialog() { if (!this.data.deleting) this.setData({deleteDialogOpen:false}); },
  async confirmDelete() {
    const box = this.data.myVersions[0], generation = this._generation;
    if (!box || this.data.deleting) return;
    this.setData({deleting:true});
    try {
      await api.send(`/boardgame-inventory/${box.id}`, 'DELETE');
      if (!this.current(generation)) return;
      const lib = getCurrentPages().find(p => p.route === 'pages/boardgame_library/boardgame_library');
      if (lib && typeof lib.removeGame === 'function') lib.removeGame(this.data.id);
      this.setData({deleteDialogOpen:false, deleteDone:true});
    } catch (error) {
      if (this.current(generation)) {
        this.setData({deleteDialogOpen:false});
        wx.showToast({title:api.message(error), icon:'none'});
        if (error.statusCode === 404 || error.statusCode === 409) this.load();
      }
    } finally { if (this.current(generation)) this.setData({deleting:false}); }
  },
  goBackLibrary() {
    if (getCurrentPages().length > 1) wx.navigateBack();
    else wx.redirectTo({url:'/pages/boardgame_library/boardgame_library'});
  }
});
