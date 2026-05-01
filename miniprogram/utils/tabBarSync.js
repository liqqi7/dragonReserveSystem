/**
 * 仅在值变化时更新自定义 TabBar。
 * 页面 patch 时对指示条关掉 transition（indicatorTransitionEnabled:false），与 onTabTap 的滑动动画分离，避免叠成双段动画；
 * patch 必须与路由一致写入 selected，不可用 global 「跳过」误判（曾与页面不同步）。
 */
function patchTabBarIfNeeded(pageCtx, patch) {
  const tb =
    typeof pageCtx.getTabBar === "function" ? pageCtx.getTabBar() : null;
  if (!tb || !patch) return {};
  const cur = tb.data || {};
  const next = {};
  let app = null;
  try {
    app = typeof getApp === "function" ? getApp() : null;
  } catch (e) {
    app = null;
  }

  if (
    patch.selected !== undefined &&
    Number(patch.selected) !== Number(cur.selected)
  ) {
    const desired = Number(patch.selected);
    next.selected = patch.selected;
    next.indicatorTransitionEnabled = false;
    try {
      if (app && app.globalData) {
        app.globalData.tabBarSelected = desired;
      }
    } catch (e) {}
  }
  if (patch.isAdmin !== undefined && patch.isAdmin !== cur.isAdmin) {
    next.isAdmin = patch.isAdmin;
  }
  if (Object.keys(next).length) {
    tb.setData(next);
  }
  return next;
}

module.exports = {
  patchTabBarIfNeeded,
};
