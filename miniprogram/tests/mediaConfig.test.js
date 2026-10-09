const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const configPath = path.join(__dirname, '../services/config.js');
const configSource = fs.readFileSync(configPath, 'utf8');

function loadConfig(baseUrl) {
  const module = { exports: {} };
  const source = baseUrl
    ? configSource.replace(/const API_BASE_URL = "[^"]+";/, `const API_BASE_URL = "${baseUrl}";`)
    : configSource;
  vm.runInNewContext(source, { module });
  return module.exports;
}

test('production config and restoration template expose the same media helpers', () => {
  assert.equal(configSource, fs.readFileSync(`${configPath}.template`, 'utf8'));
  assert.equal(loadConfig().getMediaUrl('images/card-bg-other-v2-lg.jpg'),
    'https://dragon.liqqihome.top/media/images/card-bg-other-v2-lg.jpg');
});

for (const origin of ['http://127.0.0.1:8001', 'http://192.168.1.20:8001', 'https://staging.example.test']) {
  test(`missing cover fallback follows API origin ${origin}`, () => {
    const config = loadConfig(`${origin}/api/v1/`);
    const filename = path.join(__dirname, '../utils/activityEnrich.js');
    const originalRequire = createRequire(filename);
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
      module,
      require: name => name === '../services/config' ? config : originalRequire(name)
    });
    const activity = module.exports.enrichSingleActivity({
      id: 1, start_time: "2026-10-10T10:00:00", end_time: "2026-10-10T11:00:00", participants: []
    }, "");
    assert.equal(activity.largeCardBgImageUrl, `${origin}/media/images/card-bg-other-v2-lg.jpg`);
    assert.equal(activity.smallCardBgImageUrl, activity.largeCardBgImageUrl);
    assert.equal(activity.largeCardGlassImageUrl, "");
    assert.equal(Object.hasOwn(activity, "activityType"), false);
    assert.equal(Object.hasOwn(activity, "activityStyleKey"), false);
    assert.equal(config.getMediaUrl('/images/example.png'), `${origin}/media/images/example.png`);
  });
}

test('environment changes preserve existing remote and temporary media handling', () => {
  const config = loadConfig('http://192.168.1.20:8001/api/v1');
  for (const value of ['https://cdn.example.test/avatar.jpg', 'https://dragon.liqqihome.top/media/a.jpg',
    'wxfile://tmp/avatar.png', 'http://tmp/avatar.png', '/images/default-avatar.svg']) {
    assert.equal(config.resolveLocalMediaUrl(value), value);
  }
  assert.equal(config.resolveLocalMediaUrl('http://127.0.0.1:8001/media/a.jpg'),
    'http://192.168.1.20:8001/media/a.jpg');
  assert.equal(config.isLocalTestMediaUrl('http://127.0.0.1:8001/media/a.jpg'), true);
  assert.equal(loadConfig().resolveLocalMediaUrl('http://127.0.0.1:8001/media/a.jpg'),
    'http://127.0.0.1:8001/media/a.jpg');
});
