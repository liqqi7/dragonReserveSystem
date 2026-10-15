const {createMediaSession} = require("./memoryMediaSession");

function createVideoPreloader(sharedSession) {
  const session = sharedSession || createMediaSession();
  const owner = {};
  let window = [], foreground = null, disposed = false;
  const sync = allowed => session.replace(owner, window.map((item, index) => item && item.kind === "video" && item.url ? ({
    url: item.url, kind: "video", priority: foreground === item.url ? -1 : index ? index * 10 + 1 : 0,
    protected: index === 0 || foreground === item.url, foreground: foreground === item.url,
    load: index !== 0 || foreground === item.url,
  }) : null).filter(Boolean), allowed);
  return {
    source(item) {return item && (session.source(item.url) || item.url) || "";},
    ensure(item) {
      if (disposed) return Promise.reject(Object.assign(new Error("视频加载已取消"), {cancelled: true}));
      if (session.source(item.url)) return Promise.resolve(session.source(item.url));
      foreground = item.url;
      if (!window.some(value => value && value.url === item.url)) window.unshift(item);
      session.clearError(item.url);
      const promise = session.wait(item.url);
      sync();
      return promise;
    },
    invalidate(item) {
      if (!item) return;
      if (foreground === item.url) {foreground = null; sync();}
      session.invalidate(item.url);
    },
    update(current, next, previous, allowPrefetch = true) {
      if (disposed) return;
      if (foreground && foreground !== current?.url) foreground = null;
      window = [current, next, previous];
      sync(allowPrefetch);
    },
    dispose() {
      if (disposed) return;
      disposed = true; session.replace(owner, []);
      if (!sharedSession) session.dispose();
    },
  };
}
module.exports = {createVideoPreloader};
