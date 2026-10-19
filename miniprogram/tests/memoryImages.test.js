const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {loadMediaModules} = require("./helpers/memoryMedia");
const {createMemoryCardPresentation} = require("../utils/memoryCardPresentation");
const source = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const local = id => `http://192.168.10.2:8002/api/v1/memory-media/${id}?variant=thumbnail&signature=private`;
function setup(bytes = 1024) {
  const jobs = [], removed = [], errors = [];
  const wx = {
    request: options => {options.success({statusCode:200,header:{'Content-Length':String(bytes)}}); return {abort(){}};},
    downloadFile(options) {
      const job = {options, aborted: false}; jobs.push(job);
      return {abort() {job.aborted = true; options.fail({errno: 3});}};
    },
    getFileSystemManager: () => ({unlink: ({filePath,success}) => {removed.push(filePath); success();},
      getFileInfo: options => options.success({size:bytes})}),
  };
  const {images, session} = loadMediaModules(wx, {logPageError: (...args) => errors.push(args)});
  const page = {data: {imageSources: {}, current: null}, setData(values) {Object.assign(this.data, values);}};
  const finish = (index, statusCode = 200) => {
    jobs[index].finished = true;
    jobs[index].options.success({statusCode, tempFilePath: `tmp-${index}`});
  };
  return {...images, session, jobs, removed, errors, page, finish, wx};
}

test("local HTTP images use native temporary files with unchanged private query strings", () => {
  const h = setup(), url = local(1);
  h.page.data.current = {url, kind: "image"};
  h.prepareMemoryImages(h.page, [url]);
  assert.equal(h.jobs[0].options.url, url);
  assert.equal(h.page.data.imageSources[url], undefined);
  assert.equal(h.page.data.imageLoading, true);
  h.finish(0);
  assert.equal(h.page.data.imageSources[url], "tmp-0");
  assert.equal(h.page.data.imageLoading, false);
  h.releaseMemoryImages(h.page);
  assert.deepEqual(h.removed, ["tmp-0"]);
});

test("HTTPS, packaged and existing temporary images keep their original source without downloading", () => {
  const h = setup();
  const urls = ["https://test.invalid/photo.jpg", "/images/photo.jpg", "wxfile://tmp/photo", "http://tmp/photo"];
  h.prepareMemoryImages(h.page, urls);
  assert.equal(h.jobs.length, 0);
  for (const url of urls) assert.equal(h.page.data.imageSources[url], url);
  h.releaseMemoryImages(h.page);
  assert.equal(h.removed.length, 0);
});

test("images deduplicate a window and share one serialized download queue", () => {
  const h = setup();
  h.prepareMemoryImages(h.page, [local(1), local(2), local(3), local(1)]);
  h.prepareMemoryImages(h.page, [local(1), local(2), local(3)]);
  assert.equal(h.jobs.length, 1);
  h.finish(0);
  assert.equal(h.jobs.length, 2);
  h.finish(1); h.finish(2);
  h.prepareMemoryImages(h.page, [local(1), local(2), local(3)]);
  assert.equal(h.jobs.length, 3);
  h.releaseMemoryImages(h.page);
});

test("memory feed downloads three covers concurrently and refills the first available lane", () => {
  const h = setup(), urls = [1,2,3,4].map(local), options = {concurrency:3};
  h.prepareMemoryImages(h.page, urls.slice(0,3), options);
  assert.deepEqual(h.jobs.map(job => job.options.url), urls.slice(0,3));
  h.finish(1);
  h.prepareMemoryImages(h.page, urls, options);
  assert.equal(h.jobs.length, 4);
  assert.equal(h.jobs[3].options.url, urls[3]);
  assert.equal(h.jobs[0].finished, undefined);
  assert.equal(h.jobs[2].finished, undefined);
  h.prepareMemoryImages(h.page, urls, options);
  assert.equal(h.jobs.length, 4, "unchanged windows never duplicate transfers");
  h.finish(3); h.finish(0); h.finish(2);
  assert.equal(Object.keys(h.page.data.imageSources).length, 4);
  h.releaseMemoryImages(h.page); assert.equal(h.removed.length, 4);
});

