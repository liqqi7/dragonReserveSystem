const SWIPE_OPEN_THRESHOLD_RATIO = 0.25;
const SWIPE_CLOSE_THRESHOLD_RATIO = 0.15;

function getSwipeSettledState(startOffsetX, endOffsetX, actionWidthRpx) {
  const width = Math.max(0, Number(actionWidthRpx) || 0);
  const startedOpen = Number(startOffsetX) < 0;
  const movedRightRpx = Number(endOffsetX) - Number(startOffsetX);
  const actionOpen = startedOpen
    ? movedRightRpx < width * SWIPE_CLOSE_THRESHOLD_RATIO
    : Math.abs(Number(endOffsetX) || 0) >= width * SWIPE_OPEN_THRESHOLD_RATIO;
  return { offsetX: actionOpen ? -width : 0, actionOpen };
}

module.exports = { getSwipeSettledState, SWIPE_OPEN_THRESHOLD_RATIO, SWIPE_CLOSE_THRESHOLD_RATIO };
