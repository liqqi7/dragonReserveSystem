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
    // #region agent log
    try{wx.request({url:'http://127.0.0.1:7242/ingest/f34d88b4-b211-4a11-947a-5555be024174',method:'POST',header:{'Content-Type':'application/json'},data:{location:'profile.js:onShow',message:'profile onShow',data:{},timestamp:Date.now(),hypothesisId:'H2'}});}catch(e){}
    // #endregion
    this.syncGuestState();
    app.ensureUserReady(() => {
      // #region agent log
      try{wx.request({url:'http://127.0.0.1:7242/ingest/f34d88b4-b211-4a11-947a-5555be024174',method:'POST',header:{'Content-Type':'application/json'},data:{location:'profile.js:ensureUserReady_callback',message:'ensureUserReady callback fired',data:{},timestamp:Date.now(),hypothesisId:'H2'}});}catch(e){}
      // #endregion
      this.loadUserProfile();
    });
  },

  syncGuestState() {
    const isGuest = !app.globalData.isAuthenticated;
    this.setData({ isGuest });
  },

  loadUserProfile() {
    const db = wx.cloud.database();
    const userId = app.globalData.userId;
    // #region agent log
    try{wx.request({url:'http://127.0.0.1:7242/ingest/f34d88b4-b211-4a11-947a-5555be024174',method:'POST',header:{'Content-Type':'application/json'},data:{location:'profile.js:loadUserProfile',message:'loadUserProfile',data:{userId:!!userId,userIdLen:userId?String(userId).length:0},timestamp:Date.now(),hypothesisId:'H3'}});}catch(e){}
    // #endregion

    if (!userId) {
      // #region agent log
      try{wx.request({url:'http://127.0.0.1:7242/ingest/f34d88b4-b211-4a11-947a-5555be024174',method:'POST',header:{'Content-Type':'application/json'},data:{location:'profile.js:loadUserProfile_noUserId',message:'no userId, set hasUser false',data:{},timestamp:Date.now(),hypothesisId:'H3'}});}catch(e){}
      // #endregion
      this.setData({ hasUser: false, isGuest: !app.globalData.isAuthenticated });
      return;
    }

    // 查询 users 集合
    db.collection("users")
      .where({ _openid: userId })
      .limit(1)
      .get()
      .then((res) => {
        console.log("profile 页查询 users:", res);
        if (res.data && res.data.length > 0) {
          const user = res.data[0];
          app.globalData.userDocId = user._id;
          app.globalData.userProfile = {
            nickname: user.nickname || "",
            avatarUrl: user.avatarUrl || ""
          };
          // #region agent log
          try{wx.request({url:'http://127.0.0.1:7242/ingest/f34d88b4-b211-4a11-947a-5555be024174',method:'POST',header:{'Content-Type':'application/json'},data:{location:'profile.js:loadUserProfile_success',message:'db found user, set hasUser true',data:{nickname:user.nickname||'',userIdShort:userId.slice(0,8)},timestamp:Date.now(),hypothesisId:'H4'}});}catch(e){}
          // #endregion
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
          // #region agent log
          try{wx.request({url:'http://127.0.0.1:7242/ingest/f34d88b4-b211-4a11-947a-5555be024174',method:'POST',header:{'Content-Type':'application/json'},data:{location:'profile.js:loadUserProfile_empty',message:'db returned empty, set hasUser false',data:{},timestamp:Date.now(),hypothesisId:'H4'}});}catch(e){}
          // #endregion
          this.setData({
            hasUser: false,
            isGuest: !app.globalData.isAuthenticated
          });
        }
      })
      .catch((err) => {
        // #region agent log
        try{wx.request({url:'http://127.0.0.1:7242/ingest/f34d88b4-b211-4a11-947a-5555be024174',method:'POST',header:{'Content-Type':'application/json'},data:{location:'profile.js:loadUserProfile_catch',message:'db query failed',data:{errMsg:err&&err.errMsg||''},timestamp:Date.now(),hypothesisId:'H4'}});}catch(e){}
        // #endregion
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
          this.setData({ isGuest: true });
          wx.showToast({ title: "已恢复为游客", icon: "success" });
          setTimeout(() => {
            wx.reLaunch({ url: "/pages/welcome/welcome" });
          }, 500);
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

