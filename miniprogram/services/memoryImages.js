const {isLocalTestMediaUrl} = require("./config");
const {logPageError} = require("./logger");
const {createMediaSession} = require("./memoryMediaSession");

function createImageSources(page) {
  const shared = page._mediaSession, session = shared || createMediaSession(), owner = {};
  let urls = [], requests = [], disposed = false;
  const publish = event => {
    if (disposed || page._unloaded || page._imagesHidden) return;
    const controlled = new Set(requests.map(item => item.url));
    const imageSources = {};
    for (const url of urls) {
      const source = controlled.has(url) ? session.source(url) : url;
      if (source) imageSources[url] = source;
    }
    const current = page.data.current;
    page.setData({imageSources, imageLoading: !!(current?.kind === "image" &&
      controlled.has(current.url) && !imageSources[current.url] && !session.error(current.url))});
    if (event?.error && !event.error.cancelled && controlled.has(event.url)) {
      logPageError("memory_image_download", {message: "图片下载失败", errno: event.error.errno},
        {statusCode: event.error.statusCode});
      if (current?.kind === "image" && current.url === event.url)
        page.setData({error: "图片加载失败，请刷新重试"});
    }
  };
  const unsubscribe = session.subscribe(publish);
  return {
    prepare(values, preload = [], neighbours = []) {
      if (disposed) return;
      urls = [...new Set([...preload, ...values].filter(Boolean))];
      const current = page.data.current;
      requests = urls.filter(url => /^https?:\/\//i.test(url) &&
        (shared || preload.includes(url) || isLocalTestMediaUrl(url))).map((url, index) => {
          const position = neighbours.findIndex(item => item && (item.url === url || item.thumbnail_url === url));
          return {
          url, kind: "image",
          foreground: !!current && (current.url === url || current.thumbnail_url === url) || !shared && !preload.length,
          protected: current?.kind === "image" && current.url === url,
          maxBytes: preload.includes(url) ? undefined : 1024 * 1024,
          priority: current?.thumbnail_url === url ? 0 : current?.url === url ? 1 : position > 0 ?
            position * 10 + (preload.includes(url) ? 1 : 0) : 10 + index,
        };});
      session.replace(owner, requests);
    },
    dispose() {
      if (disposed) return;
      disposed = true; unsubscribe(); session.replace(owner, []);
      if (!shared) session.dispose();
    },
  };
}
function prepareMemoryImages(page, urls, options = {}) {
  if (page._unloaded || page._imagesHidden) return;
  if (!page._memoryImages) page._memoryImages = createImageSources(page);
  page._memoryImages.prepare(urls, options.preload, options.neighbours);
}
function prepareMemoryImageWindow(page) {
  if (page._unloaded || page._imagesHidden) return;
  const fallback = () => prepareMemoryImages(page, (page.data.items || []).slice(0, 8).map(item => item.cover));
  if (!wx.createSelectorQuery) {fallback(); return;}
  const generation = page._memoryImageWindowGeneration = (page._memoryImageWindowGeneration || 0) + 1;
  try {
    const height = wx.getWindowInfo().windowHeight || 844;
    wx.createSelectorQuery().in(page).selectAll(".memory-window-image").boundingClientRect().exec(result => {
      if (page._unloaded || page._imagesHidden || generation !== page._memoryImageWindowGeneration) return;
      const rects = result && result[0] || [];
      const urls = rects.filter(rect => rect.bottom >= -height / 2 && rect.top <= height * 1.5)
        .slice(0, 24).map(rect => rect.dataset?.url).filter(Boolean);
      if (urls.length) prepareMemoryImages(page, urls);
      else if (!page._memoryImages) fallback();
    });
  } catch (_) {fallback();}
}
function scheduleMemoryImageWindow(page) {
  if (page._memoryImageWindowTimer) return;
  page._memoryImageWindowTimer = setTimeout(() => {
    page._memoryImageWindowTimer = null; prepareMemoryImageWindow(page);
  }, 80);
}
function releaseMemoryImages(page) {
  clearTimeout(page._memoryImageWindowTimer); page._memoryImageWindowTimer = null;
  page._memoryImageWindowGeneration = (page._memoryImageWindowGeneration || 0) + 1;
  if (page._memoryImages) page._memoryImages.dispose();
  page._memoryImages = null;
  if (!page._unloaded) page.setData({imageSources: {}, imageLoading: false});
}
module.exports = {prepareMemoryImages, releaseMemoryImages, prepareMemoryImageWindow, scheduleMemoryImageWindow};
