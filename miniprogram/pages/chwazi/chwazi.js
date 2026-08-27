const { getBottomSafeAreaRpx } = require("../../utils/safeArea");
const {
  MAX_TOUCHES,
  PROGRESS_DURATION_MS,
  SELECT_DELAY_MS,
  getTouchId,
  getProgress,
  allProgressComplete,
  getTouchColor
} = require("../../utils/chwazi");

const DESIGN_WIDTH_PX = 390;
const STAGE_HEIGHT_PX = 540;
const TOUCH_DIAMETER_PX = 120;
const INNER_DIAMETER_PX = 82;
const SELECTED_BASE_DIAMETER_PX = 144;
const TICK_MS = 50;

function toRpx(px) {
  return Number((Number(px) * 750 / DESIGN_WIDTH_PX).toFixed(2));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

Page({
  data: {
    status: "idle",
    statusBarHeight: 0,
    bottomSafeAreaRpx: 0,
    pageBackground: "#09090B",
    touches: [],
    tooManyMessage: [
      "iPhone 不支持 5 个以上的触摸",
      "感觉受到了侮辱",
      "",
      "但是我猜这句话应该没人看得到",
      "因为没那么多人玩桌游",
      "都去打羽毛球去了"
    ],
    stageHeightRpx: toRpx(STAGE_HEIGHT_PX)
  },

  onLoad() {
    let statusBarHeight = 0;
    try {
      const info = typeof wx.getWindowInfo === "function" ? wx.getWindowInfo() : wx.getSystemInfoSync();
      statusBarHeight = Number(info.statusBarHeight) || 0;
    } catch (e) {}
    this.setData({
      statusBarHeight,
      bottomSafeAreaRpx: getBottomSafeAreaRpx()
    });
  },

  onReady() {
    this._measureStage();
    this._setTabBarHidden(true);
  },

  onShow() {
    this._setTabBarHidden(true);
  },

  onHide() {
    this._resetGame();
  },

  onUnload() {
    this._setTabBarHidden(false);
    this._resetGame();
  },

  _setTabBarHidden(hidden) {
    if (typeof this.getTabBar !== "function") return;
    const tabBar = this.getTabBar();
    if (tabBar && typeof tabBar.setData === "function") tabBar.setData({ hidden: !!hidden });
  },

  _measureStage() {
    wx.createSelectorQuery()
      .select("#qa-chwazi-stage")
      .boundingClientRect((rect) => {
        if (rect) this._stageRect = rect;
      })
      .exec();
  },

  _getTouchPosition(touch) {
    const rect = this._stageRect;
    const hasClientPosition = touch && Number.isFinite(Number(touch.clientX)) && Number.isFinite(Number(touch.clientY));
    const rawX = hasClientPosition ? Number(touch.clientX) : Number(touch && (touch.x ?? touch.pageX));
    const rawY = hasClientPosition ? Number(touch.clientY) : Number(touch && (touch.y ?? touch.pageY));
    const x = hasClientPosition && rect ? rawX - rect.left : rawX;
    const y = hasClientPosition && rect ? rawY - rect.top : rawY;
    return {
      xPx: clamp(x, TOUCH_DIAMETER_PX / 2, DESIGN_WIDTH_PX - TOUCH_DIAMETER_PX / 2),
      yPx: clamp(y, TOUCH_DIAMETER_PX / 2, STAGE_HEIGHT_PX - TOUCH_DIAMETER_PX / 2)
    };
  },

  _formatTouch(touch, index, previous, now) {
    const id = getTouchId(touch, index);
    const color = previous || getTouchColor(index);
    const startedAt = previous ? previous.startedAt : now;
    const position = this._getTouchPosition(touch);
    const progress = getProgress(startedAt, now, PROGRESS_DURATION_MS);
    return {
      id,
      startedAt,
      xRpx: toRpx(position.xPx),
      yRpx: toRpx(position.yPx),
      leftRpx: toRpx(position.xPx - TOUCH_DIAMETER_PX / 2),
      topRpx: toRpx(position.yPx - TOUCH_DIAMETER_PX / 2),
      innerLeftRpx: toRpx(position.xPx - INNER_DIAMETER_PX / 2),
      innerTopRpx: toRpx(position.yPx - INNER_DIAMETER_PX / 2),
      outerColor: color.outer,
      innerColor: color.inner,
      progress,
      progressDeg: Number((progress * 360).toFixed(1))
    };
  },

  _syncTouches(rawTouches, { allowTooMany = true } = {}) {
    const touches = Array.isArray(rawTouches) ? rawTouches : [];
    if (allowTooMany && touches.length > MAX_TOUCHES) {
      this._enterTooMany();
      return;
    }

    if (this.data.status === "selected") {
      if (!touches.length) this._resetGame();
      return;
    }

    const now = Date.now();
    const previousById = new Map((this.data.touches || []).map((touch) => [String(touch.id), touch]));
    const next = touches.map((touch, index) => {
      const id = getTouchId(touch, index);
      return this._formatTouch(touch, index, previousById.get(id), now);
    });

    this._cancelSelectionIfParticipantsChanged(next);
    if (!next.length) {
      this._resetGame();
      return;
    }

    this.setData({
      status: "touching",
      pageBackground: "#09090B",
      touches: next
    });
    this._startTicker();
    this._maybeScheduleSelection(next);
  },

  _cancelSelectionIfParticipantsChanged(next) {
    if (!this._selectionTimer) return;
    const currentIds = (this.data.touches || []).map((touch) => String(touch.id)).sort().join(",");
    const nextIds = next.map((touch) => String(touch.id)).sort().join(",");
    if (currentIds !== nextIds) this._cancelSelection();
  },

  _startTicker() {
    if (this._ticker) return;
    this._ticker = setInterval(() => this._tick(), TICK_MS);
  },

  _stopTicker() {
    if (this._ticker) clearInterval(this._ticker);
    this._ticker = null;
  },

  _tick() {
    if (this.data.status !== "touching" || !this.data.touches.length) {
      this._stopTicker();
      return;
    }
    const now = Date.now();
    const next = this.data.touches.map((touch) => {
      const progress = getProgress(touch.startedAt, now, PROGRESS_DURATION_MS);
      return { ...touch, progress, progressDeg: Number((progress * 360).toFixed(1)) };
    });
    this.setData({ touches: next });
    this._maybeScheduleSelection(next);
  },

  _maybeScheduleSelection(touches) {
    if (this._selectionTimer || !allProgressComplete(touches)) return;
    this._selectionTimer = setTimeout(() => {
      this._selectionTimer = null;
      if (this.data.status !== "touching" || !allProgressComplete(this.data.touches)) return;
      const winner = this.data.touches[Math.floor(Math.random() * this.data.touches.length)];
      this._showWinner(winner);
    }, SELECT_DELAY_MS);
  },

  _cancelSelection() {
    if (this._selectionTimer) clearTimeout(this._selectionTimer);
    this._selectionTimer = null;
  },

  _showWinner(winner) {
    this._stopTicker();
    this._cancelSelection();
    const centerX = DESIGN_WIDTH_PX / 2;
    const centerY = STAGE_HEIGHT_PX / 2;
    const selected = {
      ...winner,
      xRpx: toRpx(centerX),
      yRpx: toRpx(centerY),
      leftRpx: toRpx(centerX - TOUCH_DIAMETER_PX / 2),
      topRpx: toRpx(centerY - TOUCH_DIAMETER_PX / 2),
      innerLeftRpx: toRpx(centerX - INNER_DIAMETER_PX / 2),
      innerTopRpx: toRpx(centerY - INNER_DIAMETER_PX / 2),
      progress: 1,
      progressDeg: 360
    };
    this.setData({
      status: "selected",
      pageBackground: selected.innerColor,
      touches: [selected]
    });
  },

  _enterTooMany() {
    this._stopTicker();
    this._cancelSelection();
    this.setData({
      status: "tooMany",
      pageBackground: "#09090B",
      touches: []
    });
  },

  _resetGame() {
    this._stopTicker();
    this._cancelSelection();
    if (this.data.status !== "idle" || this.data.touches.length) {
      this.setData({ status: "idle", pageBackground: "#09090B", touches: [] });
    }
  },

  onStageTouchStart(e) {
    this._syncTouches(e && e.touches);
  },

  onStageTouchMove(e) {
    this._syncTouches(e && e.touches);
  },

  onStageTouchEnd(e) {
    this._syncTouches(e && e.touches, { allowTooMany: false });
  },

  onStageTouchCancel(e) {
    this._syncTouches(e && e.touches, { allowTooMany: false });
  },

  onBackTap() {
    wx.navigateBack();
  }
});
