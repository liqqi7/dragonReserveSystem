const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {readWxss} = require('./helpers/readWxss');
const root = path.join(__dirname, '../pages/activity_list');
const css = readWxss(path.join(root, 'activity_list.wxss'));
const wxml = fs.readFileSync(path.join(root, 'activity_list.wxml'), 'utf8');
function rule(name) { return css.match(new RegExp('\\.' + name + ' \\{([^}]+)\\}'))[1]; }
test('home skeleton matches Pencil bxNIN geometry at 390px design width', () => {
  const expected = {
    'skeleton-large': [469.23, 626.92, 46.15],
    'skeleton-small': [307.69, 307.69, 46.15],
    'skeleton-heading': [153.85, 38.46, 19.23],
    'skeleton-name': [246.15, 23.08, 11.54],
    'skeleton-time': [184.62, 23.08, 11.54],
  };
  for (const [name, values] of Object.entries(expected)) {
    ['width', 'height', 'border-radius'].forEach((prop, i) => {
      assert.ok(rule(name).includes(`${prop}: ${values[i]}rpx;`), `${name} ${prop}`);
    });
  }
  assert.match(rule('skeleton-block'), /background: #EAECEF;/);
  assert.doesNotMatch(rule('skeleton-large'), /margin-top:/);
});
test('large skeleton renders as single visual block matching prototype while small skeleton retains info placeholders', () => {
  assert.doesNotMatch(wxml, /shape:\s*'skeleton-date'/);
  assert.match(wxml, /shape: size === 'large' \? 'skeleton-large' : 'skeleton-small', running: running && !failed/);
  assert.match(css, /transition: transform 1400ms linear/);
});

test('cold loading never guesses activity rows which would disappear after the list arrives', () => {
  const initial = wxml.match(/<view wx:if="\{\{homeListLoading\}\}"[\s\S]*?(?=<!-- ── 我参与的)/)[0];
  assert.equal((initial.match(/is="home-skeleton-shape"/g) || []).length, 1);
  assert.doesNotMatch(initial, /home-card-skeleton|wx:for|swiper/);
  assert.doesNotMatch(css, /skeleton-initial-/);
  assert.equal((wxml.match(/is="home-card-skeleton"/g) || []).length, 4);
});
test('all four rows reveal through the skeleton only after both media and entrance are ready', () => {
  assert.equal((wxml.match(/revealed: item\._homeMediaReady && item\._homeSlotEntered/g) || []).length, 4);
  assert.equal((wxml.match(/!\(item\._homeMediaReady && item\._homeSlotEntered\) \? 'pending'/g) || []).length, 4);
  assert.doesNotMatch(wxml, /wx:if="\{\{!item\._homeMediaReady\}\}"|home-slot--/);
  assert.doesNotMatch(rule('home-card-slot'), /opacity|transform|transition/);
  assert.match(rule('card-skeleton'), /transition: opacity 440ms ease-out/);
  assert.match(rule('home-card-entrance'), /transition: none/);
  assert.match(rule('home-card-entrance--pending'), /transform: translateY\(0\)/);
  assert.doesNotMatch(rule('card-skeleton'), /transform/);
  assert.match(rule('card-skeleton--revealed'), /opacity: 0; pointer-events: none/);
  assert.match(rule('home-card-entrance--pending'), /pointer-events: none/);
  assert.equal((wxml.match(/running: skeletonShimmerRunning && !item\._homeMediaError && !\(item\._homeMediaReady && item\._homeSlotEntered &&/g) || []).length, 4);
});

test('card surfaces use the skeleton color and do not fade through the page background', () => {
  for (const selector of ['skeleton-block', 'large-card', 'small-card']) {
    assert.match(rule(selector), /background: #EAECEF;/);
  }
  assert.match(rule('home-card-entrance'), /opacity: 1;/);
  assert.match(rule('home-card-entrance'), /transition: none;/);
  assert.match(rule('card-skeleton'), /opacity: 1;[^}]*transition: opacity 440ms ease-out;/);
  assert.match(rule('card-skeleton--revealed'), /opacity: 0;/);
});

test('skeleton stays visible until the newly created card can actually enter', () => {
  const expressions = [...wxml.matchAll(/revealed: (.*?), running:/g)].map(match => match[1]);
  assert.equal(expressions.length, 4);
  for (const expression of expressions) {
    const revealed = new Function('item', 'createdCardEntranceId', 'createdCardEntranceState', `return ${expression};`);
    const card = { _id: 'new', _homeMediaReady: true, _homeSlotEntered: true };
    assert.equal(revealed(card, 'new', 'pending'), false);
    assert.equal(revealed(card, 'new', 'entered'), true);
    assert.equal(revealed(card, 'other', 'pending'), true);
    assert.equal(revealed({ ...card, _homeMediaReady: false }, 'new', 'entered'), false);
    assert.equal(revealed({ ...card, _homeSlotEntered: false }, 'new', 'entered'), false);
  }
});
