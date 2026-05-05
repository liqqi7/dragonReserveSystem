const ACTIVITY_LIST_ROUTE = 'pages/activity_list/activity_list';

const TAB_URLS = [
  '/pages/activity_list/activity_list',
  '/pages/activity_calendar/activity_calendar',
  '/pages/history/history',
  '/pages/profile/profile',
];
const TAB_SWITCH_ANIMATION_MS = 180;
/** 略大于指示条 CSS transition（180ms），避免变换未合成完就 switchTab；定时器先于 transitionend */
const TAB_SWITCH_COMMIT_DELAY_MS = TAB_SWITCH_ANIMATION_MS + 40;

/** 已无调用；若有本地/缓存里的旧脚本仍引用，可避免 ReferenceError */
function _agentTabLog() {}

Component({  lifetimes: {
    attached() {
      try {
        const app = getApp();
        if (
          app &&
          app.globalData &&
          typeof app.globalData.tabBarSelected === 'number' &&
          !isNaN(app.globalData.tabBarSelected)
        ) {
          const g = Number(app.globalData.tabBarSelected);
          if (g !== Number(this.data.selected)) {
            this.setData({
              selected: g,
              indicatorTransitionEnabled: false,
            });
          }
        }
      } catch (e) {}
    },
  },

  data: {
    selected: 0,
    isAdmin: false,
    /** 由当前页 getTabBar().setData({ hidden }) 控制（如活动编辑弹窗打开时隐藏） */
    hidden: false,
    /** onTabTap 为 true 时指示条有 transition；页面 patch / attached 恢复时为 false（无过渡瞬间对齐） */
    indicatorTransitionEnabled: true,
  },

  pageLifetimes: {
    show() {
      /**
       * 不在此处 _clearPendingSwitch：若在「点了 Tab、定时器尚未 commit」期间再次触发 show（热身后更易发生），
       * 会误清计时器，造成第二次起的指示器「再抖/似滑两下」。孤儿定时器由下轮 onTap 或 commit 入口清理。
       */
      try {
        const pages = getCurrentPages();
        const top = pages[pages.length - 1];
        const route = top && top.route ? String(top.route) : '';
        /** 仅在非首页 Tab 时自愈：避免出现「已从 activity_list.onHide 切走但 TabBar.hidden 仍为 true」 */
        if (route && route !== ACTIVITY_LIST_ROUTE && this.data.hidden) {
          this.setData({ hidden: false });
        }
      } catch (e) {}
      const isAdmin = getApp().globalData.userRole === 'admin';
      if (this.data.isAdmin !== isAdmin) {
        this.setData({ isAdmin });
      }
    },
  },

  methods: {
    _clearPendingSwitch() {
      if (this._tabSwitchTimer) {
        clearTimeout(this._tabSwitchTimer);
        this._tabSwitchTimer = null;
      }
      this._pendingSwitchIndex = null;
    },

    _commitPendingSwitch() {
      const index = this._pendingSwitchIndex;
      if (index == null) {
        return;
      }
      this._clearPendingSwitch();
      const url = TAB_URLS[index];
      if (!url) return;
      wx.switchTab({ url });
    },

    onTabTap(e) {
      const index = parseInt(e.currentTarget.dataset.index, 10);
      if (!TAB_URLS[index] || index === this.data.selected) return;
      if (index === this._pendingSwitchIndex) return;

      this._clearPendingSwitch();
      this._pendingSwitchIndex = index;
      try {
        const app = getApp();
        if (app && app.globalData) app.globalData.tabBarSelected = index;
      } catch (e) {}
      this.setData({ selected: index, indicatorTransitionEnabled: true });
      this._tabSwitchTimer = setTimeout(() => {
        this._commitPendingSwitch();
      }, TAB_SWITCH_COMMIT_DELAY_MS);
    },
  },
});
