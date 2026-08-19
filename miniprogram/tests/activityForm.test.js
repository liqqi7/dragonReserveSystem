const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_ACTIVITY_TYPE,
  DEFAULT_CREATE_ACTIVITY_TYPE,
  MAX_NAME_LENGTH,
  buildCreateForm,
  buildEditForm,
  applyStartDateTime,
  validateActivityForm,
  buildActivityPayload
} = require("../utils/activityForm");


test("create defaults to badminton without changing the edit fallback", () => {
  assert.equal(DEFAULT_CREATE_ACTIVITY_TYPE, "badminton");
  assert.equal(DEFAULT_ACTIVITY_TYPE, "other");
  assert.equal(buildCreateForm(new Date(2026, 7, 17, 10, 0, 0)).activityType, "badminton");
  assert.equal(buildEditForm({}).activityType, "other");
  assert.equal(buildActivityPayload({ ...buildCreateForm(new Date(2026, 7, 17, 10, 0, 0)), activityType: "" }, { mode: "create" }).activity_type, "badminton");
});

test("activity name limit is 30 characters", () => {
  assert.equal(MAX_NAME_LENGTH, 30);

  const now = new Date(2026, 7, 16, 10, 0, 0);
  const base = {
    ...buildCreateForm(now),
    startDate: "2026-08-16", startTime: "12:00",
    endDate: "2026-08-16", endTime: "13:00",
    signupDeadlineDate: "2026-08-16", signupDeadlineTime: "11:00"
  };
  assert.equal(validateActivityForm({ ...base, name: "活".repeat(30) }, { mode: "create", now }).ok, true);
  assert.match(validateActivityForm({ ...base, name: "活".repeat(31) }, { mode: "create", now }).message, /不能超过 30 个字/);
});

test("buildCreateForm uses rounded +2h/+1h/-1h defaults", () => {
  const form = buildCreateForm(new Date(2026, 7, 16, 21, 53, 20), "boardgame");
  assert.equal(`${form.startDate} ${form.startTime}`, "2026-08-16 23:55");
  assert.equal(`${form.endDate} ${form.endTime}`, "2026-08-17 00:55");
  assert.equal(`${form.signupDeadlineDate} ${form.signupDeadlineTime}`, "2026-08-16 22:55");
  assert.equal(form.activityType, "boardgame");
  assert.equal(form.limitEnabled, true);
  assert.equal(form.maxParticipants, 12);
});

test("buildEditForm preserves values and derives missing deadline", () => {
  const form = buildEditForm({
    name: "桌游夜",
    status: "未开始",
    startTime: "2026-08-20 19:00",
    endTime: "2026-08-20 22:00",
    maxParticipants: 8,
    signupEnabled: false
  });
  assert.equal(`${form.signupDeadlineDate} ${form.signupDeadlineTime}`, "2026-08-20 18:00");
  assert.equal(form.limitEnabled, true);
  assert.equal(form.maxParticipants, 8);
  assert.equal(form.signupEnabled, false);
});

test("applyStartDateTime only fills empty linked fields", () => {
  const filled = applyStartDateTime({ endDate: "", endTime: "", signupDeadlineDate: "", signupDeadlineTime: "" }, "2026-08-20 19:00");
  assert.equal(`${filled.endDate} ${filled.endTime}`, "2026-08-20 20:00");
  assert.equal(`${filled.signupDeadlineDate} ${filled.signupDeadlineTime}`, "2026-08-20 18:00");

  const preserved = applyStartDateTime({
    endDate: "2026-08-21", endTime: "21:00",
    signupDeadlineDate: "2026-08-19", signupDeadlineTime: "12:00"
  }, "2026-08-20 19:00");
  assert.equal(`${preserved.endDate} ${preserved.endTime}`, "2026-08-21 21:00");
  assert.equal(`${preserved.signupDeadlineDate} ${preserved.signupDeadlineTime}`, "2026-08-19 12:00");
});

test("validation checks text, time and participant limits", () => {
  const now = new Date(2026, 7, 16, 10, 0, 0);
  const valid = {
    ...buildCreateForm(now),
    name: "羽毛球",
    startDate: "2026-08-16", startTime: "12:00",
    endDate: "2026-08-16", endTime: "13:00",
    signupDeadlineDate: "2026-08-16", signupDeadlineTime: "11:00"
  };
  assert.equal(validateActivityForm(valid, { mode: "create", now }).ok, true);
  assert.match(validateActivityForm({ ...valid, name: "" }, { mode: "create", now }).message, /活动名称/);
  assert.match(validateActivityForm({ ...valid, endTime: "11:00" }, { mode: "create", now }).message, /结束时间/);
  assert.match(validateActivityForm({ ...valid, signupDeadlineTime: "12:30" }, { mode: "create", now }).message, /报名截止/);
  assert.match(validateActivityForm({ ...valid, limitEnabled: true, maxParticipants: 1000 }, { mode: "create", now }).message, /999/);
  assert.match(validateActivityForm({ ...valid, limitEnabled: true, maxParticipants: 3 }, { mode: "edit", participantCount: 4, now }).message, /当前报名人数 4/);
});

test("payload includes type only when creating", () => {
  const form = { ...buildCreateForm(new Date(2026, 7, 16, 10, 0, 0), "movie"), name: "电影" };
  const createPayload = buildActivityPayload(form, { mode: "create" });
  const editPayload = buildActivityPayload(form, { mode: "edit" });
  assert.equal(createPayload.activity_type, "movie");
  assert.equal(Object.prototype.hasOwnProperty.call(editPayload, "activity_type"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(editPayload, "activity_style_key"), false);
  assert.equal(createPayload.max_participants, 12);

  const unlimitedPayload = buildActivityPayload({ ...form, limitEnabled: false }, { mode: "create" });
  assert.equal(unlimitedPayload.max_participants, null);
});
