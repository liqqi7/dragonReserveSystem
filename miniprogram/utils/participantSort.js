/** 解析后端 activity participant 的 created_at（报名时间 ISO 字符串）为毫秒时间戳。 */
function parseCreatedAtMs(raw) {
  if (raw == null || raw === "") return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * 按报名时间升序排列（最早在前），保证 avatarList.slice(-3) 为「最近报名的 3 人」。
 * 与详情/列表大卡 TL(最大)=最新、TR=次新、Mid=第三新 的索引约定一致。
 */
function orderParticipantsForRecentAvatarSlice(participants) {
  const arr = participants || [];
  return arr
    .map((p, idx) => ({ p, idx }))
    .sort((a, b) => {
      const ta = typeof a.p === "object" && a.p ? a.p.signedUpAtMs || 0 : 0;
      const tb = typeof b.p === "object" && b.p ? b.p.signedUpAtMs || 0 : 0;
      if (ta !== tb) return ta - tb;
      const ida = typeof a.p === "object" && a.p && a.p.id != null ? Number(a.p.id) : 0;
      const idb = typeof b.p === "object" && b.p && b.p.id != null ? Number(b.p.id) : 0;
      if (ida !== idb) return ida - idb;
      return a.idx - b.idx;
    })
    .map((x) => x.p);
}

/**
 * 详情「参与人」抽屉：按报名时间倒序（最近在最上）。
 */
function orderParticipantsForDrawerRecentFirst(participants) {
  const arr = participants || [];
  return arr
    .map((p, idx) => ({ p, idx }))
    .sort((a, b) => {
      const ta = typeof a.p === "object" && a.p ? a.p.signedUpAtMs || 0 : 0;
      const tb = typeof b.p === "object" && b.p ? b.p.signedUpAtMs || 0 : 0;
      if (tb !== ta) return tb - ta;
      const ida = typeof a.p === "object" && a.p && a.p.id != null ? Number(a.p.id) : 0;
      const idb = typeof b.p === "object" && b.p && b.p.id != null ? Number(b.p.id) : 0;
      if (idb !== ida) return idb - ida;
      return a.idx - b.idx;
    })
    .map((x) => x.p);
}

module.exports = {
  parseCreatedAtMs,
  orderParticipantsForRecentAvatarSlice,
  orderParticipantsForDrawerRecentFirst
};
