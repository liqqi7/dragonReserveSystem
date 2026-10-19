const {MAX_TEMP_BYTES} = require("./memoryMediaSession");

// One owner and one priority order for the mixed current/next/previous window.
function createPreviewMedia(session, publish) {
  const owner = {};
  let window = [], foreground = null, disposed = false, handoff = null;
  const emit = event => {
    if (disposed) return;
    const imageSources = {};
    for (const item of window) if (item) {
      for (const url of [item.kind === "image" && item.url, item.thumbnail_url]) {
        if (!url) continue;
        const source = session.source(url);
        if (source) imageSources[url] = source;
      }
    }
    publish?.(imageSources, event);
  };
  const unsubscribe = session.subscribe(emit);
  let allowed = true, warm = false;
  const sync = () => {
    const requests = [];
    window.forEach((item, index) => {
      if (!item) return;
      const current = index === 0, urgent = foreground === item.url;
      const base = index * 10;
      if (item.thumbnail_url) requests.push({url: item.thumbnail_url, kind: "image", priority: base,
        foreground: current, maxBytes: 1024 * 1024});
      if (item.url) requests.push({url: item.url, kind: item.kind,
        priority: urgent ? -1 : current && item.kind === "video" ? 30 : base + 1,
        protected: current || urgent, foreground: urgent || current && item.kind === "image",
        load: item.kind !== "video" || !current || urgent || warm && handoff !== item.url,
        maxBytes: MAX_TEMP_BYTES});
    });
    session.replace(owner, requests, allowed);
  };
  return {
    source(item) {return item && (session.source(item.url) || item.url) || "";},
    ensure(item) {
      if (disposed) return Promise.reject(Object.assign(new Error("媒体加载已取消"), {cancelled: true}));
      const source = session.source(item.url);
      if (source) return Promise.resolve(source);
      foreground = item.url;
      if (!window.some(value => value?.url === item.url)) window.unshift(item);
      session.clearError(item.url);
      const promise = session.wait(item.url);
      sync();
      return promise;
    },
    invalidate(item) {
      if (!item) return;
      if (foreground === item.url) foreground = null;
      session.invalidate(item.url);
    },
    update(current, next, previous, allowPrefetch = true, retainCurrent = false) {
      if (disposed) return;
      if (current?.url !== window[0]?.url) {
        // wx.downloadFile cannot hand partial bytes to the native player. Cancel once,
        // then let streaming own this visit instead of repeatedly restarting a copy.
        handoff = current?.kind === "video" && session.pending(current.url) ? current.url : null;
        foreground = null;
      }
      window = [current, next, previous];
      allowed = allowPrefetch; warm = retainCurrent;
      sync();
    },
    dispose() {
      if (disposed) return;
      disposed = true; unsubscribe(); session.replace(owner, []);
    },
  };
}
module.exports = {createPreviewMedia};
