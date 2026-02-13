const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    activityList: [],
    filteredList: [],
    showEditModal: false,
    showSignupModal: false,
    showDetailModal: false,
    currentActivity: null,
    editForm: {
      date: "",
      name: "",
      status: "进行中",
      remark: ""
    },
    userNickname: "", // 当前用户的昵称
    detailActivity: null,
    isAdmin: false,
    searchKeyword: "",
    selectedFilter: "全部"
  },

  onLoad() {
    this.checkAuth();
  },

  onShow() {
    // 每次显示页面时刷新活动列表
    if (app.globalData.isAuthenticated) {
      this.setData({ isAdmin: app.globalData.userRole === "admin" });
      this.loadActivityList();
    } else {
      this.checkAuth();
    }
  },

  // 切换账号功能
  switchAccount() {
    wx.showModal({
      title: "切换账号",
      content: "确定要退出并切换账号吗？",
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储
          try {
            wx.removeStorageSync('userRole');
            wx.removeStorageSync('isAuthenticated');
          } catch (e) {
            console.error('清除本地存储失败', e);
          }

          // 清除全局变量
          app.clearAuthState();

          // 跳转到登录页面
          wx.reLaunch({
            url: '/pages/auth/auth'
          });
        }
      }
    });
  },

  checkAuth() {
    if (!app.globalData.isAuthenticated) {
      wx.redirectTo({
        url: '/pages/auth/auth'
      });
    }
  },

  loadActivityList() {
    wx.showLoading({ title: "加载中..." });
    db.collection("activities")
      .orderBy("date", "desc")
      .get()
      .then(res => {
        const list = (res.data || []).map(item => ({
          _id: item._id,
          date: item.date,
          name: item.name,
          status: item.status || "进行中",
          remark: item.remark || "",
          participants: item.participants || [],
          maxParticipants: item.maxParticipants || 20
        }));

        this.setData({ activityList: list });
        this.filterActivities();
        
        // 更新 maxParticipants 字段（如果不存在）
        const updatePromises = list
          .filter(item => !item.maxParticipants)
          .map(item => 
            db.collection("activities")
              .doc(item._id)
              .update({
                data: { maxParticipants: 20 }
              })
          );
        if (updatePromises.length > 0) {
          Promise.all(updatePromises).catch(console.error);
        }
        wx.hideLoading();
      })
      .catch(err => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({ title: "加载失败", icon: "none" });
      });
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

  filterActivities() {
    const { activityList, searchKeyword, selectedFilter } = this.data;
    let filtered = [...activityList];

    // 按状态筛选
    if (selectedFilter !== "全部") {
      filtered = filtered.filter(item => item.status === selectedFilter);
    }

    // 按关键词搜索
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(keyword) ||
        (item.remark && item.remark.toLowerCase().includes(keyword))
      );
    }

    this.setData({ filteredList: filtered });
  },

  // 管理员：创建活动
  showCreateModal() {
    this.setData({
      showEditModal: true,
      currentActivity: null,
      editForm: {
        date: "",
        name: "",
        status: "进行中",
        remark: ""
      }
    });
  },

  // 管理员：编辑活动
  showEditModal(e) {
    const activity = e.currentTarget.dataset.activity;
    this.setData({
      showEditModal: true,
      currentActivity: activity,
      editForm: {
        date: activity.date,
        name: activity.name,
        status: activity.status,
        remark: activity.remark || ""
      }
    });
  },

  onEditFormChange(e) {
    const field = e.currentTarget.dataset.field;
    let value = e.detail.value;
    
    // 如果是状态选择器，需要从数组中取值
    if (field === "status") {
      const statusList = ["进行中", "已取消", "已结束"];
      value = statusList[Number(value)] || "进行中";
    }
    
    this.setData({
      [`editForm.${field}`]: value
    });
  },

  saveActivity() {
    const form = this.data.editForm;
    if (!form.date) {
      wx.showToast({ title: "请选择日期", icon: "none" });
      return;
    }
    if (!form.name.trim()) {
      wx.showToast({ title: "请输入活动名称", icon: "none" });
      return;
    }

    wx.showLoading({ title: "保存中..." });
    const isEdit = !!this.data.currentActivity;
    const data = {
      date: form.date,
      name: form.name.trim(),
      status: form.status,
      remark: form.remark.trim(),
          participants: isEdit ? (this.data.currentActivity.participants || []) : [],
          maxParticipants: isEdit ? (this.data.currentActivity.maxParticipants || 20) : 20,
          updatedAt: db.serverDate()
        };

        if (isEdit) {
          // 编辑
          db.collection("activities")
            .doc(this.data.currentActivity._id)
            .update({ data })
            .then(() => {
              wx.hideLoading();
              wx.showToast({ title: "更新成功", icon: "success" });
              this.closeEditModal();
              this.loadActivityList();
            })
        .catch(err => {
          console.error(err);
          wx.hideLoading();
          wx.showToast({ title: "更新失败", icon: "none" });
        });
    } else {
      // 新建
      data.createdAt = db.serverDate();
      db.collection("activities")
        .add({ data })
        .then(() => {
          wx.hideLoading();
          wx.showToast({ title: "创建成功", icon: "success" });
          this.closeEditModal();
          this.loadActivityList();
        })
        .catch(err => {
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
        date: "",
        name: "",
        status: "进行中",
        remark: ""
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
          db.collection("activities")
            .doc(activity._id)
            .remove()
            .then(() => {
              wx.hideLoading();
              wx.showToast({ title: "删除成功", icon: "success" });
              this.loadActivityList();
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

  // 用户：报名
  showSignupModal(e) {
    const activity = e.currentTarget.dataset.activity;
    if (activity.status !== "进行中") {
      wx.showToast({ title: "该活动已结束或已取消", icon: "none" });
      return;
    }
    const app = getApp();
    // 校验是否已在"我的"页面完成公会登记，并且有昵称
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

    this.setData({
      showSignupModal: true,
      currentActivity: activity
    });
  },

  submitSignup() {
    const app = getApp();
    const nickname = app.globalData.userProfile?.nickname?.trim();

    if (!nickname) {
      wx.showToast({ title: "请先完善昵称", icon: "none" });
      return;
    }

    const activity = this.data.currentActivity;
    if (!activity) {
      wx.showToast({ title: "活动信息有误", icon: "none" });
      return;
    }

    const participants = [...(activity.participants || [])];

    // 使用昵称作为唯一标识，检查是否已报名
    if (participants.includes(nickname)) {
      wx.showToast({ title: "您已报名", icon: "none" });
      return;
    }

    participants.push(nickname);

    wx.showLoading({ title: "报名中..." });

    // 使用云函数更新（云函数有管理员权限，不受数据库权限限制）
    wx.cloud.callFunction({
      name: 'signupActivity',
      data: {
        activityId: activity._id,
        nickname
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
          this.closeSignupModal();
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

  closeSignupModal() {
    this.setData({
      showSignupModal: false,
      currentActivity: null,
      userNickname: ""
    });
  },

  // 查看详情
  showDetail(e) {
    const activity = e.currentTarget.dataset.activity;
    this.setData({
      showDetailModal: true,
      detailActivity: activity
    });
  },

  closeDetailModal() {
    this.setData({
      showDetailModal: false,
      detailActivity: null
    });
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
    
    // 1. 从活动参与者列表中删除
    const participants = (activity.participants || []).filter(p => p !== name);
    
    db.collection("activities")
      .doc(activity._id)
      .update({
        data: {
          participants: participants,
          updatedAt: db.serverDate()
        }
      })
      .then(() => {
        // 2. 查找并处理包含该成员的记账记录
        return db.collection("bills")
          .where({
            activityId: activity._id
          })
          .get();
      })
      .then(res => {
        const billsToDelete = [];
        const billsToUpdate = [];
        
        res.data.forEach(bill => {
          const billParticipants = bill.participants || [];
          const isPayer = bill.payer === name;
          const isParticipant = billParticipants.includes(name);
          
          if (isPayer) {
            // 如果该成员是付款人，删除整条记录
            billsToDelete.push(bill._id);
          } else if (isParticipant) {
            // 如果该成员是参与人，从参与人列表中移除
            const newParticipants = billParticipants.filter(p => p !== name);
            
            if (newParticipants.length === 0) {
              // 如果删除后没有参与人了，删除整条记账记录
              billsToDelete.push(bill._id);
            } else {
              // 重新计算人均金额
              const newPerShare = parseFloat((bill.totalAmount / newParticipants.length).toFixed(2));
              billsToUpdate.push({
                id: bill._id,
                data: {
                  participants: newParticipants,
                  perShare: newPerShare,
                  updatedAt: db.serverDate()
                }
              });
            }
          }
        });

        // 执行删除操作
        const deletePromises = billsToDelete.map(id => 
          db.collection("bills").doc(id).remove()
        );

        // 执行更新操作
        const updatePromises = billsToUpdate.map(item =>
          db.collection("bills").doc(item.id).update({ data: item.data })
        );

        return Promise.all([...deletePromises, ...updatePromises]);
      })
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: "删除成功", icon: "success" });
        // 刷新活动列表和详情
        this.loadActivityList();
        // 更新详情显示
        const updatedActivity = {
          ...activity,
          participants: participants
        };
        this.setData({ detailActivity: updatedActivity });
      })
      .catch(err => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({ title: "删除失败", icon: "none" });
      });
  },

  getStatusColor(status) {
    const colors = {
      "进行中": "#07c160",
      "已取消": "#999999",
      "已结束": "#fa5151"
    };
    return colors[status] || "#999999";
  },

  stopPropagation() {
    // 阻止事件冒泡
  }
});
