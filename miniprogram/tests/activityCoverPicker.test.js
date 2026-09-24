const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

const pickerJs = read("components/activity-cover-picker-sheet/index.js");
const pickerHostWxml = read("components/activity-cover-picker-sheet/index.wxml");
const pickerWxml = read("components/activity-cover-picker-sheet/surface.wxml");
const previewWxml = read("components/activity-cover-picker-sheet/preview.wxml");
const previewPageJs = read("pages/activity_cover_preview/activity_cover_preview.js");
const previewPageWxml = read("pages/activity_cover_preview/activity_cover_preview.wxml");
const previewPageWxss = read("pages/activity_cover_preview/activity_cover_preview.wxss");
const previewPageJson = JSON.parse(read("pages/activity_cover_preview/activity_cover_preview.json"));
const appJson = JSON.parse(read("app.json"));
const pickerWxss = read("components/activity-cover-picker-sheet/index.wxss");
const editWxml = read("pages/activity_edit/activity_edit.wxml");
const editWxss = read("pages/activity_edit/activity_edit.wxss");
const editJs = read("pages/activity_edit/activity_edit.js");
const formWxml = read("components/activity-form-sheet/surface.wxml");
const formLogic = read("utils/activityForm.js");
const requestService = read("services/activity.js");

assert(pickerWxml.includes('type="list" scroll-y'));
assert(pickerWxml.includes('type="list" scroll-x'));
assert(pickerWxml.includes('enable-flex="{{true}}"'));
assert(pickerWxml.includes('mode="aspectFill"'));
assert(pickerWxml.includes('fade-in="{{true}}"'));
assert(pickerWxml.includes('wx:for="{{skeletonGroups}}"'));
assert(pickerWxml.includes('wx:for="{{skeletonCards}}"'));
assert(pickerWxml.includes('style="animation-delay: {{artwork.enterDelayMs}}ms;"'));
assert(pickerWxss.includes("@keyframes cover-skeleton-shimmer"));
assert(pickerWxss.includes("animation-name: cover-skeleton-shimmer"));
assert(pickerWxss.includes("animation-iteration-count: infinite"));
assert(!pickerWxss.includes("cover-skeleton-pulse"));
assert(!/\.cover-sheet-skeleton-list\s*\{[^}]*animation-/s.test(pickerWxss));
assert((pickerWxml.match(/class="cover-skeleton-shimmer"/g) || []).length === 1);
assert(/\.cover-skeleton-block\s*\{[^}]*position:\s*relative;[^}]*overflow:\s*hidden;[^}]*background-color:\s*#eaecef;[^}]*\}/s.test(pickerWxss));
assert(!/\.cover-skeleton-block\s*\{[^}]*animation-/s.test(pickerWxss));
const skeletonShimmerRule = pickerWxss.match(/\.cover-skeleton-shimmer\s*\{([^}]*)\}/s)?.[1] || "";
assert(skeletonShimmerRule.includes("position: absolute"));
assert(skeletonShimmerRule.includes("width: 72%"));
assert(skeletonShimmerRule.includes("rgba(248, 249, 251, 0.52) 42%"));
assert(skeletonShimmerRule.includes("rgba(248, 249, 251, 0.52) 58%"));
assert(skeletonShimmerRule.includes("transform: translateX(-100%)"));
assert(skeletonShimmerRule.includes("animation-name: cover-skeleton-shimmer"));
assert(skeletonShimmerRule.includes("animation-duration: 1800ms"));
assert(skeletonShimmerRule.includes("animation-timing-function: linear"));
assert(/@keyframes cover-skeleton-shimmer\s*\{\s*from\s*\{\s*transform:\s*translateX\(-100%\);\s*\}\s*to\s*\{\s*transform:\s*translateX\(150%\);\s*\}\s*\}/s.test(pickerWxss));
assert(!/@keyframes cover-skeleton-shimmer\s*\{[^}]*opacity:/s.test(pickerWxss));
assert(pickerWxss.includes("@keyframes cover-artwork-enter"));
assert(pickerWxss.includes("animation-name: cover-artwork-enter"));
assert(pickerWxss.includes("animation-duration: 560ms"));
assert(pickerJs.includes("enterDelayMs: artworkIndex * 200"));
assert(pickerWxss.includes("width: 169.23rpx"));
assert(pickerWxss.includes("height: 296.15rpx"));
assert(/\.cover-sheet-skeleton-list\s*\{[\s\S]*?padding:\s*0 30\.77rpx;/.test(pickerWxss));
assert(pickerWxml.includes("cover-sheet-confirm--disabled"));
assert(pickerWxss.includes("width: 296.15rpx"));
assert(pickerWxss.includes("border-radius: 42.31rpx 42.31rpx 0 0"));
assert(pickerWxss.includes("border-width: 3.85rpx"));
assert(read("images/icon-cover-preview-search.svg").includes("fill-opacity=\".8\""));
assert(pickerWxss.includes("margin-top: 23.08rpx"));
assert(pickerWxss.includes("margin-bottom: 23.08rpx"));
assert(pickerWxss.includes("padding: 11.54rpx 38.46rpx 57.69rpx"));
assert(pickerWxss.includes("justify-content: center"));
assert(pickerWxml.includes('<view class="cover-sheet-confirm {{'));
assert(pickerWxml.includes('<text class="cover-sheet-confirm-label">确定</text>'));
assert(previewWxml.includes('<view class="cover-preview-confirm"'));
assert(!pickerWxml.includes('<button class="cover-sheet-confirm"'));
assert(!previewWxml.includes('<button class="cover-preview-confirm"'));
assert(pickerWxss.includes(".cover-sheet-confirm-label"));
assert(/\.cover-sheet-confirm-label\s*\{[\s\S]*?color:\s*#ffffff;/.test(pickerWxss));
assert(/\.cover-sheet-confirm--disabled \.cover-sheet-confirm-label\s*\{[\s\S]*?color:\s*#ffffff;/.test(pickerWxss));
assert(/\.cover-sheet-confirm\s*\{[\s\S]*?display:\s*flex;[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;/.test(pickerWxss));
assert(!pickerHostWxml.includes("cover-sheet-embedded-root--suspended"));
assert(pickerHostWxml.includes('show="{{containerVisible}}"'));
assert(pickerHostWxml.includes('overlay-style="background: #00000066;"'));
assert(pickerWxss.includes('background: #00000066;'));
assert(pickerWxml.includes("/images/icon-cover-selected.svg"));
assert(pickerWxss.includes('background: #b8bec8;'));
assert(pickerWxss.includes('box-shadow: 0 3.85rpx 15.38rpx rgba(0, 0, 0, 0.05);'));
assert(editWxml.includes('activity-cover-picker-sheet embedded="{{true}}" visible="{{coverPickerVisible}}"'));
assert(/<view class="edit-cover-picker-host [^"\n]*">\s*<activity-cover-picker-sheet embedded="\{\{true\}\}" visible="\{\{coverPickerVisible\}\}"/.test(editWxml));
assert(/\.edit-cover-picker-host\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*21;[^}]*top:\s*0;[^}]*right:\s*0;[^}]*bottom:\s*0;[^}]*left:\s*0;[^}]*pointer-events:\s*none;/.test(editWxss));
assert(/\.edit-cover-picker-host--visible\s*\{[^}]*pointer-events:\s*auto;/.test(editWxss));
assert(editWxml.includes('bindclose="closeCoverPicker"'));
assert(editWxml.includes('bindconfirm="confirmCoverPicker"'));
assert(editJs.includes('openCoverPicker()'));
assert(editJs.includes('confirmCoverPicker(e)'));
assert(!pickerHostWxml.includes("previewVisible"));
assert(read("images/icon-cover-preview-search.svg").includes("<circle"));
assert(read("images/icon-cover-selected.svg").includes("<circle"));
assert(pickerWxml.includes("/images/icon-cover-preview-search.svg"));
assert(!pickerWxml.includes("cover-artist-avatar-image"));
assert(pickerWxss.includes("left: 15.38rpx"));
assert(previewWxml.includes("左右滑动查看其他封面"));
assert(previewWxml.includes("{{previewArtwork.artistName}}"));
assert(pickerWxml.includes("<open-container"));
assert(pickerWxml.includes('closed-border-radius="12"'));
assert(pickerWxml.includes('open-border-radius="0"'));
assert(pickerWxml.includes('transition-duration="{{previewTransitionDuration}}"'));
assert(pickerWxml.includes('<view class="cover-artwork-border"></view>'));
assert(pickerWxss.includes("overflow: visible"));
assert(pickerWxss.includes(".cover-artwork--selected .cover-artwork-border"));
assert(pickerJs.includes("withOpenContainer"));
assert(pickerJs.includes("previewTransitionDuration: 360"));
assert(pickerJs.includes("disableActivityCoverPreviewReturnTransition"));
assert(pickerJs.includes("this.setData({ previewTransitionDuration: 0 })"));
assert(pickerJs.includes("setActivityCoverPreviewSession"));
assert(previewPageJson.renderer === "skyline");
assert(previewPageJson.navigationStyle === "custom");
assert(previewPageWxml.includes("activity-cover-picker-sheet/preview.wxml"));
assert(appJson.pages.includes("pages/activity_cover_preview/activity_cover_preview"));
assert(previewWxml.includes("<swiper"));
assert(previewWxml.includes('circular="{{previewArtist.artworks.length > 1}}"'));
assert((previewWxml.match(/wx:if="{{previewArtist\.artworks\.length > 1}}"/g) || []).length === 2);
assert(previewWxml.includes("设为活动封面"));
assert(previewWxml.includes("/images/icon-cover-preview-chevron-left.svg"));
assert(previewWxml.includes("/images/icon-cover-preview-chevron-right.svg"));
assert(previewWxml.includes("/images/icon-cover-preview-circle-check.svg"));
assert(previewWxml.includes("/images/activity-detail-chevron-left.svg"));
assert(previewWxml.includes('padding-top: {{previewStatusBarHeightPx}}px'));
assert(previewWxml.includes('height: {{previewTitleBarHeightPx}}px'));
assert(previewWxml.includes('top: calc({{previewNavBarHeightPx}}px + 23.08rpx)'));
assert(!previewWxml.includes('/images/icon-check.svg'));
assert(!previewWxml.includes('<text class="cover-preview-back">‹</text>'));
assert(!previewWxml.includes("<text>‹</text>"));
assert(!previewWxml.includes("<text>›</text>"));
assert(pickerWxss.includes("cover-preview-arrow-icon { width: 38.46rpx; height: 38.46rpx"));
assert(/\.cover-preview-arrow\s*\{[\s\S]*?top:\s*503\.85rpx;[\s\S]*?width:\s*76\.92rpx;[\s\S]*?height:\s*76\.92rpx;[\s\S]*?border-radius:\s*38\.46rpx;/.test(pickerWxss));
assert(pickerWxss.includes("font-size: 38.46rpx"));
assert(pickerWxss.includes("line-height: 53.85rpx"));
assert(pickerWxss.includes("font-weight: 700"));
assert(pickerWxss.includes("bottom: 345.15rpx"));
assert(!pickerWxss.includes(".cover-preview-info::before"));
assert(previewPageJs.includes("getPreviewNavigationMetrics"));
assert(previewPageJs.includes("wx.getMenuButtonBoundingClientRect"));
assert(pickerWxss.includes("top: 146.15rpx"));
assert(pickerWxss.includes("right: 38.46rpx"));
assert(pickerWxss.includes("left: 38.46rpx"));
assert(pickerWxss.includes("width: auto"));
assert(pickerWxss.includes("border-top: 0"));
assert(pickerWxss.includes("box-shadow: none"));
assert(pickerWxss.includes("height: 73.08rpx"));
assert(previewPageWxss.includes("right: 38.46rpx"));
assert(previewPageWxss.includes("width: auto"));
assert(previewPageWxss.includes("bottom: 345.15rpx"));
assert(previewPageWxss.includes("box-shadow: none"));
assert(!previewPageWxss.includes(".cover-preview-confirm::after"));
assert(previewPageJs.includes("onPreviewChange"));
assert(previewPageJs.includes("RETURN_TRANSITION_COMMIT_MS = 34"));
assert(previewPageJs.includes("closeWithoutReturnTransition"));
assert(previewPageJs.includes('emit("disableActivityCoverPreviewReturnTransition")'));
assert(previewPageJs.includes("wrapPreviewIndex(this.data.previewArtworkIndex + delta, artist.artworks.length)"));
assert(previewPageJs.includes('emit("selectActivityCover", artwork)'));
assert(formWxml.includes("活动封面"));
assert(!formWxml.includes("活动类型"));
assert(formLogic.includes("activity_cover_id"));
assert(!formLogic.includes("payload.activity_type"));
assert(requestService.includes("apiVersion: 2"));

const previousComponent = global.Component;
global.Component = () => {};
const { normalizeCatalog } = require("../components/activity-cover-picker-sheet/index.js");
global.Component = previousComponent;
const groups = normalizeCatalog([
  { slug: "artist-a", display_name: "A", avatar_url: "a.png", artworks: [
    { id: "cover-1", categories: ["电影"], thumbnail_url: "1-thumb", image_url: "1-full" },
    { id: "cover-2", categories: ["派对"], thumbnail_url: "2-thumb", image_url: "2-full" }
  ] },
  { slug: "artist-b", display_name: "B", avatar_url: "b.png", artworks: [
    { id: "cover-3", categories: ["电影"], thumbnail_url: "3-thumb", image_url: "3-full" },
    { id: "retired", categories: ["弃用"], thumbnail_url: "4-thumb", image_url: "4-full" }
  ] }
]);
assert.deepStrictEqual(groups.map((group) => group.displayName), ["派对", "电影"]);
assert.deepStrictEqual(groups[1].artworks.map((artwork) => artwork.artistName), ["A", "B"]);
assert.deepStrictEqual(groups[1].artworks.map((artwork) => artwork.id), ["cover-1", "cover-3"]);
assert.deepStrictEqual(normalizeCatalog(groups).map((group) => group.displayName), ["派对", "电影"]);

const previousPage = global.Page;
let previewPageConfig;
global.Page = (config) => { previewPageConfig = config; };
require("../pages/activity_cover_preview/activity_cover_preview.js");
global.Page = previousPage;
const previewContext = {
  data: { previewArtist: groups[1], previewArtworkIndex: 0, previewArtwork: groups[1].artworks[0] },
  setData(patch, callback) { Object.assign(this.data, patch); if (callback) callback(); },
  _preparePreviewImages() {}
};
previewPageConfig.onPreviewChange.call(previewContext, { detail: { current: 1 } });
assert.strictEqual(previewContext.data.previewArtwork.artistName, "B");
assert.strictEqual(previewContext.data.previewArtworkIndex, 1);
assert(previewWxml.includes('src="{{previewArtwork.displayAvatarUrl}}"'));
assert(!previewWxml.includes('src="{{previewArtist.displayAvatarUrl}}"'));

console.log("activity cover picker tests passed");
