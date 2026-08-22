const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function loadComponentDefinition() {
  const componentPath = require.resolve("../components/activity-form-sheet/index.js");
  const previousComponent = global.Component;
  let definition;
  global.Component = (value) => { definition = value; };
  delete require.cache[componentPath];
  require(componentPath);
  global.Component = previousComponent;
  return definition;
}

function setByPath(target, pathValue, value) {
  const parts = pathValue.split(".");
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    cursor[part] = cursor[part] || {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function createContext(definition, overrides = {}) {
  const data = {
    ...definition.data,
    form: {
      startDate: "2026-08-17",
      startTime: "19:30",
      endDate: "2026-08-17",
      endTime: "22:00",
      signupDeadlineDate: "2026-08-17",
      signupDeadlineTime: "18:30"
    },
    ...overrides
  };
  return {
    ...definition.methods,
    data,
    setData(patch) {
      for (const [key, value] of Object.entries(patch)) {
        if (key.includes(".")) setByPath(this.data, key, value);
        else this.data[key] = value;
      }
    }
  };
}

const definition = loadComponentDefinition();

test("create remark height and counter stay synchronized while typing, deleting and reopening", () => {
  const context = createContext(definition, {
    isEdit: false,
    form: { remark: "" },
    remarkCount: 0,
    remarkLineCount: 1,
    remarkTextareaHeight: 48
  });

  definition.methods.onRemarkLineChange.call(context, { detail: { lineCount: 5 } });
  assert.equal(context.data.remarkTextareaHeight, 48);
  definition.methods.onRemarkLineChange.call(context, { detail: { lineCount: 3 } });
  definition.methods.onRemarkInput.call(context, { detail: { value: "第一行\n第二行\n第三行" } });
  assert.equal(context.data.remarkTextareaHeight, 120);

  definition.methods.onRemarkInput.call(context, { detail: { value: "第一行\n第二行\n第三行" } });
  definition.methods.onRemarkLineChange.call(context, { detail: { lineCount: 3 } });
  assert.equal(context.data.form.remark, "第一行\n第二行\n第三行");
  assert.equal(context.data.remarkCount, 11);
  assert.equal(context.data.remarkLineCount, 3);
  assert.equal(context.data.remarkTextareaHeight, 120);

  definition.methods.onRemarkInput.call(context, { detail: { value: "第一行" } });
  definition.methods.onRemarkLineChange.call(context, { detail: { lineCount: 1 } });
  assert.equal(context.data.remarkCount, 3);
  assert.equal(context.data.remarkTextareaHeight, 48);

  definition.methods.onRemarkInput.call(context, { detail: { value: "" } });
  assert.equal(context.data.form.remark, "");
  assert.equal(context.data.remarkCount, 0);
  assert.equal(context.data.remarkLineCount, 1);
  assert.equal(context.data.remarkTextareaHeight, 48);

  context.data.form.remark = "旧内容";
  context.data.remarkCount = 3;
  context.data.remarkLineCount = 8;
  context.data.remarkTextareaHeight = 200;
  context.properties = {
    mode: "create",
    defaultActivityType: "badminton",
    activityTypeOptionValues: ["badminton"],
    participantCount: 0
  };
  definition.methods.initializeForm.call(context);
  assert.equal(context.data.form.remark, "");
  assert.equal(context.data.remarkCount, 0);
  assert.equal(context.data.remarkLineCount, 1);
  assert.equal(context.data.remarkTextareaHeight, 48);
});

test("edit remark initializes to its content height and shrinks after deletion", () => {
  const context = createContext(definition);
  context.properties = {
    mode: "edit",
    activity: {
      remark: "无酒精，现场会讲解规则，新手也可以轻松参加。",
      maxParticipants: 12,
      signupEnabled: true
    },
    activityTypeOptionValues: [],
    participantCount: 0
  };

  definition.methods.initializeForm.call(context);
  assert.equal(context.data.isEdit, true);
  assert.equal(context.data.remarkCount, 22);
  assert.equal(context.data.remarkLineCount, 1);
  assert.equal(context.data.remarkTextareaHeight, 48);

  definition.methods.onRemarkLineChange.call(context, {
    detail: { lineCount: 3 }
  });
  assert.equal(context.data.remarkTextareaHeight, 126);

  definition.methods.onRemarkInput.call(context, {
    detail: { value: "" }
  });
  assert.equal(context.data.remarkCount, 0);
  assert.equal(context.data.remarkLineCount, 1);
  assert.equal(context.data.remarkTextareaHeight, 48);
});

test("remark blur provides a final native-value synchronization fallback", () => {
  const context = createContext(definition, {
    form: { remark: "残留内容" },
    remarkCount: 4,
    remarkTextareaHeight: 200
  });
  definition.methods.onRemarkBlur.call(context, { detail: { value: "" } });
  assert.equal(context.data.form.remark, "");
  assert.equal(context.data.remarkCount, 0);
  assert.equal(context.data.remarkTextareaHeight, 48);
});

test("all four visible time rows open the expected picker", () => {
  const cases = [
    ["startDateTime", "datetime", "选择开始时间", "2026-08-17 19:30"],
    ["endDateTime", "datetime", "选择结束时间", "2026-08-17 22:00"],
    ["signupDeadlineDate", "date", "选择报名截止日期", "2026-08-17"],
    ["signupDeadlineTime", "time", "选择报名截止时间", "18:30"]
  ];

  for (const [target, mode, title, value] of cases) {
    const context = createContext(definition);
    definition.methods.openDateTimePicker.call(context, {
      currentTarget: { dataset: { target } }
    });
    assert.equal(context.data.pickerVisible, true);
    assert.equal(context.data.pickerTarget, target);
    assert.equal(context.data.pickerMode, mode);
    assert.equal(context.data.pickerTitle, title);
    assert.equal(context.data.pickerValue, value);
  }
});

test("datetime confirmation updates both date and time and closes picker", () => {
  const startContext = createContext(definition, { pickerTarget: "startDateTime", pickerVisible: true });
  definition.methods.confirmDateTimePicker.call(startContext, {
    detail: { dateValue: "2026-08-18", timeValue: "20:05" }
  });
  assert.equal(startContext.data.form.startDate, "2026-08-18");
  assert.equal(startContext.data.form.startTime, "20:05");
  assert.equal(startContext.data.startDateTimeLabel, "08/18 20:05");
  assert.equal(startContext.data.pickerVisible, false);

  const endContext = createContext(definition, { pickerTarget: "endDateTime", pickerVisible: true });
  definition.methods.confirmDateTimePicker.call(endContext, {
    detail: { dateValue: "2026-08-18", timeValue: "23:10" }
  });
  assert.equal(endContext.data.form.endDate, "2026-08-18");
  assert.equal(endContext.data.form.endTime, "23:10");
  assert.equal(endContext.data.endDateTimeLabel, "08/18 23:10");
  assert.equal(endContext.data.pickerVisible, false);
});

test("form markup keeps prototype labels, placeholders and full-row tap targets", () => {
  const wxml = fs.readFileSync(path.join(__dirname, "../components/activity-form-sheet/index.wxml"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "../components/activity-form-sheet/index.js"), "utf8");
  const pageWxml = fs.readFileSync(path.join(__dirname, "../pages/activity_list/activity_list.wxml"), "utf8");
  assert.match(js, /submitText:\s*"发布活动"/);
  assert.match(js, /submitText:\s*isEdit \? "保存修改" : "发布活动"/);
  assert.match(pageWxml, /default-activity-type="{{'badminton'}}"/);
  assert.match(wxml, /data-target="startDateTime"/);
  assert.match(wxml, /data-target="endDateTime"/);
  assert.match(wxml, /data-target="signupDeadlineDate"/);
  assert.match(wxml, /data-target="signupDeadlineTime"/);
  assert.match(wxml, />日期<\/text>/);
  assert.match(wxml, />时间<\/text>/);
  assert.match(wxml, />活动备注（选填）<\/text>/);
  assert.match(wxml, /placeholder="请输入活动名称"/);
  assert.match(wxml, /请选择活动地点/);
  assert.match(wxml, /placeholder="请输入活动备注"/);
  assert.match(wxml, /<textarea[^>]*style="height: {{remarkTextareaHeight}}rpx;"[^>]*bindinput="onRemarkInput"[^>]*bindblur="onRemarkBlur"[^>]*bindlinechange="onRemarkLineChange"[^>]*auto-height="{{false}}"[^>]*disable-default-padding="{{true}}"[^>]*\/>/);
  assert.match(wxml, /<textarea[^>]*disable-default-padding="{{true}}"[^>]*\/>/);
  assert.match(wxml, /<textarea[^>]*show-confirm-bar="{{false}}"[^>]*\/>/);
  assert.doesNotMatch(wxml, /可设置 1–999 人/);
  assert.doesNotMatch(wxml, /补充活动说明（选填）/);
  assert.match(wxml, /<view[^>]*class="activity-sheet-root"[^>]*catchtouchmove="stopPropagation"[^>]*>/);
  assert.match(wxml, /class="activity-sheet-mask"[^>]*catchtap="onClose"/);
  assert.match(wxml, /<view class="activity-sheet-panel [^"]*activity-sheet-panel--create/);
  assert.match(wxml, /class="bento-grid [^"]*bento-grid--create/);
  assert.match(wxml, /create-completed-text/);
  assert.match(wxml, /create-completed-field/);
  assert.match(wxml, /activity-sheet-footer--create/);
  assert.match(wxml, /activity-sheet-footer-actions--create/);
  assert.match(wxml, /sheet-button--primary-create/);
  const editSignupIndex = wxml.indexOf(">允许报名</text>");
  const editLimitIndex = wxml.indexOf(">限制报名人数</text>", editSignupIndex);
  assert.ok(editSignupIndex >= 0 && editLimitIndex > editSignupIndex);
  assert.match(wxml, /participant-limit-card--edit/);
  assert.match(wxml, /activity-sheet-footer-actions--edit/);
  assert.match(wxml, /sheet-button--secondary-edit/);
  assert.match(wxml, /sheet-button--primary-edit/);
  assert.doesNotMatch(wxml, /activity-sheet-panel" catchtap=/);
  assert.match(wxml, /bindtap="decrementParticipants"/);
  assert.match(wxml, /bindtap="incrementParticipants"/);
  assert.doesNotMatch(wxml, /<button class="stepper-button"/);
  assert.match(wxml, /class="activity-sheet-close-icon"[^>]*src="\/images\/icon-close\.svg"/);
  assert.match(wxml, /class="location-chevron"[^>]*icon-chevron-right-600\.svg/);
  assert.match(wxml, /class="activity-type-chevron"[^>]*src="\/images\/icon-chevron-down\.svg"/);
  assert.match(wxml, /class="stepper-icon"[^>]*src="\/images\/icon-minus\.svg"/);
  assert.match(wxml, /class="stepper-icon"[^>]*src="\/images\/icon-plus\.svg"/);
  assert.match(wxml, /class="stepper-value">{{form\.maxParticipants}}<\/text>/);
  assert.match(wxml, /class="bento-card bento-card--full stepper-card participant-limit-card--create/);
  assert.match(wxml, /form\.limitEnabled \? 'participant-limit-card--visible' : ''/);
  assert.match(wxml, /class="stepper-value-input [^\"]*"[\s\S]*?type="number"[\s\S]*?focus="{{participantInputFocused}}"/);
  assert.match(wxml, /bindtap="focusParticipantInput"/);
  assert.match(wxml, /bindinput="onParticipantInput"/);
  assert.match(wxml, /bindblur="onParticipantBlur"/);
  assert.match(wxml, /bindconfirm="onParticipantConfirm"/);
  assert.match(wxml, /class="prototype-switch[^>]*bindtap="onSwitchTap"[^>]*data-field="limitEnabled"/);
  assert.doesNotMatch(wxml, />×<\/view>/);
  assert.doesNotMatch(wxml, /class="stepper-input"/);
  assert.doesNotMatch(wxml, /<switch\s/);
  assert.doesNotMatch(wxml, /activity-sheet-body-spacer/);
});

test("activity form sheet geometry follows the prototype measurements", () => {
  const css = fs.readFileSync(path.join(__dirname, "../components/activity-form-sheet/index.wxss"), "utf8");
  assert.match(css, /\.activity-sheet-drag-area\s*{[^}]*height:\s*24rpx;[^}]*margin-top:\s*16rpx;/s);
  assert.match(css, /\.activity-sheet-header\s*{[^}]*height:\s*76.92rpx;[^}]*margin-top:\s*12rpx;[^}]*padding:\s*0 30.77rpx;/s);
  assert.doesNotMatch(css, /\.activity-sheet-panel\s*{[^}]*height:\s*1316rpx;/s);
  assert.match(css, /\.activity-sheet-panel\s*{[^}]*max-height:\s*100%;[^}]*padding-bottom:\s*calc\(100rpx \+ env\(safe-area-inset-bottom\)\);[^}]*box-sizing:\s*border-box;/s);
  assert.match(css, /\.activity-sheet-body\s*{[^}]*flex:\s*none;[^}]*min-height:\s*0;[^}]*height:\s*auto;[^}]*max-height:\s*calc\(100vh - 232rpx - env\(safe-area-inset-bottom\)\);/s);
  assert.match(css, /\.activity-sheet-footer\s*{[^}]*position:\s*absolute;[^}]*bottom:\s*0;[^}]*height:\s*calc\(153.85rpx \+ env\(safe-area-inset-bottom\)\);/s);
  assert.match(css, /\.bento-grid\s*{[^}]*padding:\s*15.38rpx 30.77rpx;/s);
  assert.match(css, /\.activity-sheet-close-icon\s*{[^}]*width:\s*38.46rpx;[^}]*height:\s*38.46rpx;/s);
  assert.match(css, /\.compact-card\s*{[^}]*height:\s*100rpx;[^}]*padding:\s*15.38rpx 23.08rpx;/s);
  assert.match(css, /\.compact-switch-card\s*{[^}]*height:\s*100rpx;/s);
  assert.match(css, /\.prototype-switch\s*{[^}]*width:\s*88.46rpx;[^}]*height:\s*53.85rpx;[^}]*padding:\s*5.77rpx;/s);
  assert.match(css, /\.prototype-switch-thumb\s*{[^}]*width:\s*42.31rpx;[^}]*height:\s*42.31rpx;/s);
  assert.match(css, /\.stepper\s*{[^}]*width:\s*211.54rpx;[^}]*height:\s*73.08rpx;[^}]*justify-content:\s*space-between;[^}]*padding:\s*0 19.23rpx;/s);
  assert.match(css, /\.stepper-icon\s*{[^}]*width:\s*38.46rpx;[^}]*height:\s*38.46rpx;/s);
  assert.match(css, /\.stepper-value\s*{[^}]*width:\s*42.31rpx;[^}]*font-size:\s*28rpx;[^}]*line-height:\s*1;[^}]*font-weight:\s*700;/s);
  assert.match(css, /\.location-value\s*{[^}]*color:\s*#272064;[^}]*font-size:\s*28rpx;[^}]*line-height:\s*40rpx;/s);
  assert.match(css, /\.date-time-row-value--filled\s*\{[^}]*color:\s*#000000;/s);
  assert.match(css, /\.activity-time-card,[\s\S]*?\.deadline-card\s*\{[^}]*gap:\s*15.38rpx;[^}]*padding:\s*15.38rpx 23.08rpx;/s);
  assert.match(css, /\.date-time-row\s*\{[^}]*gap:\s*15.38rpx;/s);
  assert.match(css, /\.prototype-switch\s*\{[^}]*border-radius:\s*26.92rpx;/s);
  assert.match(css, /\.input-card\s*\{[^}]*gap:\s*16rpx;/s);
  assert.match(css, /\.activity-sheet-footer\s*\{[^}]*box-shadow:\s*0 -6rpx 24rpx rgba\(0, 0, 0, 0\.07\);/s);
  assert.match(css, /\.sheet-button\s*\{[^}]*border-radius:\s*23.08rpx;/s);
  assert.match(css, /\.activity-type-chevron\s*\{[^}]*width:\s*28rpx;[^}]*height:\s*28rpx;/s);
  assert.match(css, /\.location-value\.bento-placeholder-text\s*{[^}]*color:\s*#9ca3af;/s);
  assert.match(css, /\.bento-textarea\s*{[^}]*height:\s*40rpx;[^}]*min-height:\s*40rpx;/s);
  assert.match(css, /\.activity-sheet-panel--create\s*{[^}]*padding-bottom:\s*calc\(153.85rpx \+ env\(safe-area-inset-bottom\)\);/s);
  assert.match(css, /\.activity-sheet-panel--create \.activity-sheet-body\s*{[^}]*max-height:\s*calc\(100vh - 244rpx - env\(safe-area-inset-bottom\)\);/s);
  assert.match(css, /\.bento-grid--create\s*{[^}]*gap:\s*15.38rpx;/s);
  assert.match(css, /\.activity-sheet-panel--create \.compact-card,[\s\S]*?height:\s*100rpx;/s);
  assert.match(css, /\.activity-sheet-panel--create \.compact-select-row\s*\{[^}]*gap:\s*16rpx;/s);
  assert.match(css, /\.activity-sheet-panel--create \.stepper-card\s*\{[^}]*min-height:\s*100rpx;/s);
  assert.match(css, /\.activity-sheet-panel--create \.stepper\s*\{[^}]*width:\s*211.54rpx;[^}]*height:\s*73.08rpx;[^}]*padding:\s*0 19.23rpx;[^}]*gap:\s*0;/s);
  assert.match(css, /\.activity-sheet-panel--create \.stepper-button\s*\{[^}]*width:\s*38.46rpx;[^}]*height:\s*38.46rpx;/s);
  assert.match(css, /\.stepper-value-input\s*\{[^}]*width:\s*42.31rpx;[^}]*height:\s*40rpx;[^}]*font-size:\s*28rpx;[^}]*font-weight:\s*700;[^}]*text-align:\s*center;/s);
  assert.match(css, /\.activity-sheet-panel--create \.participant-limit-card--create\s*\{[^}]*min-height:\s*0;[^}]*height:\s*0;[^}]*opacity:\s*0;[^}]*overflow:\s*hidden;[^}]*pointer-events:\s*none;[^}]*transition:/s);
  assert.match(css, /\.activity-sheet-panel--create \.participant-limit-card--create\.participant-limit-card--visible\s*\{[^}]*min-height:\s*100rpx;[^}]*height:\s*100rpx;[^}]*opacity:\s*1;[^}]*pointer-events:\s*auto;/s);
  assert.match(css, /\.create-completed-text,[\s\S]*?color:\s*#111827;/s);
  assert.match(css, /\.activity-sheet-panel--create \.location-chevron\s*{[^}]*margin-top:\s*0;[^}]*align-self:\s*center;/s);
  assert.match(css, /\.activity-sheet-panel--create \.bento-textarea\s*\{[^}]*height:\s*48rpx;[^}]*min-height:\s*48rpx;[^}]*max-height:\s*200rpx;[^}]*padding:\s*0;[^}]*line-height:\s*40rpx;[^}]*overflow-y:\s*auto;/s);
  assert.match(css, /\.activity-sheet-footer--create\s*{[^}]*height:\s*calc\(153.85rpx \+ env\(safe-area-inset-bottom\)\);[^}]*border-top-width:\s*2rpx;/s);
  assert.match(css, /\.activity-sheet-footer-actions--create\s*{[^}]*height:\s*107.69rpx;[^}]*padding:\s*11.54rpx 38.46rpx;/s);
  assert.match(css, /\.sheet-button--primary-create\s*{[^}]*box-shadow:\s*0 4rpx 16rpx rgba\(0, 0, 0, 0\.05\);/s);
  assert.match(css, /\.activity-sheet-panel--edit\s*{[^}]*padding-bottom:\s*calc\(153.85rpx \+ env\(safe-area-inset-bottom\)\);/s);
  assert.match(css, /\.activity-sheet-panel--edit \.activity-sheet-body\s*{[^}]*max-height:\s*calc\(100vh - 244rpx - env\(safe-area-inset-bottom\)\);/s);
  assert.match(css, /\.bento-grid--edit\s*{[^}]*gap:\s*15.38rpx;/s);
  assert.match(css, /\.activity-sheet-panel--edit \.compact-card,[\s\S]*?height:\s*100rpx;/s);
  assert.match(css, /\.activity-sheet-panel--edit \.participant-limit-card--edit\s*{[^}]*min-height:\s*0;[^}]*height:\s*0;[^}]*opacity:\s*0;[^}]*overflow:\s*hidden;[^}]*pointer-events:\s*none;[^}]*transition:/s);
  assert.match(css, /\.activity-sheet-panel--edit \.participant-limit-card--edit\.participant-limit-card--visible\s*{[^}]*min-height:\s*100rpx;[^}]*height:\s*100rpx;[^}]*opacity:\s*1;[^}]*pointer-events:\s*auto;/s);
  assert.match(css, /\.activity-sheet-panel--edit \.bento-textarea\s*{[^}]*height:\s*48rpx;[^}]*min-height:\s*48rpx;[^}]*max-height:\s*210rpx;[^}]*padding:\s*0;[^}]*line-height:\s*42rpx;[^}]*overflow-y:\s*auto;/s);
  assert.match(css, /\.activity-sheet-footer--double\s*{[^}]*height:\s*calc\(153.85rpx \+ env\(safe-area-inset-bottom\)\);[^}]*border-top-width:\s*2rpx;/s);
  assert.match(css, /\.activity-sheet-footer-actions--edit\s*{[^}]*height:\s*107.69rpx;[^}]*padding:\s*11.54rpx 38.46rpx;[^}]*gap:\s*15.38rpx;/s);
  assert.match(css, /\.sheet-button--secondary-edit\s*{[^}]*width:\s*215.38rpx;[^}]*border:\s*2rpx solid #ff9800;[^}]*background:\s*transparent;[^}]*color:\s*#ff9800;[^}]*font-weight:\s*600;/s);
});

