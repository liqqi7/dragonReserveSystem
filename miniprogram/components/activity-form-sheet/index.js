const {
  DEFAULT_CREATE_ACTIVITY_TYPE,
  DEFAULT_MAX_PARTICIPANTS,
  MAX_NAME_LENGTH,
  MAX_REMARK_LENGTH,
  buildCreateForm,
  buildEditForm,
  applyStartDateTime,
  validateActivityForm,
  buildActivityPayload
} = require("../../utils/activityForm");

function normalizeMode(value) {
  return value === "edit" ? "edit" : "create";
}

function formatDateLabel(value) {
  const matched = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) return "请选择";
  return `${matched[2]}/${matched[3]}`;
}

function formatDateTimeLabel(dateValue, timeValue) {
  if (!dateValue || !timeValue) return "请选择";
  return `${formatDateLabel(dateValue)} ${timeValue}`;
}

const REMARK_MIN_HEIGHT_RPX = 48;
const REMARK_LINE_HEIGHT_RPX = 40;
const REMARK_EDIT_LINE_HEIGHT_RPX = 42;
const REMARK_MAX_LINES = 5;

function getRemarkTextareaHeight(lineCount, isEdit = false) {
  const normalizedLineCount = Math.max(1, Math.min(REMARK_MAX_LINES, Math.floor(Number(lineCount) || 1)));
  return normalizedLineCount === 1
    ? REMARK_MIN_HEIGHT_RPX
    : normalizedLineCount * (isEdit ? REMARK_EDIT_LINE_HEIGHT_RPX : REMARK_LINE_HEIGHT_RPX);
}

function estimateRemarkLineCount(value) {
  const lines = String(value || "").split("\n");
  return Math.max(1, Math.min(REMARK_MAX_LINES, lines.reduce((total, line) => {
    return total + Math.max(1, Math.ceil(line.length / 22));
  }, 0)));
}

