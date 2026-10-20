const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {createPreviewMediaPool, PREVIEW_TEMP_BYTES, PREVIEW_IDLE_MS} = require("../services/memoryPreviewSession");

function fixture({maxBytes = 20, size = 8} = {}) {
  const jobs = [], held = new Map(), timers = new Map();
  let serial = 0, now = 0;
  const wx = {
    request(options) {options.success({statusCode: 200, header: {"Content-Length": String(size)}}); return {abort() {}};},
    downloadFile(options) {
      const job = {options, aborted: false}; jobs.push(job);
      return {abort() {job.aborted = true;}};
    },
    getFileSystemManager: () => ({
      getFileInfo: ({filePath, success}) => success({size: held.get(filePath)}),
      accessSync(filePath) {if (!held.has(filePath)) throw new Error("ENOENT");},
      unlink({filePath, success}) {held.delete(filePath); success();},
    }),
  };
  const pool = createPreviewMediaPool(wx, {maxBytes, now: () => now,
    setTimer(fn, delay) {timers.set(++serial, {fn, delay}); return serial;},
    clearTimer(id) {timers.delete(id);},
  });
  const finish = (index, file = `tmp-${index}`) => {
    held.set(file, size);
    jobs[index].options.success({statusCode: 200, tempFilePath: file});
  };
  const use = (lease, url, key = url, kind = "image") => {
    lease.session.bindResources([{url, key}]);
    lease.session.replace("viewer", [{url, kind, foreground: true, priority: 0}]);
  };
  return {pool, wx, jobs, held, timers, finish, use, advance: ms => {now += ms;}};
}

test("image and video files survive closing/reopening but expire after ten idle minutes", () => {
  const h = fixture(), first = h.pool.acquire("member");
  h.use(first, "https://test/photo", "image"); h.finish(0);
  h.use(first, "https://test/clip", "video", "video"); h.finish(1);
  h.pool.release(first);
  assert.equal(h.held.size, 2);
  assert.equal([...h.timers.values()][0].delay, PREVIEW_IDLE_MS);
  const second = h.pool.acquire("member");
  assert.equal(h.timers.size, 0);
  h.use(second, "https://test/photo", "image");
  assert.equal(second.session.source("https://test/photo"), "tmp-0");
  h.use(second, "https://test/clip", "video", "video");
  assert.equal(second.session.source("https://test/clip"), "tmp-1");
  assert.equal(h.jobs.length, 2);
  h.pool.release(second); [...h.timers.values()][0].fn();
  assert.equal(h.held.size, 0); assert.equal(second.session.usage(), 0);
  h.pool.dispose();
});

test("freshly authorized signed URLs reuse bytes only for matching resource identities", () => {
  const h = fixture(), first = h.pool.acquire("admin");
  h.use(first, "https://test/1?actor=7&expires=1&signature=old", "7:3:1:display"); h.finish(0);
  h.pool.release(first);
  const next = h.pool.acquire("admin"), url = "https://test/1?actor=7&expires=2&signature=new";
  h.use(next, url, "7:3:1:display");
  assert.equal(next.session.source(url), "tmp-0"); assert.equal(h.jobs.length, 1);
  h.use(next, url, "7:4:1:display");
  assert.equal(next.session.source(url), ""); assert.equal(h.jobs.length, 2);
  h.finish(1); h.pool.dispose();
});

test("a confirmed publication-only change can retain already decoded neighbour bytes", () => {
  const h = fixture(), lease = h.pool.acquire("admin"), url = "https://test/next";
  h.use(lease, url, "7:3:2:display"); h.finish(0);
  lease.session.bindResources([{url, key: "7:4:2:display"}], true);
  h.use(lease, url, "7:4:2:display");
  assert.equal(lease.session.source(url), "tmp-0"); assert.equal(h.jobs.length, 1);
  h.pool.dispose();
});

