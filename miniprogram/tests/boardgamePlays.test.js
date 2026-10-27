const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const plain = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(setImmediate);
const event = dataset => ({currentTarget: {dataset}});
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {resolve = a; reject = b;});
  return {promise, resolve, reject};
}
function runtime(name, api, options = {}) {
  let definition;
  const toasts = [], navigations = [], timers = new Map();
  let timerId = 0;
  const wx = {getStorageSync: key => ({userId: 1, userNickname: '甲'})[key],
    showToast: value => toasts.push(value), navigateBack: () => navigations.push('back'),
    navigateTo: value => navigations.push(value.url), redirectTo: value => navigations.push(value.url)};
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, `../pages/${name}/${name}.js`), 'utf8'), {
    Page: value => {definition = value;}, wx, getCurrentPages: () => [{}, {}],
    require: value => value.endsWith('/safeArea') ? {getBottomContentInsetRpx: () => 46.15} : api,
    setTimeout: fn => {timers.set(++timerId, fn); return timerId;},
    clearTimeout: id => timers.delete(id),
  });
  const page = {...definition, data: plain(definition.data)};
  page.setData = (patch, callback) => {
    for (const [key, value] of Object.entries(patch)) {
      const parts = key.replace(/\[(\d+)\]/g, '.$1').split('.');
      let target = page.data;
      for (const part of parts.slice(0, -1)) target = target[part];
      target[parts.at(-1)] = plain(value);
    }
    if (callback) callback.call(page);
  };
  page.onLoad(options);
  return {page, toasts, navigations, timers};
}
const detail = {played_on: '2026-10-25', revision: 3,
  expansions: [{game_id: 12}], players: [{user_id: 1, display_name: '甲', score: '8'}]};
const game = {expansions: [{id: 12, name: '扩展一', in_library: true},
  {id: 13, name: '扩展二', in_library: true}, {bgg_id: 99, in_library: false}]};
for (const first of ['game', 'play']) {
  test(`editing loads owned expansions and selections when ${first} responds first`, async () => {
    const a = deferred(), b = deferred();
    const {page} = runtime('boardgame_scoresheet', {get: url => url.startsWith('/boardgames/') ? a.promise : b.promise},
      {gameId: '9', playId: '5'});
    if (first === 'game') {a.resolve(game); await tick(); b.resolve(detail);}
    else {b.resolve(detail); await tick(); a.resolve(game);}
    await tick();
    assert.deepEqual(plain(page.data.expansionOptions.map(o => [o.id, o.checked])), [[12, true], [13, false]]);
    assert.equal(page.data.expSummary, '扩展一');assert.equal(page.data.canSave, true);
    assert.equal(page.data.players[0].scoreText, '8');
  });
}
test('unloading an editing page ignores both in-flight detail responses', async () => {
  const a = deferred(), b = deferred();
  const {page} = runtime('boardgame_scoresheet', {get: url => url.startsWith('/boardgames/') ? a.promise : b.promise},
    {gameId: '9', playId: '5'});
  page.onUnload();const before = plain(page.data);
  a.resolve(game);b.resolve(detail);await tick();
  assert.deepEqual(plain(page.data), before);
});
test('edited play sends the revision and selected expansions once while saving', async () => {
  const pending = deferred(), writes = [];
  const {page} = runtime('boardgame_scoresheet', {
    get: async url => url.startsWith('/boardgames/') ? game : detail,
    send: (...args) => {writes.push(plain(args));return pending.promise;},
  }, {gameId: '9', playId: '5'});
  await tick();page.toggleScoreExpansion(event({index: 1}));
  const saving = page.save();await page.save();assert.equal(writes.length, 1);
  assert.deepEqual(writes[0], ['/boardgame-plays/5', 'PATCH', {
    expected_revision: 3, played_on: '2026-10-25', players: [{user_id: 1, score: 8}], expansion_game_ids: [12, 13],
  }]);
  pending.resolve({});await saving;assert.equal(page.data.saving, false);
});
test('calculator respects multiplication precedence and commits its result to the chosen player', async () => {
  const {page} = runtime('boardgame_scoresheet', {get: async () => game}, {gameId: '9'});
  page.openCalc(event({index: 0}));
  for (const key of ['1', '+', '2', '×', '3']) page.pressKey(event({key}));
  assert.equal(page.data.calcResult, '7');page.confirmCalc();
  assert.equal(page.data.players[0].scoreText, '7');assert.equal(page.data.canSave, true);
});
test('deleting a play refreshes the list and allows the next deletion', async () => {
  const writes = [];
  const {page} = runtime('boardgame_plays', {get: async () => ({items: [], next_cursor: null}),
    send: async (...args) => {writes.push(args);}}, {id: '9'});
  await page.load();page.askDeletePlay(event({id: 5}));await page.confirmDelete();await tick();
  assert.equal(page.data.deleting, false);assert.equal(page.data.deleteId, null);
  page.askDeletePlay(event({id: 6}));await page.confirmDelete();
  assert.deepEqual(writes.map(args => args[0]), ['/boardgame-plays/5', '/boardgame-plays/6']);
});
test('changing the play filter while deletion is pending cannot leave the delete action locked', async () => {
  const pending = deferred();
  const {page} = runtime('boardgame_plays', {get: async () => ({items: [], next_cursor: null}),
    send: () => pending.promise}, {id: '9'});
  page.askDeletePlay(event({id: 5}));const deleting = page.confirmDelete();
  page.chooseScope(event({key: 'mine'}));await tick();pending.resolve({});await deleting;await tick();
  assert.equal(page.data.deleting, false);assert.equal(page.data.deleteId, null);assert.equal(page.data.scope, 'mine');
});