test("prototype switch tap toggles fields and initializes participant count", () => {
  const limitContext = createContext(definition, {
    minParticipants: 4,
    form: { limitEnabled: false, maxParticipants: 0 }
  });
  definition.methods.onSwitchTap.call(limitContext, {
    currentTarget: { dataset: { field: "limitEnabled" } }
  });
  assert.equal(limitContext.data.form.limitEnabled, true);
  assert.equal(limitContext.data.form.maxParticipants, 12);

  limitContext.data.participantInputFocused = true;
  definition.methods.onSwitchTap.call(limitContext, {
    currentTarget: { dataset: { field: "limitEnabled" } }
  });
  assert.equal(limitContext.data.form.limitEnabled, false);
  assert.equal(limitContext.data.participantInputFocused, false);

  const signupContext = createContext(definition, {
    form: { signupEnabled: true }
  });
  definition.methods.onSwitchTap.call(signupContext, {
    currentTarget: { dataset: { field: "signupEnabled" } }
  });
  assert.equal(signupContext.data.form.signupEnabled, false);
});

test("participant stepper respects lower and upper bounds", () => {
  const decrementContext = createContext(definition, {
    minParticipants: 1,
    form: { limitEnabled: true, maxParticipants: 12 }
  });
  definition.methods.decrementParticipants.call(decrementContext);
  assert.equal(decrementContext.data.form.maxParticipants, 11);

  const lowerBoundContext = createContext(definition, {
    minParticipants: 1,
    form: { limitEnabled: true, maxParticipants: 1 }
  });
  definition.methods.decrementParticipants.call(lowerBoundContext);
  assert.equal(lowerBoundContext.data.form.maxParticipants, 1);

  const incrementContext = createContext(definition, {
    minParticipants: 1,
    form: { limitEnabled: true, maxParticipants: 12 }
  });
  definition.methods.incrementParticipants.call(incrementContext);
  assert.equal(incrementContext.data.form.maxParticipants, 13);

  const upperBoundContext = createContext(definition, {
    minParticipants: 1,
    form: { limitEnabled: true, maxParticipants: 999 }
  });
  definition.methods.incrementParticipants.call(upperBoundContext);
  assert.equal(upperBoundContext.data.form.maxParticipants, 999);
});

