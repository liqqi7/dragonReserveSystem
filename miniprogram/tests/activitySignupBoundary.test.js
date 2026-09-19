const test = require('node:test');
const assert = require('node:assert/strict');
const { enrichSingleActivity } = require('../utils/activityEnrich');
test('signup remains open until the precise start second, ignoring old deadline', () => {
  const raw = {id:1,name:'test',start_time:'2026-09-20T18:00:45',end_time:'2026-09-20T20:00:00',signup_deadline:'2026-09-19T18:00:00',status:'未开始',participants:[],sub_items:[]};
  const before=enrichSingleActivity(raw,[],null,'',new Date('2026-09-20T18:00:44'));
  assert.equal(before.isSignupClosed,false);
  assert.equal(before.activityStarted,false);
  assert.equal(before.signupDeadlinePassed,false);
  const exact=enrichSingleActivity(raw,[],null,'',new Date('2026-09-20T18:00:45'));
  assert.equal(exact.isSignupClosed,true);
  assert.equal(exact.activityStarted,true);
  assert.equal(exact.signupDeadlinePassed,true);
});
