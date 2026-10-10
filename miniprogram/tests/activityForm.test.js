const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MAX_NAME_LENGTH,
  MAX_REMARK_LENGTH,
  normalizeSubItems,
  buildCreateForm,
  buildEditForm,
  validateActivityForm,
  buildActivityPayload
} = require("../utils/activityForm");

test("shared subitem normalization uses an activity quota of at least three", () => {
  const items = [{ id: 7, name: "A", max_participants: 8, current_participants: 1 },
    { name: "B", max_participants: 1 }];
  for (const quota of [1, 2, 3, -1]) {
    assert.deepEqual(normalizeSubItems(items, quota), [
      { id: 7, name: "A", max_participants: 3, current_participants: 1 },
      { name: "B", max_participants: 1 }
    ]);
  }
  assert.equal(items[0].max_participants, 8);
});

test("shared subitem normalization preserves defaults and capacity boundaries", () => {
  for (const quota of [undefined, null, 0, "invalid"]) {
    assert.equal(normalizeSubItems([{ max_participants: 20 }], quota)[0].max_participants, 12);
  }
  assert.equal(normalizeSubItems([{ max_participants: 1200 }], 1500)[0].max_participants, 999);
  assert.equal(normalizeSubItems([{ max_participants: 10 }], 8)[0].max_participants, 8);
  for (const max_participants of [undefined, null, 0, -1, "invalid"]) {
    assert.equal(normalizeSubItems([{ max_participants }], 8)[0].max_participants, 1);
  }
  for (const items of [undefined, null, {}]) assert.deepEqual(normalizeSubItems(items, 8), []);
});


test("capacity following stays local to the form and does not reset saved subitems", () => {
  const form = {
    ...buildCreateForm(),
    maxParticipants: 16,
    subItemsEnabled: true,
    subItems: normalizeSubItems([{ name: "Dinner", max_participants: 12, followsActivityCapacity: true }], 16)
  };
  assert.deepEqual(buildActivityPayload(form).sub_items, [{ name: "Dinner", max_participants: 16 }]);
  const edited = buildEditForm({ maxParticipants: 16, subItems: [{ id: 7, name: "Dinner", max_participants: 12 }] });
  assert.deepEqual(normalizeSubItems(edited.subItems, 17), [{ id: 7, name: "Dinner", max_participants: 12 }]);
  assert.equal(form.subItems[0].followsActivityCapacity, true);
});

test("new and edited activities use a cover instead of an activity type", () => {
  assert.equal(buildCreateForm(new Date(2026, 7, 17, 10, 0, 0)).activityCoverId, "");
  assert.equal(buildEditForm({ activity_cover_id: "lam-001" }).activityCoverId, "lam-001");
});

test("activity name limit is 10 characters", () => {
  assert.equal(MAX_NAME_LENGTH, 10);

  const now = new Date(2026, 7, 16, 10, 0, 0);
  const base = {
    ...buildCreateForm(now),
    startDate: "2026-08-16", startTime: "12:00",
    endDate: "2026-08-16", endTime: "13:00",
    remark: "活动说明",
    activityCoverId: "lam-001"
  };
  assert.equal(validateActivityForm({ ...base, name: "活".repeat(10) }, { mode: "create", now }).ok, true);
  assert.match(validateActivityForm({ ...base, name: "活".repeat(11) }, { mode: "create", now }).message, /不能超过 10 个字/);
});

test("activity remark limit is 200 characters", () => {
  assert.equal(MAX_REMARK_LENGTH, 200);

  const now = new Date(2026, 7, 16, 10, 0, 0);
  const base = {
    ...buildCreateForm(now),
    name: "羽毛球",
    startDate: "2026-08-16", startTime: "12:00",
    endDate: "2026-08-16", endTime: "13:00",
    activityCoverId: "lam-001"
  };
  assert.equal(validateActivityForm({ ...base, remark: "备".repeat(200) }, { mode: "create", now }).ok, true);
  assert.match(validateActivityForm({ ...base, remark: "备".repeat(201) }, { mode: "create", now }).message, /不能超过 200 个字/);
});

