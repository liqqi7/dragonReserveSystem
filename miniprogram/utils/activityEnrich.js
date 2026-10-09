/**
 * Shared activity adaptation for the home and detail pages.
 * Also enriches a single activity with list-style presentation fields.
 */

const { formatDate, formatTime } = require("./dateFormat");

const { parseCreatedAtMs } = require("./participantSort");
const { getMediaUrl, resolveLocalMediaUrl, isLocalTestMediaUrl } = require("../services/config");

const DEFAULT_AVATAR = "/images/default-avatar.svg";
const LOCAL_TEST_AVATAR_PREFIX = "/images/avatars";
const DEFAULT_ACTIVITY_COVER_URL = getMediaUrl("images/card-bg-other-v2-lg.jpg");

function normalizeAvatarUrl(url) {
  const value = (url && String(url).trim()) || "";
  if (!value) return DEFAULT_AVATAR;

  const lower = value.toLowerCase();
  if (lower.includes("example.com/")) return DEFAULT_AVATAR;
  if (value.startsWith("/media/")) {
    const m = value.match(/test-avatar-(\d{2})\.svg$/i);
    return m ? `${LOCAL_TEST_AVATAR_PREFIX}/test-avatar-${m[1]}.svg` : DEFAULT_AVATAR;
  }
  if (value.startsWith("media/")) {
    const m = value.match(/test-avatar-(\d{2})\.svg$/i);
    return m ? `${LOCAL_TEST_AVATAR_PREFIX}/test-avatar-${m[1]}.svg` : DEFAULT_AVATAR;
  }
  if (lower.startsWith("http://")) {
    const resolved = resolveLocalMediaUrl(value);
    return isLocalTestMediaUrl(value) ? resolved : DEFAULT_AVATAR;
  }

  return value;
}

function formatDateTime(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "";
  return `${formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate())} ${formatTime(date.getHours(), date.getMinutes())}`;
}

function adaptParticipant(participant) {
  const name = participant.display_nickname || "";
  return {
    id: participant.id,
    name,
    subItemIds: participant.sub_item_ids || [],
    userId: participant.user_id != null ? String(participant.user_id) : null,
    avatarUrl: normalizeAvatarUrl(participant.display_avatar_url),
    checkedInAt: formatDateTime(participant.checked_in_at),
    checkedInAtRaw: participant.checked_in_at || "",
    checkinLat: participant.checkin_lat,
    checkinLng: participant.checkin_lng,
    checkinLocationName: participant.checkin_location_name || "",
    checkinAddress: participant.checkin_address || "",
    signedUpAtMs: parseCreatedAtMs(participant.created_at)
  };
}

function adaptActivity(item) {
  const participants = (item.participants || []).map(adaptParticipant);
  const startTime = formatDateTime(item.start_time);
  const rawCover = item.activity_cover && typeof item.activity_cover === "object" ? item.activity_cover : null;
  return {
    _id: String(item.id),
    createdBy: item.created_by != null ? String(item.created_by) : "",
    date: startTime.split(" ")[0] || "",
    name: item.name,
    status: item.status || "进行中",
    remark: item.remark || "",
    participants,
    maxParticipants: item.max_participants == null ? null : item.max_participants,
    startTime,
    startTimeRaw: item.start_time,
    endTime: formatDateTime(item.end_time),
    subItems: (item.sub_items || []).map(project => ({ ...project })),
    locationName: item.location_name || "",
    locationAddress: item.location_address || "",
    locationLatitude: item.location_latitude,
    locationLongitude: item.location_longitude,
    signupEnabled: item.signup_enabled !== false,
    activityCoverId: item.activity_cover_id || (rawCover && rawCover.id) || "",
    sharePreviewImageUrl: item.share_preview_image_url || "",
    activityCover: rawCover ? {
      id: String(rawCover.id || ""),
      artistName: String(rawCover.artist_name || ""),
      artistAvatarUrl: String(rawCover.artist_avatar_url || ""),
      thumbnailUrl: String(rawCover.thumbnail_url || ""),
      imageUrl: String(rawCover.image_url || ""),
      largeCardGlassImageUrl: String(rawCover.large_card_glass_image_url || "")
    } : null,
    weather: item.weather && typeof item.weather === "object" ? item.weather : null
  };
}

