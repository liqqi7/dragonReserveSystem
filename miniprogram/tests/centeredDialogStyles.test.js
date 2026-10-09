const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { readWxss } = require("./helpers/readWxss");

const root = path.join(__dirname, "..");
const source = relative => fs.readFileSync(path.join(root, relative), "utf8");
const shared = source("styles/centeredDialog.wxss");
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
  assert.match(profile, /\.permission-dialog-input-placeholder\s*\{\s*color:\s*#9ca3af;\s*font-weight:\s*400;/);
  assert.match(dialog, /\.create-access-dialog-overlay--prototype\s*\{\s*background:\s*rgba\(0, 0, 0, 0\.5\);/);
  assert.match(dialog, /\.create-access-dialog-overlay--strong\s*\{\s*background:\s*rgba\(0, 0, 0, 0\.6\);/);
  assert.doesNotMatch(shared, /permission-dialog-input|permission-dialog-button--disabled|overlay--prototype|overlay--strong/);
});
