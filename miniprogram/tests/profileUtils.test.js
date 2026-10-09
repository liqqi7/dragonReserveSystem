const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const profileUtils = require("../utils/profileUtils");

test("temporary avatar detection preserves supported local prefixes and normalization", () => {
  for (const url of ["http://tmp/avatar.png", "https://tmp/avatar.png", "wxfile://avatar.png",
    "tmp/avatar.png", "  WXFILE://avatar.png  ", " HTTPS://TMP/avatar.png "]
  ) assert.equal(profileUtils.isTemporaryAvatarUrl(url), true, url);
  for (const url of [undefined, null, "", "   ", "https://cdn.test/avatar.png",
    "/images/default-avatar.svg", "https://tmp.example/avatar.png", "https://cdn.test/tmp/avatar.png"]
  ) assert.equal(profileUtils.isTemporaryAvatarUrl(url), false, String(url));
});

for (const [pageName, saveMethod] of [["profile", "saveProfile"], ["activity_detail", "saveSignupProfile"]]) {
  test(`${pageName} uploads temporary avatars and reuses remote or unchanged avatars`, async () => {
    const source = fs.readFileSync(path.join(__dirname, `../pages/${pageName}/${pageName}.js`), "utf8");
    for (const avatarUrl of ["wxfile://avatar.png", "https://tmp/avatar.png", "https://cdn.test/avatar.png", ""]) {
      const events = [];
      const currentAvatarUrl = "https://cdn.test/current.png";
      const uploadedAvatarUrl = "https://cdn.test/uploaded.png";
      let page;
      const app = {
        globalData: { userId: "user-1", userProfile: { avatarUrl: currentAvatarUrl } },
        applyCurrentUser() { events.push("apply"); }
      };
      vm.runInNewContext(source, {
        getApp: () => app,
        Page: definition => { page = definition; },
        require: name => {
          if (name === "../../utils/profileUtils") return profileUtils;
          if (name === "../../services/config") return { getApiBaseUrl: () => "" };
          if (name === "../../utils/profilePresentation") return { getProfileSubtitle: () => "" };
          if (name === "../../services/user") return {
            async uploadAvatar(value) {
              events.push(["upload", value]);
              return { avatar_url: uploadedAvatarUrl };
            },
            async updateMe(value) {
              events.push(["update", value.avatar_url]);
              return { nickname: "Tester", avatar_url: value.avatar_url };
            }
          };
          return {};
        },
        wx: { showLoading() {}, hideLoading() {}, showToast: value => events.push(value.icon) },
        console
      });
      Object.assign(page.data, {
        editNickname: "Tester", editAvatarUrl: avatarUrl, user: { avatarUrl: currentAvatarUrl },
        signupProfileNickname: "Tester", signupProfileAvatarUrl: avatarUrl, signupProfileCanSubmit: true
      });
      page.setData = patch => Object.assign(page.data, patch);
      page.syncUser = () => {};
      page[saveMethod]();
      await new Promise(setImmediate);
      const isTemporary = profileUtils.isTemporaryAvatarUrl(avatarUrl);
      assert.deepEqual(events, [
        ...(isTemporary ? [["upload", avatarUrl]] : []),
        ["update", isTemporary ? uploadedAvatarUrl : (avatarUrl || currentAvatarUrl)],
        "apply", "success"
      ], `${pageName}: ${avatarUrl || "unchanged"}`);
    }
  });
}
