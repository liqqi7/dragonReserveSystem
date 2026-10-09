const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const enrich = require('../utils/activityEnrich');
const { resolvePrimaryAction } = require('../utils/activityDetail');

const obsoleteKeys = ['signupDeadline', 'signupDeadlinePassed', 'signupDeadlineWeekdayLabel'];
const raw = {
  id: 1, name: 'Start', start_time: '2026-09-20T18:00:45', end_time: '2026-09-20T20:00:00',
  status: '未开始', signup_enabled: true, participants: []
};

function harness(cached, initialTime) {
  let definition, now = new Date(initialTime).getTime();
  const commits = [], saved = [];
  const cache = { list: [cached], userId: '' };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pages/activity_list/activity_list.js'), 'utf8'), {
    Page: value => { definition = value; }, getApp: () => ({ globalData: {} }), console,
    Date: class extends Date { static now() { return now; } },
    require(name) {
      if (name.endsWith('/cacheManager')) return {
        getCachedActivityList: () => cache,
        setCachedActivityList: list => saved.push(list)
      };
      if (name.endsWith('/activityEnrich')) return enrich;
      if (name.endsWith('/participantSort')) return require('../utils/participantSort');
      return {};
    }
  });
  const page = { ...definition, data: { myUserId: '' },
    _pageVisible: true, _loadGeneration: 0, _commitHomeList: list => commits.push(list) };
  return { page, commits, saved, setNow: value => { now = new Date(value).getTime(); } };
}

for (const scenario of [
  { name: 'old early cutoff', now: '12:00:00', cutoff: '10:00', closed: false, started: false },
  { name: 'old late cutoff', now: '18:01:00', cutoff: '19:00', closed: true, started: true },
  { name: 'missing cutoff', now: '18:01:00', closed: true, started: true },
  { name: 'one second before start', now: '18:00:44', cutoff: '10:00', closed: false, started: false },
  { name: 'exact start second', now: '18:00:45', cutoff: '19:00', closed: true, started: true },
  { name: 'manual signup closure', now: '12:00:00', enabled: false, closed: true, started: false }
]) {
  test(`home cache follows start time: ${scenario.name}`, () => {
    const cached = { ...enrich.adaptActivity(raw), signupEnabled: scenario.enabled !== false,
      signupDeadlinePassed: !scenario.started, signupDeadlineWeekdayLabel: 'old' };
    if (scenario.cutoff) cached.signupDeadline = `2026-09-20 ${scenario.cutoff}`;
    const h = harness(cached, `2026-09-20T${scenario.now}`);
    assert.equal(h.page.loadActivityListFromCache(), true);
    const activity = h.commits[0][0];
    assert.equal(activity.isSignupClosed, scenario.closed);
    assert.equal(activity.activityStarted, scenario.started);
    assert.equal(activity.status, scenario.started ? '进行中' : '未开始');
    for (const key of obsoleteKeys) assert.equal(Object.hasOwn(activity, key), false);
    assert.equal(cached.signupDeadlineWeekdayLabel, 'old');
    const fresh = enrich.enrichSingleActivity({ ...raw, signup_enabled: cached.signupEnabled }, '',
      new Date(`2026-09-20T${scenario.now}`));
    assert.equal(activity.isSignupClosed, fresh.isSignupClosed);
  });
}

test('cache without raw timestamp uses displayed start time and preserves terminal states', () => {
  for (const status of ['已取消', '已流局']) {
    const h = harness({ ...enrich.adaptActivity(raw), startTimeRaw: undefined, status }, '2026-09-20T18:00:00');
    h.page.loadActivityListFromCache();
    assert.equal(h.commits[0][0].isSignupClosed, true);
    assert.equal(h.commits[0][0].status, status);
  }
});

test('unchanged network data is reprocessed at the exact start second', async () => {
  const h = harness({}, '2026-09-20T18:00:44');
  await h.page.loadActivityList({ responsePromise: Promise.resolve([raw]) });
  assert.equal(h.commits[0][0].isSignupClosed, false);
  assert.equal(h.page._nextListStatusAt, new Date(raw.start_time).getTime());
  h.setNow('2026-09-20T18:00:45');
  await h.page.loadActivityList({ responsePromise: Promise.resolve([raw]) });
  assert.equal(h.commits.length, 2);
  assert.equal(h.commits[1][0].isSignupClosed, true);
  assert.equal(h.commits[1][0].status, '进行中');
  assert.equal(h.saved.length, 2);
  for (const item of h.commits.flat()) {
    for (const key of obsoleteKeys) assert.equal(Object.hasOwn(item, key), false);
  }
});

test('manual closure blocks signup but still allows an existing participant to cancel before start', () => {
  const closed = { ...raw, signup_enabled: false, participants: [{ user_id: 7, created_at: '2026-09-19T10:00:00' }] };
  const now = new Date('2026-09-20T12:00:00');
  const joined = enrich.enrichSingleActivity(closed, '7', now);
  assert.equal(joined.isSignupClosed, true);
  assert.equal(joined.activityStarted, false);
  assert.equal(resolvePrimaryAction(joined).action, 'cancel');
  assert.equal(resolvePrimaryAction(enrich.enrichSingleActivity(closed, '8', now)).disabled, true);
  assert.equal(resolvePrimaryAction({ ...joined, activityStarted: true }).disabled, true);
});