test("participant number opens numeric input and normalizes typed value", () => {
  const context = createContext(definition, {
    isEdit: false,
    participantInputFocused: false,
    minParticipants: 4,
    form: { limitEnabled: true, maxParticipants: 12 }
  });

  definition.methods.focusParticipantInput.call(context);
  assert.equal(context.data.participantInputFocused, true);

  definition.methods.onParticipantInput.call(context, {
    detail: { value: "10a05" }
  });
  assert.equal(context.data.form.maxParticipants, "100");

  context.data.form.maxParticipants = "0";
  definition.methods.onParticipantBlur.call(context);
  assert.equal(context.data.form.maxParticipants, 4);
  assert.equal(context.data.participantInputFocused, false);

  context.data.form.maxParticipants = "1000";
  context.data.participantInputFocused = true;
  definition.methods.onParticipantConfirm.call(context);
  assert.equal(context.data.form.maxParticipants, 999);
  assert.equal(context.data.participantInputFocused, false);

  const editContext = createContext(definition, {
    isEdit: true,
    participantInputFocused: false,
    form: { limitEnabled: true, maxParticipants: 12 }
  });
  definition.methods.focusParticipantInput.call(editContext);
  assert.equal(editContext.data.participantInputFocused, false);
});


test("activity type field opens its own secondary sheet and confirmation updates the form", () => {
  const context = createContext(definition, {
    isEdit: false,
    activityTypePickerVisible: false,
    activityTypeIndex: 2,
    form: { activityType: "other" }
  });
  context.properties = {
    activityTypeOptionValues: ["badminton", "boardgame", "other", "eating", "outing", "movie"]
  };

  definition.methods.openActivityTypePicker.call(context);
  assert.equal(context.data.activityTypePickerVisible, true);

  definition.methods.confirmActivityTypePicker.call(context, {
    detail: { value: "movie", label: "电影" }
  });
  assert.equal(context.data.activityTypePickerVisible, false);
  assert.equal(context.data.form.activityType, "movie");
  assert.equal(context.data.activityTypeIndex, 5);
});

