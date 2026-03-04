const app = getApp();
const db = wx.cloud.database();

const pad = (n) => (n < 10 ? `0${n}` : `${n}`);

// 默认头像 data URI，避免网络请求失败，CSS ::before 显示阴影人像
const DEFAULT_AVATAR = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InRyYW5zcGFyZW50Ii8+PC9zdmc+";

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
    return db.collection("activities")
      .orderBy("date", "desc")
      .get()
      .then(res => {
        const now = new Date();
        const timeMigrationPromises = [];
        const statusUpdatePromises = [];

        // 收集所有需要查询头像的 userId
        const userIdsToQuery = new Set();
        (res.data || []).forEach(item => {
          (item.participants || []).forEach(p => {
            if (typeof p === "object" && p !== null && p.userId) {
              userIdsToQuery.add(p.userId);
            }
          });
        });

        const avatarMap = new Map();
        if (userIdsToQuery.size > 0) {
          return Promise.all(
            Array.from(userIdsToQuery).map(userId =>
              db.collection("users")
                .where({ _openid: userId })
                .limit(1)
                .get()
                .then(userRes => {
                  if (userRes.data && userRes.data.length > 0) {
                    const latestAvatar = userRes.data[0].avatarUrl;
                    avatarMap.set(userId, latestAvatar || DEFAULT_AVATAR);
                  } else {
                    avatarMap.set(userId, DEFAULT_AVATAR);
                  }
                })
                .catch(() => {
                  avatarMap.set(userId, DEFAULT_AVATAR);
                })
            )
          ).then(() => {
            return this.processActivityList(res.data, avatarMap, DEFAULT_AVATAR, timeMigrationPromises, statusUpdatePromises, now);
          });
        }
        return this.processActivityList(res.data, avatarMap, DEFAULT_AVATAR, timeMigrationPromises, statusUpdatePromises, now);
      })
      .then(result => {
        if (result) {
          const { list, timeMigrationPromises, statusUpdatePromises } = result;
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

          // 更新 maxParticipants 字段（如果不存在）
          const maxParticipantsPromises = list
            .filter(item => !item.maxParticipants)
            .map(item => 
              db.collection("activities")
                .doc(item._id)
                .update({
                  data: { maxParticipants: 20 }
                })
            );
          
          const allPromises = [
            ...maxParticipantsPromises,
            ...timeMigrationPromises,
            ...statusUpdatePromises
          ];
          
          if (allPromises.length > 0) {
            Promise.all(allPromises).catch(err => {
              console.error("更新失败:", err);
            });
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

  processActivityList(resData, avatarMap, defaultAvatar, timeMigrationPromises, statusUpdatePromises, now) {
    const myUserId = this.data.myUserId;
    const myNickname = (this.data.myNickname || "").trim();

    const list = (resData || []).map(item => {
      let startTime = item.startTime;
      let endTime = item.endTime;
      let needTimeMigration = false;

      if (!startTime || !endTime) {
        const baseDate = item.date;
        startTime = `${baseDate} 00:00`;
        endTime = `${baseDate} 01:00`;
        needTimeMigration = true;
      }

      // 如果未设置报名截止时间，默认使用开始时间前 1 小时（仅前端使用）
      let signupDeadline = item.signupDeadline;
      if (!signupDeadline && startTime) {
        const base = new Date(startTime.replace(" ", "T") + ":00");
        if (!isNaN(base.getTime())) {
          const dl = new Date(base.getTime() - 60 * 60 * 1000);
          signupDeadline = `${dl.getFullYear()}-${pad(dl.getMonth() + 1)}-${pad(dl.getDate())} ${pad(dl.getHours())}:${pad(dl.getMinutes())}`;
        }
      }

      const activity = {
        _id: item._id,
        date: item.date,
        name: item.name,
        status: item.status || "进行中",
        remark: item.remark || "",
        participants: item.participants || [],
        maxParticipants: item.maxParticipants || 20,
        startTime,
        endTime,
        signupDeadline,
        locationName: item.locationName || "",
        locationAddress: item.locationAddress || "",
        locationLatitude: item.locationLatitude,
        locationLongitude: item.locationLongitude
      };

      let hasSignedUp = false;
      let hasCheckedIn = false;
      let checkinCount = 0;
      const rawParticipants = item.participants || [];
      const avatarList = [];

      rawParticipants.forEach(p => {
        if (typeof p === "object" && p !== null) {
          const uid = p.userId;
          const name = p.name;
          const checkedIn = !!p.checkedInAt;
          if (checkedIn) {
            checkinCount += 1;
          }
          // 优先使用实时查询的最新头像，如果没有则使用保存的头像，最后使用默认头像
          let avatarUrl = avatarMap.get(uid);
          if (!avatarUrl) {
            const savedAvatar = p.avatarUrl && String(p.avatarUrl).trim();
            avatarUrl = savedAvatar || defaultAvatar;
          }
          const hasCustomAvatar = avatarUrl !== defaultAvatar;
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
            url: defaultAvatar,
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

      if (needTimeMigration) {
        timeMigrationPromises.push(
          wx.cloud.callFunction({
            name: "updateActivity",
            data: {
              activityId: item._id,
              startTime,
              endTime
            }
          }).catch(console.error)
        );
      }

      // 基于时间自动更新状态（除已取消之外）
      const parseDateTime = (s) => new Date(s.replace(" ", "T") + ":00");
      const start = parseDateTime(startTime);
      const end = parseDateTime(endTime);
      let autoStatus = activity.status || "未开始";
      if (activity.status === "已取消") {
        autoStatus = "已取消";
      } else if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (now.getTime() < start.getTime()) {
          autoStatus = "未开始";
        } else if (now.getTime() < end.getTime()) {
          autoStatus = "进行中";
        } else {
          autoStatus = "已结束";
        }
      }

      if (autoStatus !== activity.status && activity.status !== "已取消") {
        activity.status = autoStatus;
        statusUpdatePromises.push(
          wx.cloud.callFunction({
            name: "updateActivity",
            data: {
              activityId: item._id,
              status: autoStatus
            }
          }).catch(console.error)
        );
      }

      return activity;
    });

    return { list, timeMigrationPromises, statusUpdatePromises };
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
    let filtered = list ? [...list] : [];

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

    const startTimeFull = `${form.startDate} ${form.startTime}`;
    const endTimeFull = `${form.endDate} ${form.endTime}`;
    // date 字段保留用于兼容性，使用开始日期
    const date = form.startDate;

    wx.showLoading({ title: "保存中..." });
    const data = {
      date: date,
      name: form.name.trim(),
      status: form.status,
      remark: form.remark.trim(),
      startTime: startTimeFull,
      endTime: endTimeFull,
      signupDeadline: `${form.signupDeadlineDate} ${form.signupDeadlineTime}`,
      locationName: form.locationName || "",
      locationAddress: form.locationAddress || "",
      locationLatitude: form.locationLatitude,
      locationLongitude: form.locationLongitude,
      participants: isEdit ? (this.data.currentActivity.participants || []) : [],
      maxParticipants: isEdit ? (this.data.currentActivity.maxParticipants || 20) : 20,
      updatedAt: db.serverDate()
    };

    if (isEdit) {
      const doUpdate = () =>
        db.collection("activities")
          .doc(this.data.currentActivity._id)
          .update({ data })
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: "更新成功", icon: "success" });
            this.closeEditModal();
            this.loadActivityList();
          });

      wx.cloud.callFunction({
        name: "updateActivity",
        data: {
          activityId: this.data.currentActivity._id,
          date: data.date,
          name: data.name,
          status: data.status,
          remark: data.remark,
          participants: data.participants,
          maxParticipants: data.maxParticipants,
          startTime: data.startTime,
          endTime: data.endTime,
          signupDeadline: data.signupDeadline,
          locationName: data.locationName,
          locationAddress: data.locationAddress,
          locationLatitude: data.locationLatitude,
          locationLongitude: data.locationLongitude
        }
      })
        .then((res) => {
          if (res.result && res.result.errCode === 0) {
            wx.hideLoading();
            wx.showToast({ title: "更新成功", icon: "success" });
            this.closeEditModal();
            this.loadActivityList();
          } else {
            throw new Error(res.result && res.result.errMsg ? res.result.errMsg : "更新失败");
          }
        })
        .catch((err) => {
          const isFuncNotFound =
            err.errCode === -501000 ||
            (err.errMsg && err.errMsg.includes("FunctionName")) ||
            (err.message && String(err.message).includes("501000"));
          if (isFuncNotFound) {
            return doUpdate().catch((e) => {
              console.error(e);
              wx.hideLoading();
              wx.showToast({ title: e.message || "更新失败", icon: "none" });
            });
          }
          wx.hideLoading();
          wx.showToast({ title: err.message || "更新失败", icon: "none" });
        });
    } else {
      data.createdAt = db.serverDate();
      db.collection("activities")
        .add({ data })
        .then(() => {
          wx.hideLoading();
          wx.showToast({ title: "创建成功", icon: "success" });
          this.closeEditModal();
          this.loadActivityList();
        })
        .catch((err) => {
          console.error(err);
          wx.hideLoading();
          wx.showToast({ title: "创建失败", icon: "none" });
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
        const doUpdate = () =>
          db.collection("activities")
            .doc(activity._id)
            .update({
              data: {
                status: "已取消",
                updatedAt: db.serverDate()
              }
            })
            .then(() => {
              wx.hideLoading();
              wx.showToast({ title: "已取消活动", icon: "success" });
              this.closeEditModal();
              this.loadActivityList();
            });
        wx.cloud
          .callFunction({
            name: "updateActivity",
            data: {
              activityId: activity._id,
              date: activity.date,
              name: activity.name,
              status: "已取消",
              remark: activity.remark,
              participants: activity.participants || [],
              maxParticipants: activity.maxParticipants || 20,
              startTime: activity.startTime,
              endTime: activity.endTime,
              locationName: activity.locationName || "",
              locationAddress: activity.locationAddress || "",
              locationLatitude: activity.locationLatitude,
              locationLongitude: activity.locationLongitude
            }
          })
          .then((res) => {
            if (res.result && res.result.errCode === 0) {
              wx.hideLoading();
              wx.showToast({ title: "已取消活动", icon: "success" });
              this.closeEditModal();
              this.loadActivityList();
            } else {
              throw new Error(res.result && res.result.errMsg ? res.result.errMsg : "操作失败");
            }
          })
          .catch((err) => {
            const isFuncNotFound =
              err.errCode === -501000 ||
              (err.errMsg && err.errMsg.includes("FunctionName")) ||
              (err.message && String(err.message).includes("501000"));
            if (isFuncNotFound) {
              return doUpdate().catch((e) => {
                console.error(e);
                wx.hideLoading();
                wx.showToast({ title: e.message || "操作失败", icon: "none" });
              });
            }
            wx.hideLoading();
            wx.showToast({ title: err.message || "操作失败", icon: "none" });
          });
      }
    });
  },

  // 管理员：删除活动
  deleteActivity(e) {
    const activity = e.currentTarget.dataset.activity;
    wx.showModal({
      title: "确认删除",
      content: `确定要删除活动"${activity.name}"吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: "删除中..." });
          wx.cloud.callFunction({
            name: "deleteActivity",
            data: {
              activityId: activity._id
            }
          })
            .then(res => {
              wx.hideLoading();
              if (res.result && res.result.errCode === 0) {
                wx.showToast({ title: "删除成功", icon: "success" });
                this.loadActivityList();
              } else {
                wx.showToast({ title: (res.result && res.result.errMsg) || "删除失败", icon: "none" });
              }
            })
            .catch(err => {
              console.error(err);
              wx.hideLoading();
              wx.showToast({ title: "删除失败", icon: "none" });
            });
        }
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

    wx.cloud.callFunction({
      name: "signupActivity",
      data: {
        activityId: activity._id,
        nickname,
        userId: app.globalData.userId || null
      }
    })
      .then((res) => {
        if (res.result && res.result.errCode === 0) {
          if (res.result.alreadySignedUp) {
            wx.hideLoading();
            wx.showToast({ title: "您已报名", icon: "none" });
            return;
          }
          wx.hideLoading();
          wx.showToast({ title: "报名成功", icon: "success" });
          this.loadActivityList();
        } else {
          wx.hideLoading();
          wx.showToast({ 
            title: res.result && res.result.errMsg ? res.result.errMsg : "报名失败", 
            icon: "none" 
          });
        }
      })
      .catch(err => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({ title: "报名失败", icon: "none" });
      });
  },

  // 规范化参与者（兼容 string 与 {name, userId, checkedInAt}）
  normalizeParticipants(raw) {
    const arr = raw || [];
    return arr.map(p => {
      if (typeof p === "string") {
        return { name: p, userId: null, checkedInAt: null };
      }
      return {
        name: p.name || "",
        userId: p.userId || null,
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
    const name = e.currentTarget.dataset.name;
    const activity = this.data.detailActivity;
    
    wx.showModal({
      title: "确认删除",
      content: `确定要删除"${name}"吗？如果该成员在记账明细中，相关记录也会被删除。`,
      success: (res) => {
        if (res.confirm) {
          this.doRemoveParticipant(name, activity);
        }
      }
    });
  },

  doRemoveParticipant(name, activity) {
    wx.showLoading({ title: "处理中..." });

    wx.cloud.callFunction({
      name: "removeParticipant",
      data: {
        activityId: activity._id,
        participantName: name,
        isAdmin: this.data.isAdmin
      }
    })
      .then((res) => {
        if (res.result && res.result.errCode === 0) {
          if (res.result.alreadyRemoved) {
            wx.hideLoading();
            wx.showToast({ title: "参与者不存在", icon: "none" });
            return;
          }
          // 云函数已处理活动参与者和账单记录的删除/更新
          return Promise.resolve();
        } else {
          throw new Error(res.result && res.result.errMsg ? res.result.errMsg : "删除失败");
        }
      })
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: "删除成功", icon: "success" });
        // 刷新活动列表和详情
        this.loadActivityList();
        // 更新详情显示：重新计算 participants 和 checkinCount
        const getParticipantName = p => typeof p === "string" ? p : (p && p.name);
        const newParticipants = this.normalizeParticipants((activity.participants || []).filter(p => getParticipantName(p) !== name));
        const checkinCount = newParticipants.filter(p => !!p.checkedInAt).length;
        const updatedActivity = { ...activity, participants: newParticipants, checkinCount };
        this.setData({ detailActivity: updatedActivity });
      })
      .catch(err => {
        console.error(err);
        let errorMsg = "删除失败";
        if (err && err.errMsg) {
          if (err.errMsg.includes("FUNCTION_NOT_FOUND") || err.errMsg.includes("FunctionName parameter could not be found")) {
            errorMsg = "云函数未部署，请先上传并部署 removeParticipant 云函数";
          } else {
            errorMsg = err.errMsg;
          }
        }
        wx.hideLoading();
        wx.showToast({ title: errorMsg, icon: "none", duration: 3000 });
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
