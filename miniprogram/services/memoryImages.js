const {isLocalTestMediaUrl} = require("./config");
const {logPageError} = require("./logger");
const {createMediaSession, MAX_TEMP_BYTES} = require("./memoryMediaSession");

function createImageSources(page, concurrency = 1) {
  const owner = {};
  const count = Math.max(1, Math.min(3, Math.floor(concurrency) || 1));
  const sessions = Array.from({length: count}, () =>
    createMediaSession(wx, {maxBytes: Math.floor(MAX_TEMP_BYTES / count)}));
  const lanes = new Map();
  const sessionFor = url => sessions[lanes.get(url) || 0];
  let urls = [], requests = [], disposed = false;
  const publish = event => {
    if (disposed || page._unloaded || page._imagesHidden) return;
    const controlled = new Set(requests.map(item => item.url));
    const imageSources = {};
    for (const url of urls) {
      const source = controlled.has(url) ? sessionFor(url).source(url) : url;
      if (source) imageSources[url] = source;
    }
    const current = page.data.current;
    page.setData({imageSources, imageLoading: !!(current?.kind === "image" &&
      controlled.has(current.url) && !imageSources[current.url] && !sessionFor(current.url).error(current.url))});
    if (event?.error && !event.error.cancelled && controlled.has(event.url)) {
      logPageError("memory_image_download", {message: "图片下载失败", errno: event.error.errno},
        {statusCode: event.error.statusCode});
      if (current?.kind === "image" && current.url === event.url)
        page.setData({error: "图片加载失败，请刷新重试"});
      if (page.coverDownloadFailed) page.coverDownloadFailed(event.url);
    }
  };
  const unsubscribes = sessions.map(session => session.subscribe(publish));
  let replacing = false, replacement;
  const replace = list => {
    replacement = list;
    if (replacing) return;
    replacing = true;
    try {
      let next;
      do {
        next = replacement;
        for (let lane = 0; lane < sessions.length && next === replacement; lane++)
          sessions[lane].replace(owner, next.filter(item => (lanes.get(item.url) || 0) === lane));
        // A synchronous failure may replace the viewport from inside a subscriber.
      } while (next !== replacement);
    } finally {replacing = false;}
  };
  return {
    prepare(values) {
      if (disposed) return;
      urls = [...new Set(values.filter(Boolean))];
      const current = page.data.current;
      requests = urls.filter(isLocalTestMediaUrl).map((url, index) => ({
          url, kind: "image", foreground: true,
          protected: current?.kind === "image" && current.url === url,
          maxBytes: 1024 * 1024,
          priority: current?.thumbnail_url === url ? 0 : current?.url === url ? 1 : 10 + index,
        }));
      const controlled = new Set(requests.map(item => item.url));
      for (const url of lanes.keys()) if (!controlled.has(url)) lanes.delete(url);
      const loads = sessions.map((session, lane) => requests.filter(item =>
        lanes.get(item.url) === lane && !session.source(item.url)).length);
      for (const item of requests) if (!lanes.has(item.url)) {
        const lane = loads.indexOf(Math.min(...loads));
        lanes.set(item.url, lane); loads[lane]++;
      }
      replace(requests);
    },
    pause(keep) {
      if (disposed) return;
      const retained = new Set(keep);
      urls = urls.filter(url => retained.has(url));
      requests = requests.filter(item => retained.has(item.url) && sessionFor(item.url).source(item.url));
      // Keep completed files owned without starting or retaining pending transfers.
      replace(requests.map(item => ({...item, load: false})));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribes.forEach(unsubscribe => unsubscribe());
      replace([]);
      sessions.forEach(session => session.dispose());
      lanes.clear();
    },
  };
}
function prepareMemoryImages(page, urls, options = {}) {
  if (page._unloaded || page._imagesHidden) return;
  if (!page._memoryImages) page._memoryImages = createImageSources(page, options.concurrency);
  page._memoryImages.prepare(urls);
}
function prepareMemoryImageWindow(page) {
  if (page._unloaded || page._imagesHidden) return;
  const prepare = urls => {
    page._memoryImageWindowUrls = urls;
    if (page.prepareCoverWindow) page.prepareCoverWindow(urls);
    else prepareMemoryImages(page, urls);
  };
  // On return the native grid can briefly be unmeasurable; retain its last window.
  const fallback = () => {
    const items = page.data.items || [], available = new Set(items.map(item => item.cover));
    const retained = (page._memoryImageWindowUrls || []).filter(url => available.has(url));
    prepare(retained.length ? retained : items.slice(0, 8).map(item => item.cover));
  };
  if (!wx.createSelectorQuery) {fallback(); return;}
  const generation = page._memoryImageWindowGeneration = (page._memoryImageWindowGeneration || 0) + 1;
  try {
    const height = wx.getWindowInfo().windowHeight || 844;
    wx.createSelectorQuery().in(page).selectAll(".memory-window-image").boundingClientRect().exec(result => {
      if (page._unloaded || page._imagesHidden || generation !== page._memoryImageWindowGeneration) return;
      const rects = result && result[0] || [];
      const urls = rects.filter(rect => rect.bottom >= -height / 2 && rect.top <= height * 1.5)
        .sort((a, b) => a.top - b.top || (a.left || 0) - (b.left || 0))
        .slice(0, 24).map(rect => rect.dataset?.url).filter(Boolean);
      if (urls.length) prepare(urls);
      else if (!rects.length) fallback();
      else prepare([]);
    });
  } catch (_) {fallback();}
}
function scheduleMemoryImageWindow(page) {
  if (page._memoryImageWindowTimer) return;
  page._memoryImageWindowTimer = setTimeout(() => {
    page._memoryImageWindowTimer = null; prepareMemoryImageWindow(page);
  }, 80);
}
function stopMemoryImageWindow(page) {
  clearTimeout(page._memoryImageWindowTimer); page._memoryImageWindowTimer = null;
  page._memoryImageWindowGeneration = (page._memoryImageWindowGeneration || 0) + 1;
}
function pauseMemoryImages(page, keep = []) {
  stopMemoryImageWindow(page);
  page._memoryImages?.pause(keep);
  const retained = new Set(keep);
  if (!page._unloaded) page.setData({imageSources: Object.fromEntries(
    Object.entries(page.data.imageSources || {}).filter(([url]) => retained.has(url))), imageLoading: false});
}
function releaseMemoryImages(page) {
  stopMemoryImageWindow(page);
  page._memoryImageWindowUrls = null;
  if (page._memoryImages) page._memoryImages.dispose();
  page._memoryImages = null;
  if (!page._unloaded) page.setData({imageSources: {}, imageLoading: false});
}
module.exports = {prepareMemoryImages, releaseMemoryImages, pauseMemoryImages, prepareMemoryImageWindow, scheduleMemoryImageWindow};
