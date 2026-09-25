const test = require('node:test');
const assert = require('node:assert/strict');
const { getApiBaseUrl } = require('../services/config');
const { prepareHomeImage } = require('../utils/homeImagePreparation');

let definition;
const previousApp = global.getApp, previousPage = global.Page;
global.getApp = () => ({ globalData: {} });
global.Page = value => { definition = value; };
require('../pages/activity_create/activity_create');
global.getApp = previousApp;
global.Page = previousPage;

function fixture() {
  const files = new Map();
  const requests = [];
  const fs = {};
  for (const method of ['mkdir', 'readFile', 'writeFile', 'rename', 'readdir', 'stat', 'copyFile', 'unlink']) {
    fs[method] = args => {
      try {
        let result = {};
        if (method === 'readFile') {
          if (!files.has(args.filePath)) throw Error('missing');
          result.data = files.get(args.filePath).toString();
        }
        if (method === 'writeFile') files.set(args.filePath, Buffer.from(args.data));
        if (method === 'rename') { files.set(args.newPath, files.get(args.oldPath)); files.delete(args.oldPath); }
        if (method === 'readdir') result.files = [...files.keys()].filter(p => p.startsWith(args.dirPath + '/')).map(p => p.slice(args.dirPath.length + 1));
        if (method === 'stat') result.stats = { size: files.get(args.path).length };
        if (method === 'copyFile') files.set(args.destPath, Buffer.from(files.get(args.srcPath)));
        if (method === 'unlink') files.delete(args.filePath);
        args.success(result);
      } catch (error) { args.fail(error); }
    };
  }
  const wxApi = {
    env: { USER_DATA_PATH: '/user' }, getFileSystemManager: () => fs,
    getImageInfo: args => files.has(args.src)
      ? args.success({ path: args.src, width: 1000, height: 1000 }) : args.fail(Error('missing')),
    downloadFile: args => { requests.push(args); return { abort() {} }; }
  };
  const complete = index => {
    const path = `/tmp/image-${index}`;
    files.set(path, Buffer.from('GIF89a-original-animated-image-bytes'));
    requests[index].success({ statusCode: 200, tempFilePath: path });
  };
  return { files, requests, wxApi, complete };
}

const tick = () => new Promise(resolve => setImmediate(resolve));
function page(covers, current = 0) {
  const p = {
    ...definition, data: structuredClone(definition.data),
    setData(patch, callback) { Object.assign(this.data, patch); callback?.(); },
    startCoverSkeletonShimmer() {}
  };
  p.data.covers = covers;
  p.data.category = '派对';
  p.data.galleryCurrent = current;
  p.data.galleryPages = [];
  for (let i = 0; i < covers.length; i += 4) {
    p.data.galleryPages.push({ columns: [{ items: covers.slice(i, i + 2) }, { items: covers.slice(i + 2, i + 4) }] });
  }
  return p;
}

test('wizard and homepage share byte-identical persistent cache across page instances', async () => {
  const h = fixture(), oldWx = global.wx;
  global.wx = h.wxApi;
  const origin = getApiBaseUrl().replace(/\/api\/v\d+\/?$/, '');
  const covers = Array.from({ length: 4 }, (_, index) => ({ id: String(index), imageUrl: `${origin}/activity-cover-assets/${index}.gif`, categories: ['派对'] }));
  const first = page(covers), second = page(covers);
  try {
    first.prepareCoverImages(); await tick();
    assert.equal(h.requests.length, 3, 'same three-transfer limit as homepage');
    h.complete(0); await tick();
    assert.equal(h.requests.length, 4);
    for (let i = 1; i < 4; i++) h.complete(i);
    await tick();
    assert.equal(Object.keys(first.data.coverImagePaths).length, 4);
    first.onUnload();
    second.prepareCoverImages(); await tick();
    assert.equal(h.requests.length, 4, 'reopening must not redownload cached images');
    assert.equal(second._coverMediaStats.disk_cache_hit, 4);
    for (const path of Object.values(second.data.coverImagePaths)) {
      assert.match(path, /home-image-cache-v1/);
      assert.equal(h.files.get(path).toString(), 'GIF89a-original-animated-image-bytes');
    }
    const reused = await new Promise((ready, failed) => prepareHomeImage({ wxApi: h.wxApi, url: covers[0].imageUrl, ready, failed }));
    assert.equal(reused, second.data.coverImagePaths['0'], 'homepage preparation shares the exact same cache file');
    assert.equal(h.requests.length, 4);
  } finally {
    first.onUnload(); second.onUnload(); global.wx = oldWx;
  }
});

test('visible swiper page is prioritized; hiding pauses new work; unload ignores late downloads', async () => {
  const h = fixture(), oldWx = global.wx;
  global.wx = h.wxApi;
  const covers = Array.from({ length: 8 }, (_, index) => ({ id: String(index), imageUrl: `https://test/${index}.jpg`, categories: ['派对'] }));
  const p = page(covers, 1);
  try {
    p.prepareCoverImages(); await tick();
    assert.deepEqual(h.requests.map(r => r.url), covers.slice(4, 7).map(c => c.imageUrl));
    p.onHide();
    h.complete(0); h.complete(1); h.complete(2); await tick();
    assert.equal(h.requests.length, 3);
    p.onShow(); await tick();
    assert.equal(h.requests[3].url, covers[7].imageUrl);
    assert.equal(h.requests.length, 4, 'remaining visible cover gates offscreen work');
    p.onUnload();
    const before = { ...p.data.coverImagePaths };
    h.complete(3); await tick();
    assert.deepEqual(p.data.coverImagePaths, before);
    assert.equal(h.requests.length, 4);
  } finally { p.onUnload(); global.wx = oldWx; }
});