test("buildCreateForm uses rounded +2h/+1h defaults without independent deadline", () => {
  const form = buildCreateForm(new Date(2026, 7, 16, 21, 53, 20), "boardgame");
  assert.equal(`${form.startDate} ${form.startTime}`, "2026-08-16 23:55");
  assert.equal(`${form.endDate} ${form.endTime}`, "2026-08-17 00:55");
  assert.equal(form.signupDeadlineDate, undefined);
  assert.equal(form.activityCoverId, "");
  assert.equal(form.limitEnabled, true);
  assert.equal(form.maxParticipants, 12);
});

test("buildEditForm preserves values without reviving the removed deadline", () => {
  const form = buildEditForm({
    name: "桌游夜",
    status: "未开始",
    startTime: "2026-08-20 19:00",
    endTime: "2026-08-20 22:00",
    maxParticipants: 8,
    signupEnabled: false
  });
  assert.equal(form.signupDeadlineDate, undefined);
  assert.equal(form.limitEnabled, true);
  assert.equal(form.maxParticipants, 8);
  assert.equal(form.signupEnabled, false);
});

test("edit form raises legacy limited activities to the minimum capacity", () => {
  assert.equal(buildEditForm({ maxParticipants: 2 }).maxParticipants, 3);
  assert.equal(buildEditForm({ maxParticipants: null }).maxParticipants, 12);
});

test("edit form preserves independently selected start and end times", () => {
  const form = buildEditForm({
    startTime: "2026-08-20 19:00",
    endTime: "2026-08-21 21:00"
  });
  assert.equal(`${form.startDate} ${form.startTime}`, "2026-08-20 19:00");
  assert.equal(`${form.endDate} ${form.endTime}`, "2026-08-21 21:00");
});

test("validation checks text, time and participant limits", () => {
  const now = new Date(2026, 7, 16, 10, 0, 0);
  const valid = {
    ...buildCreateForm(now),
    name: "羽毛球",
    remark: "活动说明",
    startDate: "2026-08-16", startTime: "12:00",
    endDate: "2026-08-16", endTime: "13:00",
    activityCoverId: "lam-001"
  };
  assert.equal(validateActivityForm(valid, { mode: "create", now }).ok, true);
  assert.match(validateActivityForm({ ...valid, name: "" }, { mode: "create", now }).message, /活动名称/);
  assert.match(validateActivityForm({ ...valid, remark: "" }, { mode: "create", now }).message, /请输入活动备注/);
  assert.match(validateActivityForm({ ...valid, remark: "   " }, { mode: "edit", now }).message, /请输入活动备注/);
  assert.match(validateActivityForm({ ...valid, endTime: "11:00" }, { mode: "create", now }).message, /结束时间/);
  assert.match(validateActivityForm({ ...valid, limitEnabled: true, maxParticipants: 2 }, { mode: "create", now }).message, /3–999/);
  assert.equal(validateActivityForm({ ...valid, limitEnabled: true, maxParticipants: 3 }, { mode: "create", now }).ok, true);
  assert.match(validateActivityForm({ ...valid, limitEnabled: true, maxParticipants: 1000 }, { mode: "create", now }).message, /999/);
  assert.match(validateActivityForm({ ...valid, limitEnabled: true, maxParticipants: 3 }, { mode: "edit", participantCount: 4, now }).message, /当前报名人数 4/);
});

test("payload includes the selected cover and no activity type", () => {
  const form = { ...buildCreateForm(new Date(2026, 7, 16, 10, 0, 0)), name: "电影", activityCoverId: "lam-001" };
  const createPayload = buildActivityPayload(form, { mode: "create" });
  const editPayload = buildActivityPayload(form, { mode: "edit" });
  assert.equal(createPayload.activity_cover_id, "lam-001");
  assert.equal(editPayload.activity_cover_id, "lam-001");
  assert.equal(Object.prototype.hasOwnProperty.call(createPayload, "activity_type"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(editPayload, "activity_type"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(editPayload, "activity_style_key"), false);
  assert.equal(createPayload.max_participants, 12);
  assert.equal(Object.hasOwn(createPayload, "signup_deadline"), false);
  assert.equal(Object.hasOwn(editPayload, "signup_deadline"), false);

  const unlimitedPayload = buildActivityPayload({ ...form, limitEnabled: false }, { mode: "create" });
  assert.equal(unlimitedPayload.max_participants, null);
});