test("scope changes clear previous files and stale page releases cannot stop the new viewer", () => {
  const h = fixture(), first = h.pool.acquire("account-a");
  h.use(first, "https://test/private"); h.finish(0);
  const next = h.pool.acquire("account-b");
  assert.equal(h.held.size, 0);
  h.use(next, "https://test/private");
  h.pool.release(first);
  assert.equal(h.jobs[1].aborted, false); assert.equal(h.timers.size, 0);
  h.finish(1); h.pool.dispose();
});

test("LRU eviction reserves space before transfer and protects recently reused files", () => {
  const h = fixture(), lease = h.pool.acquire("member");
  h.use(lease, "https://test/a"); h.finish(0);
  h.use(lease, "https://test/b"); h.finish(1);
  lease.session.source("https://test/a");
  h.use(lease, "https://test/c");
  assert.equal(lease.session.usage(), 16);
  assert.equal(lease.session.source("https://test/b"), "");
  assert.equal(lease.session.source("https://test/a"), "tmp-0");
  h.finish(2); assert.equal(h.held.size, 2); h.pool.dispose();
});

test("continuous use retains at most 24 files, independent of the byte cap", () => {
  const h = fixture({maxBytes: 100, size: 1}), lease = h.pool.acquire("member");
  for (let i = 0; i < 30; i++) {h.use(lease, `https://test/${i}`); h.finish(i);}
  assert.equal(h.held.size, 24); assert.equal(lease.session.usage(), 24);
  assert.equal(lease.session.source("https://test/0"), ""); h.pool.dispose();
});

test("missing temporary files are detected on reuse and downloaded again", () => {
  const h = fixture(), first = h.pool.acquire("member");
  h.use(first, "https://test/photo"); h.finish(0); h.pool.release(first);
  h.held.clear();
  const next = h.pool.acquire("member"); h.use(next, "https://test/photo");
  assert.equal(h.jobs.length, 2); assert.equal(next.session.source("https://test/photo"), "");
  h.finish(1); h.pool.dispose();
});

test("unfinished downloads are cancelled on exit and late files never enter the reusable pool", () => {
  const h = fixture(), lease = h.pool.acquire("member");
  h.use(lease, "https://test/photo"); h.pool.release(lease);
  assert.equal(h.jobs[0].aborted, true); h.finish(0);
  assert.equal(h.held.size, 0); h.pool.dispose();
});

test("preview uses a 50MiB temporary cap and never writes persistent cache files or metadata", () => {
  assert.equal(PREVIEW_TEMP_BYTES, 50 * 1024 ** 2); assert.equal(PREVIEW_IDLE_MS, 600000);
  for (const file of ["memoryPreviewSession.js", "memoryMediaSession.js"]) {
    const source = fs.readFileSync(path.join(__dirname, "../services", file), "utf8");
    assert.doesNotMatch(source, /saveFile|setStorage|USER_DATA_PATH/);
  }
});

test("the larger preview budget accepts two 20MiB files instead of retaining only one", () => {
  const h = fixture({maxBytes: PREVIEW_TEMP_BYTES, size: 20 * 1024 ** 2}), lease = h.pool.acquire("member");
  h.use(lease, "https://test/a"); h.finish(0);
  h.use(lease, "https://test/b", "b", "video"); h.finish(1);
  assert.equal(lease.session.usage(), 40 * 1024 ** 2); assert.equal(h.held.size, 2);
  h.pool.dispose();
});

test("an operating-system temporary path can be reused and still cleaned on the next expiry", () => {
  const h = fixture(), first = h.pool.acquire("member");
  h.use(first, "https://test/photo"); h.finish(0, "reused-path");
  h.pool.release(first); [...h.timers.values()][0].fn();
  const next = h.pool.acquire("member");
  h.use(next, "https://test/photo"); h.finish(1, "reused-path");
  h.pool.release(next); [...h.timers.values()].at(-1).fn();
  assert.equal(h.held.size, 0); assert.equal(next.session.usage(), 0); h.pool.dispose();
});

