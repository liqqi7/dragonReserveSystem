const app = getApp();

Page({
  data: {
    submitting: false,
    avatarUrl: "",
    nickname: "",
    canSubmit: false
  },

  onLoad() {
    this.checkUserExists();
  },

  /** 仅当用户未在 users 表中时展示欢迎页；已注册用户直接进入主页 */
  checkUserExists() {
    const db = wx.cloud.database();
    const cachedUserId = wx.getStorageSync("userId");

    const queryAndRedirect = (openid) => {
      return db
        .collection("users")
        .where({ _openid: openid })
        .limit(1)
        .get()
        .then((res) => {
          if (res.data && res.data.length > 0) {
            const user = res.data[0];
            app.globalData.userId = openid;
            app.globalData.userDocId = user._id;
            app.globalData.userProfile = { nickname: user.nickname || "", avatarUrl: user.avatarUrl || "" };
            if (user.role) app.setAuthState(user.role, true);
            wx.setStorageSync("hasWeChatAuth", true);
            wx.setStorageSync("userId", openid);
            wx.setStorageSync("userDocId", user._id);
            wx.setStorageSync("userNickname", user.nickname || "");
            wx.reLaunch({ url: "/pages/activity_list/activity_list" });
          }
        });
    };

    if (cachedUserId) {
      queryAndRedirect(cachedUserId).catch(() => {});
      return;
    }

    wx.cloud
      .callFunction({ name: "login" })
      .then((res) => {
        let openid = null;
        if (res && res.result) {
          if (typeof res.result === "string") openid = res.result;
          else if (typeof res.result === "object")
            openid = res.result.openid || res.result.OPENID || res.result.data?.openid;
        }
        if (!openid) return;
        return queryAndRedirect(openid);
      })
      .catch(() => {});
  },

  /** 选择头像（头像昵称填写能力，基础库 2.21.2+） */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ avatarUrl, canSubmit: !!(avatarUrl && (this.data.nickname || "").trim()) });
  },

  onNicknameInput(e) {
    const nickname = e.detail.value || "";
    this.setData({ nickname, canSubmit: !!(this.data.avatarUrl && nickname.trim()) });
  },

  /** 表单提交：头像和昵称必填 */
  onFormSubmit(e) {
    if (this.data.submitting) return;
    const nickname = (this.data.nickname || e.detail.value?.nickname || "").trim();
    const avatarUrl = this.data.avatarUrl;
    if (!avatarUrl || !nickname) {
      wx.showToast({ title: "请填写头像和昵称", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    this.doEnter(nickname, avatarUrl);
  },

  doEnter(nickname, avatarTempPath) {
    const db = wx.cloud.database();

    wx.cloud
      .callFunction({ name: "login" })
      .then((res) => {
        let openid = null;
        if (res && res.result) {
          if (typeof res.result === "string") {
            openid = res.result;
          } else if (typeof res.result === "object") {
            openid =
              res.result.openid ||
              res.result.OPENID ||
              res.result.data?.openid ||
              (res.result.userInfo && res.result.userInfo.openId) ||
              (res.result.userInfo && res.result.userInfo.openid);
          }
        }
        if (!openid) throw new Error("云函数返回的 openid 为空");
        return db
          .collection("users")
          .where({ _openid: openid })
          .limit(1)
          .get()
          .then((userRes) => ({ openid, userRes }));
      })
      .then(({ openid, userRes }) => {
        // 若有选择头像，上传到云存储获取永久 fileID
        if (avatarTempPath) {
          const cloudPath = `avatars/${openid}_${Date.now()}.jpg`;
          return wx.cloud
            .uploadFile({
              cloudPath,
              filePath: avatarTempPath
            })
            .then((uploadRes) => ({
              openid,
              userRes,
              avatarUrl: uploadRes.fileID
            }));
        }
        return Promise.resolve({ openid, userRes, avatarUrl: "" });
      })
      .then(({ openid, userRes, avatarUrl }) => {
        const payload = {
          nickname,
          avatarUrl: avatarUrl || "",
          updatedAt: db.serverDate()
        };
        if (userRes.data && userRes.data.length > 0) {
          const userDoc = userRes.data[0];
          return db
            .collection("users")
            .doc(userDoc._id)
            .update({ data: payload })
            .then(() => ({ openid, userDocId: userDoc._id, existingRole: userDoc.role }));
        } else {
          return db
            .collection("users")
            .add({
              data: {
                nickname: payload.nickname,
                avatarUrl: payload.avatarUrl,
                createdAt: db.serverDate(),
                updatedAt: payload.updatedAt
              }
            })
            .then((addRes) => ({ openid, userDocId: addRes._id, existingRole: null }));
        }
      })
      .then(({ openid, userDocId, existingRole }) => {
        app.globalData.userId = openid;
        app.globalData.userDocId = userDocId;
        app.globalData.userProfile = { nickname };
        // 退出登录后再次登录：从数据库恢复管理/用户权限
        if (existingRole) {
          app.setAuthState(existingRole, true);
        }
        wx.setStorageSync("hasWeChatAuth", true);
        wx.setStorageSync("userId", openid);
        wx.setStorageSync("userDocId", userDocId);
        wx.setStorageSync("userNickname", nickname);
        this.setData({ submitting: false });
        wx.reLaunch({ url: "/pages/activity_list/activity_list" });
      })
      .catch((err) => {
        console.error("welcome submit error", err);
        this.setData({ submitting: false });
        wx.showToast({
          title: err.message || "进入失败，请重试",
          icon: "none",
          duration: 3000
        });
      });
  }
});
