const ROLE_LABELS = {
  admin: "管理员",
  user: "俱乐部成员",
  guest: "游客"
};

function getProfileSubtitle(role, createdAt) {
  const roleLabel = ROLE_LABELS[String(role || "guest")] || ROLE_LABELS.guest;
  const date = String(createdAt || "");
  const year = date.match(/^(\d{4})/)?.[1] || "";
  return year ? `${roleLabel}  /Joined in ${year}` : roleLabel;
}

module.exports = { getProfileSubtitle };
