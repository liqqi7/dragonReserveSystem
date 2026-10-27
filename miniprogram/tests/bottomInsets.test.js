const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');

function load(name, renderer, width, inset, component = false) {
  let definition;
  const wx = {getWindowInfo: () => ({windowWidth: width, windowHeight: 844, statusBarHeight: 20,
    safeAreaInsets: {bottom: inset}}), getDeviceInfo: () => ({platform: 'windows'})};
  const safe = {exports: {}};
  vm.runInNewContext(source('utils/safeArea.js'), {module: safe, wx});
  vm.runInNewContext(source(component ? `components/${name}/index.js` : `pages/${name}/${name}.js`), {
    wx, getApp: () => ({globalData: {}}), Page: value => {definition = value;}, Component: value => {definition = value;},
    require: name => name.endsWith('/safeArea') ? safe.exports : {},
  });
  const instance = {...definition, ...definition.methods, renderer, data: structuredClone(definition.data),
    setData(patch) {Object.assign(this.data, patch);}};
  return {instance, safe: safe.exports};
}

test('bottom-space audit covers all registered pages without padding fullscreen media or game surfaces', () => {
  const handled = ['activity_list', 'history', 'profile', 'memory_create', 'activity_create', 'activity_edit',
    'activity_detail', 'boardgame_plays', 'boardgame_scoresheet', 'boardgame_library', 'boardgame_intake', 'checkin_map', 'memory_detail'];
  const retained = {
    memory: '140px design-scale tail already clears the floating navigation',
    memory_review: 'scrolling card tail and full-width action-sheet rows have their own spacing',
    activity_cover_preview: 'confirmation panel has a separate 115.38rpx bottom reserve',
    chwazi: 'interactive game surface uses actual system inset, not an action footer',
    boardgame_detail: 'scroll body has design padding; form action lives in boardgame-sheet',
  };
  const registered = JSON.parse(source('app.json')).pages.map(route => route.split('/')[1]);
  assert.deepEqual([...handled, ...Object.keys(retained)].sort(), registered.sort());
  const grid = source('pages/memory/memory.js');
  assert.match(grid, /gridPadding: \[12, 20, 140, 20\]/);
});

test('WebView action footers meet the minimum on narrow and PC windows without adding safe area twice', () => {
  for (const width of [320, 390, 620]) for (const inset of [0, 34]) {
    const target = Math.max(24, inset), px = value => value * width / 750;
    for (const name of ['activity_create', 'activity_edit', 'boardgame_intake', 'checkin_map', 'boardgame_plays', 'boardgame_scoresheet']) {
      const {instance} = load(name, 'webview', width, inset);
      instance.onResize();
      const gap = name === 'checkin_map' ? px(instance.data.footerPaddingRpx + 24) :
        px(instance.data[['boardgame_intake', 'boardgame_plays', 'boardgame_scoresheet'].includes(name) ? 'footerPaddingRpx' : 'footerSafeAreaRpx']);
      assert.ok(gap >= target - 0.01, `${name}: ${gap}px at ${width}px`);
      if (name !== 'checkin_map') assert.ok(Math.abs(gap - target) < 0.01);
    }
    const detail = load('activity_detail', 'webview', width, inset).instance;
    detail.onResize();
    assert.ok(Math.abs(px(detail.data.bottomBarSafeAreaRpx + 11.53) - target) < 0.01);
    assert.equal(detail.data.signupBottomInsetRpx, detail.data.bottomBarSafeAreaRpx);
    assert.ok(Math.abs(detail.data.bottomBarHeightRpx - (107.69 + detail.data.bottomBarSafeAreaRpx)) < 0.01);
    assert.ok(Math.abs(px(detail.data.safeBottomRpx) - inset) < 0.01, 'information drawers retain actual inset');
    const sheet = load('boardgame-sheet', 'webview', width, inset, true).instance;
    sheet.syncBottomInset();
    assert.ok(Math.abs(px(sheet.data.footerPaddingRpx) - target) < 0.01);
    const library = load('boardgame_library', 'webview', width, inset).instance;
    library.onResize();
    assert.ok(Math.abs(px(library.data.bottomContentInsetRpx) - target) < 0.01);
  }
});

test('Skyline retains its prototype offsets and CSS-owned boardgame/map footer spacing', () => {
  const create = load('activity_create', 'skyline', 390, 34).instance;
  create.onResize(); assert.equal(create.data.footerSafeAreaRpx, 73.07);
  const edit = load('activity_edit', 'skyline', 390, 34).instance;
  edit.onResize(); assert.equal(edit.data.footerSafeAreaRpx, 65.38 - 9.62);
  const detail = load('activity_detail', 'skyline', 390, 34).instance;
  detail.onResize(); assert.equal(detail.data.bottomBarSafeAreaRpx, 44.23);
  assert.equal(detail.data.signupBottomInsetRpx, 65.38);
  for (const name of ['checkin_map', 'boardgame_intake', 'boardgame_plays', 'boardgame_scoresheet']) {
    const p = load(name, 'skyline', 390, 34).instance;
    p.onResize(); assert.equal(p.data.footerPaddingRpx, null);
  }
  const sheet = load('boardgame-sheet', 'skyline', 390, 34, true).instance;
  sheet.syncBottomInset(); assert.equal(sheet.data.footerPaddingRpx, null);
});

test('tab content reserves the same fixed 52px navigation height and shared bottom inset', () => {
  for (const width of [320, 390, 620]) for (const inset of [0, 34]) {
    for (const name of ['activity_list', 'history', 'profile']) {
      const p = load(name, 'webview', width, inset).instance;
      p.onResize();
      assert.ok(Math.abs(p.data.bottomSafeAreaRpx * width / 750 - Math.max(24, inset)) < 0.01);
      assert.match(source(`pages/${name}/${name}.wxml`), /calc\(52px \+/);
    }
  }
});

test('signup, library and component geometry each reserves the added spacing once', () => {
  const detail = source('pages/activity_detail/activity_detail.wxml');
  assert.match(detail, /signupSheetContentHeightRpx}}rpx \+ {{signupBottomInsetRpx}}rpx/);
  assert.match(detail, /project-confirm-bar" style="padding-bottom:{{signupBottomInsetRpx}}rpx/);
  const library = source('pages/boardgame_library/boardgame_library.wxml');
  assert.match(library, /height:calc\(123\.07692rpx \+ /);
  assert.match(library, /class="library-add" style="{{bottomContentInsetRpx/);
  assert.match(source('components/boardgame-sheet/index.wxml'), /height:auto;padding-bottom:/);
});
