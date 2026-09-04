const ACTION_WIDTH_RPX = 323.08;
const ACTION_AREA_WIDTH_RPX = 315.38;
const SWIPE_OPEN_THRESHOLD_RATIO = 0.25;
const DRAWER_MAX_HEIGHT_RATIO = 0.85;
const DEFAULT_MAX_HEIGHT_RPX = 1384.62;

function getMaxHeightRpx() {
  try {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const width = Number(info && info.windowWidth);
    const height = Number(info && info.windowHeight);
    if (width > 0 && height > 0) {
      return Math.round(height * DRAWER_MAX_HEIGHT_RATIO * 750 / width * 100) / 100;
    }
  } catch (error) {
    // Use the design fallback when the runtime metrics are unavailable.
  }
  return DEFAULT_MAX_HEIGHT_RPX;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatCheckinParts(value) {
  if (!value) return { date: "—", time: "—" };
  const raw = String(value).trim();
  const date = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return { date: "—", time: "—" };
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${pad(date.getMonth() + 1)}月${pad(date.getDate())}日`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  };
}

function hasParticipantLimit(maxParticipants) {
  if (maxParticipants === null || maxParticipants === undefined || maxParticipants === "") {
    return false;
  }
  // 后端以 null 表示不限人数；0 不是合法人数上限，兼容旧数据时也按不限人数处理。
  const limit = Number(maxParticipants);
  return Number.isFinite(limit) && limit > 0;
}

function buildProgressView(participantCount, checkinCount, maxParticipants) {
  const participants = Math.max(0, Number(participantCount) || 0);
  const checkedIn = clamp(Number(checkinCount) || 0, 0, participants);
  const hasLimit = hasParticipantLimit(maxParticipants);
  const max = hasLimit ? Math.max(0, Number(maxParticipants) || 0) : null;
  const remaining = Math.max(0, participants - checkedIn);
  return {
    participantCountText: String(participants),
    participantLimitText: hasLimit ? `${max} 人` : "",
    participantHasLimit: hasLimit,
    progressPercent: participants > 0 ? Math.round((checkedIn / participants) * 10000) / 100 : 0,
    progressWidth: `${participants > 0 ? (checkedIn / participants) * 100 : 0}%`,
    progressMessage: participants === 0 ? "暂无成员报名" : (remaining > 0 ? `还有 ${remaining} 人未签到` : "已全部签到")
  };
}

module.exports = {
  ACTION_WIDTH_RPX,
  ACTION_AREA_WIDTH_RPX,
  DRAWER_MAX_HEIGHT_RATIO,
  DEFAULT_MAX_HEIGHT_RPX,
  getMaxHeightRpx,
  SWIPE_OPEN_THRESHOLD_RATIO,
  clamp,
  formatCheckinParts,
  buildProgressView,
  hasParticipantLimit
};
