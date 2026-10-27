const {getBottomContentInsetRpx} = require('../../utils/safeArea');
const api = require('../../services/boardgames');

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
function dateLabel(iso) {
  const d = new Date(String(iso || '').replace(/-/g, '/'));
  if (Number.isNaN(d.getTime())) return iso || '';
  return `${d.getMonth() + 1}月${String(d.getDate()).padStart(2, '0')}日 · ${WEEKDAYS[d.getDay()]}`;
}
function scoreDisplay(value) {
  if (value === null || value === undefined || value === '') return '未记分';
  const n = Number(value);
  return `${Number.isInteger(n) ? n : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')} 分`;
}

Page({
  data: {
    footerPaddingRpx: null,
    id: null, gameName: '', scope: 'all',
    tabs: [{key: 'all', label: '全部'}, {key: 'mine', label: '我参与的'}, {key: 'won', label: '我获胜的'}],
    items: [], cursor: null, loading: false, error: '',
    statusBarHeight: 0, navHeight: 44, deleteId: null, deleting: false,
  },
  onLoad(options) {
    this.onResize();
    this._generation = 0;
    this.setData({ id: Number(options.id), gameName: decodeURIComponent(options.name || '') });
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const capsule = wx.getMenuButtonBoundingClientRect();
      this.setData({ statusBarHeight: info.statusBarHeight || 0,
        navHeight: capsule.top && capsule.height ? (capsule.top - info.statusBarHeight) * 2 + capsule.height : 44 });
    } catch (_) {}
  },
  onShow() { this.load(); },
  onResize() { if (this.renderer === 'webview') this.setData({footerPaddingRpx: getBottomContentInsetRpx()}); },
  onUnload() { this._dead = true; this._generation++; },
  current(generation) { return !this._dead && generation === this._generation; },
  goBack() { if (getCurrentPages().length > 1) wx.navigateBack(); else wx.redirectTo({ url: '/pages/boardgame_library/boardgame_library' }); },
  noop() {},
  chooseScope(e) {
    const key = e.currentTarget.dataset.key;
    if (key && key !== this.data.scope) { this.setData({ scope: key }); this.load(); }
  },
  async load(more = false) {
    if (more && (!this.data.cursor || this.data.loading)) return;
    const generation = ++this._generation;
    this.setData({ loading: true, error: '' });
    try {
      const result = await api.get('/boardgame-plays', {
        game_id: this.data.id, scope: this.data.scope, limit: 20,
        cursor: more ? this.data.cursor : null });
      if (!this.current(generation)) return;
      const items = (result.items || []).map(p => ({ ...p, dateLabel: dateLabel(p.played_on),
        expLabel: (p.expansions && p.expansions.length)
          ? '扩展 · ' + p.expansions.map(e => e.chinese_name || e.name).join('、')
          : '仅基础',
        players: (p.players || []).map(pl => ({ ...pl, scoreDisplay: scoreDisplay(pl.score) })) }));
      this.setData({ items: more ? [...this.data.items, ...items] : items, cursor: result.next_cursor || null });
    } catch (error) {
      if (this.current(generation)) this.setData({ error: api.message(error) });
    } finally {
      if (this.current(generation)) this.setData({ loading: false });
    }
  },
  loadMore() { this.load(true); },
  recordPlay() {
    wx.navigateTo({ url: `/pages/boardgame_scoresheet/boardgame_scoresheet?gameId=${this.data.id}&name=${encodeURIComponent(this.data.gameName)}` });
  },
  editPlay(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/boardgame_scoresheet/boardgame_scoresheet?gameId=${this.data.id}&name=${encodeURIComponent(this.data.gameName)}&playId=${id}` });
  },
  askDeletePlay(e) { this.setData({ deleteId: Number(e.currentTarget.dataset.id) }); },
  cancelDelete() { if (!this.data.deleting) this.setData({ deleteId: null }); },
  async confirmDelete() {
    const id = this.data.deleteId;
    if (!id || this.data.deleting) return;
    this.setData({ deleting: true });
    try {
      await api.send(`/boardgame-plays/${id}`, 'DELETE');
      if (this._dead) return;
      this.setData({ deleteId: null });
      wx.showToast({ title: '已删除', icon: 'success' });
      this.load();
    } catch (error) {
      if (!this._dead) {
        this.setData({ deleteId: null });
        wx.showToast({ title: api.message(error), icon: 'none' });
      }
    } finally { if (!this._dead) this.setData({ deleting: false }); }
  },
});
