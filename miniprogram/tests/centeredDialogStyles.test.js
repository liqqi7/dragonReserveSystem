const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { readWxss } = require("./helpers/readWxss");

const root = path.join(__dirname, "..");
const source = relative => fs.readFileSync(path.join(root, relative), "utf8");
const shared = readWxss(path.join(root, "styles/centeredDialog.wxss"));
const dialog = source("components/create-access-dialog/index.wxss");
const profile = source("pages/profile/profile.wxss");

test("both dialog surfaces import the shared styles before their local overrides", () => {
  for (const relative of ["components/create-access-dialog/index.wxss", "pages/profile/profile.wxss"]) {
    assert.match(source(relative), /^@import "\.\.\/\.\.\/styles\/centeredDialog\.wxss";/);
    const expanded = readWxss(path.join(root, relative));
    assert.equal((expanded.match(/@keyframes centeredDialogIn\s*\{/g) || []).length, 1);
    assert.doesNotMatch(expanded, /@import/);
  }
  assert.doesNotMatch(dialog, /\.create-access-dialog\s*\{|@keyframes/);
  assert.doesNotMatch(profile, /\.permission-dialog\s*\{|@keyframes permissionDialog/);
});

test("shared dialog rules retain both existing class names without changing templates", () => {
  for (const suffix of ["", "-overlay", "-copy", "-title-row", "-icon", "-title", "-message",
    "-actions", "-button", "-button--cancel", "-button--danger"]) {
    assert.ok(shared.includes(`.permission-dialog${suffix},\n.create-access-dialog${suffix} {`), suffix);
  }
  assert.ok(shared.includes(".permission-dialog-button--primary,\n.create-access-dialog-button--confirm {"));
  assert.match(source("components/create-access-dialog/index.wxml"), /class="create-access-dialog"/);
  assert.match(source("pages/profile/profile.wxml"), /class="permission-dialog"/);
  assert.equal(JSON.parse(source("components/create-access-dialog/index.json")).styleIsolation, "isolated");
});

test("dialog layers and pointer handling remain local to each surface", () => {
  assert.match(dialog, /:host\s*\{[^}]*z-index:\s*1500;[^}]*pointer-events:\s*none;/);
  assert.match(dialog, /\.create-access-dialog-overlay\s*\{\s*z-index:\s*1500;\s*pointer-events:\s*auto;/);
  assert.match(profile, /\.permission-dialog-overlay\s*\{\s*z-index:\s*1100;/);
  assert.doesNotMatch(shared, /z-index:|pointer-events:|:host/);
});

test("shared entrance animations preserve the mask fade and dialog scale timing", () => {
  assert.match(shared, /animation-name:\s*centeredDialogMaskIn;\s*animation-duration:\s*160ms;\s*animation-timing-function:\s*ease-out;\s*animation-fill-mode:\s*both;/);
  assert.match(shared, /animation-name:\s*centeredDialogIn;\s*animation-duration:\s*200ms;\s*animation-timing-function:\s*cubic-bezier\(0\.2, 0\.8, 0\.2, 1\);\s*animation-fill-mode:\s*both;/);
  assert.match(shared, /@keyframes centeredDialogMaskIn\s*\{\s*from \{ opacity: 0; \}\s*to \{ opacity: 1; \}\s*\}/);
  assert.match(shared, /@keyframes centeredDialogIn\s*\{\s*from \{\s*opacity: 0;\s*transform: scale\(0\.96\);\s*\}\s*to \{\s*opacity: 1;\s*transform: scale\(1\);\s*\}\s*\}/);
});

test("danger colors, mask variants and permission-only controls remain intact", () => {
  assert.match(shared, /\.create-access-dialog-button--danger\s*\{\s*background:\s*#ef4444;/);
  assert.match(profile, /\.permission-dialog-button--danger\s*\{\s*color:\s*#ffffff;/);
  assert.match(profile, /\.permission-dialog-button--disabled\s*\{\s*opacity:\s*0\.45;/);
  assert.match(profile, /\.permission-dialog-input\s*\{[^}]*height:\s*84\.61538rpx;[^}]*background:\s*#f5f5f5;/);
  assert.match(source("pages/profile/profile.wxml"), /placeholder="请输入邀请码"\s+placeholder-style="color:#9CA3AF;font-weight:400;"/);
  assert.doesNotMatch(source("pages/profile/profile.wxml"), /placeholder-class=/);
  assert.doesNotMatch(profile, /permission-dialog-input-placeholder/);
  assert.match(dialog, /\.create-access-dialog-overlay--prototype\s*\{\s*background:\s*rgba\(0, 0, 0, 0\.5\);/);
  assert.match(dialog, /\.create-access-dialog-overlay--strong\s*\{\s*background:\s*rgba\(0, 0, 0, 0\.6\);/);
  assert.doesNotMatch(shared, /permission-dialog-input|permission-dialog-button--disabled|overlay--prototype|overlay--strong/);
});

const titleStyles = source("styles/dialogTitle.wxss");
function titleRule(selector) {
  const rule = titleStyles.match(new RegExp(`\\.${selector}(?=\\s*[,\\{])[^\\{]*\\{([^}]+)\\}`));
  assert.ok(rule, selector);
  return rule[1];
}

test("every custom centered dialog uses one full-width centered title layout", () => {
  for (const selector of ["permission-dialog-title-row", "create-access-dialog-title-row",
    "modal-header", "signup-profile-modal-title-wrap"]) {
    const rule = titleRule(selector);
    assert.match(rule, /width:\s*100%;/);
    assert.match(rule, /flex-direction:\s*row;/);
    assert.match(rule, /justify-content:\s*center;/);
    assert.match(rule, /gap:\s*15\.38462rpx;/);
  }
  assert.match(source("styles/centeredDialog.wxss"), /^@import "\.\/dialogTitle\.wxss";/);
  assert.match(source("pages/activity_detail/activity_detail.wxss"), /@import "\.\.\/\.\.\/styles\/dialogTitle\.wxss";/);
});

test("invisible right spacers exactly mirror the nonshrinking left icons", () => {
  for (const [icon, spacer] of [
    ["permission-dialog-icon", "permission-dialog-title-spacer"],
    ["create-access-dialog-icon", "create-access-dialog-title-spacer"],
    ["modal-title-icon", "modal-title-spacer"],
    ["signup-profile-modal-title-icon", "signup-profile-modal-title-spacer"],
  ]) {
    assert.equal(titleRule(icon), titleRule(spacer));
    assert.match(titleRule(icon), /width:\s*34\.61538rpx;\s*height:\s*34\.61538rpx;\s*flex:\s*none;/);
  }
});

test("title markup keeps the icon left and an aria-hidden equal spacer right", () => {
  for (const [relative, icon, title, spacer, count] of [
    ["components/create-access-dialog/index.wxml", "create-access-dialog-icon", "create-access-dialog-title", "create-access-dialog-title-spacer", 1],
    ["pages/profile/profile.wxml", "permission-dialog-icon", "permission-dialog-title", "permission-dialog-title-spacer", 2],
    ["pages/profile/profile.wxml", "modal-title-icon", "modal-title", "modal-title-spacer", 1],
    ["pages/activity_detail/activity_detail.wxml", "signup-profile-modal-title-icon", "signup-profile-modal-title", "signup-profile-modal-title-spacer", 1],
  ]) {
    const markup = source(relative);
    const pattern = new RegExp(`<image[^>]*class="${icon}"[^>]*>[\\s\\S]*?<text class="${title}">[\\s\\S]*?<\\/text>\\s*<view class="${spacer}" aria-hidden="true" \\/>`, "g");
    assert.equal([...markup.matchAll(pattern)].length, count, relative + " " + title);
  }
});

test("long titles can wrap without shrinking the icon or shifting the center", () => {
  for (const title of ["permission-dialog-title", "create-access-dialog-title", "modal-title", "signup-profile-modal-title"]) {
    const rule = titleRule(title);
    assert.match(rule, /min-width:\s*0;/);
    assert.match(rule, /flex-shrink:\s*1;/);
    assert.match(rule, /text-align:\s*center;/);
    assert.match(rule, /word-break:\s*break-all;/);
    assert.doesNotMatch(rule, /white-space:\s*nowrap|overflow:\s*hidden/);
  }
  assert.doesNotMatch(source("pages/profile/profile.wxss"), /\.modal-(?:header|title-icon|title)\s*\{/);
  assert.doesNotMatch(source("pages/activity_detail/activity_detail.wxss"), /\.signup-profile-modal-title(?:-wrap|-icon)?\s*\{/);
});

test("warning dialogs use the prototype circular Lucide info icon", () => {
  const icon = source("images/dialog-warning.svg");
  assert.match(icon, /stroke="#F59E0B"/);
  assert.match(icon, /<circle cx="12" cy="12" r="10"\s*\/>/);
  assert.match(icon, /<path d="M12 16v-4"\s*\/>/);
  assert.match(icon, /<path d="M12 8h\.01"\s*\/>/);
  assert.doesNotMatch(icon, /M7\.709|10\.494/);
});
