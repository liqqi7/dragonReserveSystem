const db = wx.cloud.database();

Page({
  data: {
    // 权限相关
    inviteCodeInput: "",
    authenticated: false,
    correctInviteCode: "dragon",

    // Tab
    activeTab: "activity", // activity / aa / history

    // 活动报名
    activityDate: "",
    activityName: "",
    activityList: [],

    // AA 记账
    billItem: "",
    billAmount: "",
    aaDate: "",
    aaMembers: [],
    aaPayerIndex: -1,
    aaPayerName: "",
    settlements: [],
    billList: [],
    dailySummary: null
  },

  // ===== 通用工具 =====
  formatDateTime(dateObj) {
    const y = dateObj.getFullYear();
    const m = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const d = dateObj.getDate().toString().padStart(2, "0");
    const hh = dateObj.getHours().toString().padStart(2, "0");
    const mm = dateObj.getMinutes().toString().padStart(2, "0");
    const ss = dateObj.getSeconds().toString().padStart(2, "0");
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  },

  // ===== 邀请码相关 =====
  onInviteCodeInput(e) {
    this.setData({ inviteCodeInput: e.detail.value });
  },

  checkInvite() {
    const input = (this.data.inviteCodeInput || "").trim();
    if (input === this.data.correctInviteCode) {
      this.setData({ authenticated: true });
      wx.showToast({ title: "验证成功", icon: "success" });
      // 加载历史数据
      this.loadActivityList();
      this.loadBillList();
    } else {
      wx.showToast({ title: "邀请码错误", icon: "none" });
    }
  },

  // ===== Tab 切换 =====
  changeTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });

    if (tab === "history") {
      this.loadActivityList();
      this.loadBillList();
    }
  },

  // ===== 活动报名 =====
  onActivityDateChange(e) {
    this.setData({ activityDate: e.detail.value });
  },

  onActivityNameInput(e) {
    this.setData({ activityName: e.detail.value });
  },

  submitActivity() {
    const date = this.data.activityDate;
    const name = (this.data.activityName || "").trim();

    if (!date) {
      wx.showToast({ title: "请选择日期", icon: "none" });
      return;
    }
    if (!name) {
      wx.showToast({ title: "请输入姓名", icon: "none" });
      return;
    }

    db.collection("activities")
      .add({
        data: {
          date,
          name,
          createdAt: db.serverDate()
        }
      })
      .then(() => {
        wx.showToast({ title: "报名成功", icon: "success" });
        this.setData({
          activityName: ""
        });
        this.loadActivityList();
      })
      .catch(err => {
        console.error(err);
        wx.showToast({ title: "提交失败", icon: "none" });
      });
  },

  loadActivityList() {
    db.collection("activities")
      .orderBy("createdAt", "desc")
      .get()
      .then(res => {
        const list = res.data.map(item => {
          let createdAtText = "";
          if (item.createdAt && item.createdAt instanceof Date) {
            createdAtText = this.formatDateTime(item.createdAt);
          }
          return {
            _id: item._id,
            date: item.date,
            name: item.name,
            createdAtText
          };
        });
        this.setData({ activityList: list });
      })
      .catch(err => {
        console.error(err);
      });
  },

  // ===== AA 记账 =====
  onAADateChange(e) {
    const date = e.detail.value;
    this.setData({
      aaDate: date,
      aaMembers: [],
      aaPayerIndex: -1,
      aaPayerName: "",
      settlements: [],
      dailySummary: null
    });
    this.loadMembersByDate(date);
    this.loadDailyBills(date);
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
      // 付款人必须在参与人列表中，强制勾选
      if (!aaMembers[index].checked) {
        aaMembers[index].checked = true;
      }
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

    // 确保付款人始终包含在参与人中
    const { aaPayerIndex } = this.data;
    if (aaPayerIndex >= 0 && aaPayerIndex < aaMembers.length) {
      if (!aaMembers[aaPayerIndex].checked) {
        aaMembers[aaPayerIndex].checked = true;
      }
    }

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
    const date = this.data.aaDate;
    const item = (this.data.billItem || "").trim();
    const amountNum = parseFloat(this.data.billAmount);
    const aaMembers = this.data.aaMembers || [];
    const payerIndex = this.data.aaPayerIndex;

    if (!date) {
      wx.showToast({ title: "请选择记账日期", icon: "none" });
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
      wx.showToast({ title: "该日期暂无报名成员，无法记账", icon: "none" });
      return;
    }

    if (payerIndex < 0 || payerIndex >= aaMembers.length) {
      wx.showToast({ title: "请选择付款人", icon: "none" });
      return;
    }

    const payer = aaMembers[payerIndex].name;
    const participants = aaMembers.filter(m => m.checked).map(m => m.name);

    if (!participants.length) {
      wx.showToast({ title: "请至少选择一位参与人", icon: "none" });
      return;
    }

    const count = participants.length;
    const perShare = parseFloat((amountNum / count).toFixed(2));

    // 结算明细：除付款人外，每个人给付款人 perShare 元
    const settlements = participants
      .filter(p => p !== payer)
      .map(p => ({
        from: p,
        to: payer,
        amount: perShare
      }));

    db.collection("bills")
      .add({
        data: {
          date,
          item,
          totalAmount: amountNum,
          payer,
          participants,
          perShare,
          createdAt: db.serverDate()
        }
      })
      .then(() => {
        wx.showToast({ title: "记账成功", icon: "success" });
        this.setData({
          billItem: "",
          billAmount: "",
          settlements
        });
        this.loadBillList();
        this.loadDailyBills(date);
      })
      .catch(err => {
        console.error(err);
        wx.showToast({ title: "保存失败", icon: "none" });
      });
  },

  loadBillList() {
    db.collection("bills")
      .orderBy("createdAt", "desc")
      .get()
      .then(res => {
        const list = res.data.map(item => {
          let createdAtText = "";
          if (item.createdAt && item.createdAt instanceof Date) {
            createdAtText = this.formatDateTime(item.createdAt);
          }
          return {
            _id: item._id,
            item: item.item,
            totalAmount: item.totalAmount,
            payer: item.payer,
            perShare: item.perShare,
            participantsText: (item.participants || []).join("、"),
            createdAtText
          };
        });
        this.setData({ billList: list });
      })
      .catch(err => {
        console.error(err);
      });
  },

  loadMembersByDate(date) {
    if (!date) return;
    db.collection("activities")
      .where({ date })
      .get()
      .then(res => {
        const nameSet = {};
        (res.data || []).forEach(item => {
          if (item.name) {
            nameSet[item.name] = true;
          }
        });
        const names = Object.keys(nameSet);
        const aaMembers = names.map(name => ({
          name,
          checked: true
        }));

        let aaPayerIndex = -1;
        let aaPayerName = "";
        if (aaMembers.length > 0) {
          aaPayerIndex = 0;
          aaPayerName = aaMembers[0].name;
        }

        this.setData({
          aaMembers,
          aaPayerIndex,
          aaPayerName
        });
      })
      .catch(err => {
        console.error(err);
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

