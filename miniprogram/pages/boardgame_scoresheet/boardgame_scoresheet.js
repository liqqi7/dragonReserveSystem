const api = require('../../services/boardgames');

function pad(n) { return n < 10 ? `0${n}` : `${n}`; }
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtPlayedLabel(iso) {
  if (!iso || iso === today()) return '今天';
  const y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7)), d = Number(iso.slice(8, 10));
  return y === Number(today().slice(0, 4)) ? `${m}.${d}` : `${y}.${m}.${d}`;
}
function confirmLabel(iso) {
  return `确定 · ${Number(iso.slice(0, 4))}年${Number(iso.slice(5, 7))}月${Number(iso.slice(8, 10))}日`;
}
function normalizeScore(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n * 100) / 100;
}
function fmtNumber(n) {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
}

const OPERATORS = { '+': 1, '−': 1, '×': 2, '÷': 2 };
function evalExpr(expr) {
  let exp = String(expr || '');
  while (exp && OPERATORS[exp.slice(-1)]) exp = exp.slice(0, -1);
  if (!exp) return null;
  const parts = exp.split(/([+−×÷])/);
  if (!parts.length || !/^-?\d+$/.test(parts[0])) return null;
  const values = [Number(parts[0])];
  const ops = [];
  const apply = () => {
    const op = ops.pop();
    const b = values.pop();
    const a = values.pop();
    if (op === '+') values.push(a + b);
    else if (op === '−') values.push(a - b);
    else if (op === '×') values.push(a * b);
    else { if (b === 0) return false; values.push(a / b); }
    return true;
  };
  for (let i = 1; i < parts.length; i += 2) {
    const op = parts[i];
    const operand = parts[i + 1];
    if (!/^-?\d+$/.test(operand || '')) return null;
    while (ops.length && OPERATORS[ops[ops.length - 1]] >= OPERATORS[op]) {
      if (!apply()) return null;
    }
    ops.push(op);
    values.push(Number(operand));
  }
  while (ops.length) { if (!apply()) return null; }
  return values.length === 1 && Number.isFinite(values[0]) ? values[0] : null;
}