function enrichSingleActivity(rawItem, myUserId, now = new Date()) {
  const myIdStr = String(myUserId || "").trim();
  const activity = adaptActivity(rawItem);
  const cover = activity.activityCover;
  const imageUrl = (cover && cover.imageUrl) || DEFAULT_ACTIVITY_COVER_URL;
  activity.largeCardBgImageUrl = imageUrl;
  activity.smallCardBgImageUrl = imageUrl;
  activity.largeCardGlassImageUrl = cover && cover.imageUrl ? cover.largeCardGlassImageUrl : "";

  let hasSignedUp = false;
  let hasCheckedIn = false;
  let checkinCount = 0;
  activity.participants.forEach((participant) => {
    const checkedIn = !!participant.checkedInAt;
    if (checkedIn) checkinCount += 1;
    if (myIdStr && participant.userId === myIdStr) {
      hasSignedUp = true;
      if (checkedIn) hasCheckedIn = true;
    }
  });
  activity.hasSignedUp = hasSignedUp;
  activity.hasCheckedIn = hasCheckedIn;
  activity.checkinCount = checkinCount;
  const max = activity.maxParticipants;
  const currentCount = activity.participants.length;
  activity.isFull = max != null && currentCount >= max;

  let isSignupClosed = false;
  if (activity.signupEnabled === false) {
    isSignupClosed = true;
  } else if (activity.startTime) {
    const start = new Date(activity.startTimeRaw || (activity.startTime.replace(" ", "T") + ":00"));
    if (!isNaN(start.getTime())) {
      isSignupClosed = now.getTime() >= start.getTime();
    }
  }
  activity.isSignupClosed = isSignupClosed;

  const parseDateTime = (s) => new Date(s.replace(" ", "T") + ":00");
  const start = activity.startTimeRaw ? new Date(activity.startTimeRaw) : parseDateTime(activity.startTime);
  const end = parseDateTime(activity.endTime);
  let autoStatus = activity.status || "未开始";
  if (["已取消", "已流局"].includes(activity.status)) {
    autoStatus = activity.status;
  } else if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
    if (now.getTime() < start.getTime()) {
      autoStatus = "未开始";
    } else if (now.getTime() < end.getTime()) {
      autoStatus = "进行中";
    } else {
      autoStatus = "已结束";
    }
  }
  if (!["已取消", "已流局"].includes(activity.status)) {
    activity.status = autoStatus;
  }

  const startTimeStr = activity.startTime || (activity.date ? `${activity.date} 00:00` : "");
  activity.activityStarted = startTimeStr
    ? new Date(activity.startTimeRaw || (startTimeStr.replace(" ", "T") + ":00")).getTime() <= now.getTime()
    : false;

  const acceptingLike =
    activity.status === "未开始" &&
    !activity.isSignupClosed &&
    activity.signupEnabled !== false &&
    !activity.isFull;

  if (activity.status === "已取消") {
    activity.detailStatusTag = "已取消";
  } else if (activity.status === "已流局") {
    activity.detailStatusTag = "已流局";
  } else if (activity.status === "已结束") {
    activity.detailStatusTag = "已结束";
  } else if (acceptingLike) {
    activity.detailStatusTag = "报名中";
  } else if (activity.status === "进行中") {
    activity.detailStatusTag = "进行中";
  } else {
    activity.detailStatusTag = "未开始";
  }

  return activity;
}
module.exports = {
  DEFAULT_AVATAR,
  enrichSingleActivity,
  adaptActivity,
  normalizeAvatarUrl
};