test("parallel cover downloads retain the same total 20MiB budget including in-flight transfers", () => {
  const h = setup(1024 * 1024), urls = Array.from({length:24}, (_,i) => local(i));
  h.prepareMemoryImages(h.page, urls, {concurrency:3});
  for (let i = 0; i < h.jobs.length; i++) {
    const pending = h.jobs.filter(job => !job.finished && !job.aborted).length;
    assert.ok(pending <= 3);
    assert.ok(Object.keys(h.page.data.imageSources).length + pending <= 20);
    h.finish(i);
  }
  assert.equal(Object.keys(h.page.data.imageSources).length, 18);
  assert.equal(h.errors.length, 6, "each lane enforces its share of the original total budget");
  h.releaseMemoryImages(h.page);
  assert.equal(h.removed.length, 18);
});

test("parallel cover failures reconcile the latest window even when callbacks fail synchronously", () => {
  const h = setup(), urls = [1,2,3,4,5].map(local), download = h.wx.downloadFile;
  h.wx.downloadFile = options => {
    if (options.url === urls[0] || options.url === urls[2]) throw new Error("download rejected");
    return download(options);
  };
  const covers = createMemoryCardPresentation(h.page, values =>
    h.prepareMemoryImages(h.page, values, {concurrency:3}));
  h.page.coverDownloadFailed = url => covers.failed(url);
  try {
    covers.window(urls);
    assert.equal(h.page.data.coverStates[urls[0]].failed, true);
    assert.equal(h.page.data.coverStates[urls[2]].failed, true);
    assert.deepEqual(h.jobs.map(job => job.options.url).sort(), [urls[1],urls[3],urls[4]].sort());
    assert.ok(h.jobs.every(job => !job.aborted));
    h.finish(2); h.finish(1); h.finish(0);
    assert.equal(Object.keys(h.page.data.imageSources).length, 3);
    assert.equal(h.errors.length, 2);
  } finally {covers.dispose(); h.releaseMemoryImages(h.page);}
});

test("all synchronous download failures drain a bounded cover window without restarting failed files", () => {
  const h = setup(), urls = Array.from({length:30}, (_,i) => local(i));
  h.wx.downloadFile = () => {throw new Error("download rejected");};
  const covers = createMemoryCardPresentation(h.page, values =>
    h.prepareMemoryImages(h.page, values, {concurrency:3}));
  h.page.coverDownloadFailed = url => covers.failed(url);
  try {
    covers.window(urls);
    assert.equal(Object.keys(h.page.data.coverStates).length, 24);
    assert.ok(Object.values(h.page.data.coverStates).every(state => state.failed));
    assert.equal(h.errors.length, 24);
    assert.equal(h.page.data.skeletonShimmerRunning, undefined);
    assert.equal(Object.keys(h.page.data.imageSources).length, 0);
  } finally {covers.dispose(); h.releaseMemoryImages(h.page);}
});

test("parallel cover pause aborts every unfinished lane and preserves decoded sources on return", () => {
  const h = setup(), urls = [1,2,3].map(local), options = {concurrency:3};
  h.prepareMemoryImages(h.page, urls, options); h.finish(1);
  h.page._imagesHidden = true; h.pauseMemoryImages(h.page, [urls[1]]);
  assert.equal(h.jobs[0].aborted, true); assert.equal(h.jobs[2].aborted, true);
  assert.equal(h.page.data.imageSources[urls[1]], "tmp-1");
  h.page._imagesHidden = false; h.prepareMemoryImages(h.page, urls, options);
  assert.equal(h.jobs.length, 5);
  assert.equal(h.jobs.filter(job => job.options.url === urls[1]).length, 1);
  h.finish(0); h.finish(2);
  assert.deepEqual(h.removed, ["tmp-0", "tmp-2"]);
  assert.equal(h.page.data.imageSources[urls[0]], undefined);
  h.finish(3); h.finish(4);
  assert.equal(Object.keys(h.page.data.imageSources).length, 3);
  h.releaseMemoryImages(h.page); assert.equal(h.removed.length, 5);
});

test("hiding cancels queued downloads and discards files returned after disposal", () => {
  const h = setup();
  h.prepareMemoryImages(h.page, [local(1), local(2), local(3)]);
  h.page._imagesHidden = true;
  h.releaseMemoryImages(h.page);
  assert.ok(h.jobs.every(job => job.aborted));
  h.finish(0);
  h.prepareMemoryImages(h.page, [local(4)]);
  assert.equal(h.jobs.length, 1);
  assert.deepEqual(h.removed, ["tmp-0"]);
  assert.equal(Object.keys(h.page.data.imageSources).length, 0);
  assert.equal(h.errors.length, 0);
});

