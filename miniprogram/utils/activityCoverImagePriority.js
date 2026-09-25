const DEFAULT_VISIBLE_ARTISTS = 3;
const DEFAULT_VISIBLE_ARTWORKS = 3;

function normalizeVisibleIds(value) {
  if (value instanceof Set) return value;
  return new Set(Array.isArray(value) ? value.map(String) : []);
}

function rankActivityCoverImages({
  artists = [],
  visibleIds = new Set(),
  visibilityKnown = false,
  visibleArtistCount = DEFAULT_VISIBLE_ARTISTS,
  visibleArtworkCount = DEFAULT_VISIBLE_ARTWORKS
} = {}) {
  const visible = normalizeVisibleIds(visibleIds);
  const rows = [];

  artists.forEach((artist, artistIndex) => {
    const artworks = Array.isArray(artist && artist.artworks) ? artist.artworks : [];
    const visibleIndices = [];
    artworks.forEach((artwork, artworkIndex) => {
      const id = String((artwork && artwork.id) || "");
      if (visible.has(id) || (!visibilityKnown && artistIndex < visibleArtistCount && artworkIndex < visibleArtworkCount)) {
        visibleIndices.push(artworkIndex);
      }
    });

    artworks.forEach((artwork, artworkIndex) => {
      const url = String((artwork && artwork.imageUrl) || "");
      if (!url) return;
      const distance = visibleIndices.length
        ? Math.min(...visibleIndices.map((index) => Math.abs(index - artworkIndex)))
        : Infinity;
      rows.push({
        url,
        id: String((artwork && artwork.id) || ""),
        priority: distance === 0 ? 0 : distance === 1 ? 1 : 2,
        artistIndex,
        artworkIndex,
        distance
      });
    });
  });

  rows.sort((a, b) => a.priority - b.priority
    || a.distance - b.distance
    || a.artistIndex - b.artistIndex
    || a.artworkIndex - b.artworkIndex);

  const seen = new Set();
  return rows.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function rankActivityCoverPreviewImages(artworks = [], currentIndex = 0) {
  const length = artworks.length;
  if (!length) return [];
  const current = ((Number(currentIndex) || 0) % length + length) % length;
  const ranked = artworks.map((artwork, index) => {
    const forward = (index - current + length) % length;
    const backward = (current - index + length) % length;
    return {
      url: String((artwork && artwork.imageUrl) || ""),
      index,
      distance: Math.min(forward, backward),
      directionOrder: forward <= backward ? 0 : 1
    };
  }).filter((item) => item.url);

  ranked.sort((a, b) => a.distance - b.distance
    || a.directionOrder - b.directionOrder
    || a.index - b.index);
  return ranked;
}

module.exports = {
  DEFAULT_VISIBLE_ARTISTS,
  DEFAULT_VISIBLE_ARTWORKS,
  rankActivityCoverImages,
  rankActivityCoverPreviewImages
};
