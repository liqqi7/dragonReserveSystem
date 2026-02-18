const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    hasUser: false,
    isGuest: true,
    user: {
      nickname: "",
      userIdShort: "",
      avatarUrl: ""
    },
    showEditModal: false,
    editNickname: "",
    editAvatarUrl: "",
    showPermissionModal: false,
    permissionInput: ""
  },

  onShow() {
    this.syncGuestState();
    // 若全局已有用户信息，先同步到页面，避免首帧显示「登录」再闪回已登录态
    const userId = app.globalData.userId;
    const profile = app.globalData.userProfile;
    if (userId && profile) {
      this.setData({
        hasUser: true,
        isGuest: !app.globalData.isAuthenticated,
        user: {
          nickname: profile.nickname || "",
          userIdShort: (userId || "").slice(0, 8),
          avatarUrl: profile.avatarUrl || ""
        }
      });
    }
    app.ensureUserReady(() => {
      this.loadUserProfile();
    });
  },

  syncGuestState() {
    const isGuest = !app.globalData.isAuthenticated;
    this.setData({ isGuest });
  },

  loadUserProfile() {
    const userId = app.globalData.userId;

    if (!userId) {
      this.setData({ hasUser: false, isGuest: !app.globalData.isAuthenticated });
      return;
    }

    // 查询 users 集合
    db.collection("users")
      .where({ _openid: userId })
      .limit(1)
      .get()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const user = res.data[0];
          app.globalData.userDocId = user._id;
          app.globalData.userProfile = {
            nickname: user.nickname || "",
            avatarUrl: user.avatarUrl || ""
          };
          this.setData({
            hasUser: true,
            isGuest: !app.globalData.isAuthenticated,
            user: {
              nickname: user.nickname || "",
              userIdShort: userId.slice(0, 8),
              avatarUrl: user.avatarUrl || ""
            }
          });
        } else {
          this.setData({
            hasUser: false,
            isGuest: !app.globalData.isAuthenticated
          });
        }
      })
      .catch((err) => {
        console.error("查询 users 失败:", err);
        this.setData({
          hasUser: false,
          isGuest: !app.globalData.isAuthenticated
        });
      });
  },

  // 未授权用户：引导到欢迎页完成微信授权
  startRegister() {
    wx.reLaunch({ url: "/pages/welcome/welcome" });
  },

  openPermissionModal() {
    this.setData({ showPermissionModal: true, permissionInput: "" });
  },

  closePermissionModal() {
    this.setData({ showPermissionModal: false, permissionInput: "" });
  },

  onPermissionInput(e) {
    this.setData({ permissionInput: e.detail.value || "" });
  },

  submitPermission() {
    const input = (this.data.permissionInput || "").trim();
    let role = null;
    if (input === "dragon") {
      role = "user";
    } else if (input === "manage") {
      role = "admin";
    }
    if (role) {
      app.setAuthState(role, true);
      this.setData({ showPermissionModal: false, permissionInput: "", isGuest: false });
      wx.showToast({ title: "已获取权限", icon: "success" });
    } else {
      wx.showToast({ title: "邀请码错误", icon: "none" });
    }
  },

  removePermission() {
    wx.showModal({
      title: "确认删除权限",
      content: "确定要恢复为游客吗？将无法查看活动与记账数据。",
      success: (res) => {
        if (res.confirm) {
          app.clearAuthState();
          // 同步清除数据库中的角色
          if (app.globalData.userDocId) {
            const db = wx.cloud.database();
            db.collection("users").doc(app.globalData.userDocId).update({
              data: { role: "", updatedAt: db.serverDate() }
            }).catch(() => {});
          }
          this.setData({ isGuest: true });
          wx.showToast({ title: "已恢复为游客", icon: "success" });
        }
      }
    });
  },

  // 确保用户记录存在
  ensureUserRecord() {
    const db = wx.cloud.database();
    const userId = app.globalData.userId;
    
    if (!userId) {
      return Promise.reject("没有 openid");
    }
    
    return db.collection("users")
      .where({ _openid: userId })
      .limit(1)
      .get()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          // 用户已存在
          app.globalData.userDocId = res.data[0]._id;
          return Promise.resolve();
        } else {
          // 创建新用户
          return db.collection("users").add({
            data: {
              nickname: "",
              avatarFileId: "",
              createdAt: db.serverDate(),
              updatedAt: db.serverDate()
            }
          }).then((addRes) => {
            app.globalData.userDocId = addRes._id;
            app.globalData.userProfile = {
              nickname: ""
            };
            return Promise.resolve();
          });
        }
      });
  },

  openEditModal() {
    const { user } = this.data;
    this.setData({
      showEditModal: true,
      editNickname: user.nickname,
      editAvatarUrl: user.avatarUrl || ""
    });
  },

  closeEditModal() {
    this.setData({ showEditModal: false });
  },

  onChooseAvatarInModal(e) {
    const { avatarUrl } = e.detail;
    this.setData({ editAvatarUrl: avatarUrl });
  },

  stopTap() {
    // 阻止冒泡
  },

  onInputNickname(e) {
    this.setData({ editNickname: e.detail.value || "" });
  },

  saveProfile() {
    const nick = (this.data.editNickname || "").trim();
    const editAvatarUrl = this.data.editAvatarUrl || "";
    const userId = app.globalData.userId;

    if (!nick) {
      wx.showToast({ title: "请输入昵称", icon: "none" });
      return;
    }
    if (!userId) {
      wx.showToast({ title: "用户信息异常", icon: "none" });
      return;
    }
    const userDocId = app.globalData.userDocId;
    if (!userDocId) {
      wx.showToast({ title: "用户信息异常", icon: "none" });
      return;
    }

    wx.showLoading({ title: "保存中...", mask: true });
    const finish = (avatarUrl) => {
      const finalAvatar = avatarUrl || this.data.user.avatarUrl || "";
      app.globalData.userDocId = userDocId;
      app.globalData.userProfile = { nickname: nick, avatarUrl: finalAvatar };
      this.setData({
        hasUser: true,
        user: {
          nickname: nick,
          userIdShort: userId.slice(0, 8),
          avatarUrl: finalAvatar
        },
        editAvatarUrl: "",
        showEditModal: false
      });
      wx.hideLoading();
      wx.showToast({ title: "保存成功", icon: "success" });
    };

    const doUpdate = (avatarUrl) => {
      const payload = {
        nickname: nick,
        avatarUrl: avatarUrl || this.data.user.avatarUrl || "",
        updatedAt: db.serverDate()
      };
      return db.collection("users")
        .doc(userDocId)
        .update({ data: payload })
        .then(() => finish(payload.avatarUrl));
    };

    // 若选择了新头像（临时路径），先上传到云存储
    const isTempPath = editAvatarUrl && !editAvatarUrl.startsWith("cloud://");
    if (isTempPath) {
      const cloudPath = `avatars/${userId}_${Date.now()}.jpg`;
      wx.cloud.uploadFile({
        cloudPath,
        filePath: editAvatarUrl
      })
        .then((res) => doUpdate(res.fileID))
        .catch((err) => {
          console.error("头像上传失败", err);
          wx.hideLoading();
          wx.showToast({ title: "头像上传失败", icon: "none" });
        });
    } else {
      const avatarUrl = editAvatarUrl || this.data.user.avatarUrl || "";
      doUpdate(avatarUrl).catch((err) => {
        console.error("更新失败", err);
        wx.hideLoading();
        wx.showToast({ title: "保存失败", icon: "none" });
      });
    }
  },

  logout() {
    wx.showModal({
      title: "确认退出",
      content: "确定要退出并切换账号吗？",
      success: (res) => {
        if (!res.confirm) return;

        try {
          wx.removeStorageSync("signupNickName");
          wx.removeStorageSync("signupAvatarFileId");
          wx.removeStorageSync("hasWeChatAuth");
          wx.removeStorageSync("userId");
          wx.removeStorageSync("userDocId");
          wx.removeStorageSync("userNickname");
        } catch (e) {}

        app.clearAuthState();
        app.globalData.userId = "";
        app.globalData.userDocId = "";
        app.globalData.userProfile = null;

        this.setData({ hasUser: false, isGuest: true });

        wx.showToast({ title: "已退出", icon: "success" });
        wx.reLaunch({ url: "/pages/welcome/welcome" });
      }
    });
  }
});

