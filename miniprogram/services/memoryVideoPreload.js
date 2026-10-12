function createVideoPreloader() {
  const files = new Map();
  let pending, disposed = false;
  const remove = (path) => {
    if (!path || !wx.getFileSystemManager) return;
    wx.getFileSystemManager().unlink({filePath: path, fail() {}});
  };
  const cancel = () => {
    const job = pending;
    pending = null;
    if (job && job.task) job.task.abort();
  };
  return {
    source(item) {
      const file = item && files.get(item.id);
      return file && file.url === item.url ? file.path : (item && item.url) || "";
    },
    update(current, next) {
      if (disposed) return;
      const keep = new Set([current, next].filter(Boolean).map((item) => item.id));
      for (const [id, file] of files) {
        if (!keep.has(id)) {remove(file.path); files.delete(id);}
      }
      if (pending && (!next || pending.id !== next.id || pending.url !== next.url)) cancel();
      if (!next || next.kind !== "video" || !next.url || !wx.downloadFile || pending) return;
      const file = files.get(next.id);
      if (file && file.url === next.url) return;
      if (file) {remove(file.path); files.delete(next.id);}
      const job = {id: next.id, url: next.url};
      pending = job;
      try {
        job.task = wx.downloadFile({
          url: next.url,
          success(result) {
            if (disposed || pending !== job || result.statusCode !== 200) {
              remove(result.tempFilePath);
              return;
            }
            if (result.tempFilePath) files.set(job.id, {url: job.url, path: result.tempFilePath});
          },
          fail() {},
          complete() {if (pending === job) pending = null;},
        });
      } catch (_) {if (pending === job) pending = null;}
    },
    dispose() {
      disposed = true;
      cancel();
      for (const file of files.values()) remove(file.path);
      files.clear();
    },
  };
}

module.exports = {createVideoPreloader};
