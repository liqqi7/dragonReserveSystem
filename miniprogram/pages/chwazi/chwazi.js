const { getBottomSafeAreaRpx } = require("../../utils/safeArea");
const {
  MIN_TOUCHES,
  MAX_TOUCHES,
  PROGRESS_DURATION_MS,
  TOO_MANY_DURATION_MS,
  WINNER_TRANSITION_DURATION_MS,
  DESIGN_WIDTH_PX,
  TOUCH_DIAMETER_PX,
  TOUCH_COLORS,
  getTouchId,
  getProgress,
  getTouchColor,
  getAvailableTouchColorIndex,
  getSelectionWaitMs,
  normalizeTouchPosition
} = require("../../utils/chwazi");

const INNER_DIAMETER_PX = 82;
const WINNER_TRANSITION_FALLBACK_MS = WINNER_TRANSITION_DURATION_MS + 120;

function toRpx(px) {
  return Number((Number(px) * 750 / DESIGN_WIDTH_PX).toFixed(2));
}

function getStoredColorIndex(touch) {
  const explicit = Number(touch && touch.colorIndex);
  if (Number.isInteger(explicit) && explicit >= 0 && explicit < TOUCH_COLORS.length) return explicit;
  return TOUCH_COLORS.findIndex((color) => (
    color.outer === (touch && touch.outerColor) && color.inner === (touch && touch.innerColor)
  ));
}

function cloneRawTouches(touches) {
  return (touches || []).map((touch) => ({
    identifier: touch && touch.identifier,
    id: touch && touch.id,
    clientX: touch && touch.clientX,
    clientY: touch && touch.clientY,
    pageX: touch && touch.pageX,
    pageY: touch && touch.pageY,
    x: touch && touch.x,
    y: touch && touch.y
  }));
}

function getParticipantKey(touches) {
  return (touches || []).map((touch) => String(touch.id)).sort().join(",");
}

