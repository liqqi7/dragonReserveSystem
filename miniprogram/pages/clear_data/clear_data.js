const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    clearing: false,
    result: ""
  },

  onLoad() {
    // 只有管理员可以使用
    if (app.globalData.userRole !== "admin") {
      wx.showToast({ title: "无权限", icon: "none" });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  clearAllData() {
    wx.showModal({
      title: "确认清空",
      content: "确定要清空所有活动数据和记账数据吗？此操作不可恢复！",
      confirmText: "确认清空",
      confirmColor: "#fa5151",
      success: (res) => {
        if (res.confirm) {
          this.doClearAllData();
        }
      }
    });
  },

  doClearAllData() {
    this.setData({ clearing: true, result: "正在清空数据..." });

    // 先删除所有活动数据
    db.collection("activities")
      .get()
      .then(res => {
        if (res.data.length === 0) {
          return Promise.resolve([]);
        }
        const deletePromises = res.data.map(item => 
          db.collection("activities").doc(item._id).remove()
        );
        return Promise.all(deletePromises);
      })
      .then(() => {
        this.setData({ result: "活动数据已清空，正在清空记账数据..." });
        // 再删除所有记账数据
        return db.collection("bills").get();
      })
      .then(res => {
        if (res.data.length === 0) {
          return Promise.resolve([]);
        }
        const deletePromises = res.data.map(item => 
          db.collection("bills").doc(item._id).remove()
        );
        return Promise.all(deletePromises);
      })
      .then(() => {
        this.setData({ 
          clearing: false,
          result: "✅ 所有数据已清空！\n\n- 活动数据：已清空\n- 记账数据：已清空"
        });
        wx.showToast({ title: "清空成功", icon: "success" });
      })
      .catch(err => {
        console.error(err);
        this.setData({ 
          clearing: false,
          result: "❌ 清空失败：" + (err.message || "未知错误")
        });
        wx.showToast({ title: "清空失败", icon: "none" });
      });
  }
});
