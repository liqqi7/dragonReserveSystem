/**
 * Shared profile validation helpers.
 * Centralised here to avoid duplication across activity_detail, profile, and app.
 *
 * 报名/资料强制策略（与产品一致）：
 * - 头像：仅当可确认为「默认 / 未设置 / 占位图」时视为不通过；其余一律视为已设置头像，不拦截。
 * - 昵称：空或微信占位名「微信用户」视为不通过（与头像独立）。
 */

function isDefaultNickname(nickname) {
  const nn = String(nickname || "").trim();
  return !nn || nn === "微信用户";
}

/**
 * 是否为「默认头像」——仅在高置信度命中时返回 true。
 * 非默认、或无法可靠判定为默认时返回 false（不拦截）。
 *
 * 注意：微信用户自定义头像也常托管在 thirdwx.qlogo.cn，不可按域名整段拦截。
 */
function isDefaultAvatar(avatarUrl) {
  const avatar = String(avatarUrl || "").trim();
  if (!avatar) return true;

  const lower = avatar.toLowerCase();
  // 小程序内占位图
  if (lower.includes("default-avatar.svg")) return true;
  // 开发占位
  if (lower.includes("example.com/")) return true;

  // 微信 CDN：仅当路径（去 query）末段为 /0 时，按常见规则视为「未上传头像」的默认图
  const pathNoQuery = avatar.split("?")[0] || "";
  if (lower.startsWith("https://thirdwx.qlogo.cn/") || lower.startsWith("http://thirdwx.qlogo.cn/")) {
    return /\/0$/.test(pathNoQuery);
  }

  // 非上述情况（含自建图床、组件临时路径 wxfile、其它 https）一律不视为默认
  return false;
}

module.exports = { isDefaultNickname, isDefaultAvatar };
