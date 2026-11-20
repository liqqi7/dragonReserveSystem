const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {initialize, initializeProduction} = require('../../scripts/init_miniprogram_config.cjs');

function checkout(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dragon-config-checkout-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  const source = path.resolve(__dirname, '..');
  fs.cpSync(source, path.join(root, 'miniprogram'), {recursive:true, filter:file => {
    const relative = path.relative(source, file);
    if (relative === 'tests' || relative === path.join('services', 'config.js')) return false;
    return fs.statSync(file).isDirectory() || /\.(?:js|json|template)$/.test(file);
  }});
  return root;
}

test('fresh checkout loads all registered game pages after generating the actual config module', t => {
  const root = checkout(t);
  const before = spawnSync(process.execPath, ['-e', "require('./miniprogram/pages/boardgame_library/boardgame_library.js')"], {cwd:root, encoding:'utf8'});
  assert.notEqual(before.status, 0);
  assert.match(before.stderr, /Cannot find module '\.\/config'/);
  assert.equal(initialize(root).created, true);
  const after = spawnSync(process.execPath, ['-e', `
    const app=require('./miniprogram/app.json');
    global.wx={onNetworkStatusChange(){}};
    let registered=0;global.Page=()=>{registered++;};
    const pages=app.pages.filter(p=>p.split('/')[1].startsWith('boardgame'));
    for(const page of pages)require('./miniprogram/'+page+'.js');
    const config=require('./miniprogram/services/config.js');
    console.log(JSON.stringify({registered,base:config.getApiBaseUrl(),environment:config.getApiEnvironment()}));
  `], {cwd:root, encoding:'utf8'});
  assert.equal(after.status, 0, after.stderr);
  assert.deepEqual(JSON.parse(after.stdout), {registered:5, base:'http://127.0.0.1:8001/api/v1', environment:'local'});
});

test('configuration initialization preserves existing machine settings byte for byte', t => {
  const root = checkout(t), file = path.join(root, 'miniprogram/services/config.js');
  const original = '// Existing developer configuration\nmodule.exports = {local:true};\n';
  fs.writeFileSync(file, original);
  assert.equal(initialize(root, 'http://127.0.0.1:8999/api/v1').created, false);
  assert.equal(fs.readFileSync(file, 'utf8'), original);
});

test('production initialization generates and verifies the official API module', t => {
  const root = checkout(t);
  assert.equal(initializeProduction(root).created, true);
  const config = require(path.join(root, 'miniprogram/services/config.js'));
  assert.equal(config.getApiBaseUrl(), 'https://dragon.liqqihome.top/api/v1');
  assert.equal(config.getApiEnvironment(), 'production');
  assert.equal(initializeProduction(root).created, false);
});

test('production initialization stops on test config without overwriting it', t => {
  const root = checkout(t), file = path.join(root, 'miniprogram/services/config.js');
  initialize(root);
  const localConfig = fs.readFileSync(file, 'utf8');
  assert.throws(() => initializeProduction(root), /与正式模板不一致/);
  assert.equal(fs.readFileSync(file, 'utf8'), localConfig);
});

test('production initialization refuses a template pointing to a test API', t => {
  const root = checkout(t), file = path.join(root, 'miniprogram/services/config.js');
  const template = file + '.template';
  fs.writeFileSync(template, fs.readFileSync(template, 'utf8').replace('https://dragon.liqqihome.top/api/v1', 'http://127.0.0.1:8001/api/v1'));
  assert.throws(() => initializeProduction(root), /必须指向生产 HTTPS/);
  assert.equal(fs.existsSync(file), false);
});

test('custom API initialization keeps the media helpers and rejects credential-bearing URLs', t => {
  const root = checkout(t), file = path.join(root, 'miniprogram/services/config.js');
  for (const address of ['file:///api/v1', 'https://user:synthetic@example.invalid/api/v1', 'https://example.invalid/api/v1?token=synthetic']) {
    assert.throws(() => initialize(root, address));
    assert.equal(fs.existsSync(file), false);
  }
  initialize(root, 'http://192.168.1.2:8001/api/v1/');
  const config = require(file);
  assert.equal(config.getApiBaseUrl(), 'http://192.168.1.2:8001/api/v1');
  assert.equal(config.resolveLocalMediaUrl('http://127.0.0.1:8001/media/example.png'), 'http://192.168.1.2:8001/media/example.png');
  assert.equal(config.isLocalTestMediaUrl('http://127.0.0.1:8001/media/example.png'), true);
});
