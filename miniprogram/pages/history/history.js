const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    activeTab: "activity", // activity 或 bill
    activityList: [],
    billList: [],
    memberStats: [], // 成员统计（活动tab）
    activityBillStats: [], // 活动账单统计（账单tab）
    selectedActivityBills: null, // 选中的活动账单明细
    showBillDetail: false
  },

  onLoad() {
    this.checkAuth();
  },

  onShow() {
    if (app.globalData.isAuthenticated) {
      this.loadActivityList();
      this.loadBillList();
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

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    
    if (tab === "activity") {
      this.calculateMemberStats();
    } else {
      this.calculateActivityBillStats();
    }
  },

  loadActivityList() {
    db.collection("activities")
      .orderBy("date", "desc")
      .get()
      .then(res => {
        const list = (res.data || []).map(item => ({
          _id: item._id,
          date: item.date,
          name: item.name,
          status: item.status || "进行中",
          participants: item.participants || []
        }));
        this.setData({ activityList: list });
        this.calculateMemberStats();
      })
      .catch(err => {
        console.error(err);
      });
  },

  loadBillList() {
    db.collection("bills")
      .orderBy("createdAt", "desc")
      .get()
      .then(res => {
        const list = res.data.map(item => ({
          _id: item._id,
          activityId: item.activityId || "",
          activityName: item.activityName || "",
          date: item.date,
          item: item.item,
          totalAmount: item.totalAmount,
          payer: item.payer,
          perShare: item.perShare,
          participants: item.participants || [],
          participantsText: (item.participants || []).join("、")
        }));
        this.setData({ billList: list });
        this.calculateActivityBillStats();
      })
      .catch(err => {
        console.error(err);
      });
  },

  // 计算成员统计（活动tab）
  calculateMemberStats() {
    const { activityList } = this.data;
    
    // 统计每个成员参加的活动次数
    const memberCountMap = {};
    const totalActivities = activityList.length;
    
    activityList.forEach(activity => {
      const participants = activity.participants || [];
      participants.forEach(name => {
        if (!memberCountMap[name]) {
          memberCountMap[name] = 0;
        }
        memberCountMap[name]++;
      });
    });

    // 转换为数组并计算出席率
    const memberStats = Object.keys(memberCountMap).map(name => {
      const participateCount = memberCountMap[name];
      const attendanceRate = totalActivities > 0 
        ? ((participateCount / totalActivities) * 100).toFixed(1)
        : 0;
      
      return {
        name,
        participateCount,
        totalActivities,
        attendanceRate: parseFloat(attendanceRate)
      };
    });

    // 按参加次数降序排列
    memberStats.sort((a, b) => b.participateCount - a.participateCount);

    this.setData({ memberStats });
  },

  // 计算活动账单统计（账单tab）
  calculateActivityBillStats() {
    const { billList } = this.data;
    
    // 按活动分组统计
    const activityMap = {};
    
    billList.forEach(bill => {
      const activityId = bill.activityId || bill.activityName || "未关联活动";
      const activityName = bill.activityName || "未命名活动";
      const date = bill.date;
      
      if (!activityMap[activityId]) {
        activityMap[activityId] = {
          activityId,
          activityName,
          date,
          bills: [],
          totalAmount: 0,
          allParticipants: new Set()
        };
      }
      
      activityMap[activityId].bills.push(bill);
      activityMap[activityId].totalAmount += bill.totalAmount;
      
      // 收集所有参与人
      bill.participants.forEach(name => {
        activityMap[activityId].allParticipants.add(name);
      });
    });

    // 转换为数组并计算人均支出
    const activityBillStats = Object.keys(activityMap).map(key => {
      const activity = activityMap[key];
      const participantCount = activity.allParticipants.size;
      const avgAmount = participantCount > 0 
        ? parseFloat((activity.totalAmount / participantCount).toFixed(2))
        : 0;
      
      return {
        activityId: activity.activityId,
        activityName: activity.activityName,
        date: activity.date,
        totalAmount: parseFloat(activity.totalAmount.toFixed(2)),
        participantCount,
        avgAmount,
        bills: activity.bills.map(bill => ({
          ...bill,
          participants: bill.participants || [],
          participantsText: (bill.participants || []).join("、")
        }))
      };
    });

    // 按日期降序排列
    activityBillStats.sort((a, b) => {
      if (a.date > b.date) return -1;
      if (a.date < b.date) return 1;
      return 0;
    });

    this.setData({ activityBillStats });
  },

  // 查看活动账单明细
  showActivityBillDetail(e) {
    const activity = e.currentTarget.dataset.activity;
    // 确保每个bill都有participantsText
    const billsWithText = activity.bills.map(bill => ({
      ...bill,
      participants: bill.participants || [],
      participantsText: (bill.participants && bill.participants.length > 0) 
        ? bill.participants.join('、') 
        : '无'
    }));
    const settlements = this.calculateSettlements(billsWithText);
    this.setData({
      selectedActivityBills: {
        ...activity,
        bills: billsWithText,
        settlements
      },
      showBillDetail: true
    });
  },

  // 计算结算结果（谁要给谁打钱）
  calculateSettlements(bills) {
    if (!bills || bills.length === 0) return [];

    const stats = {};
    
    // 统计每个人的垫付和应付
    bills.forEach(bill => {
      const total = Number(bill.totalAmount) || 0;
      const participants = bill.participants || [];
      const perShare = Number(bill.perShare) || 0;
      const payer = bill.payer;

      // 统计每个参与人的应付
      participants.forEach(name => {
        if (!stats[name]) {
          stats[name] = { paid: 0, shouldPay: 0 };
        }
        stats[name].shouldPay += perShare;
      });

      // 统计付款人的垫付
      if (payer) {
        if (!stats[payer]) {
          stats[payer] = { paid: 0, shouldPay: 0 };
        }
        stats[payer].paid += total;
      }
    });

    // 计算每个人的净额
    const netAmounts = {};
    Object.keys(stats).forEach(name => {
      const paid = Number(stats[name].paid.toFixed(2));
      const shouldPay = Number(stats[name].shouldPay.toFixed(2));
      const net = Number((paid - shouldPay).toFixed(2));
      if (net !== 0) {
        netAmounts[name] = net;
      }
    });

    // 生成结算明细：应付钱的人给应收钱的人转账
    const settlements = [];
    const creditors = []; // 应收钱的人（净额>0）
    const debtors = [];   // 应付钱的人（净额<0）

    Object.keys(netAmounts).forEach(name => {
      const net = netAmounts[name];
      if (net > 0) {
        creditors.push({ name, amount: net });
      } else {
        debtors.push({ name, amount: Math.abs(net) });
      }
    });

    // 按金额排序
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    // 匹配结算
    let creditorIndex = 0;
    let debtorIndex = 0;

    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = creditors[creditorIndex];
      const debtor = debtors[debtorIndex];

      const amount = Math.min(creditor.amount, debtor.amount);
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: parseFloat(amount.toFixed(2))
      });

      creditor.amount -= amount;
      debtor.amount -= amount;

      if (creditor.amount <= 0.01) creditorIndex++;
      if (debtor.amount <= 0.01) debtorIndex++;
    }

    return settlements;
  },

  // 删除记账明细
  deleteBill(e) {
    const billId = e.currentTarget.dataset.billId;
    const activity = this.data.selectedActivityBills;
    
    wx.showModal({
      title: "确认删除",
      content: "确定要删除这条记账记录吗？",
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: "删除中..." });
          db.collection("bills")
            .doc(billId)
            .remove()
            .then(() => {
              wx.hideLoading();
              wx.showToast({ title: "删除成功", icon: "success" });
              // 重新加载数据
              this.loadBillList();
              // 如果弹窗打开，更新显示
              if (this.data.showBillDetail && activity) {
                setTimeout(() => {
                  const updatedActivity = this.data.activityBillStats.find(
                    a => a.activityId === activity.activityId
                  );
                  if (updatedActivity) {
                    // 确保每个bill都有participantsText
                    const billsWithText = updatedActivity.bills.map(bill => ({
                      ...bill,
                      participants: bill.participants || [],
                      participantsText: (bill.participants && bill.participants.length > 0) 
                        ? bill.participants.join('、') 
                        : '无'
                    }));
                    const settlements = this.calculateSettlements(billsWithText);
                    this.setData({
                      selectedActivityBills: {
                        ...updatedActivity,
                        bills: billsWithText,
                        settlements
                      }
                    });
                  }
                }, 500);
              }
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

  closeBillDetail() {
    this.setData({
      selectedActivityBills: null,
      showBillDetail: false
    });
  },

  stopPropagation() {
    // 阻止事件冒泡
  }
});
