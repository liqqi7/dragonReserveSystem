const {
  ACTION_WIDTH_RPX,
  ACTION_AREA_WIDTH_RPX,
  SWIPE_OPEN_THRESHOLD_RATIO,
  clamp,
  formatCheckinParts,
  buildProgressView,
  getMaxHeightRpx
} = require("./logic");

function getRpxPerPx() {
  try {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const width = Number(info && info.windowWidth);
    return width > 0 ? 750 / width : 750 / 390;
  } catch (error) {
    return 750 / 390;
  }
}

Component({
  properties: {
    visible: { type: Boolean, value: false },
    participants: { type: Array, value: [] },
    participantCount: { type: Number, value: 0 },
    checkinCount: { type: Number, value: 0 },
    maxParticipants: { type: Number, value: null },
    isAdmin: { type: Boolean, value: false },
    safeBottomRpx: { type: Number, value: 0 }
  },

  data: {
    rows: [],
    actionWidthRpx: ACTION_AREA_WIDTH_RPX,
    maxHeightRpx: 1384.62,
    bodyMaxHeightRpx: 1253.85,
    participantCountText: "0",
    participantLimitText: "",
    participantHasLimit: false,
    progressWidth: "0%",
    progressMessage: "暂无成员报名"
  },

  observers: {
    participants(value) {
      this.setRows(value);
    },
    isAdmin() {
      this.setRows(this.properties.participants || []);
    },
    "participantCount, checkinCount, maxParticipants"() {
      this.setProgress();
    },
    safeBottomRpx() {
      this.updateHeightConstraints();
    }
  },

  lifetimes: {
    attached() {
      this.updateHeightConstraints();
      this.setRows(this.properties.participants || []);
      this.setProgress();
    }
  },

  methods: {
    updateHeightConstraints() {
      const maxHeightRpx = getMaxHeightRpx();
      const fixedChromeRpx = 130.77;
      const safeBottomRpx = Number(this.properties.safeBottomRpx) || 0;
      this.setData({
        maxHeightRpx,
        bodyMaxHeightRpx: Math.max(0, Math.round((maxHeightRpx - fixedChromeRpx - safeBottomRpx) * 100) / 100)
      });
    },

    setProgress() {
      const progress = buildProgressView(
        this.properties.participantCount,
        this.properties.checkinCount,
        this.properties.maxParticipants
      );
      this.setData(progress);
    },

    setRows(participants) {
      const rows = (Array.isArray(participants) ? participants : []).map((item, index) => {
        const row = item && typeof item === "object" ? item : { name: String(item || "未命名") };
        const checked = !!(row.checkedInAt || row.checkedInAtRaw);
        const parts = formatCheckinParts(row.checkedInAtRaw || row.checkedInAt);
        const checkinLocation = checked
          ? String(row.checkinLocationName || row.checkinAddress || "").trim()
          : "";
        return {
          ...row,
          rowKey: row.rowKey || (row.id != null && row.id !== "" ? `participant-${row.id}` : `participant-${index}`),
          name: row.name || "未命名",
          avatarUrl: row.avatarUrl || "/images/default-avatar.svg",
          hasCheckedIn: checked,
          hasCheckinLocation: Boolean(checkinLocation),
          checkinDateText: checked ? parts.date : "—",
          checkinTimeText: checked ? parts.time : "—",
          checkinLocationText: checkinLocation || "—",
          availableActions: this.properties.isAdmin ? (checked ? ["cancelcheckin", "remove"] : ["retrocheckin", "remove"]) : [],
          offsetX: 0,
          actionOpen: false
        };
      });
      this.setData({ rows });
    },

    onMaskTap() {
      this.triggerEvent("close");
    },

    onTouchStart(e) {
      const index = Number(e.currentTarget.dataset.index);
      const touch = e.touches && e.touches[0];
      if (!Number.isFinite(index) || !touch || !this.properties.isAdmin) return;
      const row = this.data.rows[index];
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

    onTouchMove(e) {
      const gesture = this._gesture;
      const touch = e.touches && e.touches[0];
      if (!gesture || !touch || !this.properties.isAdmin) return;
      const dx = touch.clientX - gesture.startX;
      const dy = touch.clientY - gesture.startY;
      if (gesture.horizontal === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        gesture.horizontal = Math.abs(dx) > Math.abs(dy);
      }
      if (!gesture.horizontal) return;
      const dxRpx = dx * getRpxPerPx();
      const next = clamp(gesture.startOffsetX + dxRpx, -ACTION_WIDTH_RPX, 0);
      // setData is asynchronous in the Mini Program runtime. Keep the latest
      // gesture offset locally so touchend never snaps from stale row data.
      gesture.currentOffsetX = next;
      const rows = this.data.rows.map((row, i) => i === gesture.index
        ? { ...row, offsetX: next, actionOpen: Math.abs(next) >= ACTION_WIDTH_RPX * SWIPE_OPEN_THRESHOLD_RATIO }
        : row);
      this.setData({ rows });
    },

    onTouchEnd() {
      const gesture = this._gesture;
      this._gesture = null;
      if (!gesture || gesture.horizontal !== true || !this.properties.isAdmin) return;
      const row = this.data.rows[gesture.index];
      if (!row) return;
      const endOffsetX = Number.isFinite(gesture.currentOffsetX)
        ? gesture.currentOffsetX
        : (row.offsetX || 0);
      const open = Math.abs(endOffsetX) >= ACTION_WIDTH_RPX * SWIPE_OPEN_THRESHOLD_RATIO;
      const rows = this.data.rows.map((item, index) => index === gesture.index
        ? { ...item, offsetX: open ? -ACTION_WIDTH_RPX : 0, actionOpen: open }
        : item);
      this.setData({ rows });
    },

    onTouchCancel() {
      this.onTouchEnd();
    },

    closeOpenRows(exceptIndex) {
      const rows = this.data.rows.map((row, index) => index === exceptIndex
        ? row
        : { ...row, offsetX: 0, actionOpen: false });
      this.setData({ rows });
    },

    onActionTap(e) {
      const index = Number(e.currentTarget.dataset.index);
      const action = String(e.currentTarget.dataset.action || "");
      const row = this.data.rows[index];
      if (!row || !action || !this.properties.isAdmin) return;
      this.closeOpenRows(index);
      this.triggerEvent(action, { id: row.id, name: row.name, row });
    },

    onCloseTap() {
      this.triggerEvent("close");
    },

    noop() {}
  }
});
