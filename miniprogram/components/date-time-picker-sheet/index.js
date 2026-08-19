const {
  clamp,
  daysInMonth,
  range,
  formatDate,
  formatTime,
  buildPickerState
} = require("../../utils/dateTimePicker");

Component({
  options: {
    styleIsolation: "isolated"
  },

  properties: {
    visible: { type: Boolean, value: false },
    mode: { type: String, value: "datetime" },
    title: { type: String, value: "选择日期和时间" },
    value: { type: String, value: "" },
    minYear: { type: Number, value: 0 },
    maxYear: { type: Number, value: 0 },
    minuteStep: { type: Number, value: 5 }
  },

  data: {
    years: [],
    months: [],
    days: [],
    hours: [],
    minutes: [],
    pickerValue: [],
    showDate: true,
    showTime: true
  },

  observers: {
    "visible, mode, value, minYear, maxYear, minuteStep": function (visible) {
      if (visible) this.initializePicker();
    }
  },

  lifetimes: {
    attached() {
      if (this.properties.visible) this.initializePicker();
    }
  },

  methods: {
    initializePicker() {
      const pickerState = buildPickerState({
        mode: this.properties.mode,
        value: this.properties.value,
        minYear: this.properties.minYear,
        maxYear: this.properties.maxYear,
        minuteStep: this.properties.minuteStep
      });

      // mode 是 observer 监听的 property。这里若再次 setData({ mode })，
      // 微信运行时会反复触发 observer，导致选择器递归初始化并卡死模拟器。
      const { mode, ...renderState } = pickerState;
      this.setData(renderState);
    },

    stopPropagation() {},

    onClose() {
      this.triggerEvent("close");
    },

    onPickerChange(e) {
      const mode = this.data.mode;
      const next = (e.detail && e.detail.value ? e.detail.value : []).slice();
      if (mode === "time") {
        this.setData({ pickerValue: next });
        return;
      }

      const yearIndex = clamp(Number(next[0]) || 0, 0, this.data.years.length - 1);
      const monthIndex = clamp(Number(next[1]) || 0, 0, 11);
      const year = this.data.years[yearIndex];
      const month = this.data.months[monthIndex];
      const nextDays = range(1, daysInMonth(year, month));
      const dayIndex = clamp(Number(next[2]) || 0, 0, nextDays.length - 1);
      next[0] = yearIndex;
      next[1] = monthIndex;
      next[2] = dayIndex;
      this.setData({ days: nextDays, pickerValue: next });
    },

    onConfirm() {
      const mode = this.data.mode;
      const indexes = this.data.pickerValue || [];
      let dateValue = "";
      let timeValue = "";

      if (mode !== "time") {
        const year = this.data.years[indexes[0] || 0];
        const month = this.data.months[indexes[1] || 0];
        const day = this.data.days[indexes[2] || 0];
        dateValue = formatDate(year, month, day);
      }

      if (mode !== "date") {
        const offset = mode === "datetime" ? 3 : 0;
        const hour = this.data.hours[indexes[offset] || 0];
        const minute = this.data.minutes[indexes[offset + 1] || 0];
        timeValue = formatTime(hour, minute);
      }

      const value = mode === "date"
        ? dateValue
        : mode === "time"
          ? timeValue
          : `${dateValue} ${timeValue}`;
      this.triggerEvent("confirm", { mode, value, dateValue, timeValue });
    }
  }
});
