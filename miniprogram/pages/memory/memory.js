const memoryService = require("../../services/memory");
const { patchTabBarIfNeeded } = require("../../utils/tabBarSync");
const {prepareMemoryImages, prepareMemoryImageWindow, scheduleMemoryImageWindow, pauseMemoryImages, releaseMemoryImages} = require("../../services/memoryImages");
const {createMemoryCardPresentation, masonryColumns} = require("../../utils/memoryCardPresentation");

Page({
  data: {
    top: 0,
    items: [],
    imageSources: {},
    coverStates: {},
    skeletonShimmerRunning: false,
    loading: false,
    error: "",
    refreshing: false,
    hasMore: true,
    gridGap: 8,
    cardWidth: 171,
    cardRadius: 12,
    gridPadding: [12, 20, 140, 20],
    webview: false,
    columns: [],
    skeletonItems: [],
    skeletonColumns: [],
  },
  onLoad() {this.onResize();},
  onResize() {
    if (this._unloaded) return;
    const info = wx.getWindowInfo();
    const scale = info.windowWidth / 390;
    this._cardWidth = (info.windowWidth - 48 * scale) / 2;
    const items = this.data.items.map(item => ({...item, coverHeight: Math.round(this._cardWidth * (item.coverRatio || 1))}));
    const skeletonItems = Array.from({length: 6}, (_, index) => ({id: `skeleton-${index}`, skeleton: true,
      coverHeight: this._cardWidth * (index % 2 ? 1.1 : 1.35)}));
    this.setData({
      webview: this.renderer === "webview", items,
      columns: masonryColumns(items, 8 * scale), skeletonItems, skeletonColumns: masonryColumns(skeletonItems, 8 * scale),
      top: info.statusBarHeight || 0,
      gridGap: 8 * scale,
      cardRadius: 12 * scale,
      cardWidth: this._cardWidth,
      gridPadding: [12, 20, 140, 20].map((value) => value * scale),
    }, () => {if (this._loaded) prepareMemoryImageWindow(this);});
  },
  onShow() {
    patchTabBarIfNeeded(this, { selected: 1, hidden: false });
    this._imagesHidden = false;
    const version = getApp().globalData.memoryVersion || 0;
    if (!this._loaded || version !== this._version) {
      if (this.data.loading) this._refreshPending = version !== this._requestVersion;
      else this.load(true);
    }
    this._covers?.resume();
    this._covers?.fetching(this.data.loading);
    prepareMemoryImageWindow(this);
  },
  scroll() {scheduleMemoryImageWindow(this);},
  covers() {
    if (!this._covers) this._covers = createMemoryCardPresentation(this, urls => prepareMemoryImages(this, urls, {concurrency: 3}));
    return this._covers;
  },
  prepareCoverWindow(urls) {this.covers().window(urls);},
  coverLoaded(e) {this._covers?.loaded(e.currentTarget.dataset.url, e.currentTarget.dataset.token);},
  coverFailed(e) {this._covers?.failed(e.currentTarget.dataset.url, e.currentTarget.dataset.token);},
  coverDownloadFailed(url) {this._covers?.failed(url);},
  retryCover(e) {this._covers?.retry(e.currentTarget.dataset.url);},
  releaseCovers() {
    this._covers?.dispose(); this._covers = null;
    releaseMemoryImages(this);
  },
  onHide() {
    this._imagesHidden = true;
    pauseMemoryImages(this, this._covers?.pause() || []);
  },
  onUnload() {
    this._unloaded = true;
    this.releaseCovers();
    this._generation = (this._generation || 0) + 1;
  },
  load(reset = false) {
    if (this._unloaded || this.data.loading || (!reset && !this.data.hasMore)) return Promise.resolve();
    this._lastLoadReset = reset;
    const version = getApp().globalData.memoryVersion || 0;
    if (reset) {this._requestVersion = version; this._refreshPending = false;}
    const generation = (this._generation = (this._generation || 0) + 1);
    this.setData({ loading: true, error: "" });
    this.covers().fetching(true);
    return memoryService
      .list({ individual: true, cursor: reset ? undefined : this._cursor })
      .then((result) => {
        if (this._unloaded || generation !== this._generation) return;
        const incoming = result.items.flatMap(memoryService.mediaCards).map((value) => {
          return {
            ...value,
            coverHeight: Math.round((this._cardWidth || this.data.cardWidth) * value.coverRatio),
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
        if (reset) this.releaseCovers();
        this._cursor = result.cursor;
        this._loaded = true;
        if (reset) this._version = version;
        this.setData({items, columns: masonryColumns(items, this.data.gridGap), hasMore: !!result.cursor}, () => prepareMemoryImageWindow(this));
      })
      .catch((error) => {
        if (!this._unloaded && generation === this._generation)
          this.setData({ error: error.message || "记忆加载失败" });
      })
      .finally(() => {
        if (!this._unloaded && generation === this._generation) {
          this.setData({ loading: false, refreshing: false });
          this._covers?.fetching(false);
          if (this._refreshPending && !this._imagesHidden) return this.load(true);
        }
      });
  },
  refresh() {
    if (!this.data.loading) {
      this.setData({ refreshing: true });
      return this.load(true);
    }
  },
  more() {
    if (!this.data.error) return this.load(false);
  },
  retry() {
    return this.load(this._lastLoadReset || !this._loaded);
  },
  open(e) {
    const item = this.data.items.find(item => item.id === Number(e.currentTarget.dataset.id));
    if (!item) return;
    wx.navigateTo({
      url: `/pages/memory_detail/memory_detail?id=${item.memory_id}&media_id=${item.media_id}`,
      success: result => result.eventChannel.emit("memoryEntry", {id: item.memory_id, mediaId: item.media_id,
        source: this.data.imageSources[item.cover] || item.cover}),
    });
  },
});
