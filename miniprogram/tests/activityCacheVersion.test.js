const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('processed activity cache rejects the old shape without clearing image storage', () => {
  const storage = new Map([['image-cache', { filePath: 'local-cover' }]]);
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/cacheManager.js'), 'utf8'), {
    module, require: () => ({ getApiBaseUrl: () => 'https://api.test' }),
    wx: {
      getStorageSync: key => storage.get(key),
      setStorageSync: (key, value) => storage.set(key, value),
      removeStorageSync: key => storage.delete(key)
    }
  });
  const cache = module.exports;
  cache.setCachedActivityList([{ _id: '1' }], '7');
  const key = [...storage.keys()].find(key => key.startsWith('activityListCache:'));
  assert.equal(cache.getCachedActivityList().version, 2);
  assert.equal(cache.getCachedActivityList().userId, '7');
  const old = { ...storage.get(key) };
  delete old.version;
  storage.set(key, old);
  assert.equal(cache.getCachedActivityList(), null);
  storage.set(key, { ...old, version: 1 });
  assert.equal(cache.getCachedActivityList(), null);
  cache.clearCachedActivityList();
  assert.equal(storage.has(key), false);
  assert.deepEqual(storage.get('image-cache'), { filePath: 'local-cover' });
});
