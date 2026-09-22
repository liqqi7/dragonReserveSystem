const app = getApp();
const activityService = require("../../services/activity");

const CHECKIN_RADIUS_M = 1000;
const CHECKIN_RADIUS_KM = CHECKIN_RADIUS_M / 1000;
const MARKER_SIZE = { width: 24, height: 32 };
const CIRCLE_STYLE = { color: "#007aff33", fillColor: "#007aff11", strokeWidth: 1 };

function buildMarker(lat, lng) {
  return { id: 1, latitude: lat, longitude: lng, title: "活动地点", ...MARKER_SIZE };
}

function buildCircle(lat, lng) {
  return { latitude: lat, longitude: lng, radius: CHECKIN_RADIUS_M, ...CIRCLE_STYLE };
}

Page({
  data: {
    activityId: "",
    activityName: "",
    activityAddress: "",
    activityLatitude: null,
    activityLongitude: null,
    userLatitude: null,
    userLongitude: null,
    distanceKm: null,
    distanceText: "",
    mapLatitude: 0,
    mapLongitude: 0,
    scale: 15,
    markers: [],
    circles: [],
    submitting: false
  },

  onLoad() {
    this._unloaded = false;
    const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel();
    if (eventChannel) {
      eventChannel.on("initCheckin", (data) => {
        if (this._unloaded || !data || !data.activity) return;
        const { activity, nickname } = data;
        const activityLatitude = activity.locationLatitude;
        const activityLongitude = activity.locationLongitude;
        const activityName = activity.name || "";
        const activityAddress = `${activity.locationName || ""} ${activity.locationAddress || ""}`.trim();

        this.nickname = nickname || "";

        const markers = [buildMarker(activityLatitude, activityLongitude)];
        const circles = [buildCircle(activityLatitude, activityLongitude)];

        this.setData({
          activityId: activity._id,
          activityName,
          activityAddress,
          activityLatitude,
          activityLongitude,
          mapLatitude: activityLatitude,
          mapLongitude: activityLongitude,
          markers,
          circles,
          distanceText: "正在获取位置…（1km 内可签到）"
        });

        this.fetchUserLocation();
      });
    }
  },

  onShow() {
    this._pageVisible = true;
    this.finishSubmission();
    if (this.data.submitting && !this._submissionResult && !this._unloaded && !this._submissionLoadingVisible) {
      const pages = typeof getCurrentPages === "function" ? getCurrentPages() : [];
      if (pages[pages.length - 1] !== this) return;
      this._submissionLoadingVisible = true;
      wx.showLoading({ title: "签到中..." });
    }
  },

  onHide() {
    this._pageVisible = false;
    this.hideSubmissionLoading();
  },

  onUnload() {
    this._unloaded = true;
    this._pageVisible = false;
    this._submissionResult = null;
    this.hideSubmissionLoading();
  },

  hideSubmissionLoading() {
    if (!this._submissionLoadingVisible) return;
    this._submissionLoadingVisible = false;
    wx.hideLoading();
  },

  // 使用精确定位获取当前位置
  fetchUserLocation() {
    wx.getLocation({
      type: "gcj02",
      success: (res) => {
        if (this._unloaded) return;
        const { latitude, longitude } = res;
        if (typeof latitude !== "number" || typeof longitude !== "number") {
          this.setData({ distanceText: "定位信息异常，无法计算距离（1km 内可签到）" });
          return;
        }
        this.updateMapAndDistance(latitude, longitude);
      },
      fail: () => {
        if (this._unloaded) return;
        this.setData({
          distanceText: "未获取到当前位置，无法计算距离（1km 内可签到）"
        });
      }
    });
  },

  updateMapAndDistance(lat, lng) {
    const { activityLatitude, activityLongitude } = this.data;
    if (typeof activityLatitude !== "number" || typeof activityLongitude !== "number") {
      this.setData({
        userLatitude: lat,
        userLongitude: lng,
        distanceKm: null,
        distanceText: "活动未设置地点"
      });
      return;
    }

    const distanceKm = this.getDistanceKm(lat, lng, activityLatitude, activityLongitude);
    const distanceText = `距离活动地点约 ${distanceKm.toFixed(2)} km（1km 内可签到）`;

    const markers = [buildMarker(activityLatitude, activityLongitude)];
    const circles = [buildCircle(activityLatitude, activityLongitude)];

    this.setData({
      userLatitude: lat,
      userLongitude: lng,
      distanceKm,
      distanceText,
      markers,
      circles,
      mapLatitude: activityLatitude,
      mapLongitude: activityLongitude
    });
  },

  getDistanceKm(lat1, lng1, lat2, lng2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  confirmCheckin() {
    if (this._unloaded || this._submissionSucceeded || this.data.submitting) return;
    const {
      activityId,
      activityLatitude,
      activityLongitude,
      userLatitude,
      userLongitude,
      distanceKm
    } = this.data;

    if (!activityId) {
      wx.showToast({ title: "活动信息有误", icon: "none" });
      return;
    }

    if (userLatitude == null || userLongitude == null) {
      wx.showToast({ title: "未获取到定位，无法签到", icon: "none" });
      return;
    }

    const dist = typeof distanceKm === "number"
      ? distanceKm
      : this.getDistanceKm(userLatitude, userLongitude, activityLatitude, activityLongitude);

    if (dist > CHECKIN_RADIUS_KM) {
      wx.showToast({ title: `距离活动地点超过 ${CHECKIN_RADIUS_KM}km，签到失败`, icon: "none" });
      return;
    }

    this.setData({ submitting: true });
    this._submissionLoadingVisible = true;
    wx.showLoading({ title: "签到中..." });
    return activityService.checkinActivity(activityId, {
      lat: userLatitude,
      lng: userLongitude
    })
      .then(() => {
        if (this._unloaded) return;
        this._submissionSucceeded = true;
        this._submissionResult = { success: true };
        this.finishSubmission();
      }, (err) => {
        if (this._unloaded) return;
        this._submissionResult = { success: false, error: err };
        this.finishSubmission();
      })
      .catch((err) => {
        console.error("签到结果处理失败:", err);
      });
  },

  finishSubmission() {
    if (!this._submissionResult || this._unloaded || this._pageVisible === false) return;
    const pages = typeof getCurrentPages === "function" ? getCurrentPages() : [];
    if (pages[pages.length - 1] !== this) return;
    const result = this._submissionResult;
    this._submissionResult = null;
    this.hideSubmissionLoading();
    this.setData({ submitting: false });
    if (!result.success) {
      wx.showToast({ title: (result.error && result.error.message) || "签到失败", icon: "none", duration: 2500 });
      return;
    }
    wx.showToast({ title: "签到成功", icon: "success" });
    wx.navigateBack();
  },

  cancel() {
    wx.navigateBack();
  }
});