test("switching scopes cannot release the byte charge until asynchronous deletion succeeds", () => {
  const h = fixture({maxBytes: 10}), first = h.pool.acquire("account-a");
  h.use(first, "https://test/a"); h.finish(0);
  const original = h.wx.getFileSystemManager(); let release;
  h.wx.getFileSystemManager = () => ({...original, unlink(options) {release = () => original.unlink(options);}});
  const next = h.pool.acquire("account-b"); h.use(next, "https://test/b");
  assert.equal(h.jobs.length, 1); assert.equal(next.session.usage(), 8);
  release(); assert.equal(h.jobs.length, 2); assert.equal(next.session.usage(), 8);
  h.finish(1); h.wx.getFileSystemManager = () => original; h.pool.dispose();
});

test("a late idle callback cannot clear a viewer that has already reopened", () => {
  const h = fixture(), first = h.pool.acquire("member");
  h.use(first, "https://test/photo"); h.finish(0); h.pool.release(first);
  const expire = [...h.timers.values()][0].fn;
  const next = h.pool.acquire("member"); h.use(next, "https://test/photo");
  expire();
  assert.equal(next.session.source("https://test/photo"), "tmp-0");
  assert.equal(h.held.size, 1); h.pool.dispose();
});

test("wall-clock expiry also applies when background suspension delays the cleanup timer", () => {
  const h = fixture(), first = h.pool.acquire("member");
  h.use(first, "https://test/photo"); h.finish(0); h.pool.release(first);
  h.advance(PREVIEW_IDLE_MS + 1);
  const next = h.pool.acquire("member"); h.use(next, "https://test/photo");
  assert.equal(next.session.source("https://test/photo"), "");
  assert.equal(h.jobs.length, 2); h.finish(1); h.pool.dispose();
});

test("nine idle minutes still reuse files and ten minutes expire them without waiting in the app", () => {
  for (const [minutes, expectedJobs] of [[9, 1], [10, 2]]) {
    const h = fixture(), first = h.pool.acquire("member");
    h.use(first, "https://test/photo"); h.finish(0); h.pool.release(first);
    h.advance(minutes * 60 * 1000);
    const next = h.pool.acquire("member"); h.use(next, "https://test/photo");
    assert.equal(h.jobs.length, expectedJobs);
    if (expectedJobs === 2) h.finish(1);
    h.pool.dispose();
  }
});

test("the 24-file cap includes files still awaiting asynchronous deletion", () => {
  const h = fixture({maxBytes: 100, size: 1}), lease = h.pool.acquire("member");
  for (let i = 0; i < 24; i++) {h.use(lease, `https://test/${i}`); h.finish(i);}
  const original = h.wx.getFileSystemManager(); let release;
  h.wx.getFileSystemManager = () => ({...original, unlink(options) {release = () => original.unlink(options);}});
  h.use(lease, "https://test/24");
  assert.equal(h.jobs.length, 24); assert.equal(h.held.size, 24);
  release(); assert.equal(h.jobs.length, 25); h.finish(24);
  assert.equal(h.held.size, 24);
  h.wx.getFileSystemManager = () => original; h.pool.dispose();
});

test("decoded photo readiness survives a lease only while the matching temporary file exists", () => {
  const h = fixture(), first = h.pool.acquire("member"), url = "https://test/photo";
  h.use(first, url); h.finish(0);
  first.photoLoaded(url, "other-file"); assert.equal(first.photoReady(url), false);
  first.photoLoaded(url, "tmp-0"); assert.equal(first.photoReady(url), true);
  h.pool.release(first);
  const next = h.pool.acquire("member");
  assert.equal(next.photoReady(url), true);
  h.use(next, url, "new-revision");
  assert.equal(next.photoReady(url), false);
  h.finish(1); assert.equal(next.photoReady(url), false);
  next.photoLoaded(url, "tmp-1");
  assert.equal(next.photoReady(url), true);
  h.held.delete("tmp-1"); h.pool.release(next);
  assert.equal(h.pool.acquire("member").photoReady(url), false);
  h.pool.dispose();
});