test("activity type sheet follows the prototype grouping and preserves temporary selection until confirmation", () => {
  const componentPath = require.resolve("../components/activity-type-picker-sheet/index.js");
  const previousComponent = global.Component;
  let typeDefinition;
  global.Component = (value) => { typeDefinition = value; };
  delete require.cache[componentPath];
  const helpers = require(componentPath);
  global.Component = previousComponent;

  const groups = helpers.buildGroupedOptions(
    ["badminton", "boardgame", "other", "eating", "outing", "movie"],
    ["羽毛球", "桌游", "其它", "吃饭", "外出", "电影"]
  );
  assert.deepEqual(groups.map((group) => [group.title, group.options.map((item) => item.label)]), [
    ["室内活动", ["桌游", "电影", "吃饭"]],
    ["外出活动", ["外出", "羽毛球", "其他"]]
  ]);

  const events = [];
  const context = {
    ...typeDefinition.methods,
    properties: {
      value: "boardgame",
      optionValues: ["badminton", "boardgame", "other", "eating", "outing", "movie"],
      optionLabels: ["羽毛球", "桌游", "其它", "吃饭", "外出", "电影"]
    },
    data: { ...typeDefinition.data },
    setData(patch) { Object.assign(this.data, patch); },
    triggerEvent(name, detail) { events.push({ name, detail }); }
  };
  typeDefinition.methods.initializeOptions.call(context);
  assert.equal(context.data.selectedValue, "boardgame");
  typeDefinition.methods.onSelect.call(context, { currentTarget: { dataset: { value: "outing" } } });
  assert.equal(context.data.selectedValue, "outing");
  assert.equal(events.length, 0);
  typeDefinition.methods.onConfirm.call(context);
  assert.deepEqual(events, [{ name: "confirm", detail: { value: "outing", label: "外出", index: 4 } }]);
});

