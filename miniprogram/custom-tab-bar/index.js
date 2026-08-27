const TAB_GLASS_TUNING = Object.freeze({
  // 微信模糊算法与 Pencil 视觉强度不同，按当前实机观感使用 12rpx
  blurRadiusRpx: 12,
  blurLayerOpacity: 1,
  whiteFillOpacity: 0.4
});

const ACTIVITY_LIST_ROUTE = "pages/activity_list/activity_list";
const { getBottomSafeAreaRpx } = require("../utils/safeArea");

const TAB_URLS = [
  "/pages/activity_list/activity_list",
  "/pages/activity_calendar/activity_calendar",
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
    }
  },

  data: {
    selected: 0,
    isAdmin: false,
    /** 由当前页 getTabBar().setData({ hidden }) 控制（如活动编辑弹窗打开时隐藏） */
    hidden: false,
    tabGlassBlurRadiusRpx: TAB_GLASS_TUNING.blurRadiusRpx,
    tabGlassBlurOpacity: TAB_GLASS_TUNING.blurLayerOpacity,
    tabGlassFillOpacity: TAB_GLASS_TUNING.whiteFillOpacity,
    safeBottomRpx: 0
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
    syncBottomSafeArea() {
      const safeBottomRpx = getBottomSafeAreaRpx();
      if (safeBottomRpx !== Number(this.data.safeBottomRpx)) {
        this.setData({ safeBottomRpx });
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
        fail: () => setGlobalTabSelected(previousSelected)
      });
    }
  }
});
