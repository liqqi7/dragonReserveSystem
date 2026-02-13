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

    // 从本地存储恢复登录状态（管理员邀请码）
    this.restoreAuthState();
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
        console.log("云函数 login 返回:", res);
        
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
        console.log("获取到 openid:", openid);

        return db
          .collection("users")
          .where({ _openid: openid })
          .limit(1)
          .get();
      })
      .then((res) => {
        console.log("查询 users 集合结果:", res);
        if (res.data && res.data.length > 0) {
          // 用户已存在，加载资料
          const user = res.data[0];
          this.globalData.userDocId = user._id;
          this.globalData.userProfile = {
            nickname: user.nickname || ""
          };
          console.log("用户已存在，加载资料:", this.globalData.userProfile);
          callback && callback();
        } else {
          // 用户不存在，自动创建新用户记录
          console.log("用户不存在，自动创建新用户记录");
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
        // 如果是新创建的用户，res 是 add 的结果
        if (res && res._id) {
          console.log("新用户创建成功，_id:", res._id);
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