Page({
  data: {
    gameId: null, playId: null, gameName: '', playedOn: '', revision: null,
    players: [], keyword: '', candidates: [], searching: false, expansionOptions: [], expOpen: true, expSummary: '仅基础',
    saving: false, canSave: false, statusBarHeight: 0, navHeight: 44,
    calcOpen: false, calcIndex: null, calcExpr: '', calcResult: '',
    dateLabel: '今天', dateOpen: false, viewYear: 0, viewMonth: 0, pickedISO: '',
    calWeeks: ['日', '一', '二', '三', '四', '五', '六'], calCells: [], calConfirm: '',
    calcRows: [
      [{k: '7', cls: ''}, {k: '8', cls: ''}, {k: '9', cls: ''}, {k: '÷', cls: 'is-op'}],
      [{k: '4', cls: ''}, {k: '5', cls: ''}, {k: '6', cls: ''}, {k: '×', cls: 'is-op'}],
      [{k: '1', cls: ''}, {k: '2', cls: ''}, {k: '3', cls: ''}, {k: '−', cls: 'is-op'}],
      [{k: 'C', cls: 'is-clear'}, {k: '0', cls: ''}, {k: '⌫', cls: ''}, {k: '+', cls: 'is-op'}],
    ],
  },
  onLoad(options) {
    this._generation = 0;
    this._searchTimer = null;
    this.setData({
      gameId: Number(options.gameId), playId: options.playId ? Number(options.playId) : null,
      gameName: decodeURIComponent(options.name || ''), playedOn: today(),
    });
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const capsule = wx.getMenuButtonBoundingClientRect();
      this.setData({ statusBarHeight: info.statusBarHeight || 0,
        navHeight: capsule.top && capsule.height ? (capsule.top - info.statusBarHeight) * 2 + capsule.height : 44 });
    } catch (_) {}
    const myId = Number(wx.getStorageSync('userId')) || null;
    const myName = wx.getStorageSync('userNickname') || '我';
    this.loadExpansions();
    if (this.data.playId) {
      this.loadPlay();
    } else if (myId) {
      this.setData({ players: [this.makePlayer({ id: myId, nickname: myName })] }, this.refreshCanSave);
    }
  },
  onUnload() { this._dead = true; this._generation++; },
  current(generation) { return !this._dead && generation === this._generation; },
  refreshCanSave() {
    this.setData({ canSave: this.data.players.length > 0 &&
      this.data.players.every(p => String(p.scoreText || '').trim() !== '') });
  },
  makePlayer(user) {
    const name = user.nickname || user.display_name || '成员';
    return { user_id: user.id || user.user_id, display_name: name,
      avatar_url: user.avatar_url || '', initial: name.slice(0, 1), scoreText: '' };
  },
  async loadExpansions() {
    if (!this.data.gameId) return;
    const generation = this._generation;
    try {
      const game = await api.get(`/boardgames/${this.data.gameId}`);
      if (!this.current(generation)) return;
      const linkedIds = new Set((this._playExpIds || []));
      const exps = (game.expansions || []).filter(e => e.in_library !== false && e.id);
      const expansionOptions = exps.map(e => ({...e, checked: this.data.playId ? linkedIds.has(e.id) : false }));
      this.setData({ expansionOptions, expSummary: this.expSummaryOf(expansionOptions) });
    } catch (_) {}
  },
  expSummaryOf(options) {
    const names = (options || []).filter(o => o.checked).map(o => o.chinese_name || o.name);
    return names.length ? names.join('、') : '仅基础';
  },
  toggleExpOpen() { this.setData({ expOpen: !this.data.expOpen }); },
  toggleScoreExpansion(e) {
    const index = Number(e.currentTarget.dataset.index);
    const expansionOptions = this.data.expansionOptions.map((o, i) =>
      i === index ? {...o, checked: !o.checked} : o);
    this.setData({ expansionOptions, expSummary: this.expSummaryOf(expansionOptions) });
  },
  async loadPlay() {
    const generation = ++this._generation;
    try {
      const play = await api.get(`/boardgame-plays/${this.data.playId}`);
      if (!this.current(generation)) return;
      this._playExpIds = (play.expansions || []).map(e => e.game_id);
      const expansionOptions = this.data.expansionOptions.map(o => ({...o, checked: this._playExpIds.includes(o.id)}));
      this.setData({
        expansionOptions, expSummary: this.expSummaryOf(expansionOptions),
        playedOn: play.played_on, dateLabel: fmtPlayedLabel(play.played_on), revision: play.revision,
        players: (play.players || []).map(p => ({
          user_id: p.user_id, display_name: p.display_name, avatar_url: p.avatar_url || '',
          initial: (p.display_name || '成').slice(0, 1),
          scoreText: p.score === null || p.score === undefined ? '' : String(Number(p.score)),
        })),
      }, this.refreshCanSave);
    } catch (error) {
      wx.showToast({ title: api.message(error), icon: 'none' });
    }
  },
  goBack() { if (getCurrentPages().length > 1) wx.navigateBack(); },
  removePlayer(e) {
    const index = Number(e.currentTarget.dataset.index);
    const players = this.data.players.slice();
    players.splice(index, 1);
    this.setData({ players }, this.refreshCanSave);
  },
  keywordFocus() { if (this.data.keyword) this.search(this.data.keyword); },
  keywordInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });
    if (this._searchTimer) clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.search(keyword), 250);
  },
  clearKeyword() { this.setData({ keyword: '', candidates: [] }); },
  async search(keyword) {
    const generation = this._generation;
    this.setData({ searching: true });
    try {
      const result = await api.get('/users/search', { q: String(keyword || '').trim(), limit: 10 });
      if (!this.current(generation) || keyword !== this.data.keyword) return;
      const taken = new Set(this.data.players.map(p => p.user_id));
      this.setData({ candidates: (result.items || []).filter(u => !taken.has(u.id))
        .map(u => ({ ...u, initial: (u.nickname || '成').slice(0, 1) })) });
    } catch (_) {
    } finally { if (this.current(generation)) this.setData({ searching: false }); }
  },
  addPlayer(e) {
    const user = this.data.candidates[Number(e.currentTarget.dataset.index)];
    if (!user) return;
    this.setData({ players: [...this.data.players, this.makePlayer(user)], keyword: '', candidates: [] },
      this.refreshCanSave);
  },
  // ---- 日期选择 ----
  openDate() {
    const iso = this.data.playedOn || today();
    this.setData({ dateOpen: true, pickedISO: iso,
      viewYear: Number(iso.slice(0, 4)), viewMonth: Number(iso.slice(5, 7)),
      calConfirm: confirmLabel(iso) });
    this.buildCal();
  },
  closeDate() { this.setData({ dateOpen: false }); },
  buildCal() {
    const y = this.data.viewYear, m = this.data.viewMonth, t = today();
    const first = new Date(y, m - 1, 1).getDay();
    const days = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push({ d: '', iso: '', inMonth: false, selected: false, today: false });
    for (let d = 1; d <= days; d++) {
      const iso = `${y}-${pad(m)}-${pad(d)}`;
      cells.push({ d: String(d), iso, inMonth: true, selected: iso === this.data.pickedISO, today: iso === t });
    }
    while (cells.length % 7) cells.push({ d: '', iso: '', inMonth: false, selected: false, today: false });
    this.setData({ calCells: cells });
  },
  prevMonth() {
    let y = this.data.viewYear, m = this.data.viewMonth - 1;
    if (m < 1) { m = 12; y -= 1; }
    this.setData({ viewYear: y, viewMonth: m }); this.buildCal();
  },
  nextMonth() {
    let y = this.data.viewYear, m = this.data.viewMonth + 1;
    if (m > 12) { m = 1; y += 1; }
    this.setData({ viewYear: y, viewMonth: m }); this.buildCal();
  },
  pickDate(e) {
    const iso = e.currentTarget.dataset.iso;
    if (!iso) return;
    this.setData({ pickedISO: iso, calConfirm: confirmLabel(iso) });
    this.buildCal();
  },
  confirmDate() {
    if (!this.data.pickedISO) return;
    this.setData({ playedOn: this.data.pickedISO, dateLabel: fmtPlayedLabel(this.data.pickedISO), dateOpen: false });
  },
  // ---- 分数计算器抽屉 ----
  noop() {},
  openCalc(e) {
    const index = Number(e.currentTarget.dataset.index);
    const current = this.data.players[index];
    this.setData({ calcOpen: true, calcIndex: index, calcExpr: current.scoreText || '',
      calcResult: current.scoreText || '' });
  },
  closeCalc() { this.setData({ calcOpen: false, calcIndex: null }); },
  pressKey(e) {
    const key = e.currentTarget.dataset.key;
    let expr = this.data.calcExpr;
    if (key === 'C') {
      expr = '';
    } else if (key === '⌫') {
      expr = expr.slice(0, -1);
    } else if (OPERATORS[key]) {
      if (!expr) return;
      while (expr && OPERATORS[expr.slice(-1)]) expr = expr.slice(0, -1);
      expr += key;
    } else {
      if (expr === '0' && !OPERATORS[key]) expr = '';
      expr += key;
    }
    const value = evalExpr(expr);
    this.setData({ calcExpr: expr, calcResult: value === null ? '' : fmtNumber(value) });
  },
  confirmCalc() {
    if (this.data.calcResult === '' || this.data.calcIndex === null) return;
    const index = this.data.calcIndex;
    this.setData({ [`players[${index}].scoreText`]: this.data.calcResult, calcOpen: false, calcIndex: null },
      this.refreshCanSave);
  },
  // ---- 保存 ----
  async save() {
    if (this.data.saving) return;
    if (!this.data.canSave) {
      wx.showToast({ title: this.data.players.length ? '还有玩家没填分数' : '请先添加玩家', icon: 'none' });
      return;
    }
    const players = [];
    for (const p of this.data.players) {
      const score = normalizeScore(p.scoreText);
      if (score === undefined) {
        wx.showToast({ title: '分数格式不对', icon: 'none' });
        return;
      }
      players.push({ user_id: p.user_id, score });
    }
    const generation = this._generation;
    this.setData({ saving: true });
    try {
      const expansion_game_ids = this.data.expansionOptions.filter(o => o.checked).map(o => o.id);
      if (this.data.playId) {
        await api.send(`/boardgame-plays/${this.data.playId}`, 'PATCH',
          { expected_revision: this.data.revision, played_on: this.data.playedOn, players, expansion_game_ids });
      } else {
        await api.send('/boardgame-plays', 'POST',
          { game_id: this.data.gameId, played_on: this.data.playedOn, players, expansion_game_ids });
      }
      if (!this.current(generation)) return;
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => { if (getCurrentPages().length > 1) wx.navigateBack(); }, 600);
    } catch (error) {
      if (this.current(generation)) wx.showToast({ title: api.message(error), icon: 'none' });
    } finally { if (this.current(generation)) this.setData({ saving: false }); }
  },
});