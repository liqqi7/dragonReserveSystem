const activityService = require("../../services/activity");
const { setActivityCoverPreviewSession } = require("../../utils/activityCoverPreviewSession");
const { createHomeCardMediaLoader } = require("../../utils/homeCardMediaLoader");
const { prepareHomeImage, invalidateHomeImageCache } = require("../../utils/homeImagePreparation");
const { rankActivityCoverImages } = require("../../utils/activityCoverImagePriority");

let catalogCache = null;
let catalogPromise = null;

function normalizeCatalog(value) {
  if (!Array.isArray(value)) return [];
  return value.map((artist) => ({
    slug: String(artist.slug || ""),
    displayName: String(artist.display_name || artist.displayName || ""),
    avatarUrl: String(artist.avatar_url || artist.avatarUrl || ""),
    displayAvatarUrl: "",
    avatarLoadFailed: false,
    artworks: (Array.isArray(artist.artworks) ? artist.artworks : []).map((artwork, artworkIndex) => ({
      id: String(artwork.id || ""),
      artistSlug: String(artwork.artist_slug || artwork.artistSlug || artist.slug || ""),
      artistName: String(artwork.artist_name || artwork.artistName || artist.display_name || ""),
      artistAvatarUrl: String(artwork.artist_avatar_url || artwork.artistAvatarUrl || artist.avatar_url || ""),
      width: Number(artwork.width) || 0,
      height: Number(artwork.height) || 0,
      thumbnailUrl: String(artwork.thumbnail_url || artwork.thumbnailUrl || ""),
      imageUrl: String(artwork.image_url || artwork.imageUrl || ""),
      displayUrl: "",
      imageLoadFailed: false,
      enterDelayMs: artworkIndex * 200
    })).filter((artwork) => artwork.id && artwork.thumbnailUrl && artwork.imageUrl)
  })).filter((artist) => artist.slug && artist.artworks.length);
}

function loadCatalog() {
  if (catalogCache) return Promise.resolve(catalogCache);
  if (catalogPromise) return catalogPromise;
  catalogPromise = activityService.listActivityCovers()
    .then((result) => {
      catalogCache = normalizeCatalog(result);
      return catalogCache;
    })
    .finally(() => {
      catalogPromise = null;
    });
  return catalogPromise;
}

