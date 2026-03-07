const app = getApp();
const activityService = require("../../services/activity");
const billService = require("../../services/bill");
const statsService = require("../../services/stats");

function formatDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    return String(value).split("T")[0] || "";
  }
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function adaptBill(item) {
  const participants = (item.participants || []).map((participant) => ({
    id: participant.id,
    userId: participant.user_id != null ? String(participant.user_id) : "",
    name: participant.nickname_snapshot || ""
  }));
  const names = participants.map((participant) => participant.name).filter(Boolean);

  return {
    _id: String(item.id),
    activityId: item.activity_id != null ? String(item.activity_id) : "",
    activityName: item.activity_name || "未关联活动",
    date: formatDate(item.date),
    item: item.item,
    totalAmount: Number(item.total_amount || 0),
    payer: item.payer_name_snapshot || "",
    payerUserId: item.payer_user_id != null ? String(item.payer_user_id) : "",
    perShare: Number(item.per_share || 0),
    participants,
    participantNames: names,
    participantsText: names.join("、") || "无"
  };
}

function resolveActivityStatus(activity) {
  const currentStatus = activity.status || "进行中";
  if (currentStatus === "已取消") return "已取消";

  const now = Date.now();
  const start = activity.start_time ? new Date(activity.start_time).getTime() : NaN;
  const end = activity.end_time ? new Date(activity.end_time).getTime() : NaN;

  if (!isNaN(start) && !isNaN(end)) {
    if (now < start) return "未开始";
    if (now < end) return "进行中";
    return "已结束";
  }

  return currentStatus;
}

