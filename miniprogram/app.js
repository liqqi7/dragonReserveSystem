App({
  globalData: {
    // 角色/权限（原有逻辑）
    userRole: null, // 'user' | 'admin'
    isAuthenticated: false,
    userInfo: null,

    // 自定义用户体系
    userId: "",        // openid
    userDocId: "",     // users 集合中的 _id
    userProfile: null  // { nickname }
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: "cloudbase-0grjcjxkb55037a3", // 你的云开发环境 ID
        traceUser: true
      });
    }

    // 从本地存储恢复登录状态（权限 + 用户）
    this.restoreAuthState();
    this.restoreUserFromStorage();
  },

  /** 若已做过微信授权，从本地存储恢复 userId 等，供 welcome 页判断是否跳过 */
  restoreUserFromStorage() {
    try {
      if (!wx.getStorageSync("hasWeChatAuth")) return;
      const userId = wx.getStorageSync("userId");
      if (userId) {
        this.globalData.userId = userId;
        const userDocId = wx.getStorageSync("userDocId");
        const nickname = wx.getStorageSync("userNickname") || "";
        if (userDocId) this.globalData.userDocId = userDocId;
        this.globalData.userProfile = { nickname };
      }
    } catch (e) {
      console.error("恢复用户缓存失败", e);
    }
  },

  /** 管理员邀请码登录的状态恢复 */
  restoreAuthState() {
    try {
      const userRole = wx.getStorageSync("userRole");
      const isAuthenticated = wx.getStorageSync("isAuthenticated");

      if (userRole && isAuthenticated) {
        this.globalData.userRole = userRole;
        this.globalData.isAuthenticated = true;
        this.globalData.userInfo = {
          role: userRole
        };
      }
    } catch (e) {
      console.error("恢复登录状态失败", e);
    }
  },

  setAuthState(role, isAuthenticated) {
    this.globalData.userRole = role;
    this.globalData.isAuthenticated = isAuthenticated;
    this.globalData.userInfo = {
      role: role
    };

    // 持久化到本地存储
    try {
      wx.setStorageSync("userRole", role);
      wx.setStorageSync("isAuthenticated", isAuthenticated);
    } catch (e) {
      console.error("保存登录状态失败", e);
    }

    // 同步到云数据库，重新登录后可恢复
    if (this.globalData.userDocId) {
      const db = wx.cloud.database();
      db.collection("users").doc(this.globalData.userDocId).update({
        data: { role: role || "", updatedAt: db.serverDate() }
      }).catch(() => {});
    }
  },

  clearAuthState() {
    this.globalData.userRole = null;
    this.globalData.isAuthenticated = false;
    this.globalData.userInfo = null;

    try {
      wx.removeStorageSync("userRole");
      wx.removeStorageSync("isAuthenticated");
    } catch (e) {
      console.error("清除登录状态失败", e);
    }
  },

  /**
   * 自定义用户体系：确保已获取 openid 并在 users 集合中有记录。
   * 如果有关联账号，直接加载资料并执行回调。
   * 若无关联账号，自动创建一条新记录，然后执行回调。
   */
  ensureUserReady(callback) {
    if (this.globalData.userId && this.globalData.userProfile) {
      callback && callback();
      return;
    }

    const db = wx.cloud.database();

    wx.cloud
      .callFunction({
        name: "login"
      })
      .then((res) => {
        // 处理多种返回格式
        let openid = null;
        if (res && res.result) {
          if (typeof res.result === 'string') {
            openid = res.result;
          } else if (typeof res.result === 'object') {
            openid = res.result.openid || 
                     res.result.OPENID || 
                     res.result.data?.openid ||
                     (res.result.userInfo && res.result.userInfo.openId) ||
                     (res.result.userInfo && res.result.userInfo.openid);
          }
        }
        
        if (!openid) {
          throw new Error("云函数返回的 openid 为空");
        }
        
        this.globalData.userId = openid;

        return db
          .collection("users")
          .where({ _openid: openid })
          .limit(1)
          .get();
      })
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const user = res.data[0];
          this.globalData.userDocId = user._id;
          this.globalData.userProfile = {
            nickname: user.nickname || ""
          };
          // 从数据库恢复角色（退出登录后重新登录时本地存储已清空）
          if (user.role && !this.globalData.userRole) {
            this.setAuthState(user.role, true);
          }
          callback && callback();
        } else {
          return db.collection("users").add({
            data: {
              nickname: "", // 初始为空，用户可在"我的"页面填写
              createdAt: db.serverDate(),
              updatedAt: db.serverDate()
              // _openid 会自动由云数据库填充
            }
          });
        }
      })
      .then((res) => {
        if (res && res._id) {
          this.globalData.userDocId = res._id;
          this.globalData.userProfile = {
            nickname: ""
          };
          // 新用户创建后，执行回调（不强制跳转，让调用方决定）
          callback && callback();
        } else {
          // 如果 res 为空，说明是已存在的用户，已经在上面处理了
          callback && callback();
        }
      })
      .catch((err) => {
        console.error("ensureUserReady error", err);
        wx.showToast({
          title: "获取用户信息失败，请检查云函数",
          icon: "none",
          duration: 3000
        });
      });
  }
});
