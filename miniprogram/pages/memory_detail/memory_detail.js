const memory = require("../../services/memory");
const { getBottomSafeAreaRpx, getBottomContentInsetRpx } = require("../../utils/safeArea");
const { logPageError } = require("../../services/logger");
const {createPreviewMedia} = require("../../services/memoryPreviewMedia");
const {acquirePreviewMedia, releasePreviewMedia, bindPreviewResources} = require("../../services/memoryPreviewSession");
const {memoryShareImage} = require("../../services/memoryShareImage");
const {workletRuntime} = require("../../utils/workletCompat");
const {shared, runOnJS, timing, cancelAnimation, Easing} = workletRuntime(wx.worklet);

const {captionParts} = require("../../utils/wechatEmoji");

const timeLabel = memory.durationLabel;

function slideInfo(submission) {
  const {author, caption = "", activity_name = "", activityTime = "", location_name = "", status = "", statusLabel = ""} = submission;
  return {author, caption, captionParts: captionParts(caption), activity_name, activityTime, location_name, status, statusLabel};
}

function doubleTapPhoto(scale, photo, frame, x, y) {
  "worklet";
  if (scale > 1) return {scale: 1, x: 0, y: 0};
  const maxX = Math.max(0, photo.width - frame.width / 2);
  const maxY = Math.max(0, photo.height - frame.height / 2);
  return {scale: 2,
    x: Math.max(-maxX, Math.min(maxX, frame.width / 2 - x)),
    y: Math.max(-maxY, Math.min(maxY, frame.height / 2 - y))};
}