Component({
  options: {
    styleIsolation: "isolated"
  },

  properties: {
    visible: { type: Boolean, value: false },
    mode: { type: String, value: "create" },
    activity: { type: Object, value: null },
    activityTypeOptionValues: { type: Array, value: [] },
    activityTypeOptionLabels: { type: Array, value: [] },
    defaultActivityType: { type: String, value: DEFAULT_CREATE_ACTIVITY_TYPE },
    participantCount: { type: Number, value: 0 },
    locationDisabled: { type: Boolean, value: false },
    submitting: { type: Boolean, value: false }
  },

  data: {
    form: buildCreateForm(new Date(0), DEFAULT_CREATE_ACTIVITY_TYPE),
    title: "新建活动",
    submitText: "发布活动",
    isEdit: false,
    activityTypeIndex: 0,
    activityTypePickerVisible: false,
    pickerVisible: false,
    pickerMode: "datetime",
    pickerTitle: "选择日期和时间",
    pickerValue: "",
    pickerTarget: "",
    startDateTimeLabel: "请选择",
    endDateTimeLabel: "请选择",
    signupDeadlineDateLabel: "请选择",
    nameCount: 0,
    remarkCount: 0,
    remarkLineCount: 1,
    remarkTextareaHeight: REMARK_MIN_HEIGHT_RPX,
    participantInputFocused: false,
    minParticipants: 1,
    maxNameLength: MAX_NAME_LENGTH,
    maxRemarkLength: MAX_REMARK_LENGTH,
    defaultMaxParticipants: DEFAULT_MAX_PARTICIPANTS
  },

  observers: {
    visible(visible) {
      if (visible) this.initializeForm();
      else if (this.data.pickerVisible || this.data.activityTypePickerVisible) {
        this.setData({
          pickerVisible: false,
          pickerTarget: "",
          activityTypePickerVisible: false
        });
      }
    }
  },

  lifetimes: {
    attached() {
      if (this.properties.visible) this.initializeForm();
    }
  },

  methods: {
    initializeForm() {
      const mode = normalizeMode(this.properties.mode);
      const isEdit = mode === "edit";
      const form = isEdit
        ? buildEditForm(this.properties.activity || {})
        : buildCreateForm(new Date(), this.properties.defaultActivityType || DEFAULT_CREATE_ACTIVITY_TYPE);
      const optionValues = this.properties.activityTypeOptionValues || [];
      let activityTypeIndex = optionValues.indexOf(form.activityType);
      if (activityTypeIndex < 0) activityTypeIndex = optionValues.indexOf(this.properties.defaultActivityType);
      if (activityTypeIndex < 0) activityTypeIndex = 0;
      if (!form.activityType && optionValues[activityTypeIndex]) form.activityType = optionValues[activityTypeIndex];
      const participantCount = Math.max(0, Number(this.properties.participantCount) || 0);
      const minParticipants = isEdit ? Math.max(1, participantCount) : 1;
      if (form.limitEnabled && Number(form.maxParticipants) < minParticipants) {
        form.maxParticipants = minParticipants;
      }
      const remarkLineCount = estimateRemarkLineCount(form.remark);
      this.setData({
        form,
        title: isEdit ? "编辑活动" : "新建活动",
        submitText: isEdit ? "保存修改" : "发布活动",
        isEdit,
        activityTypeIndex,
        activityTypePickerVisible: false,
        pickerVisible: false,
        pickerTarget: "",
        pickerMode: "datetime",
        pickerTitle: "选择日期和时间",
        pickerValue: "",
        minParticipants,
        startDateTimeLabel: formatDateTimeLabel(form.startDate, form.startTime),
        endDateTimeLabel: formatDateTimeLabel(form.endDate, form.endTime),
        signupDeadlineDateLabel: formatDateLabel(form.signupDeadlineDate),
        nameCount: String(form.name || "").length,
        remarkCount: String(form.remark || "").length,
        remarkLineCount,
        remarkTextareaHeight: form.remark
          ? getRemarkTextareaHeight(remarkLineCount, isEdit)
          : REMARK_MIN_HEIGHT_RPX,
        participantInputFocused: false
      });
    },

    stopPropagation() {},

    onClose() {
      if (this.properties.submitting || this.data.pickerVisible || this.data.activityTypePickerVisible) return;
      this.triggerEvent("close");
    },

    onTextInput(e) {
      const field = e.currentTarget.dataset.field;
      const value = e.detail.value || "";
      const changes = { [`form.${field}`]: value };
      if (field === "name") changes.nameCount = value.length;
      this.setData(changes);
    },

    updateRemarkValue(value) {
      const normalizedValue = typeof value === "string" ? value : "";
      const changes = {
        "form.remark": normalizedValue,
        remarkCount: normalizedValue.length
      };
      if (!normalizedValue) {
        changes.remarkLineCount = 1;
        changes.remarkTextareaHeight = REMARK_MIN_HEIGHT_RPX;
      } else {
        changes.remarkTextareaHeight = getRemarkTextareaHeight(this.data.remarkLineCount, this.data.isEdit);
      }
      this.setData(changes);
    },

    onRemarkInput(e) {
      const detail = e.detail || {};
      this.updateRemarkValue(detail.value);
    },

    onRemarkBlur(e) {
      const detail = e.detail || {};
      this.updateRemarkValue(detail.value);
    },

    onRemarkLineChange(e) {
      const detail = e.detail || {};
      const lineCount = Math.max(1, Math.floor(Number(detail.lineCount) || 1));
      this.setData({
        remarkLineCount: lineCount,
        remarkTextareaHeight: this.data.form.remark
          ? getRemarkTextareaHeight(lineCount, this.data.isEdit)
          : REMARK_MIN_HEIGHT_RPX
      });
    },

    onSwitchChange(e) {
      const field = e.currentTarget.dataset.field;
      const checked = !!e.detail.value;
      this.updateSwitchField(field, checked);
    },

    onSwitchTap(e) {
      const field = e.currentTarget.dataset.field;
      this.updateSwitchField(field, !this.data.form[field]);
    },

    updateSwitchField(field, checked) {
      const changes = { [`form.${field}`]: checked };
      if (field === "limitEnabled" && checked) {
        const current = Number(this.data.form.maxParticipants) || DEFAULT_MAX_PARTICIPANTS;
        changes["form.maxParticipants"] = Math.max(this.data.minParticipants, current);
      }
      if (field === "limitEnabled" && !checked) {
        changes.participantInputFocused = false;
      }
      this.setData(changes);
    },

    openActivityTypePicker() {
      if (this.data.isEdit) return;
      this.setData({ activityTypePickerVisible: true });
    },

    closeActivityTypePicker() {
      this.setData({ activityTypePickerVisible: false });
    },

    confirmActivityTypePicker(e) {
      const detail = e.detail || {};
      const value = String(detail.value || "");
      if (!value) {
        this.setData({ activityTypePickerVisible: false });
        return;
      }
      const values = this.properties.activityTypeOptionValues || [];
      const index = values.indexOf(value);
      this.setData({
        activityTypePickerVisible: false,
        activityTypeIndex: index >= 0 ? index : 0,
        "form.activityType": value
      });
    },

    decrementParticipants() {
      if (!this.data.form.limitEnabled) return;
      const current = Number(this.data.form.maxParticipants) || this.data.minParticipants;
      this.setData({ "form.maxParticipants": Math.max(this.data.minParticipants, current - 1) });
    },

    incrementParticipants() {
      if (!this.data.form.limitEnabled) return;
      const current = Number(this.data.form.maxParticipants) || this.data.minParticipants;
      this.setData({ "form.maxParticipants": Math.min(999, current + 1) });
    },

    onParticipantInput(e) {
      const value = String(e.detail.value || "").replace(/\D/g, "").slice(0, 3);
      this.setData({ "form.maxParticipants": value });
    },

    focusParticipantInput() {
      if (this.data.isEdit || !this.data.form.limitEnabled) return;
      this.setData({ participantInputFocused: true });
    },

    onParticipantFocus() {
      if (this.data.isEdit || !this.data.form.limitEnabled) return;
      this.setData({ participantInputFocused: true });
    },

    onParticipantBlur() {
      if (!this.data.form.limitEnabled) return;
      const current = Number(this.data.form.maxParticipants);
      const normalized = Number.isInteger(current)
        ? Math.max(this.data.minParticipants, Math.min(999, current))
        : this.data.minParticipants;
      this.setData({
        "form.maxParticipants": normalized,
        participantInputFocused: false
      });
    },

    onParticipantConfirm() {
      this.onParticipantBlur();
    },

    onChooseLocation() {
      if (this.properties.locationDisabled) {
        wx.showToast({ title: "已有用户完成签到，不可修改活动地点", icon: "none" });
        return;
      }
      wx.chooseLocation({
        success: (res) => {
          this.setData({
            "form.locationName": res.name || res.address || "",
            "form.locationAddress": res.address || "",
            "form.locationLatitude": res.latitude,
            "form.locationLongitude": res.longitude
          });
        }
      });
    },

    openDateTimePicker(e) {
      const target = e.currentTarget.dataset.target;
      const config = {
        startDateTime: {
          mode: "datetime",
          title: "选择开始时间",
          value: `${this.data.form.startDate} ${this.data.form.startTime}`.trim()
        },
        endDateTime: {
          mode: "datetime",
          title: "选择结束时间",
          value: `${this.data.form.endDate} ${this.data.form.endTime}`.trim()
        },
        signupDeadlineDate: {
          mode: "date",
          title: "选择报名截止日期",
          value: this.data.form.signupDeadlineDate
        },
        signupDeadlineTime: {
          mode: "time",
          title: "选择报名截止时间",
          value: this.data.form.signupDeadlineTime
        }
      }[target];
      if (!config) return;
      this.setData({
        pickerVisible: true,
        pickerTarget: target,
        pickerMode: config.mode,
        pickerTitle: config.title,
        pickerValue: config.value
      });
    },

    closeDateTimePicker() {
      this.setData({ pickerVisible: false, pickerTarget: "" });
    },

    confirmDateTimePicker(e) {
      const detail = e.detail || {};
      const target = this.data.pickerTarget;
      if (target === "startDateTime") {
        const form = applyStartDateTime(this.data.form, `${detail.dateValue} ${detail.timeValue}`);
        this.setData({
          form,
          startDateTimeLabel: formatDateTimeLabel(form.startDate, form.startTime),
          endDateTimeLabel: formatDateTimeLabel(form.endDate, form.endTime),
          signupDeadlineDateLabel: formatDateLabel(form.signupDeadlineDate),
          pickerVisible: false,
          pickerTarget: ""
        });
        return;
      }
      if (target === "endDateTime") {
        this.setData({
          "form.endDate": detail.dateValue,
          "form.endTime": detail.timeValue,
          endDateTimeLabel: formatDateTimeLabel(detail.dateValue, detail.timeValue),
          pickerVisible: false,
          pickerTarget: ""
        });
        return;
      }
      if (target === "signupDeadlineDate") {
        this.setData({
          "form.signupDeadlineDate": detail.dateValue,
          signupDeadlineDateLabel: formatDateLabel(detail.dateValue),
          pickerVisible: false,
          pickerTarget: ""
        });
        return;
      }
      if (target === "signupDeadlineTime") {
        this.setData({
          "form.signupDeadlineTime": detail.timeValue,
          pickerVisible: false,
          pickerTarget: ""
        });
      }
    },

    onCancelActivity() {
      if (this.properties.submitting) return;
      this.triggerEvent("cancelactivity");
    },

    onSubmit() {
      if (this.properties.submitting) return;
      const mode = this.data.isEdit ? "edit" : "create";
      const validation = validateActivityForm(this.data.form, {
        mode,
        participantCount: this.properties.participantCount
      });
      if (!validation.ok) {
        wx.showToast({ title: validation.message, icon: "none" });
        return;
      }
      this.triggerEvent("submit", {
        mode,
        form: { ...this.data.form },
        payload: buildActivityPayload(this.data.form, { mode })
      });
    }
  }
});
