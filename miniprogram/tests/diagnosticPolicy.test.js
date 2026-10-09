const test = require('node:test');
const assert = require('node:assert/strict');
const { isNormalHomeDiagnostic } = require('../services/diagnosticPolicy');

test('normal home diagnostics are limited to ready snapshots and fast successful media', () => {
  assert.equal(isNormalHomeDiagnostic('home_presentation_snapshot', { reason: 'all_ready_state_committed' }), true);
  assert.equal(isNormalHomeDiagnostic('home_media_attempt', { stage: 'attempt_succeeded', evidence: { disk_cache_hit: 3 } }), true);
  assert.equal(isNormalHomeDiagnostic('home_presentation_snapshot', { reason: 'pending_heartbeat' }), false);
  assert.equal(isNormalHomeDiagnostic('home_media_attempt', { stage: 'attempt_failed' }), false);
  assert.equal(isNormalHomeDiagnostic('home_media_attempt', { stage: 'attempt_succeeded', slowAttempt: true }), false);
  assert.equal(isNormalHomeDiagnostic('page_error', { stage: 'attempt_succeeded' }), false);
  assert.equal(isNormalHomeDiagnostic('home_media_attempt'), false);
  assert.equal(isNormalHomeDiagnostic('home_media_attempt', null), false);
});

for (const event of ['attempt_failed', 'logical_timeout', 'disk_cache_invalid', 'native_error']) {
  test(`a successful recovery with ${event} evidence remains immediately reportable`, () => {
    assert.equal(isNormalHomeDiagnostic('home_media_attempt', {
      stage: 'attempt_succeeded', evidence: { [event]: 0 }
    }), false);
  });
}
