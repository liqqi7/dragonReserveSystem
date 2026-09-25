function buildActivityShareAppMessageOptions(activity, sharePreviewImageUrl) {
  const id = activity && activity._id;
  const title =
    (activity && activity.name && String(activity.name).trim()) || "俱乐部活动";
  const path = id
    ? `/pages/activity_detail/activity_detail?id=${encodeURIComponent(String(id))}`
    : "/pages/activity_list/activity_list";
  const out = { title, path };
  const preview = sharePreviewImageUrl && String(sharePreviewImageUrl).trim();
  if (preview && (/^https:\/\//i.test(preview) || /^wxfile:\/\//i.test(preview) || /^https?:\/\/tmp\//i.test(preview))) {
    out.imageUrl = preview;
    return out;
  }
  return out;
}

module.exports = {
  buildActivityShareAppMessageOptions
};
