const test = require("node:test");
const assert = require("node:assert/strict");
const {
  rankActivityCoverImages,
  rankActivityCoverPreviewImages
} = require("../utils/activityCoverImagePriority");

function artist(slug, count) {
  return {
    slug,
    artworks: Array.from({ length: count }, (_, index) => ({
      id: `${slug}-${index}`,
      imageUrl: `https://example.com/${slug}-${index}.jpg`
    }))
  };
}

test("cover picker seeds the initial viewport before native visibility is known", () => {
  const ranked = rankActivityCoverImages({ artists: [artist("a", 5), artist("b", 5), artist("c", 5), artist("d", 5)] });
  const foreground = ranked.filter((item) => item.priority === 0);
  assert.deepEqual(foreground.map((item) => item.id), [
    "a-0", "a-1", "a-2",
    "b-0", "b-1", "b-2",
    "c-0", "c-1", "c-2"
  ]);
  assert.equal(ranked.find((item) => item.id === "a-3").priority, 1);
  assert.equal(ranked.find((item) => item.id === "d-0").priority, 2);
});

test("visible cover images outrank neighbours and offscreen artwork", () => {
  const ranked = rankActivityCoverImages({
    artists: [artist("a", 5), artist("b", 3)],
    visibleIds: new Set(["a-2", "b-0"]),
    visibilityKnown: true
  });
  assert.deepEqual(ranked.filter((item) => item.priority === 0).map((item) => item.id), ["a-2", "b-0"]);
  assert.deepEqual(ranked.filter((item) => item.priority === 1).map((item) => item.id), ["a-1", "a-3", "b-1"]);
  assert.equal(ranked.at(-1).priority, 2);
});

test("preview loads current artwork before circular neighbours", () => {
  const artworks = artist("a", 5).artworks;
  const ranked = rankActivityCoverPreviewImages(artworks, 4);
  assert.deepEqual(ranked.map((item) => item.index), [4, 0, 3, 1, 2]);
});