test("pausing a feed retains completed files and aborts unfinished downloads without redownloading ready covers", () => {
  const h = setup(), first = local(1), second = local(2);
  h.prepareMemoryImages(h.page, [first, second]); h.finish(0);
  const sources = h.page._memoryImages;
  h.page._imagesHidden = true; h.pauseMemoryImages(h.page, [first]);
  assert.equal(h.jobs[1].aborted, true);
  assert.equal(h.page.data.imageSources[first], "tmp-0");
  assert.equal(h.page.data.imageSources[second], undefined);
  assert.deepEqual(h.removed, []);
  h.page._imagesHidden = false; h.prepareMemoryImages(h.page, [first, second]);
  assert.equal(h.page._memoryImages, sources);
  assert.equal(h.jobs.filter(job => job.options.url === first).length, 1);
  assert.equal(h.jobs.length, 3);
  h.finish(1); assert.deepEqual(h.removed, ["tmp-1"]);
  h.finish(2);
  assert.equal(h.page.data.imageSources[first], "tmp-0");
  assert.equal(h.page.data.imageSources[second], "tmp-2");
  h.releaseMemoryImages(h.page);
  assert.deepEqual(h.removed, ["tmp-1", "tmp-0", "tmp-2"]);
});

test("pausing direct HTTPS covers preserves only the requested ready window without persisting files", () => {
  const h = setup(), urls = ["https://test.invalid/ready.jpg", "https://test.invalid/pending.jpg"];
  h.prepareMemoryImages(h.page, urls);
  h.page._imagesHidden = true; h.pauseMemoryImages(h.page, [urls[0]]);
  assert.deepEqual(Object.keys(h.page.data.imageSources), [urls[0]]);
  assert.equal(h.jobs.length, 0);
  h.page._imagesHidden = false; h.prepareMemoryImages(h.page, [urls[0]]);
  assert.equal(h.page.data.imageSources[urls[0]], urls[0]);
  h.releaseMemoryImages(h.page);
});

test("HTTP failures do not render an error response as an image and refresh can retry", () => {
  const h = setup(), url = local(1);
  h.page.data.current = {url, kind: "image"};
  h.prepareMemoryImages(h.page, [url]);
  h.finish(0, 404);
  assert.equal(h.page.data.imageSources[url], undefined);
  assert.equal(h.page.data.imageLoading, false);
  assert.equal(h.page.data.error, "图片加载失败，请刷新重试");
  assert.deepEqual(h.removed, ["tmp-0"]);
  assert.equal(h.errors[0][0], "memory_image_download");
  assert.equal(h.errors[0][2].statusCode, 404);
  h.prepareMemoryImages(h.page, [url]);
  assert.equal(h.jobs.length, 1);
  h.releaseMemoryImages(h.page);
  h.prepareMemoryImages(h.page, [url]);
  assert.equal(h.jobs.length, 2);
  h.releaseMemoryImages(h.page);
});

test("late image failures cannot overwrite a different active image", () => {
  const h = setup();
  h.page.data.current = {url: local(1), kind: "image"};
  h.prepareMemoryImages(h.page, [local(1), local(2)]);
  h.page.data.current = {url: local(2), kind: "image"};
  h.jobs[0].options.fail({errno: 5});
  assert.equal(h.page.data.error, undefined);
  h.finish(1);
  assert.equal(h.page.data.imageSources[local(2)], "tmp-1");
  h.jobs[1].options.fail({errno: 5});
  assert.equal(h.page.data.error, undefined);
});

test("synchronous download errors settle the queue and do not leak private paths into errors", () => {
  const h = setup();
  h.wx.downloadFile = () => {throw new Error("secret local file path");};
  assert.doesNotThrow(() => h.prepareMemoryImages(h.page, [local(1), local(2), local(3)]));
  assert.equal(h.errors.length, 3);
  assert.ok(h.errors.every(error => error[1].message === "图片下载失败"));
});

