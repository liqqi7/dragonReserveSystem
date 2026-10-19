const MAX_TEMP_BYTES = 20 * 1024 * 1024;
const cancelled = () => Object.assign(new Error('媒体加载已取消'), {cancelled: true});
const limitError = () => Object.assign(new Error('临时媒体超出大小限制'), {sizeLimit: true});

// Transfers and files awaiting deletion are included in the same byte budget.
function createMediaSession(wxApi = wx, {maxBytes = MAX_TEMP_BYTES, retainCompleted = false, maxFiles = Infinity} = {}) {
  const owners = new Map(), files = new Map(), failures = new Map(), deleting = new Map();
  let identities = new Map();
  const listeners = new Set(), waiters = new Map(), removed = new Set();
  let wanted = new Map(), pending = null, speculation = true, disposed = false, updating = 0;
  const notify = event => {for (const fn of listeners) {try {fn(event);} catch (_) {}}};
  const usage = () => [...files.values(), ...deleting.values()].reduce((n, f) => n + f.size, 0) +
    (pending ? pending.reserved : 0);
  const settle = (url, path, error) => {
    const list = waiters.get(url) || []; waiters.delete(url);
    for (const waiter of list) error ? waiter.reject(error) : waiter.resolve(path);
  };
  const wake = () => {
    if (pending?.space && !updating) {const job = pending; job.space = false; transfer(job, job.expected);}
    else drain();
  };
  function remove(file) {
    if (!file || deleting.has(file.path) || removed.has(file.path)) return;
    deleting.set(file.path, file);
    const attempt = count => {
      let settled = false;
      const success = () => {
        if (settled) return; settled = true; clearTimeout(timer);
        deleting.delete(file.path); removed.add(file.path); wake();
        if (removed.size > 256) removed.delete(removed.values().next().value);
      };
      const fail = error => {
        if (settled) return;
        if (/ENOENT|no such file|not exist/i.test(error?.errMsg || '')) {success(); return;}
        settled = true; clearTimeout(timer);
        if (count < 2) setTimeout(() => attempt(count + 1), 100 * (count + 1));
        else {file.failed = true; wake();}
      };
      const timer = setTimeout(() => fail(), 2000);
      try {
        wxApi.getFileSystemManager().unlink({filePath: file.path, success, fail});
      } catch (_) {fail();}
    };
    attempt(0);
  }
  function stop(reject = true) {
    const job = pending; pending = null;
    if (!job) return;
    clearTimeout(job.timer);
    if (job.path) remove({path: job.path, size: job.reserved});
    if (reject) settle(job.url, null, cancelled());
    for (const task of [job.headTask, job.task]) {try {if (task) task.abort();} catch (_) {}}
  }
  function fail(job, error, path) {
    if (pending !== job) {if (path) remove({path, size: job.reserved}); return;}
    pending = null; clearTimeout(job.timer);
    failures.set(job.url, error); settle(job.url, null, error);
    if (path || job.path) remove({path: path || job.path, size: job.reserved});
    for (const task of [job.headTask, job.task]) {try {if (task) task.abort();} catch (_) {}}
    notify({url: job.url, error}); drain();
  }
  function reserve(job, size) {
    if (!Number.isSafeInteger(size) || size <= 0 || size > Math.min(maxBytes, wanted.get(job.url)?.maxBytes || maxBytes)) return false;
    const incoming = wanted.get(job.url);
    if (incoming?.foreground || retainCompleted) {
      updating++;
      for (const [url, file] of [...files].sort((a, b) => (wanted.get(b[0])?.priority ?? Infinity) - (wanted.get(a[0])?.priority ?? Infinity))) {
        if (usage() + size <= maxBytes && files.size < maxFiles) break;
        const existing = wanted.get(url);
        if (existing?.protected || existing?.foreground && existing.priority <= incoming.priority || !incoming.foreground && existing) continue;
        files.delete(url); failures.set(url, limitError()); remove(file); notify({url});
      }
      updating--;
    }
    if (usage() + size > maxBytes || files.size + deleting.size >= maxFiles) {
      if ([...deleting.values()].some(file => !file.failed)) {job.space = true; return 'wait';}
      return false;
    }
    job.reserved = size; return true;
  }
  function transfer(job, size) {
    if (pending !== job || disposed) return;
    job.expected = size;
    const allocated = reserve(job, size);
    if (allocated === 'wait') return;
    if (!allocated) {fail(job, limitError()); return;}
    clearTimeout(job.timer);
    job.timer = setTimeout(() => fail(job, new Error('媒体下载超时')), 60000);
    try {
      job.task = wxApi.downloadFile({url: job.url, timeout: 60000,
        success(result) {
          const path = result.tempFilePath || result.filePath;
          if (pending !== job || disposed) {if (path) remove({path, size}); return;}
          if (result.statusCode !== 200 || !path) {
            fail(job, Object.assign(new Error('媒体下载失败'), {statusCode: result.statusCode}), path); return;
          }
          removed.delete(path);
          if (deleting.has(path)) {fail(job, new Error('媒体临时文件仍在清理')); return;}
          job.path = path;
          clearTimeout(job.timer);
          job.timer = setTimeout(() => fail(job, new Error('无法读取媒体大小')), 3000);
          try {
            wxApi.getFileSystemManager().getFileInfo({filePath: path,
              success(info) {
                if (pending !== job || disposed) {remove({path, size}); return;}
                if (!Number.isSafeInteger(info.size) || info.size <= 0 || info.size > size) {
                  if (Number.isSafeInteger(info.size) && info.size > size) job.reserved = info.size;
                  fail(job, limitError(), path); return;
                }
                clearTimeout(job.timer); pending = null;
                files.set(job.url, {path, size: info.size, key: job.key}); settle(job.url, path);
                notify({url: job.url}); drain();
              }, fail: () => fail(job, new Error('无法读取媒体大小'), path),
            });
          } catch (_) {fail(job, new Error('无法读取媒体大小'), path);}
        },
        fail: error => fail(job, Object.assign(new Error('媒体下载失败'), {errno: error.errno})),
      });
      if (job.task?.onProgressUpdate) job.task.onProgressUpdate(info => {
        if (pending !== job) return;
        if (Math.max(Number(info.totalBytesWritten) || 0, Number(info.totalBytesExpectedToWrite) || 0) > size)
          fail(job, limitError());
      });
    } catch (_) {fail(job, new Error('媒体下载失败'));}
  }
  function drain() {
    if (disposed || pending || updating || !wxApi.downloadFile) return;
    const item = [...wanted.values()].filter(item => item.load !== false && !files.has(item.url) &&
      !failures.has(item.url) && (speculation || item.foreground)).sort((a, b) => a.priority - b.priority)[0];
    if (!item) return;
    const job = {url: item.url, key: identities.get(item.url), reserved: 0}; pending = job;
    try {
      // Reserve space before downloading, not after a complete file occupies disk.
      job.timer = setTimeout(() => fail(job, new Error('媒体信息读取超时')), 10000);
      job.headTask = wxApi.request({url: job.url, method: 'HEAD', timeout: 10000,
        success(result) {
          if (pending !== job) return;
          const headers = result.header || {};
          const key = Object.keys(headers).find(key => key.toLowerCase() === 'content-length');
          const type = Object.keys(headers).find(key => key.toLowerCase() === 'content-type');
          if (result.statusCode !== 200) {fail(job, Object.assign(new Error('媒体信息读取失败'), {statusCode: result.statusCode})); return;}
          if (type && !String(headers[type]).toLowerCase().startsWith(item.kind === 'video' ? 'video/' : 'image/')) {
            fail(job, new Error('媒体格式不支持')); return;
          }
          transfer(job, Number(key && headers[key]));
        }, fail: () => fail(job, new Error('媒体信息读取失败')),
      });
    } catch (_) {fail(job, new Error('媒体信息读取失败'));}
  }
  function reconcile() {
    updating++;
    const next = new Map();
    for (const list of owners.values()) for (const item of list) {
      if (!item.url || !/^https?:\/\//i.test(item.url)) continue;
      const old = next.get(item.url);
      next.set(item.url, old ? {...(old.priority <= item.priority ? old : item),
        foreground: old.foreground || item.foreground, protected: old.protected || item.protected,
        load: old.load !== false || item.load !== false} : item);
    }
    for (const [url, item] of next) if (!wanted.has(url) || item.foreground && !wanted.get(url).foreground) failures.delete(url);
    wanted = next;
    for (const [url, file] of files) if (!wanted.has(url) && !retainCompleted) {files.delete(url); remove(file);}
    for (const url of failures.keys()) if (!wanted.has(url)) failures.delete(url);
    for (const url of waiters.keys()) if (!wanted.has(url)) settle(url, null, cancelled());
    if (pending) {
      const active = wanted.get(pending.url);
      const urgent = [...wanted.values()].some(item => item.foreground && item.load !== false &&
        !files.has(item.url) && !failures.has(item.url) && item.priority < (active?.priority ?? Infinity));
      if (!active || active.load === false || !speculation && !active.foreground || urgent)
        stop(!active || active.load === false);
    }
    updating--; notify({}); drain();
  }
  return {
    bindResources(resources, unchanged = false) {
      identities = new Map(resources.map(item => [item.url, item.key]));
      updating++;
      for (const [url, key] of identities) {
        if (pending?.url === url && pending.key !== key) stop();
        const existing = files.get(url);
        if (existing && unchanged) existing.key = key;
        if (existing && existing.key !== key) {files.delete(url); remove(existing);}
        if (!files.has(url)) {
          const match = [...files].find(([, file]) => file.key === key);
          if (match) {files.delete(match[0]); files.set(url, match[1]);}
        }
      }
      updating--;
    },
    validateFiles() {
      const fs = wxApi.getFileSystemManager();
      if (!fs.accessSync) return;
      for (const [url, file] of files) {
        try {fs.accessSync(file.path);} catch (_) {files.delete(url); remove(file);}
      }
    },
    suspend() {
      owners.clear(); reconcile();
    },
    clear() {
      updating++; stop();
      for (const url of waiters.keys()) settle(url, null, cancelled());
      owners.clear(); wanted.clear(); failures.clear(); identities.clear();
      for (const file of files.values()) remove(file);
      files.clear(); updating--; notify({});
    },
    replace(owner, list, allowed) {
      if (disposed) return;
      if (typeof allowed === 'boolean') speculation = allowed;
      if (list.length) owners.set(owner, list); else owners.delete(owner);
      reconcile();
    },
    source(url) {
      const file = files.get(url);
      if (!file) return '';
      files.delete(url); files.set(url, file);
      return file.path;
    },
    error: url => failures.get(url),
    identity: url => files.get(url)?.key,
    pending: url => pending?.url === url,
    clearError: url => failures.delete(url),
    wait(url) {
      if (disposed) return Promise.reject(cancelled());
      if (files.has(url)) return Promise.resolve(files.get(url).path);
      if (failures.has(url)) return Promise.reject(failures.get(url));
      const promise = new Promise((resolve, reject) => {
        if (!waiters.has(url)) waiters.set(url, []); waiters.get(url).push({resolve, reject});
      });
      promise.catch(() => {}); return promise;
    },
    invalidate(url) {
      updating++;
      failures.delete(url);
      if (pending?.url === url) stop();
      const file = files.get(url); files.delete(url); remove(file); updating--; notify({url});
    },
    subscribe(fn) {listeners.add(fn); return () => listeners.delete(fn);},
    setSpeculation(allowed) {if (disposed) return; speculation = !!allowed; reconcile();},
    dispose() {
      if (disposed) return; disposed = true; stop();
      for (const url of waiters.keys()) settle(url, null, cancelled());
      owners.clear(); wanted.clear(); listeners.clear();
      for (const file of files.values()) remove(file);
      files.clear(); failures.clear();
    },
    usage,
  };
}
module.exports = {createMediaSession, MAX_TEMP_BYTES};
