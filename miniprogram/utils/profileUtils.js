/**
 * Shared profile validation helpers.
 * Centralised here to avoid duplication across activity_detail, profile, and app.
 */

function isDefaultNickname(nickname) {
  const nn = String(nickname || "").trim();
  return !nn || nn === "微信用户";
}

function isDefaultAvatar(avatarUrl) {
  const avatar = String(avatarUrl || "").trim();
  return (
    !avatar ||
    avatar.includes("thirdwx.qlogo.cn/mmopen/vi_32") ||
    avatar.includes("/0") ||
    avatar.endsWith("/0") ||
    avatar.endsWith("/132") ||
    avatar.startsWith("https://thirdwx.qlogo.cn/mmopen/")
  );
}

module.exports = { isDefaultNickname, isDefaultAvatar };
