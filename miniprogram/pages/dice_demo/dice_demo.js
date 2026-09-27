const { getBottomSafeAreaRpx } = require("../../utils/safeArea");
const {
  MAX_DICE_COUNT,
  normalizeCount
} = require("./dice_demo_logic");

const { STORAGE_KEY, DEFAULTS, validateConfig, makeGroups, sceneProps } = require("./dice_physics_config");

function getStatusBarHeight() {
  try {
    const info = typeof wx.getWindowInfo === "function" ? wx.getWindowInfo() : wx.getSystemInfoSync();
    return Number(info.statusBarHeight) || 0;
  } catch (e) {
    return 0;
  }
}

Page({
  data: {
    statusBarHeight: 0,
    bottomSafeAreaRpx: 0,
    selectedSides: 6,
    totalCount: 1,
    diceCount: 1,
    rollToken: 0,
    sceneMounted: false,
    sceneEpoch: 0,
    scrollIntoView: "",
    physicsConfig: DEFAULTS,
    sceneProps: sceneProps(DEFAULTS),
    physicsGroups: makeGroups(DEFAULTS),
    tunerOpen: false,
    tunerDirty: false,
    sceneWidth: 0,
    sceneHeight: 0,
    sceneBufferWidth: 0,
    sceneBufferHeight: 0,
    status: "loading",
    statusText: "正在初始化 XR-Frame",
    resultText: "—",
    resultTotal: "—"
  },

  onLoad() {
    let config = DEFAULTS;
    try {
      const checked = validateConfig(wx.getStorageSync(STORAGE_KEY));
      if (checked.config) config = checked.config;
    } catch (error) { console.warn("[dice-xr] tuning storage read failed", error); }
    this._physicsDraft = { ...config };
    this.setData({ statusBarHeight: getStatusBarHeight(), physicsConfig: config, sceneProps: sceneProps(config), physicsGroups: makeGroups(config) });
  },

  onShow() {
    this.setData({ bottomSafeAreaRpx: getBottomSafeAreaRpx() });
  },

  onBackTap() {
    wx.navigateBack();
  },

  onReady() {
    const epoch = this.data.sceneEpoch;
    this.createSelectorQuery().select(".dice-stage").boundingClientRect(rect => {
      if (this._unloaded || epoch !== this.data.sceneEpoch) return;
      if (!rect || !(rect.width > 0 && rect.height > 0)) {
        this.onSceneStatusChange({ detail: { status: "error", code: "stage-size" } });
        return;
      }
      const info = typeof wx.getWindowInfo === "function" ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const ratio = Math.min(2, Math.max(1, Number(info.pixelRatio) || 1));
      this.setData({
        sceneWidth: rect.width, sceneHeight: rect.height,
        sceneBufferWidth: Math.round(rect.width * ratio),
        sceneBufferHeight: Math.round(rect.height * ratio),
        sceneMounted: true
      });
    }).exec();
  },

  onUnload() { this._unloaded = true; },

  onTunerToggle() { this.setData({ tunerOpen: !this.data.tunerOpen }); },

  onPhysicsInput(event) {
    const key = event && event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.key;
    if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) return;
    if (!this._physicsDraft) this._physicsDraft = { ...this.data.physicsConfig };
    this._physicsDraft[key] = event.detail.value;
    if (!this.data.tunerDirty) this.setData({ tunerDirty: true });
  },

  onPhysicsApply() {
    if (this._applying) return;
    const checked = validateConfig(this._physicsDraft || this.data.physicsConfig);
    if (!checked.config) { wx.showToast({ title: checked.error, icon: "none" }); return; }
    this._applyPhysics(checked.config);
  },

  onPhysicsReset() { if (!this._applying) this._applyPhysics({ ...DEFAULTS }); },

  onPhysicsCopy() {
    const checked = validateConfig(this._physicsDraft || this.data.physicsConfig);
    if (!checked.config) { wx.showToast({ title: checked.error, icon: "none" }); return; }
    wx.setClipboardData({ data: JSON.stringify(checked.config, null, 2) });
  },

  _applyPhysics(config) {
    if (this._unloaded) return;
    this._physicsDraft = { ...config };
    this._applying = true;
    this._autoRollOnReady = true;
    // Initial XR physics is declarative: destroy the old scene before mounting the new one.
    this.setData({
      sceneMounted: false, status: "loading", statusText: "正在应用物理参数",
      resultText: "—", resultTotal: "—", rollToken: 0, tunerDirty: false, scrollIntoView: ""
    }, () => {
      wx.nextTick(() => {
        if (this._unloaded) return;
        this.setData({ sceneEpoch: this.data.sceneEpoch + 1, physicsConfig: config, sceneProps: sceneProps(config), physicsGroups: makeGroups(config) }, () => this.onReady());
      });
    });
    try { wx.setStorageSync(STORAGE_KEY, config); }
    catch (error) { wx.showToast({ title: "参数已应用，但本机保存失败", icon: "none" }); }
  },

  onSceneRetry() {
    if (this.data.status !== "unavailable" || this._unloaded) return;
    this._autoRollOnReady = false;
    // Unmount the old XR scene before creating another: only one can be live.
    this.setData({
      sceneMounted: false,
      status: "loading",
      statusText: "正在重新初始化 XR-Frame",
      resultText: "—",
      resultTotal: "—",
      rollToken: 0
    }, () => {
      wx.nextTick(() => {
        if (this._unloaded) return;
        this.setData({ sceneEpoch: this.data.sceneEpoch + 1 }, () => this.onReady());
      });
    });
  },

  onSidesTap(event) {
    const sides = Number(event && event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.sides);
    if (sides !== 6) {
      wx.showToast({ title: "D8/D10/D12/D20 在后续阶段接入", icon: "none" });
      return;
    }
    this.setData({ selectedSides: 6 });
  },

  onCountMinus() {
    this._setCount(this.data.totalCount - 1);
  },

  onCountPlus() {
    this._setCount(this.data.totalCount + 1);
  },

  _setCount(value) {
    if (["rolling", "dragging"].includes(this.data.status)) return;
    const count = normalizeCount(Math.max(1, Math.min(MAX_DICE_COUNT, value)));
    this.setData({
      totalCount: count,
      diceCount: count,
      resultText: "—",
      resultTotal: "—"
    });
  },
  onRollTap() {
    if (!["ready", "settled"].includes(this.data.status)) return;
    this.setData({ rollToken: this.data.rollToken + 1 });
  },

  onSceneStatusChange(event) {
    const detail = event && event.detail || {};
    if (detail.epoch !== undefined && detail.epoch !== this.data.sceneEpoch) return;
    if (!this.data.sceneMounted && detail.epoch !== undefined) return;
    const status = detail.status;
    const statusMap = {
      initializing: ["loading", "正在准备新增骰子"],
      ready: ["ready", "拖拽骰子，松手投掷"],
      retry: ["ready", "本次未完成，请重新投掷"],
      dragging: ["dragging", "拖动中，松手投掷"],
      rolling: ["rolling", "骰子滚动中…"],
      unavailable: ["unavailable", "XR-Frame 不可用，请使用支持的开发者工具/基础库"],
      "devtools-canvas-unsupported": ["unavailable", "开发者工具暂不支持 Skyline Canvas 调试，请用真机预览"],
      error: ["unavailable", detail.phase === "runtime" ? "XR-Frame 运行失败" : "XR-Frame 初始化失败"]
    };
    const next = statusMap[status];
    if (["ready", "error", "unavailable", "devtools-canvas-unsupported"].includes(status)) this._applying = false;
    if (status !== "ready" && ["error", "unavailable", "devtools-canvas-unsupported"].includes(status)) this._autoRollOnReady = false;
    if (status === "error") console.error("[dice-xr] scene failure", detail);
    if (next) this.setData({
      status: next[0],
      statusText: next[1] + (detail.code ? " (" + detail.code + (detail.code === "init-timeout" && detail.pending ? ": " + detail.pending : "") + ")" : ""),
      ...(["rolling", "dragging", "retry", "error"].includes(status) ? { resultText: "—", resultTotal: "—" } : {})
    }, () => {
      if (status === "ready" && this._autoRollOnReady && !this._unloaded) {
        this._autoRollOnReady = false;
        this.setData({ scrollIntoView: "dice-stage-anchor" }, () => this.onRollTap());
      }
    });
  },

  onSceneResult(event) {
    const detail = event && event.detail;
    if (!detail || (detail.epoch !== undefined && detail.epoch !== this.data.sceneEpoch) || !Array.isArray(detail.results)) return;
    this.setData({
      status: "settled",
      statusText: "已停止，可再次投掷",
      resultText: detail.results.map((item) => `D${item.sides}=${item.value}`).join("  "),
      resultTotal: String(detail.total)
    });
  }
});