test("short-lived detail snapshots are cloned, bounded by age and cleared across account scopes", () => {
  const h = fixture(), first = h.pool.acquire("member"), value = {id:7,media:[{id:10}]};
  first.rememberDetail(value); value.media[0].id = 99;
  const copy = first.detail(7); assert.equal(copy.media[0].id, 10);
  copy.media[0].id = 88; assert.equal(first.detail(7).media[0].id, 10);
  h.pool.release(first); h.advance(PREVIEW_IDLE_MS - 1);
  const next = h.pool.acquire("member");
  assert.ok(next.detail(7)); h.advance(1);
  assert.equal(next.detail(7), null, "reading a snapshot cannot extend its freshness");
  next.rememberDetail({id:7,media:[]});
  const other = h.pool.acquire("other-account");
  assert.equal(other.detail(7), null);
  first.rememberDetail({id:8}); assert.equal(other.detail(8), null);
  h.pool.dispose();
});

test("snapshot LRU respects both a 12-entry cap and a conservative 128KiB total memory budget", () => {
  const h = fixture(), lease = h.pool.acquire("member");
  for (let id = 0; id < 12; id++) lease.rememberDetail({id});
  lease.detail(0); lease.rememberDetail({id:12});
  assert.equal(lease.detail(1), null); assert.ok(lease.detail(0));
  for (let id = 20; id < 23; id++) lease.rememberDetail({id,caption:"x".repeat(20000)});
  assert.equal(lease.detail(20), null); assert.ok(lease.detail(21)); assert.ok(lease.detail(22));
  lease.rememberDetail({id:99,caption:"x".repeat(50000)});
  assert.equal(lease.detail(99), null, "oversized snapshots are never admitted");
  lease.forgetDetail(21); assert.equal(lease.detail(21), null);
  h.pool.release(lease); [...h.timers.values()][0].fn();
  assert.equal(h.pool.acquire("member").detail(22), null);
  h.pool.dispose();
});

test("metadata invalidation clears snapshots but not unchanged completed media files", () => {
  const h=fixture(), first=h.pool.acquire("account",1), url="https://test/photo";
  h.use(first,url,"content-a"); h.finish(0); first.rememberDetail({id:7}); first.photoLoaded(url,"tmp-0");
  h.pool.release(first);
  const next=h.pool.acquire("account",2);
  assert.equal(next.detail(7),null); assert.equal(next.photoReady(url),true);
  h.use(next,url,"content-a"); assert.equal(h.jobs.length,1);
  h.pool.dispose();
});

test("a recycled temporary path cannot inherit native readiness from different content",()=>{
  const h=fixture(),lease=h.pool.acquire("account"),url="https://test/photo";
  h.use(lease,url,"first-content");h.finish(0,"recycled");lease.photoLoaded(url,"recycled");
  assert.equal(lease.photoReady(url),true);
  h.use(lease,url,"new-content");h.finish(1,"recycled");
  assert.equal(lease.photoReady(url),false);h.pool.dispose();
});


test("public preview binds neighboring media to each submission's resource identity", () => {
  const {bindPreviewResources} = require("../services/memoryPreviewSession");
  let resources;
  const page = {data: {index: 1, memory: {id: 5, revision: 9},
    viewerMedia: [9, 8, 7].map(id => ({id, url: `https://test.invalid/${id}`}))},
    _publicQueue: [{memory_id: 6, revision: 2}, {memory_id: 5, revision: 9}, {memory_id: 4, revision: 3}],
    _mediaSession: {bindResources: value => {resources = value;}}};
  bindPreviewResources(page);
  assert.deepEqual(resources.map(item => item.key), ["5:9:8:display", "4:3:7:display", "6:2:9:display"]);
});