function getFiniteNumber(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

Page({
  data: {
    status: "idle",
    statusBarHeight: 0,
    bottomSafeAreaRpx: 0,
    pageBackground: "#09090B",
    touches: [],
    winnerTransitioning: false,
    winnerTransitionId: 0,
    winnerRevealOriginXpx: 0,
    winnerRevealOriginYpx: 0,
    winnerTransitionStageTopPx: 0,
    winnerTransitionTouches: [],
    tooManyMessage: " iPhone 不支持 5 个以上的触摸\n感觉受到了侮辱\n\n但是我猜这句话应该没人看得到\n因为没那么多人玩桌游\n都打羽毛球去了"
  },

  onLoad() {
    let statusBarHeight = 0;
    let windowInfo = null;
    try {
      windowInfo = typeof wx.getWindowInfo === "function" ? wx.getWindowInfo() : wx.getSystemInfoSync();
      statusBarHeight = Number(windowInfo.statusBarHeight) || 0;
    } catch (e) {}
    this._windowInfo = windowInfo;
    this._setFallbackStageRect("idle");
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

  onResize() {
    try {
      this._windowInfo = typeof wx.getWindowInfo === "function" ? wx.getWindowInfo() : wx.getSystemInfoSync();
    } catch (e) {}
    const statusBarHeight = Number(this._windowInfo && this._windowInfo.statusBarHeight) || 0;
    if (statusBarHeight !== Number(this.data.statusBarHeight)) this.setData({ statusBarHeight });
    this._setFallbackStageRect(this.data.status);
    this._measureStage(true);
  },

  _setTabBarHidden(hidden) {
    if (typeof this.getTabBar !== "function") return;
    const tabBar = this.getTabBar();
    if (tabBar && typeof tabBar.setData === "function") tabBar.setData({ hidden: !!hidden });
  },

  _setFallbackStageRect(status = this.data.status) {
    const width = Number(this._windowInfo && this._windowInfo.windowWidth);
    const statusBarHeight = Number(this._windowInfo && this._windowInfo.statusBarHeight) || 0;
    if (!Number.isFinite(width) || width <= 0) return null;
    const scale = width / DESIGN_WIDTH_PX;
    const selected = status === "selected";
    this._stageRect = {
      left: 0,
      top: statusBarHeight + (44 + (selected ? 40 : 42)) * scale,
      width,
      height: (selected ? 660 : 540) * scale
    };
    return this._stageRect;
  },

  _measureStage(force = false) {
    if (this._stageMeasurePending && !force) return;
    const generation = (this._stageMeasureGeneration || 0) + 1;
    this._stageMeasureGeneration = generation;
    this._stageMeasurePending = true;
    let measuredRect = null;
    wx.createSelectorQuery()
      .select("#qa-chwazi-stage")
      .boundingClientRect((rect) => {
        const width = Number(rect && rect.width);
        const height = Number(rect && rect.height);
        measuredRect = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
          ? rect
          : null;
      })
      .exec(() => {
        if (generation !== this._stageMeasureGeneration) return;
        this._stageMeasurePending = false;
        if (measuredRect) this._stageRect = measuredRect;
        if (!this._stageRect || !this._pendingRawTouches) return;
        const pending = this._pendingRawTouches;
        this._pendingRawTouches = null;
        this._syncTouches(pending);
      });
  },

  _getTouchPosition(touch) {
    return normalizeTouchPosition(touch, this._stageRect);
  },

  _formatTouch(touch, index, previous, now, colorIndex) {
    const id = getTouchId(touch, index);
    const resolvedColorIndex = Number.isInteger(colorIndex) ? colorIndex : index;
    const color = getTouchColor(resolvedColorIndex);
    const trackedStartedAt = this._touchStartedAtById && this._touchStartedAtById.get(id);
    const startedAt = previous
      ? previous.startedAt
      : getFiniteNumber(trackedStartedAt, now);
    const position = this._getTouchPosition(touch);
    if (!position) return previous || null;
    const progress = getProgress(startedAt, now, PROGRESS_DURATION_MS);
    return {
      id,
      colorIndex: resolvedColorIndex,
      startedAt,
      xRpx: toRpx(position.xPx),
      yRpx: toRpx(position.yPx),
      leftRpx: toRpx(position.xPx - TOUCH_DIAMETER_PX / 2),
      topRpx: toRpx(position.yPx - TOUCH_DIAMETER_PX / 2),
      innerLeftRpx: toRpx(position.xPx - INNER_DIAMETER_PX / 2),
      innerTopRpx: toRpx(position.yPx - INNER_DIAMETER_PX / 2),
      outerColor: (previous && previous.outerColor) || color.outer,
      innerColor: (previous && previous.innerColor) || color.inner,
      progress,
      progressDeg: Number((progress * 360).toFixed(1)),
      progressAnimationDelayMs: previous
        ? getFiniteNumber(previous.progressAnimationDelayMs, 0)
        : -Math.round(progress * PROGRESS_DURATION_MS)
    };
  },

  _syncTouches(rawTouches) {
    const touches = Array.isArray(rawTouches) ? rawTouches : [];
    if (this.data.status === "tooMany") {
      this._latestTooManyTouchCount = touches.length;
      return;
    }
    if (this._waitForAllTouchesReleased) {
      if (!touches.length) this._waitForAllTouchesReleased = false;
      return;
    }
    if (this.data.status === "selected") {
      if (!touches.length) {
        if (this.data.winnerTransitioning) this._winnerReleasedDuringTransition = true;
        else this._resetGame();
      }
      return;
    }

    if (touches.length > MAX_TOUCHES) {
      this._enterTooMany(touches.length);
      return;
    }

    if (!touches.length) {
      this._resetGame();
      return;
    }

    const now = Date.now();
    const activeIds = new Set(touches.map((touch, index) => getTouchId(touch, index)));
    if (!this._touchStartedAtById) this._touchStartedAtById = new Map();
    for (const id of Array.from(this._touchStartedAtById.keys())) {
      if (!activeIds.has(id)) this._touchStartedAtById.delete(id);
    }
    for (const id of activeIds) {
      if (!this._touchStartedAtById.has(id)) this._touchStartedAtById.set(id, now);
    }

    if (!this._stageRect) this._setFallbackStageRect("touching");
    if (!this._stageRect) {
      this._cancelSelection();
      this._pendingRawTouches = cloneRawTouches(touches);
      this._measureStage();
      return;
    }

    const previousById = new Map((this.data.touches || []).map((touch) => [String(touch.id), touch]));
    const usedColorIndexes = new Set();
    for (const [id, previous] of previousById.entries()) {
      if (!activeIds.has(id)) continue;
      const colorIndex = getStoredColorIndex(previous);
      if (colorIndex >= 0) usedColorIndexes.add(colorIndex);
    }
    const next = touches.map((touch, index) => {
      const id = getTouchId(touch, index);
      const previous = previousById.get(id);
      const storedColorIndex = getStoredColorIndex(previous);
      const colorIndex = storedColorIndex >= 0
        ? storedColorIndex
        : getAvailableTouchColorIndex(usedColorIndexes);
      usedColorIndexes.add(colorIndex);
      return this._formatTouch(touch, index, previous, now, colorIndex);
    }).filter(Boolean);

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
    this._maybeScheduleSelection(next);
  },

  _cancelSelectionIfParticipantsChanged(next) {
    if (!this._selectionTimer) return;
    const currentIds = getParticipantKey(this.data.touches);
    const nextIds = getParticipantKey(next);
    if (currentIds !== nextIds) this._cancelSelection();
  },

  _maybeScheduleSelection(touches) {
    if (this._selectionTimer || !Array.isArray(touches) || touches.length < MIN_TOUCHES) return;
    const waitMs = getSelectionWaitMs(touches);
    if (waitMs === null) return;
    const participantKey = getParticipantKey(touches);
    this._selectionParticipantKey = participantKey;
    this._selectionTimer = setTimeout(() => {
      this._selectionTimer = null;
      this._selectionParticipantKey = null;
      if (this.data.status !== "touching" || getParticipantKey(this.data.touches) !== participantKey) return;
      const remainingMs = getSelectionWaitMs(this.data.touches);
      if (remainingMs === null) return;
      if (remainingMs > 0) {
        this._maybeScheduleSelection(this.data.touches);
        return;
      }
      const winner = this.data.touches[Math.floor(Math.random() * this.data.touches.length)];
      this._showWinner(winner);
    }, waitMs);
  },

  _cancelSelection() {
    if (this._selectionTimer) clearTimeout(this._selectionTimer);
    this._selectionTimer = null;
    this._selectionParticipantKey = null;
  },

  _getWinnerRevealOrigin(winner) {
    const rect = this._stageRect || { left: 0, top: 0, width: DESIGN_WIDTH_PX };
    const width = getFiniteNumber(rect.width, DESIGN_WIDTH_PX);
    const scale = width / DESIGN_WIDTH_PX;
    const xRpx = getFiniteNumber(
      winner && winner.xRpx,
      getFiniteNumber(winner && winner.leftRpx, 0) + toRpx(TOUCH_DIAMETER_PX / 2)
    );
    const yRpx = getFiniteNumber(
      winner && winner.yRpx,
      getFiniteNumber(winner && winner.topRpx, 0) + toRpx(TOUCH_DIAMETER_PX / 2)
    );
    return {
      xPx: Number((getFiniteNumber(rect.left, 0) + xRpx * width / 750).toFixed(2)),
      yPx: Number((getFiniteNumber(rect.top, 0) - 2 * scale + yRpx * width / 750).toFixed(2))
    };
  },

  _showWinner(winner) {
    this._cancelSelection();
    this._clearWinnerTransition(true);
    this._winnerReleasedDuringTransition = false;
    const selected = {
      ...winner,
      progress: 1,
      progressDeg: 360,
      progressAnimationDelayMs: -PROGRESS_DURATION_MS
    };
    const revealOrigin = this._getWinnerRevealOrigin(selected);
    const transitionId = this._winnerTransitionId;
    const transitionTouches = (this.data.touches || []).map((touch) => ({
      ...touch,
      progress: 1,
      progressDeg: 360,
      progressAnimationDelayMs: -PROGRESS_DURATION_MS
    }));
    this.setData({
      status: "selected",
      pageBackground: selected.innerColor,
      touches: [selected],
      winnerTransitioning: true,
      winnerTransitionId: transitionId,
      winnerRevealOriginXpx: revealOrigin.xPx,
      winnerRevealOriginYpx: revealOrigin.yPx,
      winnerTransitionStageTopPx: getFiniteNumber(this._stageRect && this._stageRect.top, 0),
      winnerTransitionTouches: transitionTouches
    }, () => this._startWinnerTransitionFallback(transitionId));
  },

  _startWinnerTransitionFallback(transitionId) {
    this._clearWinnerTransition();
    this._winnerTransitionTimer = setTimeout(
      () => this._finishWinnerTransition(transitionId),
      WINNER_TRANSITION_FALLBACK_MS
    );
  },

  _clearWinnerTransition(invalidate = false) {
    if (this._winnerTransitionTimer) clearTimeout(this._winnerTransitionTimer);
    this._winnerTransitionTimer = null;
    if (invalidate) this._winnerTransitionId = (this._winnerTransitionId || 0) + 1;
  },

  _finishWinnerTransition(transitionId = this._winnerTransitionId) {
    if (Number(transitionId) !== Number(this._winnerTransitionId)) return;
    this._clearWinnerTransition();
    if (!this.data.winnerTransitioning) return;
    if (this._winnerReleasedDuringTransition) {
      this._winnerReleasedDuringTransition = false;
      this._resetGame();
      return;
    }
    this.setData({ winnerTransitioning: false, winnerTransitionTouches: [] });
  },

  onWinnerTransitionEnd(e) {
    const targetId = e && e.target && e.target.id;
    if (targetId && targetId !== "qa-chwazi-winner-curtain") return;
    const transitionId = e && e.currentTarget && e.currentTarget.dataset
      ? e.currentTarget.dataset.transitionId
      : this._winnerTransitionId;
    this._finishWinnerTransition(transitionId);
  },

  _enterTooMany(reportedTouchCount = MAX_TOUCHES + 1) {
    this._cancelSelection();
    this._clearWinnerTransition(true);
    this._clearTooManyTimer(true);
    this._winnerReleasedDuringTransition = false;
    this._waitForAllTouchesReleased = false;
    this._latestTooManyTouchCount = Math.max(0, Number(reportedTouchCount) || 0);
    const tooManyToken = this._tooManyToken;
    this._pendingRawTouches = null;
    if (this._touchStartedAtById) this._touchStartedAtById.clear();
    this.setData({
      status: "tooMany",
      pageBackground: "#09090B",
      touches: [],
      winnerTransitioning: false,
      winnerTransitionTouches: []
    }, () => {
      if (this.data.status === "tooMany" && Number(tooManyToken) === Number(this._tooManyToken)) {
        this._startTooManyTimer(tooManyToken);
      }
    });
  },

  _startTooManyTimer(token) {
    this._clearTooManyTimer();
    this._tooManyTimer = setTimeout(() => {
      this._tooManyTimer = null;
      if (Number(token) === Number(this._tooManyToken) && this.data.status === "tooMany") {
        this._finishTooMany(token);
      }
    }, TOO_MANY_DURATION_MS);
  },

  _finishTooMany(token = this._tooManyToken) {
    if (Number(token) !== Number(this._tooManyToken) || this.data.status !== "tooMany") return;
    this._clearTooManyTimer();
    this._waitForAllTouchesReleased = Number(this._latestTooManyTouchCount) > 0;
    this._pendingRawTouches = null;
    if (this._touchStartedAtById) this._touchStartedAtById.clear();
    this.setData({
      status: "idle",
      pageBackground: "#09090B",
      touches: [],
      winnerTransitioning: false,
      winnerTransitionTouches: []
    });
  },

  _clearTooManyTimer(invalidate = false) {
    if (this._tooManyTimer) clearTimeout(this._tooManyTimer);
    this._tooManyTimer = null;
    if (invalidate) this._tooManyToken = (this._tooManyToken || 0) + 1;
  },

  _resetGame() {
    this._cancelSelection();
    this._clearWinnerTransition(true);
    this._clearTooManyTimer(true);
    this._winnerReleasedDuringTransition = false;
    this._waitForAllTouchesReleased = false;
    this._latestTooManyTouchCount = 0;
    this._pendingRawTouches = null;
    if (this._touchStartedAtById) this._touchStartedAtById.clear();
    if (this.data.status === "selected") this._setFallbackStageRect("idle");
    if (this.data.status !== "idle" || this.data.touches.length || this.data.winnerTransitioning) {
      this.setData({
        status: "idle",
        pageBackground: "#09090B",
        touches: [],
        winnerTransitioning: false,
        winnerTransitionTouches: []
      });
    }
  },

  onStageTouchStart(e) {
    const touches = Array.isArray(e && e.touches) ? e.touches : [];
    const activeIds = new Set(touches.map((touch, index) => getTouchId(touch, index)));
    const changedTouches = Array.isArray(e && e.changedTouches) ? e.changedTouches : [];
    const additionalReportedTouches = changedTouches.filter((touch, index) => (
      touch && touch.identifier !== undefined
      && touch.identifier !== null
      && !activeIds.has(getTouchId(touch, index))
    )).length;
    const reportedTouchCount = touches.length + additionalReportedTouches;
    if (this.data.status === "tooMany") {
      this._latestTooManyTouchCount = reportedTouchCount;
      return;
    }
    if (this.data.status === "selected" || this._waitForAllTouchesReleased) {
      this._syncTouches(touches);
      return;
    }
    if (reportedTouchCount > MAX_TOUCHES) {
      this._enterTooMany(reportedTouchCount);
      return;
    }
    this._syncTouches(e && e.touches);
  },

  onStageTouchMove(e) {
    this._syncTouches(e && e.touches);
  },

  onStageTouchEnd(e) {
    this._syncTouches(e && e.touches);
  },

  onStageTouchCancel(e) {
    this._syncTouches(e && e.touches);
  },

  onBackTap() {
    wx.navigateBack();
  }
});
