const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../pages/activity_list');
const css = fs.readFileSync(path.join(root, 'activity_list.wxss'), 'utf8');
const wxml = fs.readFileSync(path.join(root, 'activity_list.wxml'), 'utf8');
function rule(name) { return css.match(new RegExp('\\.' + name + ' \\{([^}]+)\\}'))[1]; }
test('home skeleton matches Pencil bxNIN geometry at 390px design width', () => {
  const expected = {
    'skeleton-date': [280.77, 38.46, 19.23],
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
test('all four rows crossfade in place only after both media and entrance are ready', () => {
  assert.equal((wxml.match(/revealed: item\._homeMediaReady && item\._homeSlotEntered/g) || []).length, 4);
  assert.equal((wxml.match(/!\(item\._homeMediaReady && item\._homeSlotEntered\) \? 'pending'/g) || []).length, 4);
  assert.doesNotMatch(wxml, /wx:if="\{\{!item\._homeMediaReady\}\}"|home-slot--/);
  assert.doesNotMatch(rule('home-card-slot'), /opacity|transform|transition/);
  assert.match(rule('card-skeleton'), /transition: opacity 440ms ease-out/);
  assert.match(rule('home-card-entrance'), /transition: opacity 440ms ease-out/);
  assert.match(rule('home-card-entrance--pending'), /transform: translateY\(0\)/);
  assert.doesNotMatch(rule('card-skeleton'), /transform/);
  assert.match(rule('card-skeleton--revealed'), /opacity: 0; pointer-events: none/);
  assert.match(rule('home-card-entrance--pending'), /pointer-events: none/);
  assert.equal((wxml.match(/running: skeletonShimmerRunning && !item\._homeMediaError && !\(item\._homeMediaReady && item\._homeSlotEntered\)/g) || []).length, 4);
});
