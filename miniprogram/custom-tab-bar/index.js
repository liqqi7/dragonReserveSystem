const ACTIVITY_LIST_ROUTE = "pages/activity_list/activity_list";

const TAB_URLS = [
  "/pages/activity_list/activity_list",
  "/pages/activity_calendar/activity_calendar",
  "/pages/history/history",
  "/pages/profile/profile"
];

Component({
  lifetimes: {
    attached() {
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
    hidden: false
  },

  pageLifetimes: {
    show() {
      try {
        const pages = getCurrentPages();
        const top = pages[pages.length - 1];
        const route = top && top.route ? String(top.route) : "";
        if (route && route !== ACTIVITY_LIST_ROUTE && this.data.hidden) {
          this.setData({ hidden: false });
        }
      } catch (e) {}

      const isAdmin = getApp().globalData.userRole === "admin";
      if (this.data.isAdmin !== isAdmin) {
        this.setData({ isAdmin });
      }
    }
  },

  methods: {
    onTabTap(e) {
      const index = Number.parseInt(e.currentTarget.dataset.index, 10);
      if (!TAB_URLS[index] || index === this.data.selected) return;

      try {
        const app = getApp();
        if (app && app.globalData) app.globalData.tabBarSelected = index;
      } catch (error) {}

      this.setData({ selected: index });
      wx.switchTab({ url: TAB_URLS[index] });
    }
  }
});
