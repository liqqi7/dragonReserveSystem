const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { readWxss } = require("./helpers/readWxss");

const root = path.join(__dirname, "..");
const source = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const stylesSource = (relative) => readWxss(path.join(root, relative));

test("session expiry opens the prototype warning dialog on the active Skyline page", () => {
  let app;
  const opened = [];
  const native = [];
  const page = { selectComponent: (selector) => {
    assert.equal(selector, "#session-expired-dialog");
    return { open: (options) => opened.push(options) };
  } };
  vm.runInNewContext(source("app.js"), {
    App: (definition) => { app = definition; },
    require: () => ({}),
    getCurrentPages: () => [page],
    setTimeout: (fn) => fn(),
    wx: { showModal: (options) => native.push(options) }
  });
  app.showSessionExpiredPrompt();
  app.showSessionExpiredPrompt();
  assert.equal(opened.length, 1);
  assert.equal(native.length, 0);
  assert.equal(opened[0].title, "登录后即可使用");
  assert.equal(opened[0].message, "登录后才能参加活动和查看个人信息");
  assert.equal(opened[0].confirmText, "立即登录");
  assert.equal(opened[0].confirmBehavior, "reauthenticate");
  assert.equal(opened[0].prototypeStyle, true);
});

test("every configured page mounts the shared session-expired dialog", () => {
  const appConfig = JSON.parse(source("app.json"));
  for (const page of appConfig.pages) {
    const config = JSON.parse(source(`${page}.json`));
    assert.equal(config.usingComponents["create-access-dialog"], "../../components/create-access-dialog/index", page);
    assert.match(source(`${page}.wxml`), /<create-access-dialog id="session-expired-dialog"\s*\/>/, page);
  }
});

