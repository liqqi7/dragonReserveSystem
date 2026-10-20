const {createMediaSession} = require("./memoryMediaSession");

const PREVIEW_TEMP_BYTES = 50 * 1024 * 1024;
const PREVIEW_IDLE_MS = 10 * 60 * 1000;
const SNAPSHOT_BYTES = 128 * 1024;

function createPreviewMediaPool(wxApi = wx, {maxBytes = PREVIEW_TEMP_BYTES,
  idleMs = PREVIEW_IDLE_MS, setTimer = setTimeout, clearTimer = clearTimeout, now = Date.now} = {}) {
  // A single queue also charges failed/pending deletions across account changes.
  const session = createMediaSession(wxApi, {maxBytes, retainCompleted: true, maxFiles: 24});
  const snapshots = new Map(), decoded = new Map();
  const clear = () => {session.clear(); snapshots.clear(); decoded.clear();};
  let scope, active, timer, expiresAt = 0, snapshotVersion;
  return {
    acquire(nextScope, metadataVersion = 0) {
      clearTimer(timer); timer = null;
      session.suspend();
      if (scope !== nextScope || expiresAt && now() >= expiresAt) clear();
      else if (snapshotVersion !== metadataVersion) snapshots.clear();
      snapshotVersion = metadataVersion;
      expiresAt = 0;
      scope = nextScope;
      session.validateFiles();
      const lease = {session,
        photoReady(url) {
          const source = session.source(url);
          return active === lease && !!source && decoded.has(source) && decoded.get(source) === session.identity(url);
        },
        photoLoaded(url, source) {
          if (active !== lease || !source || session.source(url) !== source) return;
          decoded.delete(source); decoded.set(source, session.identity(url));
          if (decoded.size > 24) decoded.delete(decoded.keys().next().value);
        },
        detail(id) {
          if (active !== lease) return null;
          const entry = snapshots.get(id);
          if (!entry || now() - entry.at >= idleMs) {snapshots.delete(id); return null;}
          snapshots.delete(id); snapshots.set(id, entry);
          return JSON.parse(entry.text);
        },
        rememberDetail(value) {
          if (active !== lease) return;
          const text = JSON.stringify(value);
          snapshots.delete(value.id);
          // Conservative UTF-8 bound; these snapshots exist only in this scoped pool.
          if (text.length * 3 > SNAPSHOT_BYTES) return;
          snapshots.set(value.id, {text, at: now()});
          while (snapshots.size > 12 || [...snapshots.values()].reduce((n, entry) => n + entry.text.length * 3, 0) > SNAPSHOT_BYTES)
            snapshots.delete(snapshots.keys().next().value);
        },
        forgetDetail(id) {if (active === lease) snapshots.delete(id);},
      };
      active = lease;
      return active;
    },
    release(lease) {
      if (!lease || lease !== active) return;
      active = null;
      session.suspend();
      expiresAt = now() + idleMs;
      const expiry = setTimer(() => {
        if (timer !== expiry || active) return;
        timer = null; clear();
      }, idleMs);
      timer = expiry;
    },
    dispose() {clearTimer(timer); timer = null; active = null; snapshots.clear(); decoded.clear(); session.dispose();},
  };
}

let pool;
function acquirePreviewMedia(globalData, admin) {
  const {getApiBaseUrl} = require("./config");
  if (!pool) pool = createPreviewMediaPool();
  const scope = JSON.stringify([getApiBaseUrl(), globalData.userId,
    globalData.userRole, !!globalData.isAuthenticated, !!admin]);
  return pool.acquire(scope, globalData.memoryVersion || 0);
}
function releasePreviewMedia(lease) {pool?.release(lease);}

// Identity comes from a fresh authorized response, not from a stripped signed URL.
function bindPreviewResources(page, unchanged = false, currentIndex = page.data.index) {
  const media = page.data.viewerMedia.length ? page.data.viewerMedia : page.data.memory?.media || [];
  const resources = [];
  for (const index of [currentIndex, currentIndex + 1, currentIndex - 1]) {
    const item = media[index], parent = page._reviewQueue?.[index] || page._publicQueue?.[index] || page.data.memory;
    if (!item || !parent) continue;
    const key = `${parent.memory_id || parent.id}:${item.content_version || parent.revision || 0}:${item.id}`;
    for (const [field, variant] of [["url", "display"], ["thumbnail_url", "thumbnail"]]) {
      if (item[field]) resources.push({url: item[field], key: `${key}:${variant}`});
    }
  }
  page._mediaSession?.bindResources(resources, unchanged);
}

module.exports = {createPreviewMediaPool, acquirePreviewMedia, releasePreviewMedia,
  bindPreviewResources, PREVIEW_TEMP_BYTES, PREVIEW_IDLE_MS};
