/** Rank pending cover work; never cancels active work or changes concurrency. */
const cardVisibilityKey = (group, id) => JSON.stringify([group, String(id)]);
// Inspect the source URL, since byte-preserving disk cache paths end in .bin.
function usesNativeCardGlass(item) {
  const sourcePath = String(item && item.largeCardBgImageUrl || '').split(/[?#]/)[0];
  return /\.gif$/i.test(sourcePath);
}
function getHomeCardGlassUrl(item) {
  return usesNativeCardGlass(item) ? '' : (item && item.largeCardGlassImageUrl || '');
}
function rankHomeCardImages({ groups, focused = {}, visible = new Set(), visibilityKnown = false }) {
  const names = Object.keys(groups).filter(group => groups[group].length);
  const cards = [];
  names.forEach((group, groupOrder) => {
    const list = groups[group];
    const focus = Math.min(list.length - 1, Math.max(0, Number(focused[group]) || 0));
    // Before native visibility arrives, seed the leading rows, not every section.
    const visibleIndices = list.flatMap((item, index) =>
      (visibilityKnown ? visible.has(cardVisibilityKey(group, item._id)) : groupOrder < 2 && index === focus) ? [index] : []);
    list.forEach((item, index) => {
      const distance = visibleIndices.length ? Math.min(...visibleIndices.map(i => Math.abs(i - index))) : Infinity;
      const priority = distance === 0 ? 0 : distance === 1 ? 1 : 2;
      cards.push({ priority, groupOrder, distance: Math.abs(index - focus), index,
        urls: [group === 'joined' ? item.largeCardBgImageUrl : item.smallCardBgImageUrl,
          group === 'joined' ? getHomeCardGlassUrl(item) : ''].filter(Boolean) });
    });
  });
  cards.sort((a, b) => a.priority - b.priority || a.distance - b.distance || a.groupOrder - b.groupOrder || a.index - b.index);
  const seen = new Set(), result = [];
  cards.forEach(card => card.urls.forEach(url => {
    if (!seen.has(url)) { seen.add(url); result.push({ url, priority: card.priority }); }
  }));
  return result;
}
module.exports = { rankHomeCardImages, cardVisibilityKey, usesNativeCardGlass, getHomeCardGlassUrl };