Component({
  options: { styleIsolation: "isolated" },

  properties: {
    visible: { type: Boolean, value: false },
    value: { type: String, value: "" },
    embedded: { type: Boolean, value: false }
  },

  data: {
    containerRendered: false,
    containerVisible: false,
    loading: false,
    loadFailed: false,
    skeletonGroups: [0, 1, 2],
    skeletonCards: [0, 1, 2],
    previewTransitionDuration: 360,
    artists: [],
    selectedId: ""
  },

  observers: {
    "visible, value": function (visible, value) {
      if (visible) {
        this.setData({ selectedId: String(value || "") });
        this.loadAndMount();
      } else {
        this.unmountContainer();
      }
    }
  },

  lifetimes: {
    attached() {
      if (this.properties.visible) this.loadAndMount();
    },
    detached() {
      if (this._leaveTimer) clearTimeout(this._leaveTimer);
      this._stopCoverImageObservation();
      if (this._coverImageLoader) this._coverImageLoader.dispose();
      this._coverImageLoader = null;
    }
  },

  pageLifetimes: {
    show() {
      this._coverPageHidden = false;
      if (this.properties.visible && this.data.artists.length && this._coverImageLoader) {
        this._observeCoverVisibility();
      }
    },
    hide() {
      this._coverPageHidden = true;
      this._stopCoverImageObservation();
      if (this._coverImageLoader) this._coverImageLoader.pause();
    }
  },

  methods: {
    loadAndMount() {
      if (this.data.artists.length) {
        this.setData({ loading: false, loadFailed: false }, () => {
          this.mountContainer(() => this._activateCoverImageLoading());
        });
        return;
      }
      if (catalogCache) {
        this.setData({ artists: normalizeCatalog(catalogCache), loading: false, loadFailed: false }, () => {
          this.mountContainer(() => this._activateCoverImageLoading());
        });
        return;
      }
      this.setData({ loading: true, loadFailed: false }, () => {
        this.mountContainer();
      });
      loadCatalog()
        .then((artists) => {
          if (!this.properties.visible) return;
          this.setData({ artists: normalizeCatalog(artists), loading: false, loadFailed: false }, () => this._activateCoverImageLoading());
        })
        .catch(() => {
          if (!this.properties.visible) return;
          this.setData({ loading: false, loadFailed: true });
        });
    },

    retryLoad() {
      catalogCache = null;
      this.loadAndMount();
    },

    mountContainer(afterMount) {
      if (this._leaveTimer) clearTimeout(this._leaveTimer);
      this.setData({ containerRendered: true, containerVisible: false }, () => {
        wx.nextTick(() => {
          if (this.properties.visible) {
            this.setData({ containerVisible: true }, () => {
              if (typeof afterMount === "function") wx.nextTick(afterMount);
            });
          }
        });
      });
    },

    unmountContainer() {
      this._stopCoverImageObservation();
      if (this._coverImageLoader) this._coverImageLoader.pause();
      this.setData({ containerVisible: false });
      if (!this.properties.embedded) return;
      if (this._leaveTimer) clearTimeout(this._leaveTimer);
      this._leaveTimer = setTimeout(() => {
        this._leaveTimer = null;
        if (!this.properties.visible) this.setData({ containerRendered: false });
      }, 240);
    },

    onContainerAfterLeave() {
      if (!this.properties.visible) this.setData({ containerRendered: false });
    },

    _ensureCoverImageLoader() {
      if (this._coverImageLoader) return;
      this._coverImageLoader = createHomeCardMediaLoader({
        concurrency: 3,
        load: (url, ready, failed, context) => prepareHomeImage({
          wxApi: wx,
          url,
          ready,
          failed,
          stage: (name, details) => context.report(name, details)
        }),
        onReady: (url, path) => this._markCoverImageReady(url, path),
        onError: () => {},
        onExhausted: (url) => this._markCoverImageFailed(url)
      });
    },

    _activateCoverImageLoading() {
      if (!this.properties.visible || !this.data.artists.length) return;
      this._ensureCoverImageLoader();
      this._coverImageLoader.pause();
      this._visibleCoverIds = new Set();
      this._coverVisibilityKnown = false;
      if (!this._coverPageHidden) this._observeCoverVisibility();
    },

    _observeCoverVisibility() {
      this._stopCoverImageObservation();
      this._visibleCoverIds = new Set();
      this._coverVisibilityKnown = false;
      const finishCollection = () => {
        if (!this.properties.visible) return;
        this._coverVisibilityKnown = this._visibleCoverIds.size > 0;
        this._prepareCoverImages();
      };
      this._coverVisibilityTimer = setTimeout(finishCollection, 80);
      if (typeof this.createIntersectionObserver !== "function") return;
      try {
        this._coverVisibilityObserver = this.createIntersectionObserver({
          observeAll: true,
          thresholds: [0, 0.01]
        });
        this._coverVisibilityObserver
          .relativeTo(".cover-sheet-content")
          .observe(".cover-artwork", (result) => {
            const id = String((result && result.dataset && result.dataset.coverId) || "");
            if (!id) return;
            if (Number(result.intersectionRatio) > 0) this._visibleCoverIds.add(id);
            else this._visibleCoverIds.delete(id);
            clearTimeout(this._coverPriorityTimer);
            this._coverPriorityTimer = setTimeout(() => {
              this._coverVisibilityKnown = true;
              this._prepareCoverImages();
            }, 40);
          });
      } catch (_) {
        this._coverVisibilityObserver = null;
      }
    },

    _stopCoverImageObservation() {
      clearTimeout(this._coverVisibilityTimer);
      clearTimeout(this._coverPriorityTimer);
      this._coverVisibilityTimer = null;
      this._coverPriorityTimer = null;
      if (this._coverVisibilityObserver) this._coverVisibilityObserver.disconnect();
      this._coverVisibilityObserver = null;
    },

    _prepareCoverImages({ retryFailed = false } = {}) {
      if (!this.properties.visible || this._coverPageHidden || !this._coverImageLoader) return;
      const ranked = rankActivityCoverImages({
        artists: this.data.artists,
        visibleIds: this._visibleCoverIds,
        visibilityKnown: !!this._coverVisibilityKnown
      });
      const rankedUrls = [];
      const foregroundUrls = [];
      const avatarSeen = new Set();
      ranked.forEach((item) => {
        const artist = this.data.artists[item.artistIndex];
        if (artist && artist.avatarUrl && !artist.displayAvatarUrl && !avatarSeen.has(artist.avatarUrl)) {
          avatarSeen.add(artist.avatarUrl);
          rankedUrls.push(artist.avatarUrl);
          if (item.priority === 0) foregroundUrls.push(artist.avatarUrl);
        }
        const artwork = artist && artist.artworks[item.artworkIndex];
        if (artwork && !artwork.displayUrl) rankedUrls.push(item.url);
        if (item.priority === 0) foregroundUrls.push(item.url);
      });
      this._coverImageLoader.enqueue(rankedUrls, {
        retryFailed,
        prioritize: true,
        foregroundUrls
      });
      this._coverImageLoader.resume();
    },

    _markCoverImageReady(url, path) {
      const patch = {};
      this.data.artists.forEach((artist, artistIndex) => {
        if (artist.avatarUrl === url) {
          patch[`artists[${artistIndex}].displayAvatarUrl`] = path || url;
          patch[`artists[${artistIndex}].avatarLoadFailed`] = false;
        }
        artist.artworks.forEach((artwork, artworkIndex) => {
          if (artwork.imageUrl !== url) return;
          patch[`artists[${artistIndex}].artworks[${artworkIndex}].displayUrl`] = path || url;
          patch[`artists[${artistIndex}].artworks[${artworkIndex}].imageLoadFailed`] = false;
        });
      });
      if (Object.keys(patch).length) this.setData(patch);
    },

    _markCoverImageFailed(url) {
      const patch = {};
      this.data.artists.forEach((artist, artistIndex) => {
        if (artist.avatarUrl === url) patch[`artists[${artistIndex}].avatarLoadFailed`] = true;
        artist.artworks.forEach((artwork, artworkIndex) => {
          if (artwork.imageUrl === url) patch[`artists[${artistIndex}].artworks[${artworkIndex}].imageLoadFailed`] = true;
        });
      });
      if (Object.keys(patch).length) this.setData(patch);
    },

    onCoverImageError(e) {
      const url = String((e.currentTarget.dataset && e.currentTarget.dataset.url) || "");
      if (!url) return;
      invalidateHomeImageCache(wx, url);
      const patch = {};
      this.data.artists.forEach((artist, artistIndex) => {
        if (artist.avatarUrl === url) {
          patch[`artists[${artistIndex}].displayAvatarUrl`] = "";
          patch[`artists[${artistIndex}].avatarLoadFailed`] = false;
        }
        artist.artworks.forEach((artwork, artworkIndex) => {
          if (artwork.imageUrl !== url) return;
          patch[`artists[${artistIndex}].artworks[${artworkIndex}].displayUrl`] = "";
          patch[`artists[${artistIndex}].artworks[${artworkIndex}].imageLoadFailed`] = false;
        });
      });
      const retryReady = this._coverImageLoader && this._coverImageLoader.invalidateReady(url);
      this.setData(patch, () => {
        if (!retryReady) this._coverImageLoader?.enqueue([url], { retryFailed: true, prioritize: true, foregroundUrls: [url] });
      });
    },

    stopPropagation() {},

    onClose() {
      this.triggerEvent("close");
    },

    onSelect(e) {
      const id = String(e.currentTarget.dataset.id || "");
      if (id) this.setData({ selectedId: id });
    },

    onPreview(e) {
      const artistIndex = Number(e.currentTarget.dataset.artistIndex);
      const artworkIndex = Number(e.currentTarget.dataset.artworkIndex);
      const artist = this.data.artists[artistIndex];
      if (!artist || !artist.artworks[artworkIndex]) return;
      const artwork = artist.artworks[artworkIndex];
      setActivityCoverPreviewSession({ artist, artworkIndex });

      const openPreview = (openContainer) => {
        const options = {
          url: "/pages/activity_cover_preview/activity_cover_preview",
          events: {
            disableActivityCoverPreviewReturnTransition: () => {
              this.setData({ previewTransitionDuration: 0 });
            },
            selectActivityCover: (selectedArtwork) => {
              if (!selectedArtwork || !selectedArtwork.id) return;
              this.setData({ selectedId: String(selectedArtwork.id) }, () => {
                this.triggerEvent("confirm", selectedArtwork);
              });
            }
          }
        };
        if (openContainer) options.withOpenContainer = openContainer;
        wx.navigateTo(options);
      };

      this.setData({ previewTransitionDuration: 360 }, () => {
        this.createSelectorQuery()
          .select(`#coverPreviewTransition-${artistIndex}-${artworkIndex}`)
          .node()
          .exec((result) => {
            const openContainer = result && result[0] && result[0].node;
            openPreview(openContainer || null);
          });
      });
    },

    onConfirm() {
      const selectedId = this.data.selectedId;
      for (const artist of this.data.artists) {
        const artwork = artist.artworks.find((item) => item.id === selectedId);
        if (artwork) {
          this.triggerEvent("confirm", artwork);
          return;
        }
      }
      wx.showToast({ title: "请选择活动封面", icon: "none" });
    }
  }
});

module.exports = { normalizeCatalog };
