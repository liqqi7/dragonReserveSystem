const TAB_GLASS_TUNING = Object.freeze({
  // 微信模糊算法与 Pencil 视觉强度不同，按当前实机观感使用 12rpx
  blurRadiusRpx: 12,
  blurLayerOpacity: 1,
  whiteFillOpacity: 0.4
});

const ACTIVITY_LIST_ROUTE = "pages/activity_list/activity_list";
const { getBottomSafeAreaRpx, getWindowInfoCompat } = require("../utils/safeArea");

const TAB_URLS = [
  "/pages/activity_list/activity_list",
  "/pages/tools/tools",
  "/pages/history/history",
  "/pages/profile/profile"
];

function getCurrentTabState() {
  try {
    const pages = getCurrentPages();
    const top = pages[pages.length - 1];
    const route = top && top.route ? String(top.route) : "";
    return {
      route,
      selected: route ? TAB_URLS.indexOf(`/${route}`) : -1
    };
  } catch (e) {
    return { route: "", selected: -1 };
  }
}

function setGlobalTabSelected(selected) {
  try {
    const app = getApp();
    if (app && app.globalData) app.globalData.tabBarSelected = selected;
  } catch (e) {}
}

function vibrateTabSelection() {
  if (typeof wx === "undefined" || typeof wx.vibrateShort !== "function") return;
  const fallback = () => {
    try { wx.vibrateShort(); } catch (e) {}
  };
  try {
    wx.vibrateShort({ type: "light", fail: fallback });
  } catch (e) {
    fallback();
  }
}

function getBottomSafeAreaCssPx() {
  const info = getWindowInfoCompat();
  const windowWidth = Number(info && info.windowWidth);
  if (!(windowWidth > 0)) return 0;
  return Math.round(getBottomSafeAreaRpx() * windowWidth / 750 * 100) / 100;
}

function syncSelectedFromCurrentRoute(component) {
  const state = getCurrentTabState();
  if (state.selected < 0) return state;
  setGlobalTabSelected(state.selected);
  if (Number(component.data.selected) !== state.selected) {
    component.setData({ selected: state.selected });
  }
  return state;
}

Component({
  lifetimes: {
    attached() {
      const state = syncSelectedFromCurrentRoute(this);
      this.syncBottomSafeArea();
      if (state.selected >= 0) return;
      try {
        const app = getApp();
        const selected = app && app.globalData && Number(app.globalData.tabBarSelected);
        if (Number.isInteger(selected) && selected !== Number(this.data.selected)) {
          this.setData({ selected });
        }
      } catch (e) {}
    },

    detached() {
      if (this._tabEnterStartTimer) clearTimeout(this._tabEnterStartTimer);
      this._tabEnterStartTimer = null;
    }
  },

  data: {
    selected: 0,
    isAdmin: false,
    /** 供全屏弹层控制；重新显示时可选择执行一次自底向上的入场。 */
    hidden: false,
    entering: false,
    tabGlassBlurRadiusRpx: TAB_GLASS_TUNING.blurRadiusRpx,
    tabGlassBlurOpacity: TAB_GLASS_TUNING.blurLayerOpacity,
    tabGlassFillOpacity: TAB_GLASS_TUNING.whiteFillOpacity,
    safeBottomPx: 0
  },

  pageLifetimes: {
    show() {
      this.syncBottomSafeArea();
      const { route } = syncSelectedFromCurrentRoute(this);
      if (route && route !== ACTIVITY_LIST_ROUTE && this.data.hidden) {
        this.setData({ hidden: false });
      }

      const isAdmin = getApp().globalData.userRole === "admin";
      if (this.data.isAdmin !== isAdmin) {
        this.setData({ isAdmin });
      }
    }
  },

  methods: {
    setHidden(hidden, { animate = false } = {}) {
      const nextHidden = !!hidden;
      if (this._tabEnterStartTimer) {
        clearTimeout(this._tabEnterStartTimer);
        this._tabEnterStartTimer = null;
      }

      if (nextHidden) {
        if (!this.data.hidden || this.data.entering) {
          this.setData({ hidden: true, entering: false });
        }
        return;
      }

      if (!animate) {
        if (this.data.hidden || this.data.entering) {
          this.setData({ hidden: false, entering: false });
        }
        return;
      }

      this.setData({ hidden: false, entering: true }, () => {
        const startEntrance = () => {
          this._tabEnterStartTimer = setTimeout(() => {
            this._tabEnterStartTimer = null;
            if (!this.data.hidden) this.setData({ entering: false });
          }, 16);
        };
        if (typeof wx !== "undefined" && typeof wx.nextTick === "function") wx.nextTick(startEntrance);
        else startEntrance();
      });
    },

    syncBottomSafeArea() {
      const safeBottomPx = getBottomSafeAreaCssPx();
      if (safeBottomPx !== Number(this.data.safeBottomPx)) {
        this.setData({ safeBottomPx });
      }
    },

    setGlassTuning({ blurRadiusRpx, blurLayerOpacity, whiteFillOpacity } = {}) {
      const patch = {};
      if (Number.isFinite(Number(blurRadiusRpx))) {
        patch.tabGlassBlurRadiusRpx = Math.max(0, Number(blurRadiusRpx));
      }
      if (Number.isFinite(Number(blurLayerOpacity))) {
        patch.tabGlassBlurOpacity = Math.min(1, Math.max(0, Number(blurLayerOpacity)));
      }
      if (Number.isFinite(Number(whiteFillOpacity))) {
        patch.tabGlassFillOpacity = Math.min(1, Math.max(0, Number(whiteFillOpacity)));
      }
      if (Object.keys(patch).length) this.setData(patch);
    },

    onTabTap(e) {
      const index = Number.parseInt(e.currentTarget.dataset.index, 10);
      if (!TAB_URLS[index] || index === this.data.selected) return;

      const previousSelected = Number(this.data.selected);
      setGlobalTabSelected(index);
      wx.switchTab({
        url: TAB_URLS[index],
        success: vibrateTabSelection,
        fail: () => setGlobalTabSelected(previousSelected)
      });
    }
  }
});
