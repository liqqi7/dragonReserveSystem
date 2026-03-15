const app = getApp();
const activityService = require("../../services/activity");

const pad = (n) => (n < 10 ? `0${n}` : `${n}`);

// 默认头像 data URI，避免网络请求失败，CSS ::before 显示阴影人像
const DEFAULT_AVATAR = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InRyYW5zcGFyZW50Ii8+PC9zdmc+";

function formatDateTime(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function adaptParticipant(participant) {
  return {
    id: participant.id,
    name: participant.nickname_snapshot || "",
    userId: participant.user_id != null ? String(participant.user_id) : null,
    avatarUrl: participant.avatar_url_snapshot || DEFAULT_AVATAR,
    checkedInAt: formatDateTime(participant.checked_in_at),
    checkinLat: participant.checkin_lat,
    checkinLng: participant.checkin_lng
  };
}

function adaptActivity(item) {
  const participants = (item.participants || []).map(adaptParticipant);
  const startTime = formatDateTime(item.start_time);
  return {
    _id: String(item.id),
    date: startTime.split(" ")[0] || "",
    name: item.name,
    status: item.status || "进行中",
    remark: item.remark || "",
    participants,
    maxParticipants: item.max_participants || 20,
    startTime,
    endTime: formatDateTime(item.end_time),
    signupDeadline: formatDateTime(item.signup_deadline),
    locationName: item.location_name || "",
    locationAddress: item.location_address || "",
    locationLatitude: item.location_latitude,
    locationLongitude: item.location_longitude
  };
}

Page({
  data: {
    activityList: [],
    filteredList: [],
    showEditModal: false,
    showDetailModal: false,
    currentActivity: null,
    editForm: {
      // 活动名称
      name: "",
      // 活动状态
      status: "进行中",
      // 活动备注
      remark: "",
      // 活动开始时间（日期和时间分开存储）
      startDate: "",
      startTime: "",
      // 活动结束时间（日期和时间分开存储）
      endDate: "",
      endTime: "",
      // 报名截止时间（日期和时间分开存储）
      signupDeadlineDate: "",
      signupDeadlineTime: "",
      // 活动位置
      locationName: "",
      locationAddress: "",
      locationLatitude: null,
      locationLongitude: null
    },
    myUserId: "", // 当前用户 openid（用于判断能否删除自己的报名）
    myNickname: "", // 当前用户昵称（userId 为空时的回退，兼容旧数据）
    detailActivity: null,
    shareActivityId: "",   // 用于分享小程序卡片时带上活动 id
    shareActivityName: "", // 分享卡片标题
    locationDisabled: false,
    isAdmin: false,
    isGuest: true,
    searchKeyword: "",
    selectedFilter: "我参与的"
  },

  onLoad(options) {
    this.syncGuestState();
    this._openActivityIdFromShare = (options && options.activityId) || "";
    this._fromShare = !!(options && options.from === "share");
  },

  onShow() {
    const isGuest = this.syncGuestState();
    if (!isGuest) {
      const myUserId = app.globalData.userId || wx.getStorageSync("userId") || "";
      const myNickname = (app.globalData.userProfile?.nickname || wx.getStorageSync("userNickname") || "").trim();
      this.setData({ isAdmin: app.globalData.userRole === "admin", myUserId, myNickname });

      this.loadActivityList();
    }
  },

  // 下拉刷新：仅已获得权限的用户触发，刷新活动列表
  onPullDownRefresh() {
    const isGuest = this.syncGuestState();
    if (isGuest) {
      wx.stopPullDownRefresh();
      return;
    }
    const myUserId = app.globalData.userId || wx.getStorageSync("userId") || "";
    const myNickname = (app.globalData.userProfile?.nickname || wx.getStorageSync("userNickname") || "").trim();
    this.setData({ isAdmin: app.globalData.userRole === "admin", myUserId, myNickname });

    const p = this.loadActivityList();
    if (p && typeof p.finally === "function") {
      p.finally(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      wx.stopPullDownRefresh();
    }
  },

  syncGuestState() {
    const hasWeChatAuth = !!wx.getStorageSync("hasWeChatAuth");
    const isAuthenticated = app.globalData.isAuthenticated;
    // 未完成微信头像昵称授权 或 未获取访问权限，都视为游客
    const isGuest = !hasWeChatAuth || !isAuthenticated;
    this.setData({ isGuest });

    return isGuest;
  },

  loadActivityList() {
    wx.showLoading({ title: "加载中..." });
    return activityService
      .listActivities()
      .then((res) => this.processActivityList(res || [], new Date()))
      .then(result => {
        if (result) {
          const { list } = result;
          const { selectedFilter, searchKeyword } = this.data;
          const filtered = this.computeFilteredList(list, selectedFilter, searchKeyword);
          this.setData({ activityList: list, filteredList: filtered });

          // 若详情弹窗正打开，同步更新 detailActivity（如刚报名成功）
          if (this.data.showDetailModal && this.data.detailActivity) {
            const id = this.data.detailActivity._id;
            const updated = list.find(a => a._id === id);
            if (updated) {
              const participants = this.normalizeParticipants(updated.participants);
              const checkinCount = participants.filter(p => !!p.checkedInAt).length;
              const startTime = updated.startTime || (updated.date ? `${updated.date} 00:00` : "");
              const signupDeadline = updated.signupDeadline || startTime;
              const activityStarted = startTime ? new Date(startTime.replace(" ", "T") + ":00").getTime() <= Date.now() : false;
              const signupDeadlinePassed = signupDeadline ? new Date(signupDeadline.replace(" ", "T") + ":00").getTime() <= Date.now() : false;
              this.setData({
                detailActivity: { ...updated, participants, checkinCount, activityStarted, signupDeadline, signupDeadlinePassed }
              });
            }
          }

          // 从分享链接进入时自动打开对应活动详情
          if (this._openActivityIdFromShare && this._fromShare && list) {
            const activity = list.find(a => a._id === this._openActivityIdFromShare);
            if (activity) {
              const aid = this._openActivityIdFromShare;
              this._openActivityIdFromShare = "";
              this._fromShare = false;
              const participants = this.normalizeParticipants(activity.participants);
              const checkinCount = participants.filter(p => !!p.checkedInAt).length;
              const startTime = activity.startTime || (activity.date ? `${activity.date} 00:00` : "");
              const signupDeadline = activity.signupDeadline || startTime;
              const activityStarted = startTime ? new Date(startTime.replace(" ", "T") + ":00").getTime() <= Date.now() : false;
              const signupDeadlinePassed = signupDeadline ? new Date(signupDeadline.replace(" ", "T") + ":00").getTime() <= Date.now() : false;
              this.setData({
                showDetailModal: true,
                detailActivity: { ...activity, participants, checkinCount, activityStarted, signupDeadline, signupDeadlinePassed },
                shareActivityId: aid,
                shareActivityName: (activity.name || "活动").trim() || "活动"
              });
            }
          }

          wx.hideLoading();
        }
      })
      .catch(err => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({ title: "加载失败", icon: "none" });
      });
  },

  processActivityList(resData, now) {
    const myUserId = this.data.myUserId;
    const myNickname = (this.data.myNickname || "").trim();

    const list = (resData || []).map(rawItem => {
      const activity = adaptActivity(rawItem);
      let signupDeadline = activity.signupDeadline;
      if (!signupDeadline && activity.startTime) {
        const base = new Date(activity.startTime.replace(" ", "T") + ":00");
        if (!isNaN(base.getTime())) {
          const dl = new Date(base.getTime() - 60 * 60 * 1000);
          signupDeadline = `${dl.getFullYear()}-${pad(dl.getMonth() + 1)}-${pad(dl.getDate())} ${pad(dl.getHours())}:${pad(dl.getMinutes())}`;
        }
      }
      activity.signupDeadline = signupDeadline;

      let hasSignedUp = false;
      let hasCheckedIn = false;
      let checkinCount = 0;
      const rawParticipants = activity.participants || [];
      const avatarList = [];

      rawParticipants.forEach(p => {
        if (typeof p === "object" && p !== null) {
          const uid = p.userId;
          const name = p.name;
          const checkedIn = !!p.checkedInAt;
          if (checkedIn) {
            checkinCount += 1;
          }
          const avatarUrl = (p.avatarUrl && String(p.avatarUrl).trim()) || DEFAULT_AVATAR;
          const hasCustomAvatar = avatarUrl !== DEFAULT_AVATAR;
          avatarList.push({
            url: avatarUrl,
            isDefault: !hasCustomAvatar
          });
          if (myUserId && uid && uid === myUserId) {
            hasSignedUp = true;
            if (checkedIn) {
              hasCheckedIn = true;
            }
          } else if (!myUserId && myNickname && name === myNickname) {
            hasSignedUp = true;
            if (checkedIn) {
              hasCheckedIn = true;
            }
          }
        } else if (typeof p === "string") {
          avatarList.push({
            url: DEFAULT_AVATAR,
            isDefault: true
          });
          if (myNickname && p === myNickname) {
            hasSignedUp = true;
          }
        }
      });
      activity.hasSignedUp = hasSignedUp;
      activity.hasCheckedIn = hasCheckedIn;
      activity.checkinCount = checkinCount;
      activity.avatarList = avatarList;

      // 报名是否已截止
      let isSignupClosed = false;
      if (signupDeadline) {
        const dl = new Date(signupDeadline.replace(" ", "T") + ":00");
        if (!isNaN(dl.getTime())) {
          isSignupClosed = now.getTime() >= dl.getTime();
        }
      }
      activity.isSignupClosed = isSignupClosed;

      // 基于时间自动更新状态（已取消、已删除不参与自动推算，避免删除后又显示为未开始）
      const parseDateTime = (s) => new Date(s.replace(" ", "T") + ":00");
      const start = parseDateTime(activity.startTime);
      const end = parseDateTime(activity.endTime);
      let autoStatus = activity.status || "未开始";
      if (activity.status === "已取消" || activity.status === "已删除") {
        autoStatus = activity.status;
      } else if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (now.getTime() < start.getTime()) {
          autoStatus = "未开始";
        } else if (now.getTime() < end.getTime()) {
          autoStatus = "进行中";
        } else {
          autoStatus = "已结束";
        }
      }

      if (activity.status !== "已取消" && activity.status !== "已删除") {
        activity.status = autoStatus;
      }

      return activity;
    });

    return { list };
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.filterActivities();
  },

  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ selectedFilter: filter });
    this.filterActivities();
  },

  computeFilteredList(list, selectedFilter, searchKeyword) {
    // 逻辑删除的活动不在任何 Tab 展示
    let filtered = list ? list.filter(item => item.status !== "已删除") : [];

    if (selectedFilter === "我参与的") {
      // 只看当前用户参与过的活动（已通过 hasSignedUp 标记）
      filtered = filtered.filter(item => item.hasSignedUp);
    } else if (selectedFilter && selectedFilter !== "全部") {
      // 其他筛选仍按状态过滤
      filtered = filtered.filter(item => item.status === selectedFilter);
    }
    if (searchKeyword && searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(keyword) ||
        (item.remark && item.remark.toLowerCase().includes(keyword))
      );
    }
    return filtered;
  },

  filterActivities() {
    const { activityList, searchKeyword, selectedFilter } = this.data;
    const filtered = this.computeFilteredList(activityList, selectedFilter, searchKeyword);
    this.setData({ filteredList: filtered });
  },

  // 管理员：创建活动
  showCreateModal() {
    const now = new Date();
    // 开始时间默认：当前时间 + 2 小时
    const startDateTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const date = `${startDateTime.getFullYear()}-${pad(startDateTime.getMonth() + 1)}-${pad(startDateTime.getDate())}`;
    const startTime = `${pad(startDateTime.getHours())}:${pad(startDateTime.getMinutes())}`;
    // 结束时间默认：开始时间后 1 小时
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
    const endTime = `${pad(endDateTime.getHours())}:${pad(endDateTime.getMinutes())}`;
    const endDate = `${endDateTime.getFullYear()}-${pad(endDateTime.getMonth() + 1)}-${pad(endDateTime.getDate())}`;
    // 报名截止时间默认：开始时间前 1 小时
    const deadlineDateTime = new Date(startDateTime.getTime() - 60 * 60 * 1000);
    const deadlineDate = `${deadlineDateTime.getFullYear()}-${pad(deadlineDateTime.getMonth() + 1)}-${pad(deadlineDateTime.getDate())}`;
    const deadlineTime = `${pad(deadlineDateTime.getHours())}:${pad(deadlineDateTime.getMinutes())}`;

    this.setData({
      showEditModal: true,
      currentActivity: null,
      locationDisabled: false,
      editForm: {
        name: "",
        status: "未开始",
        remark: "",
        startDate: date,
        startTime: startTime,
        endDate: endDate,
        endTime: endTime,
        signupDeadlineDate: deadlineDate,
        signupDeadlineTime: deadlineTime,
        locationName: "",
        locationAddress: "",
        locationLatitude: null,
        locationLongitude: null
      }
    });
  },

  // 管理员：编辑活动
  showEditModal(e) {
    const activity = e.currentTarget.dataset.activity;
    // 解析开始时间和结束时间
    let startDate = "";
    let startTime = "";
    let endDate = "";
    let endTime = "";
    let signupDeadlineDate = "";
    let signupDeadlineTime = "";

    if (activity.startTime) {
      const startParts = activity.startTime.split(" ");
      startDate = startParts[0] || activity.date || "";
      startTime = startParts[1] || "00:00";
    } else if (activity.date) {
      startDate = activity.date;
      startTime = "00:00";
    }
    
    if (activity.endTime) {
      const endParts = activity.endTime.split(" ");
      endDate = endParts[0] || activity.date || "";
      endTime = endParts[1] || "01:00";
    } else if (activity.date) {
      endDate = activity.date;
      endTime = "01:00";
    }

    // 报名截止时间：优先使用已有 signupDeadline，否则用开始时间前 1 小时
    if (activity.signupDeadline) {
      const parts = activity.signupDeadline.split(" ");
      signupDeadlineDate = parts[0] || startDate;
      signupDeadlineTime = parts[1] || startTime;
    } else if (activity.startTime) {
      const base = new Date(activity.startTime.replace(" ", "T") + ":00");
      if (!isNaN(base.getTime())) {
        const dl = new Date(base.getTime() - 60 * 60 * 1000);
        signupDeadlineDate = `${dl.getFullYear()}-${pad(dl.getMonth() + 1)}-${pad(dl.getDate())}`;
        signupDeadlineTime = `${pad(dl.getHours())}:${pad(dl.getMinutes())}`;
      }
    } else {
      signupDeadlineDate = startDate;
      signupDeadlineTime = startTime;
    }

    const hasCheckedIn = (activity.checkinCount || 0) > 0;

    this.setData({
      showEditModal: true,
      currentActivity: activity,
      locationDisabled: hasCheckedIn,
      editForm: {
        name: activity.name,
        status: activity.status,
        remark: activity.remark || "",
        startDate: startDate,
        startTime: startTime,
        endDate: endDate,
        endTime: endTime,
        signupDeadlineDate: signupDeadlineDate,
        signupDeadlineTime: signupDeadlineTime,
        locationName: activity.locationName || "",
        locationAddress: activity.locationAddress || "",
        locationLatitude: activity.locationLatitude ?? null,
        locationLongitude: activity.locationLongitude ?? null
      }
    });
  },

  onEditFormChange(e) {
    const field = e.currentTarget.dataset.field;
    let value = e.detail.value;
    
    // 如果是状态选择器，需要从数组中取值
    if (field === "status") {
      const statusList = ["未开始", "进行中", "已取消", "已结束"];
      value = statusList[Number(value)] || "未开始";
    }
    
    this.setData({
      [`editForm.${field}`]: value
    });
  },

  // 开始日期变更
  onStartDateChange(e) {
    this.setData({
      "editForm.startDate": e.detail.value
    });
  },

  // 开始时间变更
  onStartTimeChange(e) {
    this.setData({
      "editForm.startTime": e.detail.value
    });
  },

  // 结束日期变更
  onEndDateChange(e) {
    this.setData({
      "editForm.endDate": e.detail.value
    });
  },

  // 结束时间变更
  onEndTimeChange(e) {
    this.setData({
      "editForm.endTime": e.detail.value
    });
  },

  // 报名截止日期变更
  onSignupDeadlineDateChange(e) {
    this.setData({
      "editForm.signupDeadlineDate": e.detail.value
    });
  },

  // 报名截止时间变更
  onSignupDeadlineTimeChange(e) {
    this.setData({
      "editForm.signupDeadlineTime": e.detail.value
    });
  },

  // 选择活动位置：直接打开地图选点（跳过中间页）；若已有人签到则不可修改
  onChooseLocation() {
    if (this.data.locationDisabled) {
      wx.showToast({ title: "已有用户完成签到，不可修改活动地点", icon: "none" });
      return;
    }
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          "editForm.locationName": res.name || res.address || "",
          "editForm.locationAddress": res.address || "",
          "editForm.locationLatitude": res.latitude,
          "editForm.locationLongitude": res.longitude
        });
      }
    });
  },

  saveActivity() {
    const form = this.data.editForm;
    if (!form.name.trim()) {
      wx.showToast({ title: "请输入活动名称", icon: "none" });
      return;
    }
    if (!form.startDate) {
      wx.showToast({ title: "请选择开始日期", icon: "none" });
      return;
    }
    if (!form.startTime) {
      wx.showToast({ title: "请选择开始时间", icon: "none" });
      return;
    }
    if (!form.endDate) {
      wx.showToast({ title: "请选择结束日期", icon: "none" });
      return;
    }
    if (!form.endTime) {
      wx.showToast({ title: "请选择结束时间", icon: "none" });
      return;
    }
    if (!form.signupDeadlineDate) {
      wx.showToast({ title: "请选择报名截止日期", icon: "none" });
      return;
    }
    if (!form.signupDeadlineTime) {
      wx.showToast({ title: "请选择报名截止时间", icon: "none" });
      return;
    }

    // 组合开始/结束时间，进行时间合法性校验
    const startDateTime = new Date(`${form.startDate}T${form.startTime}:00`);
    const endDateTime = new Date(`${form.endDate}T${form.endTime}:00`);
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      wx.showToast({ title: "时间格式错误，请重新选择", icon: "none" });
      return;
    }

    const signupDeadlineDateTime = new Date(`${form.signupDeadlineDate}T${form.signupDeadlineTime}:00`);
    if (isNaN(signupDeadlineDateTime.getTime())) {
      wx.showToast({ title: "报名截止时间格式错误，请重新选择", icon: "none" });
      return;
    }

    const now = new Date();
    const isEdit = !!this.data.currentActivity;
    // 新建活动时，开始时间不能早于当前时间
    if (!isEdit && startDateTime.getTime() < now.getTime()) {
      wx.showToast({ title: "开始时间不能早于当前时间", icon: "none" });
      return;
    }

    if (endDateTime.getTime() <= startDateTime.getTime()) {
      wx.showToast({ title: "结束时间必须晚于开始时间", icon: "none" });
      return;
    }
    if (signupDeadlineDateTime.getTime() > startDateTime.getTime()) {
      wx.showToast({ title: "报名截止时间必须早于或等于开始时间", icon: "none" });
      return;
    }
    if (signupDeadlineDateTime.getTime() >= endDateTime.getTime()) {
      wx.showToast({ title: "报名截止时间必须早于结束时间", icon: "none" });
      return;
    }

    wx.showLoading({ title: "保存中..." });
    const payload = {
      name: form.name.trim(),
      status: form.status,
      remark: form.remark.trim(),
      start_time: `${form.startDate}T${form.startTime}:00`,
      end_time: `${form.endDate}T${form.endTime}:00`,
      signup_deadline: `${form.signupDeadlineDate}T${form.signupDeadlineTime}:00`,
      location_name: form.locationName || "",
      location_address: form.locationAddress || "",
      location_latitude: form.locationLatitude,
      location_longitude: form.locationLongitude,
      max_participants: isEdit ? (this.data.currentActivity.maxParticipants || 20) : 20
    };

    if (isEdit) {
      activityService
        .updateActivity(this.data.currentActivity._id, payload)
        .then(() => {
          wx.hideLoading();
          wx.showToast({ title: "更新成功", icon: "success" });
          this.closeEditModal();
          this.loadActivityList();
        })
        .catch((err) => {
          console.error(err);
          wx.hideLoading();
          wx.showToast({ title: (err && err.message) || "更新失败", icon: "none" });
        });
    } else {
      activityService
        .createActivity(payload)
        .then(() => {
          wx.hideLoading();
          wx.showToast({ title: "创建成功", icon: "success" });
          this.closeEditModal();
          this.loadActivityList();
        })
        .catch((err) => {
          console.error(err);
          wx.hideLoading();
          wx.showToast({ title: (err && err.message) || "创建失败", icon: "none" });
        });
    }
  },

  closeEditModal() {
    this.setData({
      showEditModal: false,
      currentActivity: null,
      editForm: {
        name: "",
        status: "进行中",
        remark: "",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        signupDeadlineDate: "",
        signupDeadlineTime: "",
        locationName: "",
        locationAddress: "",
        locationLatitude: null,
        locationLongitude: null
      }
    });
  },

  // 管理员：取消活动（将状态设为已取消）
  cancelActivity() {
    const activity = this.data.currentActivity;
    if (!activity || !activity._id) return;
    wx.showModal({
      title: "确认取消活动",
      content: `确定要取消活动"${activity.name}"吗？`,
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: "处理中..." });
        activityService
          .updateActivity(activity._id, { status: "已取消" })
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: "已取消活动", icon: "success" });
            this.closeEditModal();
            this.loadActivityList();
          })
          .catch((err) => {
            console.error(err);
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
          });
      }
    });
  },

  // 管理员：逻辑删除已取消的活动（标记为已删除，列表中不再展示）
  logicalDeleteActivity(e) {
    const activity = e.currentTarget.dataset.activity;
    if (!activity || !activity._id) return;
    if (activity.status !== "已取消") return;
    wx.showModal({
      title: "确认删除",
      content: "确定要删除该活动吗？删除后将不再在列表中展示。",
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: "处理中..." });
        activityService
          .updateActivity(activity._id, { status: "已删除" })
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: "已删除", icon: "success" });
            this.loadActivityList();
          })
          .catch((err) => {
            console.error(err);
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
          });
      }
    });
  },

  // 管理员：从列表卡片取消活动（标记为已取消，不删除数据）
  cancelActivityFromCard(e) {
    const activity = e.currentTarget.dataset.activity;
    if (!activity || !activity._id) return;
    if (activity.status === "已取消") return;
    wx.showModal({
      title: "确认取消活动",
      content: `确定要取消活动"${activity.name}"吗？取消后活动将进入「已取消」列表，不可再报名或签到。`,
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: "处理中..." });
        activityService
          .updateActivity(activity._id, { status: "已取消" })
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: "已取消活动", icon: "success" });
            this.loadActivityList();
          })
          .catch((err) => {
            console.error(err);
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || "操作失败", icon: "none" });
          });
      }
    });
  },

  // 管理员：删除活动（从后端彻底删除，保留用于后续如需恢复）
  deleteActivity(e) {
    const activity = e.currentTarget.dataset.activity;
    wx.showModal({
      title: "确认删除",
      content: `确定要删除活动"${activity.name}"吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: "删除中..." });
          activityService
            .deleteActivity(activity._id)
            .then(() => {
              wx.hideLoading();
              wx.showToast({ title: "删除成功", icon: "success" });
              this.loadActivityList();
            })
            .catch(err => {
              console.error(err);
              wx.hideLoading();
              wx.showToast({ title: (err && err.message) || "删除失败", icon: "none" });
            });
        }
      }
    });
  },

  cancelSignup(e) {
    const activity = e.currentTarget.dataset.activity;
    if (!activity || !activity._id) return;

    wx.showModal({
      title: "确认取消报名",
      content: `确定要取消活动"${activity.name}"的报名吗？`,
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: "处理中..." });
        activityService
          .cancelSignup(activity._id)
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: "已取消报名", icon: "success" });
            this.loadActivityList();
          })
          .catch((err) => {
            console.error(err);
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || "取消失败", icon: "none" });
          });
      }
    });
  },

  // 用户：直接报名（不显示弹窗）
  directSignup(e) {
    const activity = e.currentTarget.dataset.activity;
    if (activity.status === "已结束" || activity.status === "已取消") {
      wx.showToast({ title: "该活动已结束或已取消", icon: "none" });
      return;
    }
    // 报名截止校验
    if (activity.signupDeadline) {
      const deadline = new Date(activity.signupDeadline.replace(" ", "T") + ":00");
      if (!isNaN(deadline.getTime()) && Date.now() >= deadline.getTime()) {
        wx.showToast({ title: "报名已截止", icon: "none" });
        return;
      }
    }
    // 校验是否已在「我的」页面完成公会登记并有昵称
    if (!app.globalData.userId || !app.globalData.userProfile) {
      wx.showModal({
        title: "尚未登记",
        content: "请前往\"我的\"页面完成公会登记后再报名。",
        confirmText: "去我的",
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: "/pages/profile/profile" });
          }
        }
      });
      return;
    }
    
    // 检查是否有昵称
    const nickname = app.globalData.userProfile?.nickname?.trim();
    if (!nickname) {
      wx.showModal({
        title: "提示",
        content: "请前往'我的'页面完善昵称后再报名活动",
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          });
        }
      });
      return;
    }

    const participants = activity.participants || [];
    const myUserId = app.globalData.userId || wx.getStorageSync("userId") || "";

    // 按 userId 校验：同一用户不能重复报名，允许不同用户重名
    if (myUserId && participants.some(p => typeof p === "object" && p.userId && p.userId === myUserId)) {
      wx.showToast({ title: "您已报名", icon: "none" });
      return;
    }

    wx.showLoading({ title: "报名中..." });

    activityService
      .signupActivity(activity._id)
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: "报名成功", icon: "success" });
        this.loadActivityList();
      })
      .catch(err => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || "报名失败", icon: "none" });
      });
  },

  // 规范化参与者（兼容 string 与 {name, userId, checkedInAt}）
  normalizeParticipants(raw) {
    const arr = raw || [];
    return arr.map(p => {
      if (typeof p === "string") {
        return { id: null, name: p, userId: null, avatarUrl: DEFAULT_AVATAR, checkedInAt: null };
      }
      return {
        id: p.id || null,
        name: p.name || "",
        userId: p.userId != null ? String(p.userId) : null,
        avatarUrl: p.avatarUrl || DEFAULT_AVATAR,
        checkedInAt: p.checkedInAt || null
      };
    });
  },

  // 查看详情
  showDetail(e) {
    const activity = e.currentTarget.dataset.activity;
    const participants = this.normalizeParticipants(activity.participants);
    const checkinCount = participants.filter(p => !!p.checkedInAt).length;
    const startTime = activity.startTime || (activity.date ? `${activity.date} 00:00` : "");
    const signupDeadline = activity.signupDeadline || startTime;
    const activityStarted = startTime ? new Date(startTime.replace(" ", "T") + ":00").getTime() <= Date.now() : false;
    const signupDeadlinePassed = signupDeadline ? new Date(signupDeadline.replace(" ", "T") + ":00").getTime() <= Date.now() : false;
    this.setData({
      showDetailModal: true,
      detailActivity: { ...activity, participants, checkinCount, activityStarted, signupDeadline, signupDeadlinePassed },
      shareActivityId: activity._id || "",
      shareActivityName: (activity.name || "活动").trim() || "活动"
    });
  },

  closeDetailModal() {
    this.setData({
      showDetailModal: false,
      detailActivity: null,
      shareActivityId: "",
      shareActivityName: ""
    });
  },

  // 详情弹窗内：报名（复用 directSignup 逻辑）
  detailSignup() {
    const activity = this.data.detailActivity;
    if (!activity) return;
    this.directSignup({ currentTarget: { dataset: { activity } } });
  },

  // 详情弹窗内：签到（复用 checkinActivity 逻辑，成功后刷新详情）
  detailCheckin() {
    const activity = this.data.detailActivity;
    if (!activity) return;
    this.checkinActivity({ currentTarget: { dataset: { activity } } });
  },

  detailCancelSignup() {
    const activity = this.data.detailActivity;
    if (!activity) return;
    this.cancelSignup({ currentTarget: { dataset: { activity } } });
  },

  // 小程序卡片分享：分享当前活动（在活动详情打开时由分享按钮触发）
  onShareAppMessage() {
    const id = this.data.shareActivityId;
    const title = this.data.shareActivityName || "俱乐部活动";
    const path = id
      ? `/pages/activity_list/activity_list?from=share&activityId=${id}`
      : "/pages/activity_list/activity_list";
    return { title, path };
  },

  // 删除已报名人员
  removeParticipant(e) {
    const participantId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    const isSelf = !!e.currentTarget.dataset.self;
    const activity = this.data.detailActivity;

    wx.showModal({
      title: isSelf ? "确认取消报名" : "确认删除",
      content: isSelf
        ? `确定要取消活动"${activity.name}"的报名吗？`
        : `确定要删除"${name}"吗？如果该成员在记账明细中，相关记录也会被删除。`,
      success: (res) => {
        if (res.confirm) {
          this.doRemoveParticipant(participantId, name, activity, isSelf);
        }
      }
    });
  },

  doRemoveParticipant(participantId, name, activity, isSelf = false) {
    wx.showLoading({ title: "处理中..." });

    activityService
      .removeParticipant(activity._id, participantId)
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: isSelf ? "已取消报名" : "删除成功", icon: "success" });
        // 刷新活动列表和详情
        this.loadActivityList();
        // 更新详情显示：重新计算 participants 和 checkinCount
        const getParticipantName = p => typeof p === "string" ? p : (p && p.name);
        const newParticipants = this.normalizeParticipants((activity.participants || []).filter(p => getParticipantName(p) !== name));
        const checkinCount = newParticipants.filter(p => !!p.checkedInAt).length;
        const updatedActivity = {
          ...activity,
          participants: newParticipants,
          checkinCount,
          hasSignedUp: isSelf ? false : activity.hasSignedUp,
          hasCheckedIn: isSelf ? false : activity.hasCheckedIn
        };
        this.setData({ detailActivity: updatedActivity });
      })
      .catch(err => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || (isSelf ? "取消失败" : "删除失败"), icon: "none", duration: 3000 });
      });
  },

  stopPropagation() {},

  onAvatarError(e) {
    const { index, activityId } = e.currentTarget.dataset;
    const activityList = this.data.activityList || [];
    const activity = activityList.find((item) => item._id === activityId);
    if (activity && activity.avatarList && activity.avatarList[index]) {
      activity.avatarList[index] = { url: DEFAULT_AVATAR, isDefault: true };
      this.setData({ activityList });
    }
  },

  checkinActivity(e) {
    const activity = e.currentTarget.dataset.activity;
    if (!activity) {
      wx.showToast({ title: "活动信息有误", icon: "none" });
      return;
    }

    if (activity.status !== "进行中" && activity.status !== "未开始") {
      wx.showToast({ title: "仅未开始或进行中的活动可以签到", icon: "none" });
      return;
    }

    if (!activity.locationLatitude || !activity.locationLongitude) {
      wx.showToast({ title: "活动未设置地点，无法签到", icon: "none" });
      return;
    }

    if (!activity.hasSignedUp) {
      wx.showToast({ title: "请先报名后再签到", icon: "none" });
      return;
    }

    const nickname =
      (app.globalData.userProfile && app.globalData.userProfile.nickname && app.globalData.userProfile.nickname.trim()) ||
      this.data.myNickname ||
      "";

    if (!nickname) {
      wx.showToast({ title: "请先在“我的”页面完善昵称", icon: "none" });
      return;
    }

    wx.navigateTo({
      url: "/pages/checkin_map/checkin_map",
      success: (res) => {
        if (res && res.eventChannel) {
          res.eventChannel.emit("initCheckin", {
            activity,
            nickname
          });
        }
      }
    });
  }
});
