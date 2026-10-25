const api = require('../../services/boardgames');
const media = require('../../utils/boardgameMedia');

const PAGE_SIZE = 20;

function rangeText(min, max, suffix) {
  if (!min && !max) return `— ${suffix}`;
  if (min && max && Number(min) !== Number(max)) return `${min}–${max}${suffix}`;
  return `${max || min}${suffix}`;
}

function viewGame(game) {
  const inventory = game.inventory_summary || {};
  return {
    ...game,
    displayPlayers: rangeText(game.min_players, game.max_players, '人'),
    displayTime: rangeText(game.min_playtime_minutes, game.max_playtime_minutes, '分钟'),
    compactTime: rangeText(game.min_playtime_minutes, game.max_playtime_minutes, '分'),
    displayComplexity: Number(game.complexity) > 0 ? (Number(game.complexity) >= 3.75 ? '重度' : Number(game.complexity) >= 2.5 ? '中度' : '轻度') : '暂无',
    weightText: Number(game.complexity) > 0 ? Number(game.complexity).toFixed(1) : '暂无',
    inventoryText: inventory.total ? `${inventory.total} 盒馆藏` : '暂无馆藏',
    tags: (game.mechanic_tags?.length ? game.mechanic_tags : []).slice(0, 4),
    featureTags: (game.mechanic_tags?.length ? game.mechanic_tags : []).slice(0, 2),
    ratingText: Number(game.bgg_rating) > 0 ? Number(game.bgg_rating).toFixed(1) : '',
    imageFailed: false
  };
}

