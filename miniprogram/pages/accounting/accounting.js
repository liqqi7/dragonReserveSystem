const app = getApp();
const activityService = require("../../services/activity");
const billService = require("../../services/bill");

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

function formatDateTime(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "";
  return `${formatDate(date)} ${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

function adaptActivity(item) {
  const status = resolveActivityStatus(item);
  const participants = (item.participants || []).map((participant) => ({
    id: participant.user_id,
    participantId: participant.id,
    name: participant.nickname_snapshot || "",
    checkedInAt: formatDateTime(participant.checked_in_at)
  }));

  return {
    _id: String(item.id),
    date: formatDate(item.start_time),
    name: item.name,
    status,
    participants
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

function adaptBill(item) {
  return {
    _id: String(item.id),
    activityId: item.activity_id != null ? String(item.activity_id) : "",
    date: formatDate(item.date),
    item: item.item,
    totalAmount: Number(item.total_amount || 0),
    payer: item.payer_name_snapshot || "",
    payerUserId: item.payer_user_id != null ? String(item.payer_user_id) : "",
    perShare: Number(item.per_share || 0),
    participants: (item.participants || []).map((participant) => ({
      id: participant.user_id,
      name: participant.nickname_snapshot || ""
    }))
  };
}

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
    dailySummary: null,
    isGuest: true
  },

  onLoad() {
    this.syncGuestState();
  },

  onShow() {
    const isGuest = this.syncGuestState();
    if (!isGuest) {
      this.loadActivityList();
    }
  },

  syncGuestState() {
    const hasWeChatAuth = !!wx.getStorageSync("hasWeChatAuth");
    const isAuthenticated = app.globalData.isAuthenticated;
    const isGuest = !hasWeChatAuth || !isAuthenticated;
    this.setData({ isGuest });
    return isGuest;
  },

  loadActivityList() {
    wx.showLoading({ title: "加载中..." });
    activityService
      .listActivities()
      .then((activities) => {
        const list = (activities || [])
          .map(adaptActivity)
          .filter((activity) => activity.status === "进行中" || activity.status === "已结束")
          .sort((a, b) => (a.date < b.date ? 1 : -1));
        this.setData({ activityList: list });
        wx.hideLoading();
      })
      .catch((err) => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || "加载活动失败", icon: "none" });
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

    const aaMembers = participants.map((participant) => ({
      id: participant.id != null ? String(participant.id) : "",
      name: participant.name,
      checked: true
    }));

    this.setData({
      selectedActivityId: activity._id,
      selectedActivityIndex: index,
      selectedActivity: activity,
      aaMembers,
      aaPayerIndex: 0,
      aaPayerName: aaMembers[0].name,
      settlements: []
    });

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
      this.setData({
        aaPayerIndex: index,
        aaPayerName: aaMembers[index].name,
        aaMembers
      });
    }
  },

  onAAParticipantsChange(e) {
    const values = e.detail.value || [];
    const aaMembers = (this.data.aaMembers || []).map((member) => ({
      ...member,
      checked: values.includes(member.name)
    }));
    this.setData({ aaMembers });
  },

  onSelectAllParticipants() {
    const aaMembers = (this.data.aaMembers || []).map((member) => ({
      ...member,
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

    const payer = aaMembers[payerIndex];
    const participants = aaMembers.filter((member) => member.checked);

    if (!participants.length) {
      wx.showToast({ title: "请选择参与人", icon: "none" });
      return;
    }
    if (!payer.id) {
      wx.showToast({ title: "付款人信息不完整", icon: "none" });
      return;
    }
    if (participants.some((member) => !member.id)) {
      wx.showToast({ title: "参与人信息不完整", icon: "none" });
      return;
    }

    const count = participants.length;
    const perShare = Number((amountNum / count).toFixed(2));
    const settlements = participants
      .filter((member) => member.name !== payer.name)
      .map((member) => ({
        from: member.name,
        to: payer.name,
        amount: perShare
      }));

    wx.showLoading({ title: "保存中..." });
    billService
      .createBill({
        activity_id: Number(activity._id),
        item,
        note: "",
        total_amount: amountNum,
        payer_user_id: Number(payer.id),
        participant_user_ids: participants.map((member) => Number(member.id)),
        date: activity.date
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
      .catch((err) => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || "保存失败", icon: "none" });
      });
  },

  loadDailyBills(date) {
    if (!date) {
      this.setData({ dailySummary: null });
      return;
    }

    billService
      .listBills()
      .then((bills) => {
        const dailyBills = (bills || [])
          .map(adaptBill)
          .filter((bill) => bill.date === date);
        const dailySummary = this.buildDailySummary(date, dailyBills);
        this.setData({ dailySummary });
      })
      .catch((err) => {
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

    bills.forEach((bill) => {
      const total = Number(bill.totalAmount) || 0;
      const participants = (bill.participants || []).map((participant) => participant.name);
      const perShareFromDoc = Number(bill.perShare);
      const perShare =
        !isNaN(perShareFromDoc) && perShareFromDoc > 0 && participants.length
          ? perShareFromDoc
          : participants.length
          ? total / participants.length
          : 0;

      totalAmount += total;

      participants.forEach((name) => {
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

    const members = Object.keys(stats).map((name) => {
      const paid = Number(stats[name].paid.toFixed(2));
      const shouldPay = Number(stats[name].shouldPay.toFixed(2));
      const net = Number((paid - shouldPay).toFixed(2));

      let summaryText = "";
      if (net > 0) {
        summaryText = `垫付 ${paid} 元，应付 ${shouldPay} 元，净应收 ${net} 元`;
      } else if (net < 0) {
        summaryText = `垫付 ${paid} 元，应付 ${shouldPay} 元，净应付 ${Math.abs(net)} 元`;
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
