const app = getApp();

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
    circles: []
  },

  onLoad() {
    const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel();
    if (eventChannel) {
      eventChannel.on("initCheckin", (data) => {
        if (!data || !data.activity) return;
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

  // 使用精确定位获取当前位置
  fetchUserLocation() {
    wx.getLocation({
      type: "gcj02",
      success: (res) => {
        const { latitude, longitude } = res;
        if (typeof latitude !== "number" || typeof longitude !== "number") {
          this.setData({ distanceText: "定位信息异常，无法计算距离（1km 内可签到）" });
          return;
        }
        this.updateMapAndDistance(latitude, longitude);
      },
      fail: () => {
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
      wx.showToast({ title: "距离活动地点超过 1km，签到失败", icon: "none" });
      return;
    }

    const nickname =
      (app.globalData.userProfile && app.globalData.userProfile.nickname && app.globalData.userProfile.nickname.trim()) ||
      this.nickname ||
      "";

    if (!nickname) {
      wx.showToast({ title: "请先在“我的”页面完善昵称", icon: "none" });
      return;
    }

    wx.showLoading({ title: "签到中..." });
    wx.cloud.callFunction({
      name: "checkinActivity",
      data: {
        activityId,
        nickname,
        lat: userLatitude,
        lng: userLongitude
      }
    })
      .then((res) => {
        const result = res.result || {};
        if (result.errCode === 0) {
          wx.hideLoading();
          if (result.alreadyCheckedIn) {
            wx.showToast({ title: "已签到，无需重复", icon: "none" });
          } else {
            wx.showToast({ title: "签到成功", icon: "success" });
          }
          wx.navigateBack();
        } else {
          wx.hideLoading();
          const msg = result.errMsg || "签到失败";
          wx.showToast({ title: msg, icon: "none", duration: 2500 });
        }
      })
      .catch((err) => {
        console.error("checkinActivity 调用失败:", err);
        wx.hideLoading();
        const msg = (err.errMsg || err.message || "").includes("fail") ? "网络异常，请重试" : "签到失败";
        wx.showToast({ title: msg, icon: "none", duration: 2500 });
      });
  },

  cancel() {
    wx.navigateBack();
  }
});

