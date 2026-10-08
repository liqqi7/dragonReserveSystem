const api = require('../../services/boardgames');
const versionView = v => ({...v, languageLabel:v.language_label || (v.languages || []).join(' / '), publisherLabel:(v.publishers || []).join(' / ')});
const boxes = items => items.map(item => ({...item, ownerInitial:(item.owner?.display_name || '？').slice(0,1)}));
Page({
  data:{id:null,game:null,inventory:[],myVersions:[],versionOptions:[],ownerPreview:[],ownerCount:0,
    detailImages:[],detailGalleryPosition:'',galleryLoading:false,galleryError:'',inventoryCursor:null,
    loading:false,error:'',statusBarHeight:0,navHeight:44,inventoryOpen:false,ownerOpen:false,
    selectedVersionId:null,currentVersionId:null,saving:false,formError:'',ownerError:'',ownersLoading:false,descriptionOpen:false},
  onLoad(options) {
    this._account = String(wx.getStorageSync('userId'));
    this._generation = 0;
    this.setData({id:Number(options.id)});
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const capsule = wx.getMenuButtonBoundingClientRect();
      this.setData({statusBarHeight:info.statusBarHeight || 0,
        navHeight:capsule.top && capsule.height ? (capsule.top - info.statusBarHeight)*2 + capsule.height : 44});
    } catch (_) {}
  },
  onShow() { this.load(); },
  onUnload() { this._dead = true; this._generation++; },
  current(generation) { return !this._dead && generation === this._generation && this._account === String(wx.getStorageSync('userId')); },
  async load() {
    if (!this.data.id) return this.setData({error:'桌游不存在'});
    if (this._account !== String(wx.getStorageSync('userId'))) return this.setData({game:null,error:'账号已切换，请重新打开桌游'});
    const generation = ++this._generation;
    this.setData({loading:true,error:''});
    try {
      const game = await api.get(`/boardgames/${this.data.id}`);
      if (!this.current(generation)) return;
      this.setData({game:{...game,bgg_weight_display:Number(game.complexity)>0 ? Number(game.complexity).toFixed(1) : game.bgg_weight_display},
        myVersions:boxes(game.my_versions || []), versionOptions:(game.version_options || []).map(versionView),ownerCount:game.owner_count || 0});
      // Optional photos and owners never delay the saved game data.
      this.loadOwners(false, generation);
      this.loadGallery(generation);
    } catch (error) { if (this.current(generation)) this.setData({error:api.message(error)}); }
    finally { if (this.current(generation)) this.setData({loading:false}); }
  },
  async loadGallery(generation = this._generation) {
    this.setData({galleryLoading:true,galleryError:''});
    try {
      const result = await api.get(`/boardgames/${this.data.id}/images`);
      if (this.current(generation)) this.setData({detailImages:result.items || [],detailGalleryPosition:result.items?.length ? `1 / ${result.items.length}` : ''});
    } catch (_) { if (this.current(generation)) this.setData({galleryError:'实体预览暂未加载成功，点击重试'}); }
    finally { if (this.current(generation)) this.setData({galleryLoading:false}); }
  },
  retryGallery() { this.loadGallery(); },
  async loadOwners(more = false, generation = this._generation) {
    if (more && (!this.data.inventoryCursor || this.data.ownersLoading)) return;
    this.setData({ownersLoading:true,ownerError:''});
    try {
      const result = await api.get('/boardgame-inventory',{game_id:this.data.id,limit:20,cursor:more ? this.data.inventoryCursor : null});
      if (!this.current(generation)) return;
      const inventory = [...(more ? this.data.inventory : []),...boxes(result.items || [])];
      this.setData({inventory,ownerPreview:inventory.slice(0,5),inventoryCursor:result.next_cursor || null});
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
  openOwner() { this.setData({ownerOpen:true}); },
  closeOwner() { this.setData({ownerOpen:false}); },
  openBox() {
    const box=this.data.myVersions[0];
    if (!box) return wx.navigateTo({url:'/pages/boardgame_intake/boardgame_intake'+api.query({name:this.data.game.chinese_name || this.data.game.name})});
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
  }
});
