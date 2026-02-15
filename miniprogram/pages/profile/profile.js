const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    hasUser: false,
    user: {
      nickname: "",
      userIdShort: ""
    },
    showEditModal: false,
    editNickname: ""
  },

  onShow() {
    // 使用全局的 ensureUserReady 方法，它会自动检查并创建用户记录
    app.ensureUserReady(() => {
      this.loadUserProfile();
    });
  },

  loadUserProfile() {
    const db = wx.cloud.database();
    const userId = app.globalData.userId;

    if (!userId) {
      this.setData({ hasUser: false });
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
            nickname: user.nickname || ""
          };
          
          // 用户已存在，直接显示（即使没有昵称也算已登录）
          this.setData({
            hasUser: true, // 有用户记录就算已登录，不需要强制填写昵称
            user: {
              nickname: user.nickname || "",
              userIdShort: userId.slice(0, 8)
            }
          });
        } else {
          // 如果查询不到，说明 ensureUserReady 可能还没执行完，稍等再试
          // 或者用户记录创建失败
          this.setData({ hasUser: false });
        }
      })
      .catch((err) => {
        console.error("查询 users 失败:", err);
        this.setData({ hasUser: false });
      });
  },

  // 首次注册入口（完善资料）
  startRegister() {
    const userId = app.globalData.userId;
    const userDocId = app.globalData.userDocId;
    
    if (!userId) {
      // 如果还没有 openid，先获取并创建用户
      wx.cloud
        .callFunction({
          name: "login"
        })
        .then((res) => {
          if (res.result && res.result.openid) {
            app.globalData.userId = res.result.openid;
            // 确保用户记录已创建
            return this.ensureUserRecord();
          } else {
            wx.showToast({ title: "获取用户信息失败", icon: "none" });
          }
        })
        .then(() => {
          this.setData({
            showEditModal: true,
            editNickname: ""
          });
        })
        .catch((err) => {
          console.error("获取 openid 失败:", err);
          wx.showToast({ title: "请检查云函数是否部署", icon: "none" });
        });
      return;
    }
    
    // 如果已有 userId 但没有 userDocId，先确保记录存在
    if (!userDocId) {
      this.ensureUserRecord().then(() => {
        this.setData({
          showEditModal: true,
          editNickname: ""
        });
      });
    } else {
      this.setData({
        showEditModal: true,
        editNickname: ""
      });
    }
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
      editNickname: user.nickname
    });
  },

  closeEditModal() {
    this.setData({ showEditModal: false });
  },

  stopTap() {
    // 阻止冒泡
  },

  onInputNickname(e) {
    const nick = (e.detail.value || "").trim();
    this.setData({ editNickname: nick });
  },

  saveProfile() {
    const nick = (this.data.editNickname || "").trim();
    const userId = app.globalData.userId;

    if (!nick) {
      wx.showToast({ title: "请输入昵称", icon: "none" });
      return;
    }
    if (!userId) {
      wx.showToast({ title: "用户信息异常", icon: "none" });
      return;
    }

    wx.showLoading({ title: "保存中...", mask: true });

    const userDocId = app.globalData.userDocId;
    const payload = {
      nickname: nick,
      updatedAt: db.serverDate()
    };

    const finish = (_id) => {
      app.globalData.userDocId = _id;
      app.globalData.userProfile = { nickname: nick };
      this.setData({
        hasUser: true,
        user: {
          nickname: nick,
          userIdShort: userId.slice(0, 8)
        },
        showEditModal: false
      });
      wx.hideLoading();
      wx.showToast({ title: "保存成功", icon: "success" });
    };

    if (userDocId) {
      console.log("更新现有用户记录，_id:", userDocId);
      db.collection("users")
        .doc(userDocId)
        .update({ data: payload })
        .then((res) => {
          console.log("更新成功，返回结果:", res);
          finish(userDocId);
        })
        .catch((err) => {
          console.error("更新失败，完整错误:", err);
          console.error("错误信息:", err.errMsg || err.message);
          wx.hideLoading();
          wx.showToast({ 
            title: `保存失败: ${err.errMsg || err.message || "未知错误"}`,
            icon: "none",
            duration: 3000
          });
        });
    } else {
      console.log("创建新用户记录");
      db.collection("users")
        .add({
          data: {
            ...payload,
            createdAt: db.serverDate()
          }
        })
        .then((res) => {
          console.log("创建成功，返回结果:", res);
          console.log("新用户 _id:", res._id);
          finish(res._id);
        })
        .catch((err) => {
          console.error("创建失败，完整错误:", err);
          console.error("错误信息:", err.errMsg || err.message);
          wx.hideLoading();
          wx.showToast({ 
            title: `保存失败: ${err.errMsg || err.message || "未知错误"}`,
            icon: "none",
            duration: 3000
          });
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
        } catch (e) {}

        app.globalData.userId = "";
        app.globalData.userDocId = "";
        app.globalData.userProfile = null;

        this.setData({ hasUser: false });

        wx.showToast({ title: "已退出", icon: "success" });
      }
    });
  }
});

