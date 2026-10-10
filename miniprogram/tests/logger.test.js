const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(options = {}) {
  const records = [], mirrors = [], filters = [], removed = [], requests = [];
  let time = 10000, networkChanged;
  class Clock extends Date { static now() { return time; } }
  const page = { route: 'pages/activity_list/activity_list' };
  const sink = { setFilterMsg: text => filters.push(text), addFilterMsg: text => filters.push(text),
    in: value => { assert.equal(value, page); } };
  for (const level of ['info', 'warn', 'error']) sink[level] = record => records.push({ level, record });
  const wx = {
    getRealtimeLogManager: () => sink,
    getAccountInfoSync: () => ({ miniProgram: { envVersion: options.env || 'release', version: '1.2.3' } }),
    getDeviceInfo: () => ({ platform: options.platform || 'ios', model: 'test phone', system: 'test OS' }),
    getAppBaseInfo: () => ({ version: '8', SDKVersion: '3' }),
    removeStorageSync: key => removed.push(key),
    getNetworkType: ({ success }) => success({ networkType: 'wifi' }),
    onNetworkStatusChange: callback => { networkChanged = callback; },
    request: value => requests.push(value),
    reportAnalytics: () => { throw Error('Analytics must not be used'); },
    ...options.wx
  };
  const sandbox = { module: { exports: {} }, Date: Clock, wx, getCurrentPages: () => [page],
    require: () => require('../services/diagnosticPolicy'),
    console: Object.fromEntries(['info', 'warn', 'error'].map(level => [level, (...args) => mirrors.push(args)])) };
  vm.runInNewContext(fs.readFileSync(require.resolve('../services/logger'), 'utf8'), sandbox);
  return { logger: sandbox.module.exports, records, mirrors, filters, removed, requests, wx,
    advance: ms => { time += ms; }, network: res => networkChanged(res), sandbox };
}

test('only actionable events reach official realtime, with severity and correlation', () => {
  const h = setup();
  h.logger.initializeLogging();
  h.logger.logInfo('request_start', {});
  h.logger.logInfo('request_success', {});
  h.logger.logInfo('home_presentation_snapshot', { reason: 'all_ready_state_committed' });
  h.logger.logInfo('home_media_attempt', { stage: 'attempt_succeeded', slowAttempt: false });
  h.logger.logWarn('request_slow', { traceId: 'req-slow', duration: 2100 });
  h.logger.logRequestFailure({ traceId: 'req-1', requestId: 'server-1', statusCode: 503 }, Error('unavailable'));
  assert.equal(h.records.length, 2);
  assert.equal(h.records[0].level, 'warn');
  const { record } = h.records[1];
  assert.equal(record.event, 'request_fail');
  assert.equal(record.requestId, 'server-1');
  assert.equal(record.page, 'pages/activity_list/activity_list');
  assert.equal(record.networkType, 'wifi');
  assert.equal(record.appVersion, '1.2.3');
  assert.match(record.sessionId, /^sess-/);
  assert.ok(h.filters.includes('request_fail'));
  assert.equal(h.mirrors.length, 0);
  assert.equal(h.requests.length, 0);
});

test('redaction applies to nested payloads, URLs and development console copies', () => {
  const h = setup({ env: 'develop' });
  const payload = { traceId: 'req-1', url: '/users/me?token=private-query#fragment',
    summary: 'Bearer private-bearer https://alice:private-pass@test/a?signature=private-signature',
    nested: { accessToken: 'private-token', nickname: 'private-name', userId: 12,
      authorization: 'private-auth', body: 'private-body', latitude: 3,
      url: 'https://test/a?signature=private-signature', profile: { queueEnd: 3 } } };
  payload.nested.self = payload;
  Object.defineProperty(payload, 'unsafe', { enumerable: true, get() { throw Error('getter'); } });
  assert.doesNotThrow(() => h.logger.logInfo('home_presentation_snapshot', payload));
  assert.equal(h.records.length, 1);
  const text = JSON.stringify(h.records);
  assert.ok(!text.includes('private-'));
  assert.equal(h.records[0].record.url, '/users/me');
  assert.equal(h.records[0].record.nested.profile.queueEnd, 3);
  assert.equal(h.records[0].record.nested.self, '[circular]');
  assert.equal(h.mirrors.length, 1);
  assert.ok(!JSON.stringify(h.mirrors).includes('private-'));
});

test('hard limit measures UTF-8 bytes and preserves IDs and small numeric evidence', () => {
  const h = setup();
  const payload = { traceId: 'req-large', requestId: 'server-large', reason: 'media_error',
    cards: [{ activityId: '42', coverPhases: { download: { startedAt: 3, endedAt: 9 } } }] };
  for (let i = 0; i < 30; i++) payload['field' + i] = '\u4e2d\u6587\u{1f600}'.repeat(1000);
  h.logger.logInfo('home_presentation_snapshot', payload);
  const record = h.records[0].record;
  assert.ok(Buffer.byteLength(JSON.stringify(record), 'utf8') <= 4096);
  assert.equal(record.truncated, true);
  assert.equal(record.traceId, 'req-large');
  assert.equal(record.cards[0].coverPhases.download.endedAt, 9);
});