test("activity type sheet markup and dimensions match the Pencil component", () => {
  const formWxml = fs.readFileSync(path.join(__dirname, "../components/activity-form-sheet/index.wxml"), "utf8");
  const typeWxml = fs.readFileSync(path.join(__dirname, "../components/activity-type-picker-sheet/index.wxml"), "utf8");
  const typeCss = fs.readFileSync(path.join(__dirname, "../components/activity-type-picker-sheet/index.wxss"), "utf8");

  assert.match(formWxml, /bindtap="openActivityTypePicker"/);
  assert.doesNotMatch(formWxml, /<picker[^>]*mode="selector"/);
  assert.match(formWxml, /<activity-type-picker-sheet[\s\S]*wx:if="{{activityTypePickerVisible}}"[\s\S]*bindconfirm="confirmActivityTypePicker"/);
  assert.match(typeWxml, /^<root-portal enable="{{visible}}">/);
  assert.match(typeWxml, /<view[^>]*class="type-sheet-root"[^>]*catchtouchmove="stopPropagation"[^>]*>/);
  assert.match(typeWxml, /选择活动类型/);
  assert.match(typeWxml, /src="\/images\/icon-close\.svg"/);
  assert.match(typeWxml, /class="type-sheet-option {{option\.value === selectedValue \? 'type-sheet-option--selected' : ''}}"/);
  assert.match(typeWxml, /class="type-sheet-confirm"[\s\S]*>确定<\/view>/);

  assert.match(typeCss, /\.type-sheet-panel\s*{[\s\S]*?border-radius:\s*48rpx 48rpx 0 0;[\s\S]*?background:\s*#ffffff;/);
  assert.match(typeCss, /\.type-sheet-header\s*{[\s\S]*?height:\s*112rpx;[\s\S]*?padding:\s*0 32rpx;/);
  assert.match(typeCss, /\.type-sheet-content\s*{[\s\S]*?padding:\s*32rpx;[\s\S]*?gap:\s*32rpx;/);
  assert.match(typeCss, /\.type-sheet-group\s*{[\s\S]*?gap:\s*20rpx;/);
  assert.match(typeCss, /\.type-sheet-group-title\s*{[\s\S]*?font-size:\s*28rpx;[\s\S]*?line-height:\s*40rpx;[\s\S]*?font-weight:\s*600;/);
  assert.match(typeCss, /\.type-sheet-options\s*{[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?gap:\s*20rpx;/);
  assert.match(typeCss, /\.type-sheet-option\s*{[\s\S]*?width:\s*calc\(\(100% - 20rpx\) \/ 2\);[\s\S]*?height:\s*96rpx;[\s\S]*?border-radius:\s*24rpx;/);
  assert.match(typeCss, /\.type-sheet-option--selected\s*{[\s\S]*?border:\s*2rpx solid #ff9800;[\s\S]*?background:\s*#fff3e0;/);
  assert.match(typeCss, /\.type-sheet-option--selected \.type-sheet-option-label\s*{[\s\S]*?color:\s*#ff9800;[\s\S]*?font-weight:\s*600;/);
  assert.match(typeCss, /\.type-sheet-footer\s*{[\s\S]*?height:\s*160rpx;[\s\S]*?padding:\s*12rpx 32rpx 60rpx;[\s\S]*?border-top:\s*2rpx solid #e5e7eb;[\s\S]*?box-shadow:\s*0 -6rpx 24rpx rgba\(0, 0, 0, 0\.07\);/);
  assert.match(typeCss, /\.type-sheet-confirm\s*{[\s\S]*?height:\s*88rpx;[\s\S]*?border-radius:\s*24rpx;[\s\S]*?font-weight:\s*700;/);
});

test("picker sheet is mounted on demand and portaled above the form sheet", () => {
  const formWxml = fs.readFileSync(path.join(__dirname, "../components/activity-form-sheet/index.wxml"), "utf8");
  const pickerWxml = fs.readFileSync(path.join(__dirname, "../components/date-time-picker-sheet/index.wxml"), "utf8");
  assert.match(formWxml, /<date-time-picker-sheet[\s\S]*wx:if="{{pickerVisible}}"[\s\S]*visible="{{true}}"/);
  assert.match(pickerWxml, /^<root-portal enable="{{visible}}">/);
  assert.match(pickerWxml, /<view[^>]*class="picker-sheet-root"[^>]*catchtouchmove="stopPropagation"[^>]*>/);
  assert.match(pickerWxml, /class="picker-sheet-mask"[^>]*catchtap="onClose"/);
  assert.match(pickerWxml, /<view class="picker-sheet-panel">/);
  assert.doesNotMatch(pickerWxml, /picker-sheet-panel"[^>]*catch(?:tap|touchmove)=/);
});



test("picker structure follows the prototype instead of native indicator styling", () => {
  const pickerWxml = fs.readFileSync(path.join(__dirname, "../components/date-time-picker-sheet/index.wxml"), "utf8");
  const pickerCss = fs.readFileSync(path.join(__dirname, "../components/date-time-picker-sheet/index.wxss"), "utf8");

  assert.match(pickerWxml, /class="picker-sheet-selection picker-sheet-selection--{{mode}}"/);
  assert.match(pickerWxml, /indicator-class="picker-sheet-native-indicator"/);
  assert.match(pickerWxml, /indicator-style="height: 96rpx; background: transparent; border: 0; box-shadow: none;"/);
  assert.match(pickerWxml, /class="picker-sheet-fade picker-sheet-fade--top"/);
  assert.match(pickerWxml, /class="picker-sheet-fade picker-sheet-fade--bottom"/);
  assert.match(pickerWxml, /src="\/images\/icon-close\.svg"/);
  assert.match(pickerWxml, /<view class="picker-sheet-confirm"[\s\S]*>确定<\/view>/);
  assert.doesNotMatch(pickerWxml, /<button class="picker-sheet-confirm"/);
  assert.doesNotMatch(pickerWxml, /picker-sheet-item--selected|selectedHourIndex|selectedMinuteIndex/);
  assert.doesNotMatch(pickerWxml, /mask-style="background:\s*transparent;"/);

  assert.match(pickerCss, /\.picker-sheet-panel\s*{[\s\S]*?height:\s*792rpx;[\s\S]*?border-radius:\s*48rpx 48rpx 0 0;/);
  assert.match(pickerCss, /\.picker-sheet-wheel\s*{[\s\S]*?height:\s*518rpx;/);
  assert.match(pickerCss, /\.picker-sheet-selection\s*{[\s\S]*?z-index:\s*2;[\s\S]*?top:\s*210rpx;[\s\S]*?height:\s*96rpx;[\s\S]*?background:\s*rgba\(0,\s*0,\s*0,\s*0\.04\);[\s\S]*?pointer-events:\s*none;/);
  assert.match(pickerCss, /\.picker-sheet-view\s*\{[\s\S]*?top:\s*18rpx;[\s\S]*?height:\s*480rpx;[\s\S]*?transform:\s*scaleY\(1\.45\);[\s\S]*?transform-origin:\s*center center;/);
  assert.match(pickerCss, /\.picker-sheet-column\s*\{[\s\S]*?height:\s*480rpx;/);
  assert.match(pickerCss, /\.picker-sheet-item\s*{[\s\S]*?height:\s*96rpx;/);
  assert.match(pickerCss, /\.picker-sheet-item\s*{[\s\S]*?transform:\s*scaleY\(0\.689655\);[\s\S]*?transform-origin:\s*center center;/);
  assert.match(pickerCss, /\.picker-sheet-fade--top\s*\{[\s\S]*?height:\s*116rpx;[\s\S]*?rgba\(255, 255, 255, 0\.72\),[\s\S]*?rgba\(255, 255, 255, 0\)/);
  assert.match(pickerCss, /\.picker-sheet-fade--bottom\s*\{[\s\S]*?top:\s*402rpx;[\s\S]*?height:\s*114rpx;[\s\S]*?rgba\(255, 255, 255, 0\),[\s\S]*?rgba\(255, 255, 255, 0\.72\)/);
  assert.match(pickerCss, /\.picker-sheet-view--date \.picker-sheet-column--year\s*{[\s\S]*?width:\s*240rpx;[\s\S]*?flex:\s*none;/);
  assert.match(pickerCss, /\.picker-sheet-view--datetime \.picker-sheet-column--hour,[\s\S]*?width:\s*124rpx;[\s\S]*?flex:\s*none;/);
  assert.match(pickerCss, /\.picker-sheet-footer\s*{[\s\S]*?position:\s*relative;[\s\S]*?z-index:\s*4;[\s\S]*?height:\s*160rpx;[\s\S]*?padding-bottom:\s*60rpx;[\s\S]*?box-shadow:\s*0 -6rpx 24rpx rgba\(0, 0, 0, 0\.07\);/);
  assert.match(pickerCss, /\.picker-sheet-confirm\s*{[\s\S]*?width:\s*calc\(100% - 64rpx\);[\s\S]*?margin:\s*0 32rpx;[\s\S]*?border-radius:\s*24rpx;/);
});

test("activity form typography uses even pixel sizes and picker columns use date units without slash separators", () => {
  const formCss = fs.readFileSync(path.join(__dirname, "../components/activity-form-sheet/index.wxss"), "utf8");
  const pickerCss = fs.readFileSync(path.join(__dirname, "../components/date-time-picker-sheet/index.wxss"), "utf8");
  const pickerWxml = fs.readFileSync(path.join(__dirname, "../components/date-time-picker-sheet/index.wxml"), "utf8");
  const oddPixelRpx = /font-size:\s*(22|26|30|34|42)rpx/;
  assert.doesNotMatch(formCss, oddPixelRpx);
  assert.doesNotMatch(pickerCss, oddPixelRpx);
  assert.match(pickerWxml, /}}年<\/view>/);
  assert.match(pickerWxml, /}}月<\/view>/);
  assert.match(pickerWxml, /}}日<\/view>/);
  assert.doesNotMatch(pickerWxml, /}}\s*\/<\/view>/);
  assert.doesNotMatch(pickerWxml, /picker-sheet-item--selected/);
  assert.match(pickerCss, /\.picker-sheet-item\s*\{[\s\S]*?color:\s*#000000;[\s\S]*?font-weight:\s*600;/);
});

test("critical custom component hosts keep stable qa ids for runtime validation", () => {
  const listWxml = fs.readFileSync(
    path.join(__dirname, "../pages/activity_list/activity_list.wxml"),
    "utf8"
  );
  const detailWxml = fs.readFileSync(
    path.join(__dirname, "../pages/activity_detail/activity_detail.wxml"),
    "utf8"
  );
  const formWxml = fs.readFileSync(
    path.join(__dirname, "../components/activity-form-sheet/index.wxml"),
    "utf8"
  );

  const createFormHost = listWxml.match(/<activity-form-sheet\b[\s\S]*?\/>/)?.[0] || "";
  const editFormHost = detailWxml.match(/<activity-form-sheet\b[\s\S]*?\/>/)?.[0] || "";
  const typePickerHost = formWxml.match(/<activity-type-picker-sheet\b[\s\S]*?\/>/)?.[0] || "";
  const dateTimePickerHost = formWxml.match(/<date-time-picker-sheet\b[\s\S]*?\/>/)?.[0] || "";

  assert.match(createFormHost, /\bid="qaActivityFormSheet"/);
  assert.match(createFormHost, /\bmode="create"/);
  assert.match(editFormHost, /\bid="qaActivityFormSheet"/);
  assert.match(editFormHost, /\bmode="edit"/);
  assert.match(typePickerHost, /\bid="qaActivityTypePickerSheet"/);
  assert.match(dateTimePickerHost, /\bid="qaDateTimePickerSheet"/);
});
