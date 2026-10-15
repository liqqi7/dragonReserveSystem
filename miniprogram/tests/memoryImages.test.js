const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {loadMediaModules} = require("./helpers/memoryMedia");
const source = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const local = id => `http://192.168.10.2:8002/api/v1/memory-media/${id}?variant=thumbnail&signature=private`;
function setup() {
  const jobs = [], removed = [], errors = [];
  const wx = {
    request: options => {options.success({statusCode:200,header:{'Content-Length':'1024'}}); return {abort(){}};},
    downloadFile(options) {
      const job = {options, aborted: false}; jobs.push(job);
      return {abort() {job.aborted = true; options.fail({errno: 3});}};
    },
    getFileSystemManager: () => ({unlink: ({filePath,success}) => {removed.push(filePath); success();},
      getFileInfo: options => options.success({size:1024})}),
  };
  const {images} = loadMediaModules(wx, {logPageError: (...args) => errors.push(args)});
  const page = {data: {imageSources: {}, current: null}, setData(values) {Object.assign(this.data, values);}};
  const finish = (index, statusCode = 200) => {
    jobs[index].options.success({statusCode, tempFilePath: `tmp-${index}`});
  };
  return {...images, jobs, removed, errors, page, finish, wx};
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

test("preview preloads current, next and previous HTTPS originals with only three retained files", () => {
  const h=setup(), url=id=>`https://test.invalid/${id}.jpg`, thumb="https://test.invalid/cover.jpg";
  h.page.data.current={kind:"image",url:url(2)};
  h.prepareMemoryImages(h.page,[thumb],{preload:[url(2),url(3),url(1)]});
  assert.deepEqual(h.jobs.map(job=>job.options.url),[url(2)]);
  assert.equal(h.page.data.imageSources[thumb],thumb);
  h.finish(0); h.finish(1); h.finish(2);
  assert.equal(h.page.data.imageSources[url(1)],"tmp-2");
  assert.equal(h.page.data.imageSources[url(2)],"tmp-0");
  assert.equal(h.page.data.imageLoading,false);
  h.page.data.current={kind:"image",url:url(3)};
  h.prepareMemoryImages(h.page,[thumb],{preload:[url(3),url(4),url(2)]});
  assert.deepEqual(h.removed,["tmp-2"]);
  assert.equal(h.page.data.imageSources[url(1)],undefined);
  assert.equal(h.jobs[3].options.url,url(4));
  h.finish(3);
  h.prepareMemoryImages(h.page,[thumb],{preload:[url(3),url(4),url(2)]});
  assert.equal(h.jobs.length,4);
  h.releaseMemoryImages(h.page);
  assert.equal(h.removed.length,4);
});

test("speculative image failures stay offscreen and retry when that image becomes current", () => {
  const h=setup(), urls=["https://test.invalid/1.jpg","https://test.invalid/2.jpg"];
  h.page.data.current={kind:"image",url:urls[0]};
  h.prepareMemoryImages(h.page,[],{preload:urls});
  h.finish(0); h.finish(1,403);
  assert.equal(h.page.data.error,undefined);
  h.page.data.current={kind:"image",url:urls[1]};
  h.prepareMemoryImages(h.page,[],{preload:[urls[1],urls[0]]});
  assert.equal(h.jobs.length,3);
  assert.equal(h.page.data.imageLoading,true);
  h.finish(2);
  assert.equal(h.page.data.imageLoading,false);
  assert.equal(h.page.data.error,undefined);
  h.releaseMemoryImages(h.page);
});

test("jumping outside the preview window cancels obsolete originals and removes late files", () => {
  const h=setup(), urls=Array.from({length:6},(_,i)=>`https://test.invalid/${i}.jpg`);
  h.prepareMemoryImages(h.page,[],{preload:urls.slice(0,3)});
  h.prepareMemoryImages(h.page,[],{preload:urls.slice(3)});
  assert.equal(h.jobs[0].aborted,true);
  assert.equal(h.jobs[1].aborted,false);
  assert.equal(h.jobs.length,2);
  h.finish(0);
  assert.equal(h.page.data.imageSources[urls[0]],undefined);
  assert.deepEqual(h.removed,["tmp-0"]);
  h.releaseMemoryImages(h.page);
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