test('metadata and oversized arrays cannot overflow the official record budget', () => {
  const long = '\u{1f600}'.repeat(3000);
  const h = setup({ wx: { getDeviceInfo: () => ({ platform: long, model: long, system: long }),
    getAccountInfoSync: () => ({ miniProgram: { version: long, envVersion: long } }),
    getAppBaseInfo: () => ({ version: long, SDKVersion: long }) } });
  h.logger.logInfo('home_media_attempt', { traceId: 'req', cards: Array.from({ length: 30 }, () => ({ evidence: long })) });
  assert.equal(h.records.length, 1);
  assert.ok(Buffer.byteLength(JSON.stringify(h.records[0].record), 'utf8') <= 4096);
});

test('same failure is reported once across request, auth, page and global handlers', () => {
  const h = setup();
  const error = { message: 'network fail', traceId: 'req-1' };
  h.logger.logRequestFailure({ traceId: 'req-1' }, error);
  h.logger.logPageError('wechat_login', error);
  h.logger.logPageError('global_error', error);
  h.logger.logPageError('wechat_login', { code: 'STALE_LOGIN_ATTEMPT' });
  assert.equal(h.records.length, 1);
  h.logger.logPageError('upload_avatar', { message: 'bad upload', traceId: 'upload-1' });
  assert.equal(h.records.length, 2);
});

test('short duplicates are throttled, distinct requests survive, and the cache stays bounded', () => {
  const h = setup();
  const emit = traceId => h.logger.logInfo('home_presentation_snapshot', { traceId, reason: 'glass_error' });
  emit('first'); emit('first'); assert.equal(h.records.length, 1);
  emit('second'); assert.equal(h.records.length, 2);
  h.advance(2000); emit('first'); assert.equal(h.records.length, 3);
  for (let i = 0; i < 201; i++) emit('other-' + i);
  emit('first'); assert.equal(h.records.length, 205);
});

test('startup clears exactly two retired keys once and tracks later network changes', () => {
  const h = setup(); h.logger.initializeLogging(); h.logger.initializeLogging();
  assert.deepEqual(h.removed, ['client-diagnostic-outbox-v1', 'client-diagnostic-delivery-metrics-v1']);
  h.network({ isConnected: false });
  h.logger.logPageError('test', Error('oops'));
  assert.equal(h.records[0].record.networkType, 'none');
});

test('missing or throwing official APIs never break business code or development mirrors', () => {
  for (const getRealtimeLogManager of [undefined, () => { throw Error('unavailable'); },
    () => ({ error() { throw Error('sink'); } })]) {
    const h = setup({ env: 'develop', wx: { getRealtimeLogManager,
      removeStorageSync() { throw Error('storage'); }, getNetworkType: undefined, onNetworkStatusChange: undefined } });
    assert.doesNotThrow(() => { h.logger.initializeLogging(); h.logger.logPageError('test', Error('oops')); });
    assert.equal(h.mirrors.length, 1);
  }
});

function loadService(file, h, dependencies = {}) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve(file), 'utf8'), {
    module, wx: h.wx, Date: h.sandbox.Date,
    require: name => name === './logger' ? h.logger : dependencies[name] || { getApiBaseUrl: () => 'https://api.test/api/v1' }
  });
  return module.exports;
}

test('real request wrapper reports HTTP/transport failures, slow success, and no normal success', async () => {
  const h = setup({ wx: { getStorageSync: () => 'private-token' } });
  const { request } = loadService('../services/request', h);
  const normal = request({ url: '/activities' });
  h.requests.pop().success({ statusCode: 200, data: [] }); await normal;
  assert.equal(h.records.length, 0);
  const slow = request({ url: '/activities' }); h.advance(2500);
  h.requests.pop().success({ statusCode: 200, data: [] }); await slow;
  assert.equal(h.records.at(-1).record.event, 'request_slow');
  const http = request({ url: '/activities?token=private-query' });
  h.requests.pop().success({ statusCode: 503, data: { message: 'failed', access_token: 'private-response' }, header: { 'X-Request-Id': 'server-http' } });
  await assert.rejects(http, error => { h.logger.logPageError('load', error); return error.statusCode === 503; });
  const transport = request({ url: '/activities' });
  h.requests.pop().fail({ errMsg: 'request:fail timeout', errno: -1 });
  await assert.rejects(transport, error => error.statusCode === 0);
  assert.equal(h.records.filter(x => x.record.event === 'request_fail').length, 2);
  assert.equal(h.records.length, 3);
  assert.ok(!JSON.stringify(h.records).includes('private-'));
});

test('avatar parse, HTTP and transport failures use the same sanitized request sink', async () => {
  const uploads = [];
  const h = setup({ wx: { getStorageSync: () => 'private-token', uploadFile: value => uploads.push(value) } });
  const { uploadAvatar } = loadService('../services/user', h, { './request': {} });
  for (const response of [{ statusCode: 200, data: 'not-json' }, { statusCode: 503, data: '{"message":"failed"}' }, null]) {
    const pending = uploadAvatar('/private-path/avatar.jpg');
    const upload = uploads.pop();
    if (response) upload.success(response); else upload.fail({ errMsg: 'timeout' });
    await assert.rejects(pending, error => { h.logger.logPageError('save_profile', error); return true; });
  }
  assert.equal(h.records.length, 3);
  assert.ok(h.records.every(x => x.record.event === 'request_fail'));
  assert.ok(!JSON.stringify(h.records).includes('private-'));
});