test("memory covers, preview images, video posters and review thumbnails use resolved sources", () => {
  for (const file of ["pages/memory/memory.wxml", "pages/memory_review/memory_review.wxml", "pages/memory_detail/memory_detail.wxml"]) {
    const markup = source(file);
    assert.doesNotMatch(markup, /(?:src|poster)="\{\{item\.(?:cover|url|thumbnail_url)\}\}"/);
    assert.match(markup, /imageSources\[item\./);
  }
  assert.match(source("pages/memory_detail/memory_detail.wxml"), /id="memory-photo"[^>]*mode="aspectFit"/);
});

test("list scrolling retains a measured visible thumbnail window instead of accumulating every loaded batch",()=>{
  const h=setup();let offset=0;
  h.page.data.items=Array.from({length:100},(_,i)=>({cover:local(i)}));
  h.wx.getWindowInfo=()=>({windowHeight:160});
  const query={in(){return this;},selectAll(){return this;},boundingClientRect(){return this;},
    exec(callback){callback([h.page.data.items.map((item,i)=>({top:i*80-offset,bottom:i*80-offset+80,dataset:{url:item.cover}}))]);}};
  h.wx.createSelectorQuery=()=>query;
  h.prepareMemoryImageWindow(h.page);
  for(let i=0;i<h.jobs.length;i++)h.finish(i);
  assert.ok(Object.keys(h.page.data.imageSources).length<10);
  const completed=h.jobs.length;offset=4000;h.prepareMemoryImageWindow(h.page);
  for(let i=completed;i<h.jobs.length;i++)h.finish(i);
  assert.equal(h.page.data.imageSources[local(0)],undefined);
  assert.ok(Object.keys(h.page.data.imageSources).length<10);
  assert.ok(h.removed.length>=completed);h.releaseMemoryImages(h.page);
});

test("late viewport queries cannot start downloads after hiding a list",()=>{
  const h=setup();let complete;
  h.wx.getWindowInfo=()=>({windowHeight:160});
  const query={in(){return this;},selectAll(){return this;},boundingClientRect(){return this;},exec(fn){complete=fn;}};
  h.wx.createSelectorQuery=()=>query;
  h.prepareMemoryImageWindow(h.page);h.page._imagesHidden=true;h.releaseMemoryImages(h.page);
  complete([[{top:0,bottom:100,dataset:{url:local(1)}}]]);
  assert.equal(h.jobs.length,0);
});

test("masonry cover preparation follows measured top then left, not backend item order", () => {
  const h = setup(); let window;
  h.page.prepareCoverWindow = urls => {window = Array.from(urls);};
  h.wx.getWindowInfo = () => ({windowHeight: 400});
  const rects = [{top:200,left:0,bottom:300,dataset:{url:"bottom"}},
    {top:0,left:200,bottom:100,dataset:{url:"right"}},
    {top:0,left:0,bottom:100,dataset:{url:"left"}}];
  h.wx.createSelectorQuery = () => ({in(){return this;},selectAll(){return this;},
    boundingClientRect(){return this;},exec(fn){fn([rects]);}});
  h.prepareMemoryImageWindow(h.page);
  assert.deepEqual(window, ["left", "right", "bottom"]);
  assert.equal(h.jobs.length, 0);
});

test("an empty first layout measurement on return retains the previous scrolled window", () => {
  const h = setup(); let window, rects = [{top:0,bottom:100,dataset:{url:"scrolled-cover"}}];
  h.page.data.items = [{cover:"first-cover"}, {cover:"scrolled-cover"}];
  h.page.prepareCoverWindow = urls => {window = Array.from(urls);};
  h.wx.getWindowInfo = () => ({windowHeight:400});
  h.wx.createSelectorQuery = () => ({in(){return this;},selectAll(){return this;},
    boundingClientRect(){return this;},exec(fn){fn([rects]);}});
  h.prepareMemoryImageWindow(h.page);
  h.page._imagesHidden = true; h.pauseMemoryImages(h.page);
  h.page._imagesHidden = false; rects = []; h.prepareMemoryImageWindow(h.page);
  assert.deepEqual(window, ["scrolled-cover"]);
  h.page.data.items = [{cover:"replacement-cover"}];
  h.prepareMemoryImageWindow(h.page);
  assert.deepEqual(window, ["replacement-cover"]);
  h.page.data.items = [{cover:"first-cover"}, {cover:"scrolled-cover"}];
  h.releaseMemoryImages(h.page); h.prepareMemoryImageWindow(h.page);
  assert.deepEqual(window, ["first-cover", "scrolled-cover"]);
  h.releaseMemoryImages(h.page);
});
