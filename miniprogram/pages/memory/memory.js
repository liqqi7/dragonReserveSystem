const memoryService = require("../../services/memory");
const { patchTabBarIfNeeded } = require("../../utils/tabBarSync");
const {prepareMemoryImageWindow, scheduleMemoryImageWindow, releaseMemoryImages} = require("../../services/memoryImages");

Page({
  data: {
    top: 0,
    items: [],
    imageSources: {},
    loading: false,
    error: "",
    refreshing: false,
    hasMore: true,
    gridGap: 8,
    cardWidth: 171,
    cardRadius: 12,
    gridPadding: [12, 20, 140, 20],
  },
  onLoad() {
    const info = wx.getWindowInfo();
    const scale = info.windowWidth / 390;
    this._cardWidth = (info.windowWidth - 48 * scale) / 2;
    this.setData({
      top: info.statusBarHeight || 0,
      gridGap: 8 * scale,
      cardRadius: 12 * scale,
      cardWidth: this._cardWidth,
      gridPadding: [12, 20, 140, 20].map((value) => value * scale),
    });
  },
  onShow() {
    this._imagesHidden = false;
    patchTabBarIfNeeded(this, { selected: 1, hidden: false });
    const version = getApp().globalData.memoryVersion || 0;
    if (!this._loaded || version !== this._version) this.load(true);
    this._version = version;
    prepareMemoryImageWindow(this);
  },
  scroll() {scheduleMemoryImageWindow(this);},
  onHide() {
    this._imagesHidden = true;
    releaseMemoryImages(this);
  },
  onUnload() {
    this._unloaded = true;
    releaseMemoryImages(this);
    this._generation = (this._generation || 0) + 1;
  },
  load(reset = false) {
    if (this.data.loading || (!reset && !this.data.hasMore)) return;
    if (reset) releaseMemoryImages(this);
    const generation = (this._generation = (this._generation || 0) + 1);
    this.setData({ loading: true, error: "" });
    memoryService
      .list({ individual: true, cursor: reset ? undefined : this._cursor })
      .then((result) => {
        if (this._unloaded || generation !== this._generation) return;
        const incoming = result.items.flatMap(memoryService.mediaCards).map((value) => {
          return {
            ...value,
            coverHeight: Math.round(this._cardWidth * value.coverRatio),
          };
        });
        const items = reset ? [] : this.data.items.slice();
        const seen = new Set(items.map((item) => item.id));
        incoming.forEach((item) => {
          if (!seen.has(item.id)) {
            items.push(item);
            seen.add(item.id);
          }
        });
        this._cursor = result.cursor;
        this._loaded = true;
        this.setData({ items, hasMore: !!result.cursor }, () => prepareMemoryImageWindow(this));
      })
      .catch((error) => {
        if (!this._unloaded && generation === this._generation)
          this.setData({ error: error.message || "记忆加载失败" });
      })
      .finally(() => {
        if (!this._unloaded && generation === this._generation)
          this.setData({ loading: false, refreshing: false });
      });
  },
  refresh() {
    if (!this.data.loading) {
      this.setData({ refreshing: true });
      this.load(true);
    }
  },
  more() {
    this.load(false);
  },
  retry() {
    this.load(!this._loaded);
  },
  open(e) {
    const item = this.data.items.find(item => item.id === Number(e.currentTarget.dataset.id));
    if (!item) return;
    wx.navigateTo({
      url: `/pages/memory_detail/memory_detail?id=${item.memory_id}&media_id=${item.media_id}`,
    });
  },
});
