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
    emptyFiltered: false
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
    this.loadAll();
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
    wx.navigateTo({ url: '/pages/boardgame_intake/boardgame_intake' });
  },

  goBack() {
    if (getCurrentPages().length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/tools/tools' });
  },

  retry() {
    this.loadAll();
  },

  openFilter() { this.setData({filterOpen:true, filterDraft:{...this.data.filterForm}}); },

  closeFilter() {
    this.setData({ filterOpen: false });
  },

  filterField(event) {
    this.setData({ [`filterDraft.${event.currentTarget.dataset.key}`]: event.detail.value });
  },

  applyFilter() {
    const source = this.data.filterDraft;
    const filter = {};
    ['player_count', 'max_minutes', 'min_complexity', 'max_complexity'].forEach(key => {
      if (source[key] !== '' && source[key] !== undefined && source[key] !== null) filter[key] = Number(source[key]);
    });
    this.setData({ filterForm: filter, filterCount: Object.keys(filter).length, filterOpen: false });
    this.loadGames(true);
  },

  resetFilter() {
    this.setData({ filterForm: {}, filterCount: 0, filterOpen: false });
    this.loadGames(true);
  },

  imageError(event) {
    media.imageError.call(this, event);
    if (String(event.currentTarget.dataset.path).startsWith('recentGames')) this.updateRecent(this.data.recentIndex);
  },

  onUnload() {
    clearTimeout(this._searchTimer);
    this._generation = (this._generation || 0) + 1;
  }
});