Page({
  data: {
    top: 0,
    bottom: 0,
    reviewBottomInsetRpx: 0,
    memory: null,
    admin: false,
    index: 0,
    error: "",
    revalidationFailed: false,
    entrySource: "",
    loading: false,
    reviewComplete: false,
    selected: [],
    reviewed: false,
    busy: false,
    current: null,
    viewerMedia: [],
    viewerInfo: [],
    imageSources: {},
    photoReady: false,
    mediaLoading: false,
    loadingIndicatorVisible: false,
    zoomed: false,
    fullScreen: false,
    playing: false,
    muted: false,
    visible: false,
    videoSource: "",
    videoPoster: "",
    videoMounted: false,
    videoLoading: false,
    videoBuffering: false,
    videoInitialTime: 0,
    videoGeneration: 0,
    pausedByUser: false,
    controlsVisible: true,
    seeking: false,
    seekGesture: false,
    seekForward: true,
    progress: 0,
    progressVisible: false,
    seekCurrentLabel: "00:00",
    seekDurationLabel: "00:00",
    currentLabel: "0:00",
    durationLabel: "0:00",
    bubbleLeft: 50,
    selectionOpen: false,
    photoWidth: 0,
    photoHeight: 0,
    photoLeft: 0,
    photoTop: 0,
    photoPointerState: null,
    videoPointerState: null,
  },
  onLoad(options) {
    this._id = Number(options.id);
    this._admin = options.admin === "1";
    this._mediaId = this._admin ? Number(options.media_id) || null : null;
    this._initialMediaId = !this._admin ? Number(options.media_id) || null : null;
    // Shared links have no opener; the channel is only an optional thumbnail handoff.
    const opener = !this._admin && this.getOpenerEventChannel?.();
    if (opener && typeof opener.on === "function") opener.on("memoryEntry", entry => {
      if (this._unloaded || this.data.memory || entry.id !== this._id || entry.mediaId !== this._initialMediaId) return;
      this.setViewerData({entrySource: entry.source || ""});
    });
    const info = wx.getWindowInfo();
    this._windowWidth = info.windowWidth || 390;
    this._scale = shared(1);
    this._zoomTarget = shared(1);
    this._progress = shared(0);
    this._playback = shared({time: 0, duration: 0});
    this._seekMotion = shared({start: 0, delta: 0, duration: 0});
    this._x = shared(0);
    this._y = shared(0);
    this._pinching = shared(false);
    this._portraitDragging = shared(false);
    this._portraitGestureGeneration = shared(0);
    this._portraitState = shared({allowed: false, generation: 0});
    let tracePortrait = false;
    try { tracePortrait = wx.getAccountInfoSync().miniProgram.envVersion === "develop"; } catch (_) {}
    this._portraitTraceEnabled = shared(tracePortrait);
    this._pinchBase = shared({ scale: 1, x: 0, y: 0, focalX: 0, focalY: 0 });
    this._frame = shared({
      width: this._windowWidth,
      height: info.windowHeight || 844,
    });
    this._photo = shared({
      width: this._windowWidth,
      height: info.windowHeight || 844,
    });
    this.setViewerData({
      admin: this._admin,
      top: wx.getWindowInfo().statusBarHeight || 0,
      bottom: getBottomSafeAreaRpx(),
      reviewBottomInsetRpx: this.renderer === "webview" ? Math.max(0, getBottomContentInsetRpx() - 23.08) : getBottomSafeAreaRpx(),
    });
    this.tracePortraitSeek("mounted");
  },
  setViewerData(patch, callback) {
    const next = {...this.data, ...patch};
    if (next.error || !next.visible) {
      clearTimeout(this._mediaDeadline); this._mediaDeadline = null;
    }
    patch = {...patch, mediaLoading: !!(next.visible && !next.error && !next.reviewComplete &&
      (next.loading && !next.memory || next.current?.kind === "image" && next.current.url && !next.photoReady ||
       next.current?.kind === "video" && !next.pausedByUser && next.videoBuffering))};
    const loadingKey = patch.mediaLoading ? `${this._generation || 0}:${this._videoGeneration || 0}:${next.current?.id || "detail"}` : null;
    if (!loadingKey || loadingKey !== this._loadingKey) {
      clearTimeout(this._loadingTimer); this._loadingTimer = null;
      this._loadingKey = loadingKey;
      patch.loadingIndicatorVisible = false;
    }
    if (loadingKey && !this._loadingTimer && !(patch.loadingIndicatorVisible ?? next.loadingIndicatorVisible)) {
      const timer = setTimeout(() => {
        if (this._loadingTimer !== timer || this._unloaded || !this._visible ||
            this._loadingKey !== loadingKey || !this.data.mediaLoading) return;
        this._loadingTimer = null;
        this.setViewerData({loadingIndicatorVisible: true});
      }, next.current?.kind === "video" && !this._videoProgressed ? 500 : 180);
      this._loadingTimer = timer;
    }
    if (this._portraitState) {
      const allowed = !!(!this._unloaded && this._visible && next.visible &&
        next.current && next.current.kind === "video" && !next.fullScreen &&
        !next.videoLoading && !next.error && !next.selectionOpen && !next.busy);
      const generation = this._videoGeneration || 0;
      const previous = this._portraitState.value;
      if (previous.allowed !== allowed || previous.generation !== generation)
        this._portraitState.value = {allowed, generation};
    }
    if (next.photoPointerState && this.renderer === "webview") {
      const enabled = !!(next.visible && next.zoomed && next.current?.kind === "image" &&
        next.current.id === next.photoPointerState.id && !next.fullScreen && !next.busy &&
        !next.selectionOpen && !next.error && (!next.current.url || next.photoReady));
      if (next.photoPointerState.enabled !== enabled)
        patch.photoPointerState = {...next.photoPointerState, enabled};
    }
    if (this.renderer === "webview") {
      const state = {
        enabled: !!(!this._unloaded && this._visible && next.visible && next.current?.kind === "video" &&
          !next.videoLoading && !next.error && !next.selectionOpen && !next.busy && this._duration > 0),
        id: next.current?.id || 0, generation: this._videoGeneration || 0,
        epoch: this._seekPointerEpoch || 0,
        fullScreen: next.fullScreen, duration: this._duration || 0,
        width: next.fullScreen ? Math.max(this._frame.value.width, this._frame.value.height) : this._frame.value.width * 358 / 390,
        progress: next.progress, seeking: next.seeking,
      };
      if (Object.keys(state).some(key => state[key] !== next.videoPointerState?.[key])) patch.videoPointerState = state;
    } else if (next.videoPointerState) patch.videoPointerState = null;
    this.setData(patch, callback);
  },
  onShow() {
    this._visible = true;
    this._previewLease = acquirePreviewMedia(getApp().globalData, this._admin);
    this._mediaSession = this._previewLease.session;
    this._previewMedia = createPreviewMedia(this._mediaSession, (imageSources, event) => {
      if (this._unloaded || !this._visible) return;
      const current = this.data.current;
      this.setViewerData({imageSources});
      if (event?.error && !event.error.cancelled && current?.kind === "image" && event.url === current.url)
        this.setViewerData({error: "图片加载失败，请刷新重试"});
    });
    this.setViewerData({visible: true});
    this.onResize();
    this.load(true);
  },
  onResize() {
    if (this._unloaded || this.data.fullScreen) return;
    this._seekPointerEpoch = (this._seekPointerEpoch || 0) + 1;
    if (this.data.seeking) this.finishSeek(true);
    clearTimeout(this._progressTimer);
    this._portraitDragging.value = false;
    const info = wx.getWindowInfo();
    this._windowWidth = info.windowWidth || 390;
    this._frame.value = {width: this._windowWidth, height: info.windowHeight || 844};
    this.setViewerData({top: info.statusBarHeight || 0, bottom: getBottomSafeAreaRpx(),
      reviewBottomInsetRpx: this.renderer === "webview" ? Math.max(0, getBottomContentInsetRpx() - 23.08) : getBottomSafeAreaRpx(),
      progressVisible: false}, () => {
      if (this.data.current && this.data.current.kind === "image") {
        this.restorePhoto();
        this.fitPhoto(this.data.current);
      }
    });
  },
  onHide() {
    this._photoPointer = null;
    if (this.data.current?.kind === "video") this._resumeState = {
      mediaId: this.data.current.id, time: this._currentTime || 0,
      pausedByUser: this.data.pausedByUser || this.data.selectionOpen,
    };
    this._generation = (this._generation || 0) + 1;
    this._visible = false;
    this._pointerSeek = null;
    this._portraitProbeTouch = null;
    this._photoTap = null;
    this._videoGeneration = (this._videoGeneration || 0) + 1;
    this.pause();
    const preloader = this._previewMedia;
    const lease = this._previewLease;
    this._portraitDragging.value = false;
    this.setViewerData({visible: false, playing: false, videoMounted: false, videoLoading: false, videoBuffering: false,
      seeking: false, seekGesture: false, progressVisible: false},
      () => {if (preloader) preloader.dispose(); releasePreviewMedia(lease);});
    this.clearTimers();
  },
  onUnload() {
    this._unloaded = true;
    this._photoPointer = null;
    this._pointerSeek = null;
    this._portraitProbeTouch = null;
    this._portraitDragging.value = false;
    this._portraitState.value = {allowed: false, generation: (this._videoGeneration || 0) + 1};
    this._photoTap = null;
    this._generation = (this._generation || 0) + 1;
    this._videoGeneration = (this._videoGeneration || 0) + 1;
    this.pause();
    this._previewMedia?.dispose();
    releasePreviewMedia(this._previewLease);
    this.clearTimers();
  },
  clearTimers() {
    clearTimeout(this._loadingTimer); this._loadingTimer = null; this._loadingKey = null;
    clearTimeout(this._controlsTimer);
    clearTimeout(this._progressTimer);
    clearTimeout(this._videoWarmTimer); this._videoWarmTimer = null;
    clearTimeout(this._mediaDeadline); this._mediaDeadline = null;
    this.stopVideoProgress();
    for (const value of [this._scale, this._x, this._y, this._progress]) {
      if (value) cancelAnimation(value);
    }
  },
  pause() {
    this._playRequested = false;
    this.stopVideoProgress();
    if (typeof wx.createVideoContext === "function")
      wx.createVideoContext("memory-video", this).pause();
  },
  async load(preferCached = false) {
    if (this._unloaded) return;
    if (this._reviewAfterAction) return this.nextReview();
    const previous = this.data.memory;
    const selection = this.data.selected.slice();
    const reviewed = this.data.reviewed;
    const cached = preferCached === true && !this._admin ? this._previewLease?.detail(this._id) : null;
    const cachedResult = cached && memory.presentation(cached);
    const target = this._initialMediaId || this._resumeState?.mediaId || this.data.current?.id;
    const cachedIndex = cachedResult ? target ? cachedResult.media.findIndex(item => item.id === target) : 0 : -1;
    const cachedCurrent = cachedResult?.media[cachedIndex];
    const warm = cachedCurrent && this._mediaSession.source(cachedCurrent.url);
    const generation = (this._generation = (this._generation || 0) + 1);
    this._publicQueue = null;
    this._publicCursor = null;
    this._publicQueueLoading = false;
    this._reviewQueue = null;
    this._reviewCursor = null;
    this._queueLoading = false;
    this.pause();
    this._videoGeneration = (this._videoGeneration || 0) + 1;
    if (warm) this._initialMediaId = null;
    this.setViewerData({
      loading: true,
      reviewComplete: false,
      error: "",
      revalidationFailed: false,
      memory: warm ? cachedResult : null,
      current: null,
      photoReady: false,
      viewerMedia: warm ? cachedResult.media : [],
      viewerInfo: warm ? cachedResult.media.map(() => slideInfo(cachedResult)) : [],
      ...(warm ? {index: cachedIndex} : {}),
      videoSource: "",
      videoMounted: false,
      videoLoading: false,
      fullScreen: false,
      selected: [],
      reviewed: false,
      selectionOpen: false,
    }, () => {
      this._previewMedia?.update(null, null);
      if (warm) this.activate();
    });
    try {
      const submission = await memory.detail(this._id, this._admin);
      if (this._unloaded || generation !== this._generation) return;
      if (this._mediaId) {
        const item = submission.media.find((item) => item.id === this._mediaId);
        if (!item || item.state === "cleaned" || item.state === "removed")
          throw Object.assign(new Error("这份内容已不可用，请返回审核列表刷新"), {statusCode: 404});
        submission.media = [item];
        submission.media_count = 1;
        submission.status = memory.mediaReviewStatus(item, submission.status);
      }
      let result = memory.presentation(submission);
      let viewerMedia = result.media;
      let index = Math.min(this.data.index, Math.max(0, viewerMedia.length - 1));
      if (warm) {
        index = viewerMedia.findIndex(item => item.id === this.data.current?.id);
        if (index < 0) throw Object.assign(new Error("这份内容已不可用或已下架"), {statusCode: 404});
      }
      if (!this._admin && target && !warm) {
        index = viewerMedia.findIndex(item => item.id === target);
        if (index < 0) throw Object.assign(new Error("这份内容已不可用或已下架"), {statusCode: 404});
      }
      if (this._mediaId && result.status === "pending") {
        const queue = [];
        let cursor;
        const seen = new Set();
        do {
          const batch = await memory.list({status: "pending", individual: true, cursor}, true);
          if (this._unloaded || generation !== this._generation) return;
          batch.items.flatMap(memory.reviewCards).forEach((card) => {
            if (!seen.has(card.id)) {queue.push(card); seen.add(card.id);}
          });
          cursor = batch.cursor;
        } while (cursor && !seen.has(this._mediaId));
        const currentCard = memory.reviewCards(submission)[0];
        index = queue.findIndex((card) => card.id === this._mediaId);
        if (index < 0) {queue.unshift(currentCard); index = 0;}
        else queue[index] = currentCard;
        this._reviewQueue = queue;
        this._reviewCursor = cursor;
        result = {...queue[index], id: queue[index].memory_id};
        viewerMedia = queue.map((card) => card.media[0]);
      }
      if (this._unloaded || generation !== this._generation) return;
      if (!this._admin) this._previewLease?.rememberDetail(submission);
      if (this._resumeState) {
        const resumed = viewerMedia.findIndex(item => item.id === this._resumeState.mediaId);
        if (resumed < 0) throw Object.assign(new Error("这份内容已不可用或已下架"), {statusCode: 404});
        index = resumed;
      }
      this._initialMediaId = null;
      const unchanged = previous && previous.revision === result.revision;
      const selected = unchanged
        ? selection.filter((id) =>
            result.media.some((item) => item.id === id && item.selectable),
          )
        : [];
      result.media = result.media.map((item) => ({
        ...item,
        selected: selected.includes(item.id),
      }));
      if (this._reviewQueue) this._reviewQueue[index] = {...this._reviewQueue[index], media: result.media};
      const current = viewerMedia[index];
      const active = this.data.current;
      const reuse = warm && current && ["id", "kind", "width", "height", "duration"].every(key => current[key] === active?.[key]) &&
        (current.content_version ? current.content_version === active?.content_version :
          result.revision === this.data.memory?.revision && current.url === active?.url);
      this.setViewerData(
        {
          memory: result,
          viewerMedia,
          viewerInfo: this._reviewQueue ? this._reviewQueue.map(slideInfo) : viewerMedia.map(() => slideInfo(result)),
          index,
          selected,
          reviewed: !!unchanged && reviewed,
          ...(reuse ? {current} : {}),
        },
        () => {
          if (reuse) this.preparePreviewMedia();
          else this.activate();
        },
      );
      if (!this._admin && typeof wx.showShareMenu === "function")
        wx.showShareMenu({ menus: ["shareAppMessage"] });
      if (!this._admin) await this.loadPublicContent(submission, generation);
    } catch (error) {
      if (!this._unloaded && generation === this._generation) {
        const revoked = [401, 403, 404, 410].includes(error.statusCode);
        if (warm && !revoked) {
          this.setViewerData({revalidationFailed: true});
          return;
        }
        if (!this._admin) this._previewLease?.forgetDetail(this._id);
        if (warm) {
          this.pause();
          this._previewMedia?.update(null, null);
          for (const item of cachedResult.media) for (const url of [item.url, item.thumbnail_url])
            if (url) this._mediaSession.invalidate(url);
          this._videoGeneration = (this._videoGeneration || 0) + 1;
          this.setViewerData({memory: null, current: null, viewerMedia: [], viewerInfo: [],
            videoMounted: false, videoSource: "", playing: false});
        }
        this.setViewerData({error: error.message || "记忆暂不可用", entrySource: ""});
      }
    } finally {
      if (!this._unloaded && generation === this._generation)
        this.setViewerData({ loading: false });
    }
  },
  back() {
    if (this.data.busy) return;
    if (this.data.selectionOpen) {
      this.closeSelection();
      return;
    }
    if (this.data.fullScreen) {
      this.exitFullScreen();
      return;
    }
    if (this.data.zoomed) {
      this.restorePhoto();
      return;
    }
    wx.navigateBack({
      fail: () => wx.switchTab({ url: "/pages/memory/memory" }),
    });
  },
  revalidate() {return this.load(true);},
  change(e) {
    if (this.data.zoomed || this.data.fullScreen || this.data.seeking || this.data.selectionOpen || this.data.busy) return;
    const index = e.detail.current;
    const items = this.data.viewerMedia.length ? this.data.viewerMedia : this.data.memory.media;
    const current = items[index];
    if (!current) return;
    if (index === this.data.index && current.id === this.data.current?.id) return;
    this.pause();
    // Commit index, current media and generation together before cached images can emit bindload.
    this.activate(index);
  },
  activate(index = this.data.index) {
    if (this._unloaded || !this.data.memory) return;
    this.clearTimers();
    this.restorePhoto();
    const queueCard = (this._reviewQueue || this._publicQueue)?.[index];
    const current = queueCard ? queueCard.media[0] : this.data.memory.media[index];
    if (!current) return;
    const changed = this._reviewQueue && current.id !== this._mediaId;
    if (queueCard) {
      this._id = queueCard.memory_id;
      if (this._admin) this._mediaId = current.id;
    }
    const resume = this._resumeState?.mediaId === current.id ? this._resumeState : null;
    this._resumeState = null;
    this._currentTime = resume ? Math.max(0, Math.min(Number(resume.time) || 0,
      Number(current.duration) > 0 ? Number(current.duration) - 0.05 : Infinity)) : 0;
    this._duration = Number(current.duration) || 0;
    this._progress.value = this._duration ? this._currentTime / this._duration * 100 : 0;
    this._playback.value = {time: this._currentTime, duration: this._duration};
    this._seekWasPlaying = false;
    this._seekPortrait = false;
    this._pointerSeek = null;
    this._portraitProbeTouch = null;
    this._portraitDragging.value = false;
    const videoGeneration = this._videoGeneration = (this._videoGeneration || 0) + 1;
    this._restoreVideoPosition = {generation: videoGeneration, time: this._currentTime};
    this._videoWarmReady = false;
    this._videoProgressed = false;
    bindPreviewResources(this, !!this._retainReviewFiles, index);
    this._retainReviewFiles = false;
    this._videoRetries = 0;
    this.setViewerData(
      {
        ...(queueCard ? {memory: {...queueCard, id: queueCard.memory_id}} : {}),
        ...(changed ? {selected: [], reviewed: false, selectionOpen: false, error: ""} : {}),
        current,
        index,
        ...(this.data.current && this.data.current.id !== current.id ? {entrySource: ""} : {}),
        photoReady: current.kind === "image" && !!this._previewLease?.photoReady(current.url),
        playing: false,
        muted: false,
        error: "",
        videoSource: "",
        videoPoster: /^https:\/\//i.test(current.thumbnail_url || "") ? current.thumbnail_url : "",
        videoMounted: false,
        videoLoading: current.kind === "video" && !!current.url,
        videoBuffering: current.kind === "video" && !!current.url && !this._mediaSession?.source(current.url),
        videoGeneration,
        videoInitialTime: this._currentTime,
        pausedByUser: !!resume?.pausedByUser,
        seeking: false,
        seekGesture: false,
        progress: this._duration ? this._currentTime / this._duration * 100 : 0,
        progressVisible: false,
        seekCurrentLabel: "00:00",
        seekDurationLabel: timeLabel(this._duration).padStart(5, "0"),
        currentLabel: timeLabel(this._currentTime),
        durationLabel: timeLabel(this._duration),
        controlsVisible: true,
      },
      () => {
        if (!this.videoAttemptActive(videoGeneration, current.id)) return;
        if (current.kind === "video" && current.url) {
          this.loadVideo(current, videoGeneration);
        } else this.preparePreviewMedia();
        if (current.kind === "image") this.fitPhoto(current);
        this.armMediaDeadline();
      },
    );
    if (this._reviewQueue && index >= this._reviewQueue.length - 2) this.moreReviewContent();
    if (this._publicQueue && index >= this._publicQueue.length - 2) this.morePublicContent();
  },
  preparePreviewMedia() {
    bindPreviewResources(this);
    const items = this.data.viewerMedia.length ? this.data.viewerMedia : this.data.memory && this.data.memory.media || [];
    this._previewMedia?.update(items[this.data.index], items[this.data.index + 1], items[this.data.index - 1],
      !this.data.videoBuffering || this.data.pausedByUser, this._videoWarmReady);
  },
  armMediaDeadline() {
    clearTimeout(this._mediaDeadline); this._mediaDeadline = null;
    if (!this.data.current?.url || this.data.error || this.data.pausedByUser ||
        this.data.current.kind === "image" && this.data.photoReady) return;
    const id = this.data.current.id, generation = this._videoGeneration;
    this._mediaDeadline = setTimeout(() => {
      if (!this.videoAttemptActive(generation, id) || this.data.pausedByUser) return;
      this._mediaDeadline = null;
      this.pause();
      this._previewMedia?.update(null, null);
      this.setViewerData({error: "媒体加载超时，请刷新重试", playing: false, videoMounted: false,
        videoLoading: false, videoBuffering: false});
    }, 20000);
  },
  photoLoaded(event) {
    const data = event.currentTarget.dataset;
    const item = this.data.viewerMedia.find(item => item.id === Number(data.id));
    if (this._unloaded || !this._visible || item?.kind !== "image" ||
        Number(data.generation) !== this._videoGeneration ||
        !data.source || data.source !== this.data.imageSources[item.url]) return;
    this._previewLease?.photoLoaded(item.url, data.source);
    if (item.id === this.data.current?.id) {
      clearTimeout(this._mediaDeadline); this._mediaDeadline = null;
      this.setViewerData({photoReady: true, entrySource: ""});
    }
  },
  fitPhoto(current) {
    if (this._unloaded) return;
    const frame = this._frame.value;
    const width = current.width || frame.width, height = current.height || frame.height;
    const ratio = Math.min(frame.width / width, frame.height / height);
    this._photo.value = {width: width * ratio, height: height * ratio};
    this.setViewerData({photoWidth: width * ratio, photoHeight: height * ratio,
      photoLeft: (frame.width - width * ratio) / 2, photoTop: (frame.height - height * ratio) / 2});
    const scale = this._scale, x = this._x, y = this._y;
    if (this.renderer === "webview") return;
    this.applyAnimatedStyle("#memory-photo", () => {
      "worklet";
      return {transform: `translate(${x.value}px, ${y.value}px) scale(${scale.value})`};
    });
  },
  bindVideoProgress() {
    if (this.renderer === "webview") return;
    const progress = this._progress;
    const prefix = this.data.fullScreen ? "viewer-progress" : "portrait";
    const targets = this.data.fullScreen ? [[`${prefix}-played`, false, false], [`${prefix}-thumb`, true, false]] :
      [[`${prefix}-seek-played`, false, true], [`${prefix}-seek-thumb`, true, true],
       [`${prefix}-progress-played`, false, true], [`${prefix}-progress-thumb`, true, true]];
    for (const [name, thumb, inset] of targets) {
      this.applyAnimatedStyle(`.${name}`, () => {
        "worklet";
        const value = thumb && inset ? Math.max(1.2, Math.min(98.8, progress.value)) : progress.value;
        return thumb ? {left: `${value}%`} : {width: `${value}%`};
      });
    }
  },
  stopVideoProgress() {
    clearTimeout(this._progressFrame);
    this._progressFrame = null;
    this._progressMotionCycle = (this._progressMotionCycle || 0) + 1;
    if (this._progress) cancelAnimation(this._progress);
  },
  videoAttemptActive(generation, id) {
    return !this._unloaded && this._visible !== false && generation === this._videoGeneration &&
      this.data.current && this.data.current.id === id;
  },
  async loadVideo(current, generation) {
    try {
      this.preparePreviewMedia();
      let source = this._previewMedia ? this._previewMedia.source(current) : current.url;
      // Network playback is progressive. A full transfer is only an error-recovery fallback.
      if (this._previewMedia && this._videoRetries) source = await this._previewMedia.ensure(current);
      if (!this.videoAttemptActive(generation, current.id)) return;
      this.setViewerData({videoSource: source, videoMounted: true, videoLoading: false}, () => {
        if (this.videoAttemptActive(generation, current.id)) {
          this.bindVideoProgress();
          this.startVideo();
        }
      });
    } catch (error) {
      if (!this.videoAttemptActive(generation, current.id) || error.cancelled) return;
      this.mediaError({currentTarget: {dataset: {id: current.id, generation}}, detail: {errMsg: error.message}});
    }
  },
  startVideo(event) {
    if (!this.currentVideo(event) || !this.data.videoMounted || this.data.pausedByUser ||
        this.data.selectionOpen || this.data.seeking || this.data.error) return;
    this._playRequested = true;
    wx.createVideoContext("memory-video", this).play();
  },
  videoMetadata(event) {
    if (!this.currentVideo(event)) return;
    const restore = this._restoreVideoPosition;
    if (restore?.generation === this._videoGeneration) {
      this._restoreVideoPosition = null;
      if (restore.time > 0) wx.createVideoContext("memory-video", this).seek(restore.time);
    }
    this.startVideo(event);
  },
  videoWaiting(event) {
    if (!this.currentVideo(event)) return;
    this.stopVideoProgress();
    this.setViewerData({videoBuffering: true});
    clearTimeout(this._videoWarmTimer); this._videoWarmTimer = null;
    this._videoWarmReady = false;
    this.preparePreviewMedia();
    this.armMediaDeadline();
  },
  async retryVideo(current) {
    this.stopVideoProgress();
    this._videoProgressed = false;
    const generation = this._videoGeneration = (this._videoGeneration || 0) + 1;
    this._videoRetries++;
    this._restoreVideoPosition = {generation, time: this._currentTime || 0};
    this.setViewerData({videoMounted: false, videoLoading: true, videoBuffering: true, playing: false, fullScreen: false,
      seeking: false, seekGesture: false, error: "", videoGeneration: generation,
      videoInitialTime: this._currentTime || 0}, async () => {
      if (!this.videoAttemptActive(generation, current.id)) return;
      this._previewMedia?.invalidate(current);
      try {
        const fresh = await memory.detail(this._id, this._admin);
        if (!this.videoAttemptActive(generation, current.id)) return;
        const item = fresh.media.find(item => item.id === current.id);
        if (!item || !item.url) throw new Error("视频暂不可用");
        const renewed = {...current, ...memory.presentation(fresh).media.find(item => item.id === current.id)};
        const viewerMedia = this.data.viewerMedia.map(item => item.id === current.id ? renewed : item);
        const media = this.data.memory.media.map(item => item.id === current.id ? renewed : item);
        const queue = this._reviewQueue || this._publicQueue;
        if (queue) {
          const card = queue[this.data.index];
          queue[this.data.index] = {...card, media};
        }
        this.setViewerData({current: renewed, viewerMedia, "memory.media": media,
          videoPoster: /^https:\/\//i.test(renewed.thumbnail_url || "") ? renewed.thumbnail_url : ""});
        this.armMediaDeadline();
        await this.loadVideo(renewed, generation);
      } catch (error) {
        if (this.videoAttemptActive(generation, current.id))
          this.setViewerData({error: "媒体加载失败，请刷新重试", playing: false, videoLoading: false, controlsVisible: true});
      }
    });
  },
  async loadPublicContent(submission, generation) {
    this._publicQueueLoading = true;
    try {
      const queue = [], seen = new Set(), cursors = new Set();
      const target = this.data.current?.id;
      let cursor;
      do {
        const batch = await memory.list({individual: true, cursor});
        if (this._unloaded || generation !== this._generation) return;
        (batch.items || []).flatMap(memory.mediaCards).forEach(card => {
          if (!seen.has(card.id)) {queue.push(card); seen.add(card.id);}
        });
        cursor = batch.cursor;
        if (cursors.has(cursor)) {cursor = null; break;}
        cursors.add(cursor);
      } while (cursor && !seen.has(target));
      // Keep the fresh detail authoritative, including all files from this submission.
      const fresh = memory.mediaCards(submission);
      const byId = new Map(fresh.map(card => [card.id, card]));
      for (let i = 0; i < queue.length; i++) {
        if (byId.has(queue[i].id)) queue[i] = byId.get(queue[i].id);
      }
      const currentId = this.data.current?.id;
      let index = queue.findIndex(card => card.id === currentId);
      if (index < 0) {
        // A temporarily inconsistent list must not remove the visible, authorized detail.
        queue.unshift(...fresh.filter(card => !seen.has(card.id)));
        index = queue.findIndex(card => card.id === currentId);
      }
      if (index < 0) return;
      this._publicQueue = queue;
      this._publicCursor = cursor;
      const card = queue[index];
      this.setViewerData({memory: {...card, id: card.memory_id}, index,
        viewerMedia: queue.map(item => item.media[0]), viewerInfo: queue.map(slideInfo)},
      () => this.preparePreviewMedia());
    } catch (error) {
      // List availability must not interrupt a successfully loaded image or video.
      if (!this._unloaded && generation === this._generation)
        logPageError("memory_public_feed", error);
    } finally {
      if (generation === this._generation) this._publicQueueLoading = false;
    }
    if (!this._unloaded && generation === this._generation && this._publicQueue &&
        this.data.index >= this._publicQueue.length - 2) this.morePublicContent();
  },
  async morePublicContent() {
    if (this._publicQueueLoading || !this._publicCursor || !this._publicQueue) return;
    const generation = this._generation;
    this._publicQueueLoading = true;
    try {
      const queue = this._publicQueue.slice();
      const seen = new Set(queue.map(card => card.id)), cursors = new Set();
      let cursor = this._publicCursor;
      const length = queue.length;
      do {
        cursors.add(cursor);
        const batch = await memory.list({individual: true, cursor});
        if (this._unloaded || generation !== this._generation) return;
        (batch.items || []).flatMap(memory.mediaCards).forEach(card => {
          if (!seen.has(card.id)) {queue.push(card); seen.add(card.id);}
        });
        cursor = cursors.has(batch.cursor) ? null : batch.cursor;
      } while (cursor && queue.length === length);
      this._publicQueue = queue;
      this._publicCursor = cursor;
      this.setViewerData({viewerMedia: queue.map(card => card.media[0]), viewerInfo: queue.map(slideInfo)},
        () => this.preparePreviewMedia());
    } catch (error) {
      if (!this._unloaded && generation === this._generation)
        logPageError("memory_public_feed_more", error);
    } finally {
      if (generation === this._generation) this._publicQueueLoading = false;
    }
  },
  async moreReviewContent() {
    if (this._queueLoading || !this._reviewCursor || !this._reviewQueue) return;
    const generation = this._generation;
    this._queueLoading = true;
    try {
      const batch = await memory.list({status: "pending", individual: true, cursor: this._reviewCursor}, true);
      if (this._unloaded || generation !== this._generation) return;
      const seen = new Set(this._reviewQueue.map((card) => card.id));
      batch.items.flatMap(memory.reviewCards).forEach((card) => {
        if (!seen.has(card.id)) {this._reviewQueue.push(card); seen.add(card.id);}
      });
      this._reviewCursor = batch.cursor;
      const viewerMedia = this._reviewQueue.map((card) => card.media[0]);
      this.setViewerData({viewerMedia, viewerInfo: this._reviewQueue.map(slideInfo)});
      this.preparePreviewMedia();
    } catch (error) {
      if (!this._unloaded && generation === this._generation)
        this.setViewerData({error: error.message || "更多待审核内容加载失败，请刷新重试"});
    } finally {
      if (generation === this._generation) this._queueLoading = false;
    }
  },
  syncZoom(zoomed, animated = false, serial = 0) {
    if (this._unloaded) return;
    const patch = {};
    if (this.data.zoomed !== zoomed) patch.zoomed = zoomed;
    if (this.renderer === "webview") {
      const scale = this._scale.value, frame = this._frame.value, photo = this._photo.value;
      patch.photoPointerState = {id: this.data.current?.id || 0, generation: this._videoGeneration || 0,
        x: this._x.value, y: this._y.value, scale, animated, serial,
        maxX: Math.max(0, (photo.width * scale - frame.width) / 2),
        maxY: Math.max(0, (photo.height * scale - frame.height) / 2)};
    }
    if (Object.keys(patch).length) this.setViewerData(patch);
  },
  restorePhoto(event) {
    this._photoTap = null;
    this._photoPointer = null;
    this._zoomTarget.value = 1;
    const animated = !!event;
    if (animated && this.renderer !== "webview") {
      const options = {duration: 240, easing: Easing.out(Easing.cubic)};
      this._scale.value = timing(1, options);
      this._x.value = timing(0, options);
      this._y.value = timing(0, options);
    } else {
      this._scale.value = 1;
      this._x.value = this._y.value = 0;
    }
    this._pinching.value = false;
    this.syncZoom(false, animated);
  },
  photoScale(event) {
    "worklet";
    if (event.state === 1) {
      // Skyline scale gestures also recognize single-finger pans.
      if (!(event.pointerCount >= 2)) return;
      cancelAnimation(this._scale);
      cancelAnimation(this._x);
      cancelAnimation(this._y);
      this._zoomTarget.value = this._scale.value;
      this._pinching.value = true;
      this._pinchBase.value = {
        scale: this._scale.value,
        x: this._x.value,
        y: this._y.value,
        focalX: event.focalX - this._frame.value.width / 2,
        focalY: event.focalY - this._frame.value.height / 2,
      };
      runOnJS(this.syncZoom.bind(this))(true);
    } else if (event.state === 2 && this._pinching.value) {
      const base = this._pinchBase.value;
      const scale = Math.max(1, Math.min(4, base.scale * event.scale));
      const ratio = scale / base.scale;
      const focalX = event.focalX - this._frame.value.width / 2;
      const focalY = event.focalY - this._frame.value.height / 2;
      const maxX = Math.max(
        0,
        (this._photo.value.width * scale - this._frame.value.width) / 2,
      );
      const maxY = Math.max(
        0,
        (this._photo.value.height * scale - this._frame.value.height) / 2,
      );
      this._scale.value = scale;
      this._zoomTarget.value = scale;
      this._x.value = Math.max(
        -maxX,
        Math.min(maxX, focalX - (base.focalX - base.x) * ratio),
      );
      this._y.value = Math.max(
        -maxY,
        Math.min(maxY, focalY - (base.focalY - base.y) * ratio),
      );
    } else if ((event.state === 3 || event.state === 4) && this._pinching.value) {
      this._pinching.value = false;
      if (this._scale.value <= 1.02) {
        this._scale.value = 1;
        this._x.value = this._y.value = 0;
      }
      this._zoomTarget.value = this._scale.value;
      runOnJS(this.syncZoom.bind(this))(this._scale.value > 1);
    }
  },
  photoPanAllowed() {
    "worklet";
    return this._scale.value > 1 && !this._pinching.value;
  },
  photoPan(event) {
    "worklet";
    if (event.state === 1) {
      cancelAnimation(this._scale);
      cancelAnimation(this._x);
      cancelAnimation(this._y);
      this._zoomTarget.value = this._scale.value;
    }
    if (event.state !== 2 || this._pinching.value) return;
    const maxX = Math.max(
      0,
      (this._photo.value.width * this._scale.value - this._frame.value.width) /
        2,
    );
    const maxY = Math.max(
      0,
      (this._photo.value.height * this._scale.value -
        this._frame.value.height) /
        2,
    );
    this._x.value = Math.max(
      -maxX,
      Math.min(maxX, this._x.value + event.deltaX),
    );
    this._y.value = Math.max(
      -maxY,
      Math.min(maxY, this._y.value + event.deltaY),
    );
  },
  photoDoubleTap(event) {
    "worklet";
    if (this._portraitTraceEnabled.value) runOnJS(this.tracePortraitSeek.bind(this))("photo-double-tap", {
      state: event.state, scale: this._scale.value,
    });
    // Discrete tap gestures report BEGIN once; they do not emit a drag END.
    if (event.state !== 1) return;
    const next = doubleTapPhoto(this._zoomTarget.value, this._photo.value, this._frame.value, event.absoluteX, event.absoluteY);
    this._zoomTarget.value = next.scale;
    const options = {duration: 240, easing: Easing.out(Easing.cubic)};
    this._scale.value = timing(next.scale, options);
    this._x.value = timing(next.x, options);
    this._y.value = timing(next.y, options);
    runOnJS(this.syncZoom.bind(this))(next.scale > 1);
  },
  photoTap(event) {
    const current = this.data.current;
    if (this.renderer === "skyline" || this._unloaded || this._visible === false ||
        !current || current.kind !== "image" || this.data.fullScreen || this.data.busy ||
        this.data.selectionOpen || this._photoPointer?.moved || current.url && !this.data.photoReady || this.data.error) return;
    const id = event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.id;
    if (id != null && Number(id) !== current.id) return;
    const touch = event.changedTouches && event.changedTouches[0];
    const detail = event.detail || {};
    const x = touch && Number.isFinite(touch.clientX) ? touch.clientX : Number.isFinite(detail.x) ? detail.x : this._frame.value.width / 2;
    const y = touch && Number.isFinite(touch.clientY) ? touch.clientY : Number.isFinite(detail.y) ? detail.y : this._frame.value.height / 2;
    const time = Number.isFinite(event.timeStamp) ? event.timeStamp : Date.now();
    const previous = this._photoTap;
    this._photoTap = {id: current.id, x, y, time};
    if (!previous || previous.id !== current.id || time < previous.time || time - previous.time > 300 ||
        Math.abs(x - previous.x) > 24 || Math.abs(y - previous.y) > 24) return;
    this._photoTap = null;
    const next = doubleTapPhoto(this._scale.value, this._photo.value, this._frame.value, x, y);
    this._zoomTarget.value = next.scale;
    this._scale.value = next.scale;
    this._x.value = next.x;
    this._y.value = next.y;
    this.syncZoom(next.scale > 1, true);
  },
  photoPointer(event) {
    const current = this.data.current;
    if (this.renderer === "skyline" || this._unloaded || !this._visible || !this.data.zoomed ||
        current?.kind !== "image" || this.data.fullScreen || this.data.selectionOpen || this.data.busy || this.data.error) return;
    if (Number(event.id) !== current.id || Number(event.generation) !== this._videoGeneration) return;
    if (event.type === "start") {
      this._photoPointer = {serial: event.serial, moved: false};
      return;
    }
    const gesture = this._photoPointer;
    if (event.type !== "end" || !gesture || gesture.ended || gesture.serial !== event.serial ||
        !Number.isFinite(event.x) || !Number.isFinite(event.y)) return;
    gesture.ended = true; gesture.moved = !!event.moved;
    if (gesture.moved) this._photoTap = null;
    if (event.x === this._x.value && event.y === this._y.value) return;
    this.photoPan({state: 2, deltaX: event.x - this._x.value, deltaY: event.y - this._y.value});
    this.syncZoom(true, false, event.serial);
  },
  pagerAllowed() {
    "worklet";
    return this._scale.value === 1 && !this._pinching.value && !this._portraitDragging.value;
  },
  portraitSeekAllowed() {
    "worklet";
    const state = this._portraitState.value;
    if (this._portraitTraceEnabled.value) runOnJS(this.tracePortraitSeek.bind(this))("accept", {
      allowed: state.allowed, uiGeneration: state.generation,
    });
    return state.allowed;
  },
  portraitVideoDrag(event) {
    "worklet";
    if (event.state === 1) {
      this._portraitDragging.value = true;
      this._portraitGestureGeneration.value = this._portraitState.value.generation;
      cancelAnimation(this._progress);
      this._seekMotion.value = {start: this._progress.value / 100 * this._playback.value.duration,
        delta: 0, duration: this._playback.value.duration};
    } else if (event.state === 2 && this._portraitDragging.value) {
      const motion = this._seekMotion.value;
      const delta = motion.delta + (event.deltaX || 0);
      const time = Math.max(0, Math.min(motion.duration,
        motion.start + delta / (this._frame.value.width * 358 / 390) * motion.duration));
      this._seekMotion.value = {start: motion.start, delta, duration: motion.duration};
      this._progress.value = motion.duration ? time / motion.duration * 100 : 0;
    }
    else if (event.state === 3 || event.state === 4) this._portraitDragging.value = false;
    runOnJS(this.dragSeek.bind(this))(event.state, event.deltaX || 0, true,
      this._portraitGestureGeneration.value, this._seekMotion.value.start);
  },
  portraitTouchStart(event) {
    const mediaId = event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.mediaId;
    if (mediaId != null && (!this.data.current || Number(mediaId) !== this.data.current.id)) return;
    if (this._portraitTraceEnabled.value) {
      const touch = event.touches && event.touches[0];
      this._portraitProbeTouch = touch ? {x: touch.clientX, y: touch.clientY, moved: false} : null;
      this.tracePortraitSeek("touch-start");
    }
  },
  portraitTouchMove(event) {
    const points = event.touches && event.touches.length ? event.touches : event.changedTouches;
    const probe = this._portraitProbeTouch;
    if (probe && !probe.moved && points && points.length === 1) {
      const dx = points[0].clientX - probe.x, dy = points[0].clientY - probe.y;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        probe.moved = true;
        this.tracePortraitSeek("touch-move", {horizontal: Math.abs(dx) > Math.abs(dy)});
      }
    }
  },
  portraitTouchEnd(event) {
    if (event) this.portraitTouchMove(event);
    if (this._portraitProbeTouch) this.tracePortraitSeek("touch-end");
    this._portraitProbeTouch = null;
  },
  portraitTouchCancel() {
    if (this._portraitProbeTouch) this.tracePortraitSeek("touch-cancel");
    this._portraitProbeTouch = null;
  },
  pointerSeek(event) {
    if (this.renderer !== "webview" || !this.currentVideo() || !this.data.visible ||
        event.id !== this.data.current.id || event.generation !== this._videoGeneration ||
        event.epoch !== (this._seekPointerEpoch || 0) ||
        event.fullScreen !== this.data.fullScreen || this.data.busy || this.data.selectionOpen ||
        this.data.videoLoading || this.data.error || !Number.isFinite(event.time)) return;
    if (event.state === 1) {
      this._pointerSeek = event.serial;
      this._seekStart = event.start;
      this._portraitDragging.value = true;
      if (event.slider) this.seekChanging({detail: {value: event.time / this._duration * 1000}});
      else this.dragSeek(1, 0, !event.fullScreen, event.generation, event.start);
    } else if (this._pointerSeek === event.serial && this.data.seeking) {
      this._seekTarget = Math.max(0, Math.min(this._duration, event.time));
      if (event.state === 2) {
        this.setViewerData({currentLabel: timeLabel(this._seekTarget),
          seekCurrentLabel: timeLabel(this._seekTarget).padStart(5, "0"),
          seekForward: this._seekTarget >= this._seekStart});
      } else if (event.state === 3 || event.state === 4) this.finishSeek(event.state === 4);
    }
  },
  tracePortraitSeek(stage, extra = {}) {
    if (!this._portraitTraceEnabled.value || this._unloaded) return;
    try { console.info("[memory_seek]", JSON.stringify({build: "portrait-shared-v3", stage,
      renderer: this.renderer || "unknown", mediaId: this.data.current && this.data.current.id,
      kind: this.data.current && this.data.current.kind, visible: this.data.visible, active: !!this._visible,
      fullScreen: this.data.fullScreen, loading: this.data.videoLoading, error: !!this.data.error,
      busy: this.data.busy, selectionOpen: this.data.selectionOpen, seeking: this.data.seeking,
      duration: this._duration || 0, generation: this._videoGeneration || 0, ...extra})); } catch (_) {}
  },
  currentVideo(event) {
    return (
      !this._unloaded &&
      this._visible !== false &&
      this.data.current &&
      this.data.current.kind === "video" &&
      (!event ||
        (Number(event.currentTarget.dataset.id) === this.data.current.id &&
          (event.currentTarget.dataset.generation === undefined ||
            Number(event.currentTarget.dataset.generation) === this._videoGeneration)))
    );
  },
  videoPlay(event) {
    if (!this.currentVideo(event)) return;
    if (this.data.pausedByUser || this.data.selectionOpen || this.data.seeking) {this.pause(); return;}
    // Native play reports intent before decoding; only advancing time ends a wait.
    this.setViewerData({ playing: true, entrySource: "" });
    this.preparePreviewMedia();
    this.scheduleHide();
  },
  videoPause(event) {
    if (!this.currentVideo(event)) return;
    this.stopVideoProgress();
    this._playRequested = false;
    clearTimeout(this._controlsTimer);
    this.setViewerData({ playing: false, controlsVisible: true });
    this.preparePreviewMedia();
  },
  playVideo() {
    if (!this.currentVideo()) return;
    this.setViewerData({ muted: false, pausedByUser: false }, () => {
      if (this.currentVideo() && !this.data.videoLoading && !this.data.selectionOpen) {
        this.armMediaDeadline();
        this.preparePreviewMedia();
        this._playRequested = true;
        wx.createVideoContext("memory-video", this).play();
      }
    });
  },
  toggleVideo() {
    if (!this.currentVideo() || this.data.selectionOpen || this.data.seeking) return;
    if (this.data.playing || this._playRequested ||
        ((this.data.videoLoading || this.data.videoBuffering) && !this.data.pausedByUser)) {
      clearTimeout(this._controlsTimer);
      this.setViewerData({pausedByUser: true, playing: false, controlsVisible: true});
      this.pause();
      clearTimeout(this._mediaDeadline); this._mediaDeadline = null;
      this.preparePreviewMedia();
    }
    else this.playVideo();
  },
  videoTap() {
    this.toggleVideo();
  },
  scheduleHide() {
    clearTimeout(this._controlsTimer);
    if (
      !this.data.playing ||
      this.data.seeking ||
      this.data.selectionOpen ||
      !this._visible
    )
      return;
    this._controlsTimer = setTimeout(() => {
      if (
        !this._unloaded &&
        this._visible &&
        this.data.playing &&
        !this.data.seeking &&
        !this.data.selectionOpen
      )
        this.setViewerData({ controlsVisible: false });
    }, 3000);
  },
  videoTime(event) {
    if (!this.currentVideo(event)) return;
    this._duration = Number(event.detail.duration) || this._duration;
    if (this.data.seeking) return;
    const time = Number(event.detail.currentTime) || 0;
    const progressed = this.data.playing && time !== this._currentTime;
    if (progressed) {
      this._videoProgressed = true;
      clearTimeout(this._mediaDeadline); this._mediaDeadline = null;
    }
    if (this.data.videoBuffering && progressed) {
      this.setViewerData({videoBuffering: false});
      this.preparePreviewMedia();
    }
    this._currentTime = time;
    this.showTime(this._currentTime, true);
    if (this._previewLease && progressed && !this.data.videoBuffering &&
        !this._videoWarmReady && !this._videoWarmTimer) {
      const generation = this._videoGeneration, id = this.data.current.id;
      const timer = setTimeout(() => {
        if (this._videoWarmTimer !== timer) return;
        this._videoWarmTimer = null;
        if (!this.videoAttemptActive(generation, id) || !this.data.playing || this.data.videoBuffering) return;
        this._videoWarmReady = true; this.preparePreviewMedia();
      }, 1000);
      this._videoWarmTimer = timer;
    }
  },
  showTime(seconds, continuous = false, patch = {}) {
    this.stopVideoProgress();
    const progress = this._duration
      ? Math.max(0, Math.min(100, (seconds / this._duration) * 100))
      : 0;
    this._playback.value = {time: seconds, duration: this._duration};
    if (!(this.data.seekGesture && this._seekPortrait && this.renderer !== "webview"))
      this._progress.value = progress;
    if (continuous && this._visible && this.data.playing &&
        !this.data.seeking && !this.data.videoBuffering && this._duration > 0) {
      if (this.renderer !== "webview") {
        this._progress.value = timing(Math.min(100, (seconds + 1) / this._duration * 100),
          {duration: 1000, easing: Easing.linear});
      } else {
        const started = Date.now(), duration = this._duration, cycle = this._progressMotionCycle;
        const advance = () => {
          if (cycle !== this._progressMotionCycle || this._unloaded || !this._visible ||
              !this.data.playing || this.data.seeking || this.data.videoBuffering) return;
          const elapsed = Math.min(1000, Math.max(0, Date.now() - started));
          const value = Math.min(100, (seconds + elapsed / 1000) / duration * 100);
          this._progress.value = value;
          this.setViewerData({progress: value});
          this._progressFrame = elapsed < 1000 ? setTimeout(advance, 16) : null;
        };
        this._progressFrame = setTimeout(advance, 16);
      }
    }
    this.setViewerData({
      progress,
      currentLabel: timeLabel(seconds),
      durationLabel: timeLabel(this._duration),
      seekCurrentLabel: timeLabel(seconds).padStart(5, "0"),
      seekDurationLabel: timeLabel(this._duration).padStart(5, "0"),
      bubbleLeft: Math.max(10, Math.min(90, progress)),
      ...patch,
    });
  },
  seekChanging(event) {
    if (!this._duration || !this.currentVideo()) return;
    if (!this.data.seeking) {
      this._seekWasPlaying = this.data.playing;
      this.pause();
    }
    this._seekTarget = Math.max(
      0,
      Math.min(
        this._duration,
        (Number(event.detail.value) / 1000) * this._duration,
      ),
    );
    clearTimeout(this._controlsTimer);
    this.showTime(this._seekTarget, false, {seeking: true, controlsVisible: true});
  },
  seekChanged(event) {
    if (!this._duration || !this.currentVideo()) return;
    if (!this.data.seeking) this._seekWasPlaying = this.data.playing;
    this._seekTarget = Math.max(
      0,
      Math.min(
        this._duration,
        (Number(event.detail.value) / 1000) * this._duration,
      ),
    );
    this.finishSeek(false);
  },
  videoDrag(event) {
    "worklet";
    runOnJS(this.dragSeek.bind(this))(event.state, event.deltaX || 0);
  },
  dragSeek(state, deltaX, portrait = false, generation, startTime) {
    if (portrait && (state === 1 || state === 3 || state === 4))
      this.tracePortraitSeek("bridge", {state, gestureGeneration: generation});
    if ((generation !== undefined && generation !== this._videoGeneration) ||
        (portrait ? this.data.fullScreen : !this.data.fullScreen) || !this._duration ||
        !this.currentVideo() || this.data.busy || this.data.selectionOpen || this.data.videoLoading || this.data.error)
      return;
    if (state === 1) {
      clearTimeout(this._progressTimer);
      clearTimeout(this._controlsTimer);
      this._seekStart = Number.isFinite(startTime) ? Math.max(0, Math.min(this._duration, startTime)) : this._currentTime;
      this._seekTarget = this._seekStart;
      this._seekDelta = 0;
      this._seekWasPlaying = this.data.playing && !this.data.pausedByUser;
      this._seekPortrait = portrait;
      this.pause();
      this.setViewerData({ seeking: true, seekGesture: true, controlsVisible: true, progressVisible: false });
    } else if (state === 2 && this.data.seekGesture) {
      this._seekDelta += deltaX;
      const width = portrait ? this._frame.value.width * 358 / 390 : Math.max(this._frame.value.width, this._frame.value.height);
      this._seekTarget = Math.max(
        0,
        Math.min(
          this._duration,
          this._seekStart + (portrait ? 1 : -1) * (this._seekDelta / width) * this._duration,
        ),
      );
      this.setViewerData({ seekForward: this._seekTarget >= this._seekStart });
      this.showTime(this._seekTarget);
    } else if ((state === 3 || state === 4) && this.data.seekGesture)
      this.finishSeek(state === 4);
  },
  finishSeek(cancelled) {
    this._seekPointerEpoch = (this._seekPointerEpoch || 0) + 1;
    this._pointerSeek = null;
    this._portraitDragging.value = false;
    const target = cancelled ? this._currentTime : this._seekTarget;
    if (!cancelled) {
      wx.createVideoContext("memory-video", this).seek(target);
      this._currentTime = target;
    }
    this._progress.value = this._duration ? target / this._duration * 100 : 0;
    this.showTime(target);
    this.setViewerData({ seeking: false, seekGesture: false });
    if (this._seekPortrait) this.showPortraitProgress();
    this._seekPortrait = false;
    if (this._seekWasPlaying && this._visible)
      wx.createVideoContext("memory-video", this).play();
    this._seekWasPlaying = false;
    this.scheduleHide();
  },
  showPortraitProgress() {
    clearTimeout(this._progressTimer);
    this.setViewerData({progressVisible: true});
    const generation = this._videoGeneration;
    const cycle = this._progressCycle = (this._progressCycle || 0) + 1;
    this._progressTimer = setTimeout(() => {
      if (!this._unloaded && this._visible && generation === this._videoGeneration &&
          cycle === this._progressCycle && !this.data.fullScreen && !this.data.seeking)
        this.setViewerData({progressVisible: false});
    }, 3000);
  },
  enterFullScreen() {
    if (this.currentVideo())
      wx.createVideoContext("memory-video", this).requestFullScreen({
        direction: 90,
      });
  },
  exitFullScreen() {
    if (this.currentVideo())
      wx.createVideoContext("memory-video", this).exitFullScreen();
  },
  fullScreenChanged(event) {
    if (!this.currentVideo(event)) return;
    if (this.data.seeking) this.finishSeek(true);
    clearTimeout(this._progressTimer);
    this._portraitDragging.value = false;
    this.setViewerData({
      fullScreen: !!event.detail.fullScreen,
      controlsVisible: true,
      progressVisible: false,
    }, () => this.bindVideoProgress());
    this.scheduleHide();
  },
  stopTap() {},
  approve() {
    if (this.data.busy || this._unloaded || !this._admin || !this.data.memory ||
        this.data.memory.status !== "pending") return;
    if (!this._mediaId) return this.beginReview();
    if (!this.data.current || this.data.current.id !== this._mediaId || !this.data.current.selectable) return;
    this.pause();
    this._action = "publish";
    this.setViewerData({selected: [this._mediaId], reviewed: true});
    return this.confirmReview();
  },
  beginReview() {
    if (
      this.data.busy ||
      !this.data.memory ||
      this.data.memory.status !== "pending"
    )
      return;
    this.pause();
    if (this._mediaId) {
      this.setViewerData({selected: [this._mediaId], reviewed: false,
        "memory.media": this.data.memory.media.map((item) => ({...item, selected: true}))});
    }
    this.setViewerData({ selectionOpen: true, controlsVisible: true });
    this.scheduleHide();
  },
  closeSelection() {
    if (this.data.busy) return;
    this.setViewerData({ selectionOpen: false });
    this.scheduleHide();
  },
  mediaError(event) {
    if (this._unloaded) return;
    const id = Number(event && event.currentTarget && event.currentTarget.dataset.id);
    const generation = event && event.currentTarget && event.currentTarget.dataset.generation;
    if (generation !== undefined && Number(generation) !== this._videoGeneration) return;
    if (id && this.data.current && id !== this.data.current.id) return;
    if (this.data.current && this.data.current.kind === "video" && !this.currentVideo(event)) return;
    if (this.data.current && this.data.current.kind === "video") this.stopVideoProgress();
    if (this.data.current && this.data.current.kind === "image" &&
        this.data.current.url && !this.data.imageSources[this.data.current.url]) return;
    const detail = (event && event.detail) || {};
    logPageError("memory_media_playback", {errMsg: detail.errMsg || "媒体加载失败", errno: detail.errCode},
      {mediaId: this.data.current && this.data.current.id, kind: this.data.current && this.data.current.kind});
    if (this.data.current && this.data.current.kind === "video" && this.data.current.url && !this._videoRetries)
      return this.retryVideo(this.data.current);
    if (this.data.current?.kind === "image") this._mediaSession?.invalidate(this.data.current.url);
    this.setViewerData({error: "媒体加载失败，请刷新重试", playing: false, videoLoading: false, controlsVisible: true});
  },
  selectMedia(e) {
    const id = Number(e.currentTarget.dataset.id);
    const item = this.data.memory.media.find((value) => value.id === id);
    if (!item || !item.selectable || this.data.busy) return;
    const selected = this.data.selected.includes(id)
      ? this.data.selected.filter((value) => value !== id)
      : this.data.selected.concat(id);
    const media = this.data.memory.media.map((value) => ({
      ...value,
      selected: selected.includes(value.id),
    }));
    this.setViewerData({ selected, reviewed: false, "memory.media": media });
  },
  reviewed(e) {
    this.setViewerData({ reviewed: e.detail.value.includes("reviewed") });
  },
  askReview(e) {
    if (this.data.busy || !this.data.memory) return;
    const action = e.currentTarget.dataset.action;
    if (
      action === "publish" &&
      (!this.data.selected.length || !this.data.reviewed)
    )
      return;
    this._action = action;
    if (action === "reject" || action === "retry") return this.confirmReview();
    const options = {
      publish: {
        title: "确认上架",
        message: this._mediaId ? "仅发布当前这份内容，其他内容不受影响。" : `发布选中的 ${this.data.selected.length} 项内容，其余素材不会公开。`,
        confirmText: "确认上架",
      },
      offline: {
        title: "确认下架",
        message: "下架后将停止公开展示，素材保留，可以重新上架。",
        confirmText: "确认下架",
        variant: "danger",
      },
      republish: {
        title: "确认重新上架",
        message: "当前内容将重新公开展示，其他内容不受影响。",
        confirmText: "重新上架",
      },
      reopen: {
        title: "确认重新审核",
        message: "当前内容将放回待审核列表，不会直接上架，其他内容不受影响。",
        confirmText: "重新审核",
      },
    };
    this.selectComponent("#memory-confirm").open({
      ...options[action],
      cancelText: "取消",
      prototypeStyle: true,
      confirmBehavior: "emit",
    });
  },
  async confirmReview() {
    if (this.data.busy || this._unloaded || !this.data.memory) return;
    const action = this._action;
    const restoring = action === "retry" || action === "republish" || action === "reopen";
    this.setViewerData({ busy: true, error: "" });
    try {
      const result = await memory.send(`/admin/memories/${this._id}/review`, "POST", {
        action,
        expected_revision: this.data.memory.revision,
        selected_media_ids: this._mediaId ? [this._mediaId] : restoring && this.data.current ? [this.data.current.id] : this.data.selected,
        manually_reviewed: this.data.reviewed,
        individual: !!this._mediaId || restoring,
      });
      if (this._unloaded) return;
      getApp().globalData.memoryVersion =
        (getApp().globalData.memoryVersion || 0) + 1;
      wx.showToast({ title: "已处理", icon: "success" });
      if (action === "publish" || action === "reject") {
        // Our review changes publication metadata, not already decoded media bytes.
        this._retainReviewFiles = !!this._reviewQueue;
        this._generation = (this._generation || 0) + 1;
        this._queueLoading = false;
        this._reviewNextIndex = this.data.index;
        this._reviewNeedsFirstPage = !this._reviewQueue;
        this._reviewQueue = (this._reviewQueue || []).filter((card) => card.id !== this._mediaId)
          .map((card) => card.memory_id === this._id && result && result.revision
            ? {...card, revision: result.revision} : card);
        this._reviewAfterAction = true;
        await this.nextReview();
      } else wx.navigateBack();
    } catch (error) {
      if (!this._unloaded)
        this.setViewerData({ error: error.message || "操作未完成，请刷新后重试" });
    } finally {
      if (!this._unloaded) this.setViewerData({ busy: false });
    }
  },
  async nextReview() {
    if (this._unloaded || this.data.loading) return;
    const generation = this._generation;
    this.pause();
    this._videoGeneration = (this._videoGeneration || 0) + 1;
    this.clearTimers();
    this.restorePhoto();
    this.setViewerData({loading: true, error: "", reviewComplete: false, memory: null, current: null,
      viewerMedia: [], viewerInfo: [], videoSource: "", videoMounted: false, videoLoading: false, playing: false, fullScreen: false,
      selected: [], reviewed: false, selectionOpen: false});
    try {
      if (this._reviewNeedsFirstPage) {
        const batch = await memory.list({status: "pending", individual: true}, true);
        if (this._unloaded || generation !== this._generation) return;
        this._reviewQueue = batch.items.flatMap(memory.reviewCards);
        this._reviewCursor = batch.cursor;
        this._reviewNeedsFirstPage = false;
        this._reviewNextIndex = 0;
      }
      while (this._reviewQueue.length <= this._reviewNextIndex && this._reviewCursor) {
        const cursor = this._reviewCursor;
        await this.moreReviewContent();
        if (this._unloaded || generation !== this._generation || this.data.error) return;
        if (this._reviewCursor === cursor) throw new Error("更多待审核内容加载失败，请刷新重试");
      }
      if (this._unloaded || generation !== this._generation) return;
      const index = Math.min(this._reviewNextIndex, this._reviewQueue.length - 1);
      const card = this._reviewQueue[index];
      if (!card) {
        this._previewMedia?.update(null, null);
        this.setViewerData({reviewComplete: true});
        return;
      }
      this._reviewAfterAction = false;
      this.setViewerData({index, memory: {...card, id: card.memory_id},
        viewerMedia: this._reviewQueue.map((item) => item.media[0]),
        viewerInfo: this._reviewQueue.map(slideInfo)}, () => this.activate());
    } catch (error) {
      if (!this._unloaded && generation === this._generation)
        this.setViewerData({error: error.message || "下一份内容加载失败，请刷新重试"});
    } finally {
      if (!this._unloaded && generation === this._generation) this.setViewerData({loading: false});
    }
  },
  onShareAppMessage() {
    if (this._admin || !this.data.memory)
      return { title: "记忆", path: "/pages/memory/memory" };
    const current = this.data.current;
    const url = current?.kind === "video" ? current.thumbnail_url : current?.url || current?.thumbnail_url;
    const source = this.data.imageSources[url] || url;
    const share = {
      title: this.data.memory.caption || "活动记忆",
      path: `/pages/memory_detail/memory_detail?id=${this._id}${current ? '&media_id=' + current.id : ''}`,
      ...(source ? {imageUrl: source} : {}),
    };
    return {...share, promise: memoryShareImage(source).then(imageUrl => ({...share, imageUrl}), error => {
      logPageError("memory_share_image", error, {mediaId: current?.id});
      return share;
    })};
  },
});
