const { patchTabBarIfNeeded } = require("../../utils/tabBarSync");
const { getBottomSafeAreaRpx } = require("../../utils/safeArea");

Page({
  data: {
    statusBarHeight: 0,
    bottomSafeAreaRpx: 0
  },

  onLoad() {
    let statusBarHeight = 0;
    try {
      const info = typeof wx.getWindowInfo === "function" ? wx.getWindowInfo() : wx.getSystemInfoSync();
      statusBarHeight = Number(info.statusBarHeight) || 0;
    } catch (e) {}
    this.setData({ statusBarHeight });
  },

  onShow() {
    this.setData({ bottomSafeAreaRpx: getBottomSafeAreaRpx() });
    patchTabBarIfNeeded(this, { selected: 1, hidden: false });
  },

  onBoardGameTap() {
    wx.navigateTo({ url: "/pages/boardgame_library/boardgame_library" });
  },

  onChwaziTap() {
    wx.navigateTo({ url: "/pages/chwazi/chwazi" });
  }
});
