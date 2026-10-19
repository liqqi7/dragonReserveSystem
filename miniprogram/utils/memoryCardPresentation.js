// Only the measured thumbnail window participates; no persistent media cache.
const COVER_CONCURRENCY = 3;
const REVEAL_INTERVAL_MS = 60;

function createMemoryCardPresentation(page, prepare) {
  let states = new Map(), urls = [], windowDirty = true;
  const active = new Map();
  let revealTimer, shimmer, fetching = false, disposed = false, paused = false;
  const alive = () => !disposed && !paused && !page._unloaded && !page._imagesHidden;
  const stopTimers = () => {
    for (const timer of active.values()) clearTimeout(timer);
    active.clear();
    clearTimeout(revealTimer); clearTimeout(shimmer);
    revealTimer = shimmer = null;
  };
  const pending = () => fetching || urls.some(url => !states.get(url)?.ready && !states.get(url)?.failed);
  const animate = () => {
    if (!alive()) return;
    if (!pending()) {
      clearTimeout(shimmer); shimmer = null;
      if (page.data.skeletonShimmerRunning) page.setData({skeletonShimmerRunning: false});
      return;
    }
    if (shimmer) return;
    const tick = () => {
      shimmer = null;
      if (!alive() || !pending()) {animate(); return;}
      const running = !page.data.skeletonShimmerRunning;
      page.setData({skeletonShimmerRunning: running});
      shimmer = setTimeout(tick, running ? 1500 : 100);
    };
    // Give the native skeleton its initial frame before starting the sweep.
    shimmer = setTimeout(tick, 32);
  };
  const publish = () => {
    if (!alive()) return;
    page.setData({coverStates: Object.fromEntries(states)});
    prepare(urls.filter(url => states.get(url)?.loaded || states.get(url)?.ready || active.has(url)));
    animate();
  };
  const pump = () => {
    if (!alive()) return;
    for (const url of urls) {
      if (active.size >= COVER_CONCURRENCY) break;
      const state = states.get(url);
      if (state?.ready || state?.loaded || state?.failed || active.has(url)) continue;
      const token = page._memoryCoverAttempt = (page._memoryCoverAttempt || 0) + 1;
      states.set(url, {token, loaded: false, ready: false, failed: false});
      active.set(url, setTimeout(() => settle(url, token, false), 15000));
    }
  };
  const reveal = () => {
    if (!alive() || revealTimer) return;
    const url = urls.find(url => !states.get(url)?.ready && !states.get(url)?.failed);
    const state = states.get(url);
    if (!state?.loaded) return;
    states.set(url, {...state, ready: true});
    // This timer gates only presentation; downloads refill immediately in settle().
    revealTimer = setTimeout(() => {
      revealTimer = null;
      if (!alive()) return;
      reveal(); publish();
    }, REVEAL_INTERVAL_MS);
  };
  const settle = (url, token, ready) => {
    if (!alive() || !active.has(url) || states.get(url)?.token !== token) return;
    clearTimeout(active.get(url)); active.delete(url);
    states.set(url, {token, loaded: ready, ready: false, failed: !ready});
    pump(); reveal(); publish();
  };
  return {
    window(values) {
      if (!alive()) return;
      const next = [...new Set(values.filter(Boolean))].slice(0, 24);
      if (!windowDirty && next.length === urls.length && next.every((url, index) => url === urls[index])) return;
      urls = next; windowDirty = false;
      states = new Map(urls.map(url => [url, states.get(url) || {ready: false, failed: false}]));
      for (const [url, timer] of active) if (!states.has(url)) {clearTimeout(timer); active.delete(url);}
      pump(); reveal(); publish();
    },
    fetching(value) {fetching = value; animate();},
    pause() {
      if (disposed) return [];
      paused = true; windowDirty = true; stopTimers();
      // Invalidate unfinished native callbacks but retain decoded covers in place.
      states = new Map([...states].map(([url, state]) => [url,
        state.loaded || state.ready || state.failed ? state : {ready: false, failed: false}]));
      if (!page._unloaded) page.setData({coverStates: Object.fromEntries(states), skeletonShimmerRunning: false});
      return urls.filter(url => states.get(url)?.loaded || states.get(url)?.ready);
    },
    resume() {if (!disposed) {paused = false; animate();}},
    loaded(url, token) {settle(url, token, true);},
    failed(url, token = states.get(url)?.token) {
      const state = states.get(url);
      if (alive() && (state?.loaded || state?.ready) && state.token === token) {
        states.set(url, {token, loaded: false, ready: false, failed: true});
        pump(); reveal(); publish();
      } else settle(url, token, false);
    },
    retry(url) {
      if (!alive() || !states.get(url)?.failed) return;
      states.set(url, {ready: false, failed: false}); pump(); reveal(); publish();
    },
    dispose() {
      disposed = true;
      stopTimers();
      states.clear(); urls = [];
      if (!page._unloaded) page.setData({coverStates: {}, skeletonShimmerRunning: false});
    },
  };
}
function masonryColumns(items, gap = 0) {
  const columns = [{id: 0, items: []}, {id: 1, items: []}], heights = [0, 0];
  for (const item of items) {
    const column = heights[0] <= heights[1] ? 0 : 1;
    columns[column].items.push(item);
    heights[column] += (Number(item.coverHeight) || 0) + gap;
  }
  return columns;
}
module.exports = {createMemoryCardPresentation, masonryColumns};
