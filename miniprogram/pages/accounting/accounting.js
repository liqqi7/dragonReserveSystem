const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    activityList: [],
    selectedActivityId: "",
    selectedActivityIndex: -1,
    selectedActivity: null,
    aaMembers: [],
    aaPayerIndex: -1,
    aaPayerName: "",
    billItem: "",
    billAmount: "",
    settlements: [],
    dailySummary: null
  },

  onLoad() {
    this.checkAuth();
  },

  onShow() {
    if (app.globalData.isAuthenticated) {
      this.loadActivityList();
    } else {
      this.checkAuth();
    }
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
    // 只加载"进行中"或"已结束"的活动
    db.collection("activities")
      .where({
        status: db.command.in(["进行中", "已结束"])
      })
      .orderBy("date", "desc")
      .get()
      .then(res => {
        const list = (res.data || []).map(item => ({
          _id: item._id,
          date: item.date,
          name: item.name,
          status: item.status,
          participants: item.participants || []
        }));
        this.setData({ activityList: list });
        wx.hideLoading();
      })
      .catch(err => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({ title: "加载活动失败", icon: "none" });
      });
  },

  onActivityChange(e) {
    const index = Number(e.detail.value);
    const activity = this.data.activityList[index];
    
    if (!activity) {
      this.setData({
        selectedActivityId: "",
        selectedActivityIndex: -1,
        selectedActivity: null,
        aaMembers: [],
        aaPayerIndex: -1,
        aaPayerName: "",
        settlements: [],
        dailySummary: null
      });
      return;
    }

    // 从活动的 participants 字段直接读取参与人员名单
    const participants = activity.participants || [];
    
    if (participants.length === 0) {
      wx.showToast({ title: "该活动暂无报名人员", icon: "none" });
      this.setData({
        selectedActivityId: "",
        selectedActivityIndex: -1,
        selectedActivity: null,
        aaMembers: [],
        aaPayerIndex: -1,
        aaPayerName: "",
        settlements: [],
        dailySummary: null
      });
      return;
    }

    const aaMembers = participants.map(name => ({
      name,
      checked: true
    }));

    let aaPayerIndex = 0;
    let aaPayerName = aaMembers[0].name;

    this.setData({
      selectedActivityId: activity._id,
      selectedActivityIndex: index,
      selectedActivity: activity,
      aaMembers,
      aaPayerIndex,
      aaPayerName,
      settlements: []
    });

    // 加载该活动日期的当日汇总
    this.loadDailyBills(activity.date);
  },

  onBillItemInput(e) {
    this.setData({ billItem: e.detail.value });
  },

  onBillAmountInput(e) {
    this.setData({ billAmount: e.detail.value });
  },

  onAAPayerChange(e) {
    const index = Number(e.detail.value);
    const aaMembers = (this.data.aaMembers || []).slice();

    if (index >= 0 && index < aaMembers.length) {
      // 取消强制勾选付款人的限制，允许付款人不在参与人名单内
      this.setData({
        aaPayerIndex: index,
        aaPayerName: aaMembers[index].name,
        aaMembers
      });
    }
  },

  onAAParticipantsChange(e) {
    const values = e.detail.value || [];
    const aaMembers = (this.data.aaMembers || []).map(m => ({
      ...m,
      checked: values.includes(m.name)
    }));

    // 取消强制包含付款人的限制，允许用户自主选择参与人
    this.setData({ aaMembers });
  },

  onSelectAllParticipants() {
    const aaMembers = (this.data.aaMembers || []).map(m => ({
      ...m,
      checked: true
    }));
    this.setData({ aaMembers });
  },

  submitBill() {
    const activity = this.data.selectedActivity;
    const item = (this.data.billItem || "").trim();
    const amountNum = parseFloat(this.data.billAmount);
    const aaMembers = this.data.aaMembers || [];
    const payerIndex = this.data.aaPayerIndex;

    if (!activity) {
      wx.showToast({ title: "请选择活动", icon: "none" });
      return;
    }

    if (!item) {
      wx.showToast({ title: "请填写支出事项", icon: "none" });
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      wx.showToast({ title: "金额需大于 0", icon: "none" });
      return;
    }

    if (!aaMembers.length) {
      wx.showToast({ title: "该活动暂无参与人员", icon: "none" });
      return;
    }

    if (payerIndex < 0 || payerIndex >= aaMembers.length) {
      wx.showToast({ title: "请选择付款人", icon: "none" });
      return;
    }

    const payer = aaMembers[payerIndex].name;
    const participants = aaMembers.filter(m => m.checked).map(m => m.name);

    // 必须至少选择一位参与人
    if (!participants.length) {
      wx.showToast({ title: "请选择参与人", icon: "none" });
      return;
    }

    // 严格按照实际勾选的参与人数量计算人均金额
    const count = participants.length;
    const perShare = parseFloat((amountNum / count).toFixed(2));

    // 结算明细：所有参与人都需要支付 perShare 元给付款人
    // 如果付款人也在参与人列表中，付款人自己不需要给自己转账（因为已经垫付了总金额）
    const settlements = participants
      .filter(p => p !== payer)  // 排除付款人自己（如果付款人在参与人列表中）
      .map(p => ({
        from: p,
        to: payer,
        amount: perShare
      }));

    wx.showLoading({ title: "保存中..." });
    db.collection("bills")
      .add({
        data: {
          activityId: activity._id,
          activityName: activity.name,
          date: activity.date,
          item,
          totalAmount: amountNum,
          payer,
          participants,
          perShare,
          createdAt: db.serverDate()
        }
      })
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: "记账成功", icon: "success" });
        this.setData({
          billItem: "",
          billAmount: "",
          settlements
        });
        this.loadDailyBills(activity.date);
      })
      .catch(err => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({ title: "保存失败", icon: "none" });
      });
  },

  loadDailyBills(date) {
    if (!date) {
      this.setData({ dailySummary: null });
      return;
    }

    db.collection("bills")
      .where({ date })
      .get()
      .then(res => {
        const dailySummary = this.buildDailySummary(date, res.data || []);
        this.setData({ dailySummary });
      })
      .catch(err => {
        console.error(err);
      });
  },

  buildDailySummary(date, bills) {
    if (!bills || bills.length === 0) {
      return {
        date,
        totalAmount: 0,
        members: []
      };
    }

    let totalAmount = 0;
    const stats = {};

    bills.forEach(bill => {
      const total = Number(bill.totalAmount) || 0;
      const participants = bill.participants || [];
      const perShareFromDoc = Number(bill.perShare);
      const perShare =
        !isNaN(perShareFromDoc) && perShareFromDoc > 0 && participants.length
          ? perShareFromDoc
          : participants.length
          ? total / participants.length
          : 0;

      totalAmount += total;

      participants.forEach(name => {
        if (!name) return;
        if (!stats[name]) {
          stats[name] = { paid: 0, shouldPay: 0 };
        }
        stats[name].shouldPay += perShare;
      });

      const payerName = bill.payer;
      if (payerName) {
        if (!stats[payerName]) {
          stats[payerName] = { paid: 0, shouldPay: 0 };
        }
        stats[payerName].paid += total;
      }
    });

    const members = Object.keys(stats).map(name => {
      const paid = Number(stats[name].paid.toFixed(2));
      const shouldPay = Number(stats[name].shouldPay.toFixed(2));
      const net = Number((paid - shouldPay).toFixed(2));

      let summaryText = "";
      if (net > 0) {
        summaryText = `垫付 ${paid} 元，应付 ${shouldPay} 元，净应收 ${net} 元`;
      } else if (net < 0) {
        summaryText = `垫付 ${paid} 元，应付 ${shouldPay} 元，净应付 ${Math.abs(
          net
        )} 元`;
      } else {
        summaryText = `垫付 ${paid} 元，应付 ${shouldPay} 元，已结清`;
      }

      return {
        name,
        paid,
        shouldPay,
        net,
        summaryText
      };
    });

    totalAmount = Number(totalAmount.toFixed(2));

    return {
      date,
      totalAmount,
      members
    };
  }
});
