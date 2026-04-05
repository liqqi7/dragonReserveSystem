const ROUTES = [
  'pages/activity_list/activity_list',
  'pages/history/history',
  'pages/profile/profile',
];

const TAB_URLS = [
  '/pages/activity_list/activity_list',
  '/pages/history/history',
  '/pages/profile/profile',
];

Component({
  data: {
    selected: 0,
    isAdmin: false,
  },

  pageLifetimes: {
    show() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const route = currentPage ? currentPage.route : '';
      const idx = ROUTES.indexOf(route);
      const isAdmin = getApp().globalData.userRole === 'admin';
      this.setData({ selected: idx >= 0 ? idx : 0, isAdmin });
    },
  },

  methods: {
    onTabTap(e) {
      const index = parseInt(e.currentTarget.dataset.index, 10);
      if (index === this.data.selected) return;
      wx.switchTab({ url: TAB_URLS[index] });
    },

    onCreateTap() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      if (currentPage && typeof currentPage.showCreateModal === 'function') {
        currentPage.showCreateModal();
      }
    },
  },
});
