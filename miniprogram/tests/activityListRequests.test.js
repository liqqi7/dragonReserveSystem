const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
  const requests = [], module = { exports: {} };
  let invalidations = 0;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/activity.js'), 'utf8'), {
    module,
    require(name) {
      if (name === './cacheManager') return { clearCachedActivityList: () => invalidations++ };
      if (name === './request') return { request(options) {
        return new Promise((resolve, reject) => requests.push({ options, resolve, reject }));
      } };
      throw new Error(name);
    }
  });
  return { service: module.exports, requests, invalidations: () => invalidations };
}

test('simultaneous list reads share one request and release it on completion', async () => {
  const h = setup(), a = h.service.listActivities();
  assert.equal(h.service.listActivities(), a);
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].options.apiVersion, 2);
  h.requests[0].resolve(['first']);
  assert.deepEqual(await a, ['first']);
  const b = h.service.listActivities();
  assert.notEqual(b, a);
  h.requests[1].resolve(['second']);
  await b;
});

for (const method of ['createActivity', 'updateActivity', 'signupActivity', 'cancelActivity',
  'removeParticipant', 'checkinActivity', 'adminCheckinParticipant', 'adminCancelCheckinParticipant']) {
  test(`${method} invalidates in-flight reads and old consumers receive the fresh list`, async () => {
    const h = setup(), old = h.service.listActivities();
    const mutation = h.service[method](1, 2);
    h.requests[1].resolve({ id: 1 });
    await mutation;
    assert.equal(h.invalidations(), 1);
    const fresh = h.service.listActivities();
    assert.notEqual(fresh, old);
    assert.equal(h.requests.length, 3);
    h.requests[0].resolve(['stale']);
    await Promise.resolve();
    assert.equal(h.service.listActivities(), fresh);
    h.requests[2].resolve(['updated']);
    assert.deepEqual(await fresh, ['updated']);
    assert.deepEqual(await old, ['updated']);
  });
}

test('an invalidated list rejection retries instead of failing a newer read', async () => {
  const h = setup(), old = h.service.listActivities();
  const mutation = h.service.updateActivity(1, {});
  h.requests[1].resolve({});
  await mutation;
  h.requests[0].reject(new Error('obsolete failure'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.requests.length, 3);
  h.requests[2].resolve(['fresh']);
  assert.deepEqual(await old, ['fresh']);
});

test('failed mutations preserve the pending list and its cache', async () => {
  const h = setup(), list = h.service.listActivities();
  const mutation = h.service.updateActivity(1, {});
  h.requests[1].reject(new Error('mutation failed'));
  await assert.rejects(mutation, /mutation failed/);
  assert.equal(h.service.listActivities(), list);
  assert.equal(h.invalidations(), 0);
  h.requests[0].resolve(['unchanged']);
  await list;
});

test('current list failure propagates and does not block a retry', async () => {
  const h = setup(), list = h.service.listActivities();
  h.requests[0].reject(new Error('network failed'));
  await assert.rejects(list, /network failed/);
  const retry = h.service.listActivities();
  assert.equal(h.requests.length, 2);
  h.requests[1].resolve([]);
  await retry;
});

test('a mutation completing beside an older GET invalidates it before delivery', async () => {
  const h = setup(), old = h.service.listActivities();
  const mutation = h.service.updateActivity(1, {});
  h.requests[0].resolve(['stale']);
  h.requests[1].resolve({});
  await mutation;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.requests.length, 3);
  h.requests[2].resolve(['fresh']);
  assert.deepEqual(await old, ['fresh']);
});

test('a superseded response reuses the fresh result even when that read has already completed', async () => {
  const h = setup(), old = h.service.listActivities();
  const mutation = h.service.updateActivity(1, {});
  h.requests[1].resolve({});
  await mutation;
  const fresh = h.service.listActivities();
  h.requests[2].resolve(['fresh']);
  await fresh;
  h.requests[0].resolve(['stale']);
  assert.deepEqual(await old, ['fresh']);
  assert.equal(h.requests.length, 3);
  const next = h.service.listActivities();
  assert.equal(h.requests.length, 4);
  h.requests[3].resolve(['latest']);
  await next;
});