test("dialog message alignment is opt-in and resets for other confirmations", () => {
  let definition;
  vm.runInNewContext(source("components/create-access-dialog/index.js"), {
    Component: value => {definition = value;},
  });
  const dialog = {...definition.methods, data: {...definition.data},
    setData(patch) {Object.assign(this.data, patch);}};
  const message = "第一段。\n第二段。";
  dialog.open({message, messageAlign: "left"});
  assert.equal(dialog.data.messageAlign, "left");
  assert.equal(dialog.data.message, message);
  dialog.close();
  dialog.open({message: "普通确认提示"});
  assert.equal(dialog.data.messageAlign, "center");
  assert.equal(dialog.data.message, "普通确认提示");
  dialog.open({messageAlign: "invalid", variant: "danger"});
  assert.equal(dialog.data.messageAlign, "center");
  const markup = source("components/create-access-dialog/index.wxml");
  assert.match(markup, /messageAlign === 'left' \? 'create-access-dialog-message--left'/);
  assert.match(source("components/create-access-dialog/index.wxss"), /\.create-access-dialog-message--left\s*\{\s*text-align:\s*left;/);
});

test("exit confirmation reuses the danger dialog and only removes the intended signup", () => {
  let definition;
  let nativeCalls = 0;
  vm.runInNewContext(source("pages/activity_detail/activity_detail.js"), {
    getApp: () => ({ globalData: {} }),
    Page: (value) => { definition = value; },
    require: () => ({}),
    wx: { getStorageSync: () => "", showModal: () => { nativeCalls += 1; } }
  });
  const opened = [];
  const removed = [];
  const activity = { _id: "a-1", hasSignedUp: true, hasCheckedIn: false };
  const page = {
    ...definition,
    data: { ...definition.data, activity, myUserId: "u-1", participantDrawerList: [
      { id: "p-1", userId: "u-1", name: "我" }
    ] },
    selectComponent: () => ({ open: (options) => opened.push(options) }),
    doRemoveParticipant: (...args) => removed.push(args)
  };
  page.onTapCancelSignup();
  assert.equal(opened[0].variant, "danger");
  assert.equal(opened[0].title, "确定退出活动？");
  assert.equal(opened[0].message, "退出后将无法继续参与本次活动");
  assert.equal(opened[0].confirmText, "确定退出");
  assert.equal(opened[0].confirmBehavior, "emit");
  assert.equal(nativeCalls, 0);
  assert.equal(removed.length, 0, "opening the dialog must not remove the signup");
  page.confirmExitActivity();
  assert.equal(removed.length, 1);
  assert.equal(removed[0][0], "p-1");
  assert.equal(removed[0][3], true);
  page.confirmExitActivity();
  assert.equal(removed.length, 1, "duplicate confirm must not remove twice");
  page.removeParticipant({ detail: { id: "p-1", name: "我", self: true } });
  assert.equal(opened.length, 2, "the participant drawer uses the same confirmation");
  page.data.activity = { ...activity, _id: "a-2" };
  page.confirmExitActivity();
  assert.equal(removed.length, 1, "stale confirmation cannot remove a signup from another activity");
});

test("prototype dialog style and empty-avatar placeholder match their canvas geometry", () => {
  const markup = source("components/create-access-dialog/index.wxml");
  const styles = stylesSource("components/create-access-dialog/index.wxss");
  const detailMarkup = source("pages/activity_detail/activity_detail.wxml");
  const detailStyles = source("pages/activity_detail/activity_detail.wxss");
  assert.match(markup, /wx:if="\{\{variant === 'danger'\}\}"[^>]*src="\/images\/dialog-danger\.svg"/);
  assert.match(markup, /wx:else[^>]*src="\/images\/dialog-warning\.svg"/);
  assert.match(styles, /\.create-access-dialog-overlay--prototype\s*\{\s*background:\s*rgba\(0, 0, 0, 0\.5\)/);
  assert.match(styles, /\.create-access-dialog-button--danger\s*\{\s*background:\s*#ef4444/);
  assert.match(styles, /\.create-access-dialog\s*\{[^}]*width:\s*576\.92308rpx;[^}]*padding:\s*38\.46154rpx;/s);
  assert.match(detailMarkup, /id="exit-activity-dialog" bind:confirm="confirmExitActivity"/);
  const profileMarkup = source("pages/profile/profile.wxml");
  const profileStyles = source("pages/profile/profile.wxss");
  const profileConfig = JSON.parse(source("pages/profile/profile.json"));
  const detailConfig = JSON.parse(source("pages/activity_detail/activity_detail.json"));
  const profileDialog = source("components/profile-editor-dialog/index.wxml");
  const profileDialogLogic = source("components/profile-editor-dialog/index.js");
  const profileDialogStyles = stylesSource("components/profile-editor-dialog/index.wxss");
  const avatarIcon = source("images/icon-avatar-user-round.svg");
  assert.equal(profileConfig.usingComponents["profile-editor-dialog"], "../../components/profile-editor-dialog/index");
  assert.equal(detailConfig.usingComponents["profile-editor-dialog"], "../../components/profile-editor-dialog/index");
  assert.match(profileMarkup, /<profile-editor-dialog[\s\S]*visible="\{\{showEditModal\}\}"[\s\S]*avatar-url="\{\{editAvatarUrl\}\}"[\s\S]*nickname="\{\{editNickname\}\}"[\s\S]*bind:chooseavatar="onChooseAvatar"[\s\S]*bind:nicknameinput="onInputNickname"[\s\S]*bind:save="saveProfile"/);
  assert.match(detailMarkup, /<profile-editor-dialog[\s\S]*visible="\{\{showSignupProfileModal\}\}"[\s\S]*avatar-url="\{\{signupProfileAvatarUrl\}\}"[\s\S]*nickname="\{\{signupProfileNickname\}\}"[\s\S]*save-disabled="\{\{!signupProfileCanSubmit\}\}"[\s\S]*z-index="1300"[\s\S]*bind:chooseavatar="onSignupProfileChooseAvatar"[\s\S]*bind:nicknameinput="onSignupProfileNicknameInput"[\s\S]*bind:save="saveSignupProfile"/);
  assert.match(profileDialogLogic, /hint:\s*\{\s*type:\s*String,\s*value:\s*"以下内容将公开展示，上传即视为同意"/);
  assert.match(profileDialog, /bindtap="close"/);
  assert.match(profileDialog, /bindtap="chooseAvatar"/);
  assert.match(profileDialog, /bindinput="inputNickname"/);
  assert.match(profileDialog, /bindtap="save" disabled="\{\{saveDisabled\}\}"/);
  assert.match(profileDialogStyles, /\.profile-editor-overlay\s*\{[^}]*position:\s*fixed;[\s\S]*align-items:\s*center;[\s\S]*justify-content:\s*center;/);
  assert.match(profileDialogStyles, /\.profile-editor-dialog\s*\{[^}]*width:\s*576\.92308rpx;[^}]*max-width:\s*calc\(100% - 64rpx\);[^}]*border-radius:\s*30\.76923rpx;/s);
  assert.doesNotMatch(profileStyles, /\.modal-overlay|\.avatar-edit-/);
  assert.doesNotMatch(detailStyles, /\.signup-profile-/);
  assert.doesNotMatch(profileMarkup, /class="close-btn"|forceProfile|force-profile-hint/);
  assert.match(profileDialog, /class="profile-editor-avatar-placeholder"><image src="\/images\/icon-avatar-user-round\.svg"/);
  const sharedDialogStyles = stylesSource("components/create-access-dialog/index.wxss");
  assert.match(sharedDialogStyles, /\.create-access-dialog-overlay\s*\{[^}]*position:\s*fixed;[\s\S]*top:\s*0;[\s\S]*bottom:\s*0;[\s\S]*align-items:\s*center;[\s\S]*justify-content:\s*center;/);
  assert.match(avatarIcon, /stroke="#9CA3AF"/);
  assert.match(avatarIcon, /<circle cx="12" cy="8" r="5"\s*\/>/);
  assert.match(avatarIcon, /<path d="M20 21a8 8 0 0 0-16 0"\s*\/>/);
});

test("shared profile editor forwards each user action to its page", () => {
  let definition;
  vm.runInNewContext(source("components/profile-editor-dialog/index.js"), {
    Component: (value) => { definition = value; }
  });
  const events = [];
  const dialog = {
    ...definition.methods,
    triggerEvent: (name, detail) => events.push({ name, detail })
  };
  dialog.close();
  dialog.chooseAvatar();
  dialog.inputNickname({ detail: { value: "小明" } });
  dialog.save();
  assert.deepEqual(events.map(({ name }) => name), ["close", "chooseavatar", "nicknameinput", "save"]);
  assert.equal(events[2].detail.value, "小明");
});
test("prototype dialog confirmation dispatches re-login and exit exactly once", () => {
  let definition;
  let loginCalls = 0;
  let nativeCalls = 0;
  const tabMasks = [];
  vm.runInNewContext(source("components/create-access-dialog/index.js"), {
    Component: (value) => { definition = value; },
    getCurrentPages: () => [{ getTabBar: () => ({ setModalMaskVisible: (value) => tabMasks.push(value) }) }],
    getApp: () => ({ reauthenticateAfterExpiry: () => { loginCalls += 1; } }),
    wx: { switchTab: () => { nativeCalls += 1; } }
  });
  const events = [];
  const dialog = {
    data: { ...definition.data },
    ...definition.methods,
    setData(patch) { Object.assign(this.data, patch); },
    triggerEvent: (name, detail) => events.push({ name, detail })
  };
  dialog.open({ type: "sessionExpired", confirmBehavior: "reauthenticate", prototypeStyle: true });
  assert.equal(dialog.data.visible, true);
  assert.equal(dialog.data.prototypeStyle, true);
  dialog.confirm();
  assert.equal(loginCalls, 1);
  assert.equal(dialog.data.visible, false);
  dialog.open({ type: "exitActivity", variant: "danger", confirmBehavior: "emit" });
  assert.equal(dialog.data.variant, "danger");
  dialog.confirm();
  assert.equal(events.length, 1);
  assert.equal(events[0].name, "confirm");
  assert.equal(events[0].detail.type, "exitActivity");
  assert.equal(nativeCalls, 0);
  assert.deepEqual(tabMasks, [true, false, true, false]);
});

test("logout modal matches P37gp and cancels without clearing account", () => {
  const markup = source("pages/profile/profile.wxml");
  const dialogMarkup = source("components/create-access-dialog/index.wxml");
  const dialogStyle = source("components/create-access-dialog/index.wxss");
  assert.match(markup, /<create-access-dialog id="logout-dialog" bind:confirm="confirmLogout"\s*\/>/);
  assert.match(dialogMarkup, /strongMask \? 'create-access-dialog-overlay--strong'/);
  assert.match(dialogStyle, /\.create-access-dialog-overlay--strong\s*\{\s*background:\s*rgba\(0, 0, 0, 0\.6\)/);
  let definition;
  let logoutCalls = 0;
  const app = { logout: () => { logoutCalls += 1; }, globalData: {} };
  const toasts = [];
  vm.runInNewContext(source("pages/profile/profile.js"), {
    Page: (value) => { definition = value; },
    getApp: () => app,
    require: (id) => id.endsWith("/config") ? { getApiBaseUrl: () => "" } : {},
    wx: { showToast: (value) => toasts.push(value) }
  });
  let options;
  const page = {
    ...definition,
    data: { ...definition.data, hasUser: true, isGuest: false, user: { nickname: "test" } },
    selectComponent: (id) => {
      assert.equal(id, "#logout-dialog");
      return { open: (value) => { options = value; } };
    },
    setData(patch) { Object.assign(this.data, patch); }
  };
  page.logout();
  assert.equal(options.variant, "danger");
  assert.equal(options.strongMask, true);
  assert.equal(options.confirmBehavior, "emit");
  assert.equal(options.title, "退出登录");
  assert.equal(options.message, "退出后将清除本机的账号信息，下次需要重新登录。");
  assert.equal(options.confirmText, "确定");
  assert.equal(logoutCalls, 0);
  page.confirmLogout();
  assert.equal(logoutCalls, 1);
  assert.equal(page.data.hasUser, false);
  assert.equal(page.data.isGuest, true);
  assert.equal(toasts[0].title, "已退出登录");
  page.confirmLogout();
  assert.equal(logoutCalls, 1);
});
