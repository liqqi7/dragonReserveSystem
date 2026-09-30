const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const wxml = fs.readFileSync(path.join(root, "pages/profile/profile.wxml"), "utf8");
const wxss = fs.readFileSync(path.join(root, "pages/profile/profile.wxss"), "utf8");
// Paths are taken from phosphor-icons/core assets/regular for the named prototype symbols.
const icons = {
  "profile-icon-login.svg": ["sign-in", "bvdOh", "#111827", 18, "bad1eacd78325b40f5d78328008545ead9709a22777e9d9b9a88f941728543a8"],
  "profile-icon-pencil.svg": ["pencil-simple", "Le30z", "#111827", 18, "0b77ba5d465c8a5084f95b43182a8a067b4dcfcedef3a0c2dec4a259baabdcf6"],
  "profile-icon-lock-keyhole.svg": ["lock-key", "Kp0sY", "#111827", 18, "7fa116ca780c76f4063ee4381cc12ed9e81a78b707318cefb307ba52e91a809f"],
  "profile-icon-lock-keyhole-danger.svg": ["lock-key", "Kp0sY", "#E5484D", 18, "7fa116ca780c76f4063ee4381cc12ed9e81a78b707318cefb307ba52e91a809f"],
  "profile-icon-logout.svg": ["sign-out", "bYsb6", "#E5484D", 18, "3c347ece5189b87459fb7b5a860bf83a8cb92166aebdc1e6e39e855a358b1510"],
  "profile-icon-chevron-right.svg": ["caret-right", "eoJ4k", "#B0B0B0", 14, "ef32eac845b54f47d578c6b61034a23b193880394b56bf849bd23e7f33e1be08"]
};

test("我的页图标采用原型指定的 Phosphor Regular 资产", () => {
  for (const [filename, [name, id, fill, size, hash]] of Object.entries(icons)) {
    const svg = fs.readFileSync(path.join(root, "images", filename), "utf8");
    assert.ok(wxml.includes(`/images/${filename}`), `${filename} is used`);
    assert.ok(svg.includes(`data-icon-name="${name}"`), `${filename} name`);
    assert.ok(svg.includes(`data-prototype-id="${id}"`), `${filename} prototype id`);
    assert.ok(svg.includes('data-icon-library="phosphor" data-icon-weight="regular"'), `${filename} variant`);
    assert.ok(svg.includes(`width="${size}" height="${size}" viewBox="0 0 256 256" fill="${fill}"`), `${filename} geometry`);
    const pathData = svg.match(/<path d="([^"]+)"\/>/);
    assert.ok(pathData, `${filename} path`);
    assert.equal(crypto.createHash("sha256").update(pathData[1]).digest("hex"), hash, `${filename} official path`);
    assert.doesNotMatch(svg, /stroke(?:-width)?=/, `${filename} should use filled paths`);
  }
});

test("未登录状态仅显示登录账户按钮", () => {
  assert.match(wxml, /<view class="profile-hero">/);
  assert.match(wxml, /wx:else[\s\S]*?class="profile-avatar-image profile-avatar-image--guest"[\s\S]*?src="\/images\/profile-guest-avatar\.png"/);
  assert.match(wxml, /: '神秘用户'/);
  assert.match(wxml, /<view wx:if="{{!hasUser}}" class="profile-menu-row" bindtap="startRegister"[^>]*aria-label="登录账户">/);
  assert.match(wxml, /wx:if="{{hasUser}}"[\s\S]*?bindtap="onProfileEditTap"/);
  assert.match(wxml, /<view wx:if="{{hasUser}}" class="profile-menu-row profile-menu-row--access" bindtap="onAccessTap" aria-role="button" aria-label="{{isGuest \? '获取权限' : '删除权限'}}">/);
  assert.match(wxml, /src="{{isGuest \? '\/images\/profile-icon-lock-keyhole\.svg' : '\/images\/profile-icon-lock-keyhole-danger\.svg'}}"/);
  assert.match(wxml, /class="profile-menu-label {{isGuest \? '' : 'profile-menu-label--danger'}}">{{isGuest \? '获取权限' : '删除权限'}}<\/text>/);
  assert.match(wxml, /<view wx:if="{{hasUser}}" class="profile-menu-row" bindtap="logout"/);
});

test("我的页菜单遵循原型文本、字重和仅退出项分隔的布局", () => {
  assert.doesNotMatch(wxml, /class="profile-navbar-title">我的<\/text>/);
  assert.doesNotMatch(wxml, /游客账号|公会 ID|已获取访问权限/);
  assert.match(wxml, /<text class="profile-subtitle">{{hasUser \? user\.subtitle : '非常神秘的一位伙伴'}}<\/text>/);
  assert.doesNotMatch(wxml, /Joined in 2026/);
  assert.match(wxss, /\.profile-menu-row\s*\{[^}]*gap:\s*23\.07692rpx\s*;/);
  assert.match(wxss, /\.profile-menu-label\s*\{[^}]*font-weight:\s*400\s*;/);
  assert.match(wxss, /\.profile-menu-label--danger,\s*\.profile-menu-label--logout\s*\{[^}]*color:\s*#e5484d\s*;/);
  assert.doesNotMatch(wxss, /\.profile-menu-row \+ \.profile-menu-row/);
  assert.match(wxss, /\.profile-menu-row--access\s*\{[^}]*border-top:/);
  assert.doesNotMatch(wxss, /\.profile-menu-row--logout\s*\{[^}]*border-top:/);
});
