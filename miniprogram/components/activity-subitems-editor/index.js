const ACTION_OFFSET_RPX = 138.46;
const ACTION_AREA_WIDTH_RPX = 130.77;
const SWIPE_OPEN_THRESHOLD_RATIO = 0.25;
const SWIPE_CLOSE_THRESHOLD_RATIO = 0.15;
const INSERT_ANIMATION_MS = 280;
const CONTENT_ENTER_ANIMATION_MS = 360;
const CONTENT_EXIT_ANIMATION_MS = 360;
const ITEM_REMOVE_ANIMATION_MS = 220;

function getRpxPerPx() {
  try {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const width = Number(info && info.windowWidth);
    return width > 0 ? 750 / width : 750 / 390;
  } catch (error) {
    return 750 / 390;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getSwipeSettledState(startOffsetX, endOffsetX) {
  const startedOpen = Number(startOffsetX) < 0;
  const movedRightRpx = Number(endOffsetX) - Number(startOffsetX);
  const actionOpen = startedOpen
    ? movedRightRpx < ACTION_OFFSET_RPX * SWIPE_CLOSE_THRESHOLD_RATIO
    : Math.abs(Number(endOffsetX) || 0) >= ACTION_OFFSET_RPX * SWIPE_OPEN_THRESHOLD_RATIO;
  return {
    offsetX: actionOpen ? -ACTION_OFFSET_RPX : 0,
    actionOpen
  };
}

function rowKey(item, index) {
  return item && item.id != null && item.id !== "" ? `subitem-${item.id}` : `subitem-new-${index}`;
}

function getQuota(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? clamp(numeric, 1, 999) : 12;
}

Component({
  properties: {
    enabled: { type: Boolean, value: false },
    items: { type: Array, value: [] },
    locked: { type: Boolean, value: false },
    maxParticipants: { type: Number, value: 12 }
  },

  data: {
    rowStates: [],
    insertingIndex: -1,
    contentEntering: false,
    contentLeaving: false,
    renderContent: false,
    removingIndex: -1
  },
  observers: {
    enabled(enabled) {
      const wasEnabled = this._lastEnabled;
      this._lastEnabled = enabled;
      if (enabled) {
        clearTimeout(this._contentExitTimer);
        this._contentExitTimer = null;
        this.setData({ renderContent: true, contentLeaving: false });
        if (wasEnabled !== false) return;
        this.setData({ contentEntering: true });
        clearTimeout(this._contentEnterTimer);
        this._contentEnterTimer = setTimeout(() => {
          this._contentEnterTimer = null;
          this.setData({ contentEntering: false });
        }, CONTENT_ENTER_ANIMATION_MS);
        return;
      }
      clearTimeout(this._contentEnterTimer);
      this._contentEnterTimer = null;
      if (!this.data.renderContent || this.data.contentLeaving) return;
      this.setData({ contentLeaving: true });
      this._contentExitTimer = setTimeout(() => {
        this._contentExitTimer = null;
        this.setData({ renderContent: false, contentLeaving: false });
      }, CONTENT_EXIT_ANIMATION_MS);
    },
    items(items) {
      const previous = Array.isArray(this.data.rowStates) ? this.data.rowStates : [];
      const next = (Array.isArray(items) ? items : []).map((item, index) => {
        const key = rowKey(item, index);
        const prior = previous.find(row => row.key === key);
        return prior || { key, offsetX: 0, actionOpen: false };
      });
      this.setData({ rowStates: next });
    }
  },

  lifetimes: {
    attached() {
      this._lastEnabled = this.properties.enabled;
      const items = Array.isArray(this.properties.items) ? this.properties.items : [];
      this.setData({
        renderContent: Boolean(this.properties.enabled),
        contentLeaving: false,
        contentEntering: false,
        removingIndex: -1,
        rowStates: items.map((item, index) => ({ key: rowKey(item, index), offsetX: 0, actionOpen: false }))
      });
    },
    detached() {
      clearTimeout(this._insertTimer);
      clearTimeout(this._contentEnterTimer);
      clearTimeout(this._contentExitTimer);
      clearTimeout(this._removeTimer);
      this._gesture = null;
    }
  },

  methods: {
    emit(items, enabled = this.properties.enabled) {
      this.triggerEvent("change", { items, enabled });
    },

    toggleTap() {
      this.toggle({ detail: { value: !this.properties.enabled } });
    },

    toggle(e) {
      const enabled = e.detail.value;
      if (this.properties.locked) {
        wx.showToast({ title: "已有报名，不能切换项目模式", icon: "none" });
        return;
      }
      const quota = getQuota(this.properties.maxParticipants);
      const items = this.properties.items.length
        ? this.properties.items
        : [{ name: "", max_participants: Math.min(12, quota) }];
      if (!enabled && this.properties.enabled) {
        if (this._contentExitTimer) return;
        this.setData({ contentLeaving: true });
        // The parent layout changes immediately; only the visual content remains mounted
        // long enough to finish its exit animation.
        this.emit(items, false);
        this._contentExitTimer = setTimeout(() => {
          this._contentExitTimer = null;
          this.setData({ renderContent: false, contentLeaving: false });
        }, CONTENT_EXIT_ANIMATION_MS);
        return;
      }
      this.emit(items, enabled);
    },

    add() {
      const items = Array.isArray(this.properties.items) ? this.properties.items : [];
      if (items.length >= 4) return;
      const insertingIndex = items.length;
      const quota = getQuota(this.properties.maxParticipants);
      const nextItems = [...items, { name: "", max_participants: Math.min(12, quota) }];
      this.setData({ insertingIndex }, () => {
        // Paint the inserting row's initial state before mounting the new item data.
        // This keeps Skyline from batching the class change away and makes the fade-in visible.
        this.emit(nextItems);
        clearTimeout(this._insertTimer);
        this._insertTimer = setTimeout(() => {
          this._insertTimer = null;
          this.setData({ insertingIndex: -1 });
        }, INSERT_ANIMATION_MS);
        if (this._insertTimer && typeof this._insertTimer.unref === "function") this._insertTimer.unref();
      });
    },

    input(e) {
      const index = Number(e.currentTarget.dataset.index);
      const items = this.properties.items.map(item => ({ ...item }));
      items[index].name = e.detail.value;
      this.emit(items);
    },

    step(e) {
      const index = Number(e.currentTarget.dataset.index);
      const items = this.properties.items.map(item => ({ ...item }));
      const item = items[index];
      const quota = getQuota(this.properties.maxParticipants);
      const currentParticipants = Number(item.current_participants || 0);
      const currentCapacity = Number(item.max_participants);
      item.max_participants = Math.max(
        1,
        Math.min(quota, currentParticipants),
        Math.min(quota, (Number.isFinite(currentCapacity) ? currentCapacity : 1) + Number(e.currentTarget.dataset.delta))
      );
      this.emit(items);
    },

    getRowStates() {
      const items = Array.isArray(this.properties.items) ? this.properties.items : [];
      const states = Array.isArray(this.data.rowStates) ? this.data.rowStates.slice() : [];
      while (states.length < items.length) {
        const index = states.length;
        states.push({ key: rowKey(items[index], index), offsetX: 0, actionOpen: false });
      }
      return states.slice(0, items.length);
    },

    startSwipe(e) {
      const index = Number(e.currentTarget.dataset.index);
      const touch = e.touches && e.touches[0];
      if (!Number.isFinite(index) || !touch) return;
      const states = this.getRowStates();
      const row = states[index];
      if (!row) return;
      this.closeOpenRows(index);
      this._gesture = {
        index,
        startX: touch.clientX,
        startY: touch.clientY,
        startOffsetX: row.offsetX || 0,
        horizontal: null
      };
    },

    moveSwipe(e) {
      const gesture = this._gesture;
      const touch = e.touches && e.touches[0];
      if (!gesture || !touch) return;
      const dx = touch.clientX - gesture.startX;
      const dy = touch.clientY - gesture.startY;
      if (gesture.horizontal === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        gesture.horizontal = Math.abs(dx) > Math.abs(dy);
      }
      if (!gesture.horizontal) return;
      const next = clamp(gesture.startOffsetX + dx * getRpxPerPx(), -ACTION_OFFSET_RPX, 0);
      gesture.currentOffsetX = next;
      const states = this.getRowStates().map((row, index) => index === gesture.index
        ? { ...row, offsetX: next, actionOpen: Math.abs(next) >= ACTION_OFFSET_RPX * SWIPE_OPEN_THRESHOLD_RATIO }
        : row);
      this.setData({ rowStates: states });
    },

    endSwipe() {
      const gesture = this._gesture;
      this._gesture = null;
      if (!gesture || gesture.horizontal !== true) return;
      const states = this.getRowStates();
      const row = states[gesture.index];
      if (!row) return;
      const endOffsetX = Number.isFinite(gesture.currentOffsetX) ? gesture.currentOffsetX : (row.offsetX || 0);
      const settled = getSwipeSettledState(gesture.startOffsetX, endOffsetX);
      this.setData({
        rowStates: states.map((item, index) => index === gesture.index ? { ...item, ...settled } : item)
      });
    },

    cancelSwipe() {
      this.endSwipe();
    },

    closeOpenRows(exceptIndex) {
      const states = this.getRowStates().map((row, index) => index === exceptIndex
        ? row
        : { ...row, offsetX: 0, actionOpen: false });
      this.setData({ rowStates: states });
    },

    remove(e) {
      const index = Number(e.currentTarget.dataset.index);
      if (this.data.removingIndex >= 0) return;
      if (Number(this.properties.items[index].current_participants) > 0) {
        wx.showToast({ title: "已有报名的子项目不能删除", icon: "none" });
        return;
      }
      this.setData({ removingIndex: index });
      clearTimeout(this._removeTimer);
      this._removeTimer = setTimeout(() => {
        this._removeTimer = null;
        const items = Array.isArray(this.properties.items) ? this.properties.items : [];
        this.emit(items.filter((_, itemIndex) => itemIndex !== index));
        this.setData({ rowStates: [], insertingIndex: -1, removingIndex: -1 });
        this._gesture = null;
      }, ITEM_REMOVE_ANIMATION_MS);
    }
  }
});

if (typeof module !== "undefined") {
  module.exports = {
    ACTION_OFFSET_RPX,
    ACTION_AREA_WIDTH_RPX,
    SWIPE_OPEN_THRESHOLD_RATIO,
    SWIPE_CLOSE_THRESHOLD_RATIO,
    INSERT_ANIMATION_MS,
    CONTENT_ENTER_ANIMATION_MS,
    CONTENT_EXIT_ANIMATION_MS,
    ITEM_REMOVE_ANIMATION_MS,
    clamp,
    getSwipeSettledState
  };
}






