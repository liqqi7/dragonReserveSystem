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
const RING_CENTER_PX = TOUCH_DIAMETER_PX / 2;
const RING_LINE_WIDTH_PX = 9;
const RING_RADIUS_PX = (TOUCH_DIAMETER_PX - RING_LINE_WIDTH_PX) / 2;
const RING_FRAME_MS = 16;
const TOUCH_MOVE_FRAME_MS = 16;
const TOO_MANY_CANCEL_FALLBACK_MS = 80;
const WINNER_TRANSITION_FALLBACK_MS = WINNER_TRANSITION_DURATION_MS + 120;
const STAGE_TOP_GAP_PX = 42;
const SELECTED_STAGE_TOP_GAP_PX = 40;
const TOUCH_DOWN_AUDIO_SRC = "/audio/chwazi-touch-down.wav";
const SELECTION_AUDIO_SRC = "/audio/chwazi-selection.mp3";

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

function getRingCanvasId(id) {
  return "chwazi-ring-" + String(id).replace(/[^a-zA-Z0-9_-]/g, "-");
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
    winnerCollapseDiameterPx: 0,
    winnerTouchId: "",
    slotStyles: [],
    tooManyMessage: " iPhone 不支持 5 个以上的触摸\n感觉受到了侮辱\n\n但是我猜这句话应该没人看得到\n因为没那么多人玩桌游\n都打羽毛球去了"
  },

  onLoad() {
    this._pageVisible = true;
    let statusBarHeight = 0;
    let windowInfo = null;
    try {
      windowInfo = typeof wx.getWindowInfo === "function" ? wx.getWindowInfo() : wx.getSystemInfoSync();
      statusBarHeight = Number(windowInfo.statusBarHeight) || 0;
    } catch (e) {}
    this._windowInfo = windowInfo;
    this._initAudio();
    this._setFallbackStageRect("idle");
    this.setData({
      statusBarHeight,
      bottomSafeAreaRpx: getBottomSafeAreaRpx()
    });
  },

  onReady() {
    this._initSlotVisuals();
    this._measureStage();
    this._setTabBarHidden(true);
  },

  onShow() {
    this._pageVisible = true;
    this._initAudio();
    this._setTabBarHidden(true);
  },

  onHide() {
    this._pageVisible = false;
    this._cancelTooManyCancellationFallback();
    this._stopAudio();
    this._resetGame();
  },

  onUnload() {
    this._pageVisible = false;
    this._setTabBarHidden(false);
    this._destroyAudio();
    this._resetGame();
  },

  onResize() {
    try {
      this._windowInfo = typeof wx.getWindowInfo === "function" ? wx.getWindowInfo() : wx.getSystemInfoSync();
    } catch (e) {}
    const statusBarHeight = Number(this._windowInfo && this._windowInfo.statusBarHeight) || 0;
    const bottomSafeAreaRpx = getBottomSafeAreaRpx();
    const patch = {};
    if (statusBarHeight !== Number(this.data.statusBarHeight)) patch.statusBarHeight = statusBarHeight;
    if (bottomSafeAreaRpx !== Number(this.data.bottomSafeAreaRpx)) patch.bottomSafeAreaRpx = bottomSafeAreaRpx;
    const refreshStageGeometry = () => {
      this._setFallbackStageRect(this.data.status);
      this._measureStage(true);
    };
    if (Object.keys(patch).length) this.setData(patch, refreshStageGeometry);
    else refreshStageGeometry();
  },

  _setTabBarHidden(hidden) {
    if (typeof this.getTabBar !== "function") return;
    const tabBar = this.getTabBar();
    if (tabBar && typeof tabBar.setData === "function") tabBar.setData({ hidden: !!hidden });
  },

  _initAudio() {
    if (this._audioInitialized) return true;
    if (typeof wx === "undefined" || typeof wx.createInnerAudioContext !== "function") return false;
    try {
      this._touchDownAudioPool = Array.from({ length: MAX_TOUCHES }, () => {
        const audio = wx.createInnerAudioContext();
        audio.src = TOUCH_DOWN_AUDIO_SRC;
        return audio;
      });
      this._selectionAudio = wx.createInnerAudioContext();
      this._selectionAudio.src = SELECTION_AUDIO_SRC;
      this._touchDownAudioCursor = 0;
      this._audioInitialized = true;
      return true;
    } catch (e) {
      this._destroyAudio();
      return false;
    }
  },

  _playAudio(audio) {
    if (!audio) return;
    try {
      if (audio._chwaziHasStarted && audio.paused === false) audio.stop();
      audio.play();
      audio._chwaziHasStarted = true;
    } catch (e) {}
  },

  _playTouchDown(count = 1) {
    if (!this._initAudio() || !this._touchDownAudioPool.length) return;
    const playCount = Math.max(0, Number(count) || 0);
    for (let index = 0; index < playCount; index += 1) {
      const audio = this._touchDownAudioPool[this._touchDownAudioCursor];
      this._touchDownAudioCursor = (this._touchDownAudioCursor + 1) % this._touchDownAudioPool.length;
      this._playAudio(audio);
    }
  },

  _playSelection() {
    if (!this._initAudio()) return;
    this._playAudio(this._selectionAudio);
  },

  _vibrateSelection() {
    if (typeof wx === "undefined" || typeof wx.vibrateShort !== "function") return;
    let fallbackStarted = false;
    const fallback = () => {
      if (fallbackStarted) return;
      fallbackStarted = true;
      try { wx.vibrateShort(); } catch (e) {}
    };
    try {
      wx.vibrateShort({ type: "medium", fail: fallback });
    } catch (e) {
      fallback();
    }
  },

  _destroyAudio() {
    const contexts = [
      ...(this._touchDownAudioPool || []),
      this._selectionAudio
    ].filter(Boolean);
    for (const audio of contexts) {
      try { audio.stop(); } catch (e) {}
      try {
        if (typeof audio.destroy === "function") audio.destroy();
      } catch (e) {}
    }
    this._touchDownAudioPool = null;
    this._selectionAudio = null;
    this._touchDownAudioCursor = 0;
    this._audioInitialized = false;
  },

  _stopAudio() {
    const contexts = [
      ...(this._touchDownAudioPool || []),
      this._selectionAudio
    ].filter(Boolean);
    for (const audio of contexts) {
      try {
        if (audio.paused === false) audio.stop();
        audio._chwaziHasStarted = false;
      } catch (e) {}
    }
  },

  _playNewTouchAudio(e) {
    if (
      (this.data.status !== "idle" && this.data.status !== "touching")
      || this._waitForAllTouchesReleased
    ) return;
    const trackedIds = new Set((this.data.touches || []).map((touch) => String(touch.id)));
    if (this._touchStartedAtById) {
      for (const id of this._touchStartedAtById.keys()) trackedIds.add(String(id));
    }
    const changedTouches = Array.isArray(e && e.changedTouches) ? e.changedTouches : [];
    const activeTouches = Array.isArray(e && e.touches) ? e.touches : [];
    const candidates = changedTouches.length ? changedTouches : activeTouches;
    const newIds = new Set();
    candidates.forEach((touch, index) => {
      const id = getTouchId(touch, index);
      if (!trackedIds.has(id)) newIds.add(id);
    });
    this._playTouchDown(newIds.size);
  },

  _setFallbackStageRect(status = this.data.status) {
    const width = Number(this._windowInfo && this._windowInfo.windowWidth);
    const windowHeight = Number(this._windowInfo && this._windowInfo.windowHeight);
    const statusBarHeight = Number(this._windowInfo && this._windowInfo.statusBarHeight) || 0;
    if (!Number.isFinite(width) || width <= 0) return null;
    const scale = width / DESIGN_WIDTH_PX;
    const selected = status === "selected";
    const top = statusBarHeight + (44 + (selected ? 40 : 42)) * scale;
    const bottomSafeAreaPx = getBottomSafeAreaRpx() * width / 750;
    const minimumHeight = (selected ? 660 : 540) * scale;
    const availableHeight = windowHeight - top - bottomSafeAreaPx;
    this._stageRect = {
      left: 0,
      top,
      width,
      height: Number.isFinite(availableHeight) && availableHeight > 0
        ? availableHeight
        : minimumHeight
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
    const rect = this._stageRect;
    if (!rect) return null;
    const scale = getFiniteNumber(rect.width, DESIGN_WIDTH_PX) / DESIGN_WIDTH_PX;
    const stageTopGap = this.data.status === "selected"
      ? SELECTED_STAGE_TOP_GAP_PX
      : STAGE_TOP_GAP_PX;
    const stageHeight = getFiniteNumber(rect.height, 540) / scale;
    return normalizeTouchPosition(touch, rect, {
      minY: -stageTopGap,
      maxY: stageHeight - TOUCH_DIAMETER_PX / 2
    });
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
    return {
      id,
      colorIndex: resolvedColorIndex,
      startedAt,
      xRpx: toRpx(position.xPx),
      yRpx: toRpx(position.yPx),
      xPx: position.xPx,
      yPx: position.yPx,
      leftRpx: toRpx(position.xPx - TOUCH_DIAMETER_PX / 2),
      topRpx: toRpx(position.yPx - TOUCH_DIAMETER_PX / 2),
      innerLeftRpx: toRpx(position.xPx - INNER_DIAMETER_PX / 2),
      innerTopRpx: toRpx(position.yPx - INNER_DIAMETER_PX / 2),
      canvasId: (previous && previous.canvasId) || getRingCanvasId(id),
      outerColor: (previous && previous.outerColor) || color.outer,
      innerColor: (previous && previous.innerColor) || color.inner
    };
  },

  _initSlotVisuals() {
    this._slotTouches = Array.from({ length: MAX_TOUCHES }, () => null);
    this._slotByTouchId = new Map();
    const slotStyles = Array.from({ length: MAX_TOUCHES }, () => ({
      transform: "translate(-9999rpx, -9999rpx)",
      innerBackground: "transparent"
    }));
    this.setData({ slotStyles }, () => {
      const useWorklet = typeof wx !== "undefined"
        && wx.worklet && typeof wx.worklet.shared === "function"
        && typeof this.applyAnimatedStyle === "function";
      this._useWorkletVisuals = !!useWorklet;
      if (!useWorklet) return;
      this._slotShared = Array.from({ length: MAX_TOUCHES }, () => wx.worklet.shared({ x: -9999, y: -9999, active: 0 }));
      this._slotShared.forEach((sharedSlot, index) => {
        this.applyAnimatedStyle("#chwazi-slot-" + index, () => {
          "worklet";
          const s = sharedSlot.value;
          return s && s.active
            ? { transform: "translate(" + s.x + "rpx, " + s.y + "rpx)" }
            : { transform: "translate(-9999rpx, -9999rpx)" };
        }, { flush: "sync" });
      });
    });
  },

  _applySlotPosition(index) {
    const slot = this._slotTouches && this._slotTouches[index];
    const x = slot ? toRpx(slot.xPx - TOUCH_DIAMETER_PX / 2) : -9999;
    const y = slot ? toRpx(slot.yPx - TOUCH_DIAMETER_PX / 2) : -9999;
    if (this._useWorkletVisuals && this._slotShared && this._slotShared[index]) {
      this._slotShared[index].value = slot ? { x, y, active: 1 } : { x: -9999, y: -9999, active: 0 };
      return;
    }
    const patch = {};
    patch["slotStyles[" + index + "].transform"] = "translate(" + x + "rpx, " + y + "rpx)";
    this.setData(patch);
  },

  _applySlotColor(index) {
    const slot = this._slotTouches && this._slotTouches[index];
    const patch = {};
    patch["slotStyles[" + index + "].innerBackground"] = slot ? slot.innerColor : "transparent";
    this.setData(patch);
  },

  _assignSlots(next) {
    if (!this._slotTouches) this._initSlotVisuals();
    const nextIds = new Set(next.map((touch) => String(touch.id)));
    for (const [touchId, slotIndex] of Array.from(this._slotByTouchId.entries())) {
      if (nextIds.has(touchId)) continue;
      this._slotByTouchId.delete(touchId);
      this._slotTouches[slotIndex] = null;
      this._applySlotPosition(slotIndex);
      this._applySlotColor(slotIndex);
    }
    for (const touch of next) {
      const touchId = String(touch.id);
      let slotIndex = this._slotByTouchId.get(touchId);
      if (slotIndex === undefined) {
        slotIndex = this._slotTouches.findIndex((slot) => slot === null);
        if (slotIndex === -1) continue;
        this._slotByTouchId.set(touchId, slotIndex);
      }
      const isNew = !this._slotTouches[slotIndex];
      this._slotTouches[slotIndex] = {
        id: touchId,
        startedAt: touch.startedAt,
        outerColor: touch.outerColor,
        innerColor: touch.innerColor,
        xPx: touch.xPx,
        yPx: touch.yPx
      };
      this._applySlotPosition(slotIndex);
      if (isNew) this._applySlotColor(slotIndex);
    }
  },

  _clearSlots() {
    if (!this._slotTouches) return;
    for (let index = 0; index < MAX_TOUCHES; index += 1) {
      if (!this._slotTouches[index]) continue;
      this._slotTouches[index] = null;
      this._applySlotPosition(index);
      this._applySlotColor(index);
    }
    if (this._slotByTouchId) this._slotByTouchId.clear();
  },

  _syncMoveVisuals(rawTouches) {
    if (!this._slotByTouchId || !this._stageRect) return;
    const touches = Array.isArray(rawTouches) ? rawTouches : [];
    if (!touches.length) return;
    const rawById = new Map();
    touches.forEach((touch, index) => rawById.set(getTouchId(touch, index), touch));
    for (const [touchId, slotIndex] of this._slotByTouchId.entries()) {
      const slot = this._slotTouches[slotIndex];
      if (!slot) continue;
      const raw = rawById.get(touchId);
      if (!raw) continue;
      const position = this._getTouchPosition(raw);
      if (!position) continue;
      if (slot.xPx === position.xPx && slot.yPx === position.yPx) continue;
      slot.xPx = position.xPx;
      slot.yPx = position.yPx;
      this._applySlotPosition(slotIndex);
    }
  },

  _drawTouchRings(now = Date.now()) {
    if (typeof wx === "undefined" || typeof wx.createSelectorQuery !== "function") return false;
    const canvasScale = getFiniteNumber(this._stageRect && this._stageRect.width, DESIGN_WIDTH_PX)
      / DESIGN_WIDTH_PX;
    const canvasSize = TOUCH_DIAMETER_PX * canvasScale;
    if (!this._ringCanvasContexts) this._ringCanvasContexts = new Map();
    if (!this._slotTouches) this._slotTouches = Array.from({ length: MAX_TOUCHES }, () => null);

    let animationPending = false;
    for (let index = 0; index < MAX_TOUCHES; index += 1) {
      const slot = this._slotTouches[index];
      const canvasId = "chwazi-ring-slot-" + index;
      const entry0 = this._ringCanvasContexts.get(canvasId);
      if (!slot) {
        if (entry0 && entry0.ctx) entry0.ctx.clearRect(0, 0, canvasSize, canvasSize);
        continue;
      }
      const progress = this.data.status === "selected"
        ? 1
        : getProgress(slot.startedAt, now, PROGRESS_DURATION_MS);
      if (progress < 1) animationPending = true;
      let entry = entry0;
      if (!entry) {
        entry = { canvas: null, ctx: null, pixelSize: 0, dpr: 1 };
        this._ringCanvasContexts.set(canvasId, entry);
        this._acquireRingCanvas(canvasId);
        continue;
      }
      if (!entry.ctx) continue;
      this._resizeRingCanvas(entry, canvasSize);
      const ctx = entry.ctx;
      ctx.clearRect(0, 0, canvasSize, canvasSize);
      if (progress > 0) {
        ctx.beginPath();
        ctx.strokeStyle = slot.outerColor;
        ctx.lineWidth = RING_LINE_WIDTH_PX * canvasScale;
        ctx.lineCap = "round";
        ctx.arc(
          RING_CENTER_PX * canvasScale,
          RING_CENTER_PX * canvasScale,
          RING_RADIUS_PX * canvasScale,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * progress,
          false
        );
        ctx.stroke();
      }
    }
    return animationPending;
  },

  _acquireRingCanvas(canvasId) {
    if (typeof wx === "undefined" || typeof wx.createSelectorQuery !== "function") return;
    wx.createSelectorQuery()
      .select("#" + canvasId)
      .fields({ node: true })
      .exec((res) => {
        const entry = this._ringCanvasContexts && this._ringCanvasContexts.get(canvasId);
        if (!entry) return;
        const info = res && res[0];
        if (!info || !info.node) {
          setTimeout(() => {
            if (this._ringCanvasContexts && this._ringCanvasContexts.get(canvasId) === entry) {
              this._acquireRingCanvas(canvasId);
            }
          }, 50);
          return;
        }
        entry.dpr = getFiniteNumber(this._windowInfo && this._windowInfo.pixelRatio, 1);
        entry.canvas = info.node;
        entry.ctx = info.node.getContext("2d");
        this._drawTouchRings();
      });
  },

  _resizeRingCanvas(entry, cssSize) {
    if (!entry.canvas || !cssSize) return;
    const target = Math.max(1, Math.round(cssSize * entry.dpr));
    if (entry.pixelSize === target) return;
    entry.pixelSize = target;
    entry.canvas.width = target;
    entry.canvas.height = target;
    entry.ctx.setTransform(entry.dpr, 0, 0, entry.dpr, 0, 0);
  },

  _startRingRenderLoop() {
    if (this._ringRenderTimer) return;
    const schedule = (callback) => {
      const entry = this._ringCanvasContexts
        && Array.from(this._ringCanvasContexts.values()).find((item) => (
          item && item.canvas && typeof item.canvas.requestAnimationFrame === "function"
        ));
      if (entry) {
        this._ringRenderRafCanvas = entry.canvas;
        this._ringRenderTimer = entry.canvas.requestAnimationFrame(callback);
        this._ringRenderUsingRaf = true;
      } else {
        this._ringRenderTimer = setTimeout(callback, RING_FRAME_MS);
        this._ringRenderUsingRaf = false;
      }
    };
    const render = () => {
      this._ringRenderTimer = null;
      if (this.data.status !== "touching") {
        this._drawTouchRings();
        return;
      }
      if (this._drawTouchRings()) schedule(render);
    };
    render();
  },

  _stopRingRenderLoop() {
    if (this._ringRenderTimer) {
      if (this._ringRenderUsingRaf && this._ringRenderRafCanvas
        && typeof this._ringRenderRafCanvas.cancelAnimationFrame === "function") {
        this._ringRenderRafCanvas.cancelAnimationFrame(this._ringRenderTimer);
      } else if (!this._ringRenderUsingRaf) {
        clearTimeout(this._ringRenderTimer);
      }
    }
    this._ringRenderTimer = null;
    this._ringRenderUsingRaf = false;
    this._ringRenderRafCanvas = null;
    if (this._ringCanvasContexts) this._ringCanvasContexts.clear();
  },

  _queueTouchMove(rawTouches) {
    this._pendingMoveTouches = cloneRawTouches(rawTouches);
    if (this._touchMoveTimer) return;
    this._touchMoveTimer = setTimeout(() => {
      this._touchMoveTimer = null;
      const touches = this._pendingMoveTouches;
      this._pendingMoveTouches = null;
      if (this._pageVisible === false || !touches) return;
      this._syncTouches(touches);
    }, TOUCH_MOVE_FRAME_MS);
  },

  _cancelPendingTouchMove() {
    if (this._touchMoveTimer) clearTimeout(this._touchMoveTimer);
    this._touchMoveTimer = null;
    this._pendingMoveTouches = null;
  },

  _getTrackedTouchCount() {
    return Math.max(
      Array.isArray(this.data.touches) ? this.data.touches.length : 0,
      Array.isArray(this._pendingRawTouches) ? this._pendingRawTouches.length : 0,
      Array.isArray(this._pendingMoveTouches) ? this._pendingMoveTouches.length : 0,
      this._touchStartedAtById instanceof Map ? this._touchStartedAtById.size : 0
    );
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
        return;
      }
      const winnerId = String(this._winnerTouchId || this.data.winnerTouchId || "");
      const winnerRawTouch = touches.find((touch, index) => getTouchId(touch, index) === winnerId);
      if (!winnerRawTouch || !this.data.touches.length) return;
      const now = Date.now();
      const winner = this._formatTouch(
        winnerRawTouch,
        0,
        this.data.touches[0],
        now,
        getStoredColorIndex(this.data.touches[0])
      );
      if (!winner) return;
      const winnerSlotIndex = this._slotByTouchId && this._slotByTouchId.get(String(winner.id));
      if (Number.isInteger(winnerSlotIndex) && this._slotTouches[winnerSlotIndex]) {
        this._slotTouches[winnerSlotIndex].xPx = winner.xPx;
        this._slotTouches[winnerSlotIndex].yPx = winner.yPx;
        this._applySlotPosition(winnerSlotIndex);
      }
      const revealOrigin = this._getWinnerRevealOrigin(winner);
      this.setData({
        touches: [winner],
        winnerRevealOriginXpx: revealOrigin.xPx,
        winnerRevealOriginYpx: revealOrigin.yPx
      }, () => this._drawTouchRings(now));
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

    this._assignSlots(next);
    const memberKeyOf = (list) => (list || []).map((touch) => (
      String(touch.id) + ":" + touch.colorIndex + ":" + touch.startedAt
    )).join("|");
    const patch = {};
    if (memberKeyOf(this.data.touches) !== memberKeyOf(next)) patch.touches = next;
    if (this.data.status !== "touching") {
      patch.status = "touching";
      patch.pageBackground = "#09090B";
    }
    if (Object.keys(patch).length) this.setData(patch, () => this._startRingRenderLoop());
    else this._startRingRenderLoop();
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
    this._selectionTimer = setTimeout(() => {
      this._selectionTimer = null;
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
  },

  _getWinnerRevealOrigin(winner) {
    const rect = this._stageRect || { left: 0, top: 0, width: DESIGN_WIDTH_PX };
    const width = getFiniteNumber(rect.width, DESIGN_WIDTH_PX);
    const scale = width / DESIGN_WIDTH_PX;
    const slotIndex = this._slotByTouchId && this._slotByTouchId.get(String(winner && winner.id));
    const slot = Number.isInteger(slotIndex) && this._slotTouches ? this._slotTouches[slotIndex] : null;
    const xPx = getFiniteNumber(slot && slot.xPx, NaN);
    const yPx = getFiniteNumber(slot && slot.yPx, NaN);
    if (Number.isFinite(xPx) && Number.isFinite(yPx)) {
      return {
        xPx: Number((getFiniteNumber(rect.left, 0) + xPx * scale).toFixed(2)),
        yPx: Number((getFiniteNumber(rect.top, 0) - 2 * scale + yPx * scale).toFixed(2))
      };
    }
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

  _getWinnerCollapseRadius(origin) {
    const rect = this._stageRect || { left: 0, top: 0, width: DESIGN_WIDTH_PX, height: 540 };
    const viewportWidth = getFiniteNumber(
      this._windowInfo && this._windowInfo.windowWidth,
      getFiniteNumber(rect.left, 0) + getFiniteNumber(rect.width, DESIGN_WIDTH_PX)
    );
    const viewportHeight = getFiniteNumber(
      this._windowInfo && this._windowInfo.windowHeight,
      getFiniteNumber(rect.top, 0) + getFiniteNumber(rect.height, 540)
    );
    const x = getFiniteNumber(origin && origin.xPx, 0);
    const y = getFiniteNumber(origin && origin.yPx, 0);
    return Number(Math.max(
      Math.hypot(x, y),
      Math.hypot(viewportWidth - x, y),
      Math.hypot(x, viewportHeight - y),
      Math.hypot(viewportWidth - x, viewportHeight - y)
    ).toFixed(2));
  },

  _showWinner(winner) {
    this._cancelSelection();
    this._clearWinnerTransition(true);
    this._winnerReleasedDuringTransition = false;
    this._playSelection();
    const selected = { ...winner };
    this._winnerTouchId = String(selected.id);
    this._assignSlots([selected]);
    const revealOrigin = this._getWinnerRevealOrigin(selected);
    const collapseRadius = this._getWinnerCollapseRadius(revealOrigin);
    const transitionId = this._winnerTransitionId;
    this.setData({
      status: "selected",
      pageBackground: selected.innerColor,
      touches: [selected],
      winnerTransitioning: true,
      winnerTransitionId: transitionId,
      winnerRevealOriginXpx: revealOrigin.xPx,
      winnerRevealOriginYpx: revealOrigin.yPx,
      winnerCollapseDiameterPx: collapseRadius * 2,
      winnerTouchId: this._winnerTouchId
    }, () => {
      this._vibrateSelection();
      this._stopRingRenderLoop();
      this._drawTouchRings();
      this._startWinnerTransitionFallback(transitionId);
    });
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
    this.setData({ winnerTransitioning: false });
  },

  onWinnerTransitionEnd(e) {
    const targetId = e && e.target && e.target.id;
    if (targetId && targetId !== "qa-chwazi-winner-collapse-disc") return;
    const transitionId = e && e.currentTarget && e.currentTarget.dataset
      ? e.currentTarget.dataset.transitionId
      : this._winnerTransitionId;
    this._finishWinnerTransition(transitionId);
  },

  _scheduleTooManyCancellationFallback() {
    this._cancelTooManyCancellationFallback();
    this._cancelSelection();
    this._stopRingRenderLoop();
    this._tooManyCancellationTimer = setTimeout(() => {
      this._tooManyCancellationTimer = null;
      if (this._pageVisible === false) return;
      if (this.data.status !== "idle" && this.data.status !== "touching") return;
      if (this._getTrackedTouchCount() < MAX_TOUCHES) return;
      this._enterTooMany(MAX_TOUCHES + 1);
    }, TOO_MANY_CANCEL_FALLBACK_MS);
  },

  _cancelTooManyCancellationFallback() {
    if (this._tooManyCancellationTimer) clearTimeout(this._tooManyCancellationTimer);
    this._tooManyCancellationTimer = null;
  },

  _enterTooMany(reportedTouchCount = MAX_TOUCHES + 1) {
    this._clearSlots();
    this._cancelTooManyCancellationFallback();
    this._cancelPendingTouchMove();
    this._cancelSelection();
    this._stopRingRenderLoop();
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
      winnerCollapseDiameterPx: 0,
      winnerTouchId: ""
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
    this._clearSlots();
    this._clearTooManyTimer();
    this._waitForAllTouchesReleased = Number(this._latestTooManyTouchCount) > 0;
    this._pendingRawTouches = null;
    if (this._touchStartedAtById) this._touchStartedAtById.clear();
    this.setData({
      status: "idle",
      pageBackground: "#09090B",
      touches: [],
      winnerTransitioning: false,
      winnerCollapseDiameterPx: 0,
      winnerTouchId: ""
    });
  },

  _clearTooManyTimer(invalidate = false) {
    if (this._tooManyTimer) clearTimeout(this._tooManyTimer);
    this._tooManyTimer = null;
    if (invalidate) this._tooManyToken = (this._tooManyToken || 0) + 1;
  },

  _resetGame() {
    this._clearSlots();
    this._cancelTooManyCancellationFallback();
    this._cancelPendingTouchMove();
    this._cancelSelection();
    this._stopRingRenderLoop();
    this._clearWinnerTransition(true);
    this._clearTooManyTimer(true);
    this._winnerReleasedDuringTransition = false;
    this._winnerTouchId = "";
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
        winnerCollapseDiameterPx: 0,
        winnerTouchId: ""
      });
    }
  },

  onStageTouchStart(e) {
    this._cancelTooManyCancellationFallback();
    this._cancelPendingTouchMove();
    this._playNewTouchAudio(e);
    const touches = Array.isArray(e && e.touches) ? e.touches : [];
    const activeIds = new Set(touches.map((touch, index) => getTouchId(touch, index)));
    const changedTouches = Array.isArray(e && e.changedTouches) ? e.changedTouches : [];
    const reportedIds = new Set(activeIds);
    changedTouches.forEach((touch, index) => reportedIds.add(getTouchId(touch, index)));
    const reportedTouchCount = Math.max(touches.length, reportedIds.size);
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
    this._syncMoveVisuals(e && e.touches);
    this._queueTouchMove(e && e.touches);
  },

  onStageTouchEnd(e) {
    this._cancelPendingTouchMove();
    this._syncTouches(e && e.touches);
  },

  onStageTouchCancel(e) {
    this._cancelPendingTouchMove();
    const touches = Array.isArray(e && e.touches) ? e.touches : [];
    const changedTouches = Array.isArray(e && e.changedTouches) ? e.changedTouches : [];
    const trackedTouchCount = this._getTrackedTouchCount();
    const unexpectedCancellation = changedTouches.length > 0 || touches.length < trackedTouchCount;
    const reachedDeviceTouchLimit = trackedTouchCount >= MAX_TOUCHES;
    if (
      this.data.status !== "tooMany"
      && this.data.status !== "selected"
      && !this._waitForAllTouchesReleased
      && reachedDeviceTouchLimit
      && unexpectedCancellation
    ) {
      this._scheduleTooManyCancellationFallback();
      return;
    }
    this._syncTouches(touches);
  },

  onBackTap() {
    wx.navigateBack();
  }
});