Page({
  data: {
    recentGames: [], recentStack: [], recentIndex:0, recentPosition: '01', recentError:'', statusBarHeight:0, navHeight:44,
    games: [],
    query: '',
    loading: false,
    recentLoading: false,
    error: '',
    cursor: null,
    hasMore: false,
    filterOpen: false,
    filterForm: {},
    filterCount: 0,
    filterTags: [],
    emptyFiltered: false,
    ownerSearch: '',
    ownerResults: [],
    selectedOwners: [],
    appliedOwners: [],
    filterError: ''
  },

  onLoad(options) {
    try {
      const info=wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const capsule=wx.getMenuButtonBoundingClientRect();
      this.setData({statusBarHeight:info.statusBarHeight || 0, navHeight:(capsule.top-info.statusBarHeight)*2+capsule.height || 44});
    } catch (_) {}
    if (options && options.query) this.setData({ query: options.query });
  },

  onShow() {
    // 从详情页返回：页面实例仍在，列表数据与滚动位置原样保留，不再全量重载；
    // 需要刷新用下拉刷新（onPullDownRefresh）。
    if (this.data.games && this.data.games.length) return;
    this.loadAll();
  },

  removeGame(gameId) {
    // 详情页删除后定向移除：不重载列表，保留滚动位置
    const id = Number(gameId);
    this.setData({
      games: this.data.games.filter(g => g.id !== id),
      recentGames: this.data.recentGames.filter(g => g.id !== id),
      recentIndex: 0,
    });
    this.updateRecent(0);
  },
  onPullDownRefresh() {
    return this.loadAll().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadGames(false);
  },

  async loadAll() {
    this._generation = (this._generation || 0) + 1;
    this.setData({ error: '', recentLoading: true, loading: true, cursor: null });
    await Promise.allSettled([this.loadRecent(), this.loadGames(true)]);
  },

  async loadRecent() {
    const generation=this._generation;
    this.setData({recentError:''});
    try {
      const result = await api.get('/boardgames/recent-arrivals', {limit:50});
      if (generation !== this._generation) return;
      this.setData({recentGames:(result.items || []).map(viewGame),recentIndex:0});
      this.updateRecent(0);
    } catch (error) {
      if (generation === this._generation) this.setData({recentGames:[],recentStack:[],recentError:'近期馆藏暂未加载成功'});
    } finally {
      if (generation === this._generation) this.setData({recentLoading:false});
    }
  },
  updateRecent(index) {
    const games=this.data.recentGames, count=games.length;
    if (!count) return;
    const offsets=count >= 5 ? [-2,-1,0,1,2] : count===4 ? [-1,0,1,2] : count===3 ? [-1,0,1] : count===2 ? [0,1] : [0];
    this.setData({recentIndex:index,recentPosition:String(index+1).padStart(2,'0'),
      recentStack:offsets.map(offset=>({...games[(index+offset+count)%count],recentIndex:(index+offset+count)%count,slot:offset+2}))});
  },
  recentChanged(event) { this.updateRecent(Number(event.detail.current)); },
  selectRecent(event) {
    if (Date.now() < (this._coverTapBlockedUntil || 0)) return;
    this.updateRecent(Number(event.currentTarget.dataset.index));
  },
  coverTouchStart(event) {
    this._coverTouch = event.touches.length === 1 ? event.touches[0] : null;
  },
  coverTouchCancel() { this._coverTouch = null; },
  coverTouchEnd(event) {
    const start = this._coverTouch, end = event.changedTouches[0];
    this._coverTouch = null;
    if (!start || !end) return;
    const dx = end.clientX - start.clientX, dy = end.clientY - start.clientY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 12) this._coverTapBlockedUntil = Date.now() + 350;
    const count = this.data.recentGames.length;
    if (count < 2 || Math.abs(dx) < 35 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
    this.updateRecent((this.data.recentIndex + (dx < 0 ? 1 : -1) + count) % count);
  },

  async loadGames(reset) {
    const generation = this._generation, requestId=this._listRequest=(this._listRequest || 0)+1;
    this.setData({ loading: true, error: '' });
    try {
      const playerQuery=this.data.query.trim().match(/^(\d{1,2})\s*人?$/);
      const values = {
        q: playerQuery ? '' : this.data.query,
        limit: PAGE_SIZE,
        cursor: reset ? null : this.data.cursor,
        ...this.data.filterForm,
        ...(playerQuery && Number(playerQuery[1]) > 0 ? {player_count:Number(playerQuery[1])} : {})
      };
      const result = await api.get('/boardgames', values);
      if (generation !== this._generation || requestId !== this._listRequest) return;
      const items = (result.items || []).map(viewGame);
      this.setData({
        games: reset ? items : [...this.data.games, ...items],
        cursor: result.next_cursor || null,
        hasMore: !!result.next_cursor,
        emptyFiltered: reset && !items.length
      });
    } catch (error) {
      if (generation === this._generation && requestId === this._listRequest) this.setData({ error: api.message(error) });
    } finally {
      if (generation === this._generation && requestId === this._listRequest) this.setData({ loading: false });
    }
  },

  onSearch(event) {
    this.setData({ query: event.detail.value || '' });
    this._listRequest=(this._listRequest || 0)+1;
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.loadGames(true), 320);
  },

  submitSearch() {
    clearTimeout(this._searchTimer);
    return this.loadGames(true);
  },

  openGame(event) {
    const id = Number(event && event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.id);
    if (!id) return;
    wx.navigateTo({ url: `/pages/boardgame_detail/boardgame_detail?id=${id}` });
  },

  openEntry() {
    const role = String(wx.getStorageSync('userRole') || '');
    const hasSession = !!wx.getStorageSync('accessToken');
    if (!hasSession || !['user', 'admin'].includes(role)) {
      const app = getApp();
      const type = hasSession ? 'permission' : 'login';
      app.globalData.pendingCreateAccessAction = type;
      wx.switchTab({url:'/pages/profile/profile'});
      return;
    }
    wx.navigateTo({ url: '/pages/boardgame_intake/boardgame_intake' });
  },

  goBack() {
    if (getCurrentPages().length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/tools/tools' });
  },

  retry() {
    this.loadAll();
  },

  openFilter() {
    this.setData({ filterOpen: true, filterDraft: { ...this.data.filterForm },
      selectedOwners: [...this.data.appliedOwners], ownerSearch: '', ownerResults: [], filterError: '' });
  },

  closeFilter() {
    this.setData({ filterOpen: false });
  },

  filterField(event) {
    this.setData({ [`filterDraft.${event.currentTarget.dataset.key}`]: event.detail.value });
  },

  applyFilter() {
    const source = this.data.filterDraft || {};
    const pairs = [['min_players', 'max_players'], ['min_minutes', 'max_minutes'], ['min_complexity', 'max_complexity']];
    const filter = {};
    for (const [lo, hi] of pairs) {
      const rawLo = source[lo], rawHi = source[hi];
      const lov = rawLo === '' || rawLo === undefined || rawLo === null ? null : Number(rawLo);
      const hiv = rawHi === '' || rawHi === undefined || rawHi === null ? null : Number(rawHi);
      if (lov !== null && hiv !== null && lov > hiv) {
        this.setData({ filterError: '区间设置有问题：最小值不能大于最大值' });
        return;
      }
      if (lov !== null) filter[lo] = lov;
      if (hiv !== null) filter[hi] = hiv;
    }
    const owners = this.data.selectedOwners;
    if (owners.length) filter.owner_user_ids = owners.map(o => o.id);
    let count = 0;
    pairs.forEach(([lo, hi]) => { if (filter[lo] !== undefined || filter[hi] !== undefined) count += 1; });
    if (owners.length) count += 1;
    this.setData({ filterForm: filter, appliedOwners: owners, filterCount: count, filterOpen: false, filterError: '' });
    this.loadGames(true);
  },

  resetFilter() {
    this.setData({ filterForm: {}, filterCount: 0, filterOpen: false, filterDraft: {},
      selectedOwners: [], appliedOwners: [], ownerSearch: '', ownerResults: [], filterError: '' });
    this.loadGames(true);
  },

  ownerSearchInput(event) {
    const value = event.detail.value || '';
    this.setData({ ownerSearch: value });
    clearTimeout(this._ownerTimer);
    this._ownerTimer = setTimeout(() => this.fetchOwners(), 300);
  },

  async fetchOwners() {
    try {
      const result = await api.get('/boardgame-owners', { q: this.data.ownerSearch.trim(), limit: 20 });
      const selected = this.data.selectedOwners.map(o => o.id);
      this.setData({ ownerResults: (result.items || []).map(i => ({ ...i, selected: selected.includes(i.id) })) });
    } catch (error) {
      this.setData({ ownerResults: [] });
    }
  },

  clearOwnerSearch() {
    this.setData({ ownerSearch: '', ownerResults: [] });
  },

  toggleOwner(event) {
    const id = Number(event.currentTarget.dataset.id);
    const item = this.data.ownerResults.find(i => i.id === id);
    if (!item) return;
    const exists = this.data.selectedOwners.some(o => o.id === id);
    const selectedOwners = exists
      ? this.data.selectedOwners.filter(o => o.id !== id)
      : [...this.data.selectedOwners, item];
    this.setData({
      selectedOwners,
      ownerResults: this.data.ownerResults.map(i => ({ ...i, selected: selectedOwners.some(o => o.id === i.id) }))
    });
  },

  removeOwner(event) {
    const id = Number(event.currentTarget.dataset.id);
    const selectedOwners = this.data.selectedOwners.filter(o => o.id !== id);
    this.setData({ selectedOwners, ownerResults: this.data.ownerResults.map(i => ({ ...i, selected: selectedOwners.some(o => o.id === i.id) })) });
  },

  imageError(event) {
    media.imageError.call(this, event);
    if (String(event.currentTarget.dataset.path).startsWith('recentGames')) this.updateRecent(this.data.recentIndex);
  },

  onUnload() {
    clearTimeout(this._searchTimer);
    clearTimeout(this._ownerTimer);
    this._generation = (this._generation || 0) + 1;
  }
});