Page({
  data: {
    activeTab: "activity",
    billList: [],
    pigeonStats: [],
    endedActivityCount: 0,
    activityBillStats: [],
    selectedActivityBills: null,
    showBillDetail: false,
    isGuest: true
  },

  onLoad() {
    this.syncGuestState();
  },

  onShow() {
    const isGuest = this.syncGuestState();
    if (!isGuest) {
      this.loadEndedActivityCount();
      this.loadPigeonStats();
      this.loadBillList();
    }
  },

  syncGuestState() {
    const hasWeChatAuth = !!wx.getStorageSync("hasWeChatAuth");
    const isAuthenticated = app.globalData.isAuthenticated;
    const isGuest = !hasWeChatAuth || !isAuthenticated;
    this.setData({ isGuest });
    return isGuest;
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  loadEndedActivityCount() {
    activityService
      .listActivities()
      .then((activities) => {
        const endedActivityCount = (activities || []).filter((activity) => resolveActivityStatus(activity) === "已结束").length;
        this.setData({ endedActivityCount });
      })
      .catch((err) => {
        console.error(err);
      });
  },

  loadPigeonStats() {
    statsService
      .getHistoryStats()
      .then((stats) => {
        const pigeonStats = (stats || []).map((item) => ({
          userId: String(item.user_id),
          name: item.nickname,
          signupCount: item.signup_count,
          checkinCount: item.checkin_count,
          pigeonCount: item.pigeon_count,
          pigeonRate: item.pigeon_rate
        }));

        this.setData({ pigeonStats });
      })
      .catch((err) => {
        console.error(err);
        wx.showToast({ title: (err && err.message) || "加载统计失败", icon: "none" });
      });
  },

  loadBillList() {
    billService
      .listBills()
      .then((bills) => {
        const billList = (bills || []).map(adaptBill);
        this.setData({ billList });
        this.calculateActivityBillStats();
      })
      .catch((err) => {
        console.error(err);
        wx.showToast({ title: (err && err.message) || "加载账单失败", icon: "none" });
      });
  },

  calculateActivityBillStats() {
    const { billList } = this.data;
    const activityMap = {};

    billList.forEach((bill) => {
      const activityId = bill.activityId || bill.activityName || "unlinked";
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
      bill.participantNames.forEach((name) => activityMap[activityId].allParticipants.add(name));
    });

    const activityBillStats = Object.keys(activityMap).map((key) => {
      const activity = activityMap[key];
      const participantCount = activity.allParticipants.size;
      const avgAmount = participantCount > 0 ? Number((activity.totalAmount / participantCount).toFixed(2)) : 0;

      return {
        activityId: activity.activityId,
        activityName: activity.activityName,
        date: activity.date,
        totalAmount: Number(activity.totalAmount.toFixed(2)),
        participantCount,
        avgAmount,
        bills: activity.bills.map((bill) => ({
          ...bill,
          participants: bill.participantNames,
          participantsText: bill.participantsText
        }))
      };
    });

    activityBillStats.sort((a, b) => {
      if (a.date > b.date) return -1;
      if (a.date < b.date) return 1;
      return 0;
    });

    this.setData({ activityBillStats });
  },

  showActivityBillDetail(e) {
    const activity = e.currentTarget.dataset.activity;
    const billsWithText = (activity.bills || []).map((bill) => ({
      ...bill,
      participants: bill.participants || [],
      participantsText: bill.participantsText || "无"
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

  calculateSettlements(bills) {
    if (!bills || bills.length === 0) return [];

    const stats = {};

    bills.forEach((bill) => {
      const total = Number(bill.totalAmount) || 0;
      const participants = bill.participants || [];
      const perShare = Number(bill.perShare) || 0;
      const payer = bill.payer;

      participants.forEach((name) => {
        if (!stats[name]) {
          stats[name] = { paid: 0, shouldPay: 0 };
        }
        stats[name].shouldPay += perShare;
      });

      if (payer) {
        if (!stats[payer]) {
          stats[payer] = { paid: 0, shouldPay: 0 };
        }
        stats[payer].paid += total;
      }
    });

    const netAmounts = {};
    Object.keys(stats).forEach((name) => {
      const paid = Number(stats[name].paid.toFixed(2));
      const shouldPay = Number(stats[name].shouldPay.toFixed(2));
      const net = Number((paid - shouldPay).toFixed(2));
      if (net !== 0) {
        netAmounts[name] = net;
      }
    });

    const settlements = [];
    const creditors = [];
    const debtors = [];

    Object.keys(netAmounts).forEach((name) => {
      const net = netAmounts[name];
      if (net > 0) {
        creditors.push({ name, amount: net });
      } else {
        debtors.push({ name, amount: Math.abs(net) });
      }
    });

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    let creditorIndex = 0;
    let debtorIndex = 0;

    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = creditors[creditorIndex];
      const debtor = debtors[debtorIndex];
      const amount = Math.min(creditor.amount, debtor.amount);

      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: Number(amount.toFixed(2))
      });

      creditor.amount -= amount;
      debtor.amount -= amount;

      if (creditor.amount <= 0.01) creditorIndex += 1;
      if (debtor.amount <= 0.01) debtorIndex += 1;
    }

    return settlements;
  },

  deleteBill(e) {
    const billId = e.currentTarget.dataset.billId;
    const activity = this.data.selectedActivityBills;

    wx.showModal({
      title: "确认删除",
      content: "确定要删除这条记账记录吗？",
      success: (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: "删除中..." });
        billService
          .deleteBill(billId)
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: "删除成功", icon: "success" });
            return this.loadBillList();
          })
          .then(() => {
            if (!this.data.showBillDetail || !activity) return;
            const updatedActivity = this.data.activityBillStats.find((item) => item.activityId === activity.activityId);
            if (!updatedActivity) {
              this.setData({ selectedActivityBills: null, showBillDetail: false });
              return;
            }

            const billsWithText = updatedActivity.bills.map((bill) => ({
              ...bill,
              participants: bill.participants || [],
              participantsText: bill.participantsText || "无"
            }));
            const settlements = this.calculateSettlements(billsWithText);
            this.setData({
              selectedActivityBills: {
                ...updatedActivity,
                bills: billsWithText,
                settlements
              }
            });
          })
          .catch((err) => {
            console.error(err);
            wx.hideLoading();
            wx.showToast({ title: (err && err.message) || "删除失败", icon: "none" });
          });
      }
    });
  },

  closeBillDetail() {
    this.setData({
      selectedActivityBills: null,
      showBillDetail: false
    });
  },

  stopPropagation() {}
});
