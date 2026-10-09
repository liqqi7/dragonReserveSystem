const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const enrich = require("../utils/activityEnrich");
const { orderParticipantsForDrawerRecentFirst } = require("../utils/participantSort");

function homePage(userId) {
  let definition;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../pages/activity_list/activity_list.js"), "utf8"), {
    Page: value => { definition = value; },
    getApp: () => ({ globalData: {} }),
    require: name => name.endsWith("/activityEnrich") ? enrich : {}
  });
  return { ...definition, data: { myUserId: userId } };
}

for (const extension of ["jpg", "gif"]) {
  test(`home and detail share activity state while preserving the ${extension} cover`, () => {
    const raw = {
      id: 8, name: "Activity", status: "未开始", start_time: "2026-10-10T18:00:45",
      end_time: "2026-10-10T20:00:00", max_participants: 3, signup_enabled: true,
      activity_cover: { id: "artwork", image_url: `https://cdn.test/cover.${extension}`,
        large_card_glass_image_url: "https://cdn.test/glass.jpg" },
      participants: [{ id: 1, user_id: 7, display_nickname: "Member", display_avatar_url: "https://cdn.test/avatar.jpg",
        created_at: "2026-10-09T12:00:00", checked_in_at: null }]
    };
    for (const time of ["18:00:44", "18:00:45", "20:00:00"]) {
      const now = new Date(`2026-10-10T${time}`);
      const detail = enrich.enrichSingleActivity(raw, "7", now);
      const home = homePage("7").processActivityList([raw], now).list[0];
      for (const key of Object.keys(detail)) assert.deepEqual(home[key], detail[key], key);
      assert.equal(home.largeCardBgImageUrl, raw.activity_cover.image_url);
      assert.equal(home.largeCardGlassImageUrl, raw.activity_cover.large_card_glass_image_url);
      assert.equal(home.participants[0].avatarUrl, "https://cdn.test/avatar.jpg");
      assert.equal(home.hasSignedUp, true);
      assert.equal(home.cardDateTimeLabel, "10-10 周六 18:00-20:00");
      assert.equal(home.smallCardTimeLabel, home.cardDateTimeLabel);
    }
  });
}

test("home has no unused scroll measurement or artificial loading-more state", () => {
  const page = homePage("");
  const wxml = fs.readFileSync(path.join(__dirname, "../pages/activity_list/activity_list.wxml"), "utf8");
  assert.equal(page.onMainScroll, undefined);
  assert.equal(Object.hasOwn(page.data, "endedLoadingMore"), false);
  assert.doesNotMatch(wxml, /bindscroll="onMainScroll"|endedLoadingMore/);
});

test("participant drawer keeps newest-first order, ID tie-breaks and participant avatars", () => {
  const activity = enrich.adaptActivity({
    id: 1,
    participants: [
      { id: 1, user_id: 7, created_at: "2026-10-09T10:00:00", display_avatar_url: "https://cdn.test/first.jpg" },
      { id: 2, user_id: 8, created_at: "2026-10-10T10:00:00", display_avatar_url: "https://cdn.test/second.jpg" },
      { id: 3, user_id: 9, created_at: "2026-10-10T10:00:00", display_avatar_url: "" }
    ]
  });
  const rows = orderParticipantsForDrawerRecentFirst(activity.participants);
  assert.deepEqual(rows.map(row => row.id), [3, 2, 1]);
  assert.deepEqual(activity.participants.map(row => row.id), [1, 2, 3]);
  assert.equal(rows[0].avatarUrl, enrich.DEFAULT_AVATAR);
  assert.equal(rows[1].avatarUrl, "https://cdn.test/second.jpg");
  assert.equal(rows[2].avatarUrl, "https://cdn.test/first.jpg");
});
