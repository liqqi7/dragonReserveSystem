const test = require("node:test");
const assert = require("node:assert/strict");
const {
  daysInMonth,
  buildMinutes,
  roundUpToMinuteStep,
  buildPickerState
} = require("../utils/dateTimePicker");

test("daysInMonth handles leap years and month lengths", () => {
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(2028, 2), 29);
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2026, 4), 30);
  assert.equal(daysInMonth(2026, 7), 31);
});

test("buildMinutes uses five-minute steps and preserves legacy minute", () => {
  assert.deepEqual(buildMinutes(5), [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  assert.deepEqual(buildMinutes(5, 7), [0, 5, 7, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
});

test("roundUpToMinuteStep rounds across day boundary", () => {
  assert.equal(roundUpToMinuteStep(new Date(2026, 7, 16, 23, 58, 20), 5).getTime(), new Date(2026, 7, 17, 0, 0, 0).getTime());
  assert.equal(roundUpToMinuteStep(new Date(2026, 7, 16, 9, 10, 1), 5).getTime(), new Date(2026, 7, 16, 9, 15, 0).getTime());
  assert.equal(roundUpToMinuteStep(new Date(2026, 7, 16, 9, 10, 0), 5).getTime(), new Date(2026, 7, 16, 9, 10, 0).getTime());
});

test("buildPickerState maps date, time and datetime indexes", () => {
  const now = new Date(2026, 7, 16, 9, 0, 0);
  const date = buildPickerState({ mode: "date", value: "2028-02-29", now });
  assert.deepEqual(date.pickerValue, [4, 1, 28]);
  assert.equal(date.days.length, 29);

  const time = buildPickerState({ mode: "time", value: "09:07", now });
  assert.equal(time.hours[time.pickerValue[0]], 9);
  assert.equal(time.minutes[time.pickerValue[1]], 7);

  const datetime = buildPickerState({ mode: "datetime", value: "2026-08-16 13:35", now });
  assert.equal(datetime.years[datetime.pickerValue[0]], 2026);
  assert.equal(datetime.months[datetime.pickerValue[1]], 8);
  assert.equal(datetime.days[datetime.pickerValue[2]], 16);
  assert.equal(datetime.hours[datetime.pickerValue[3]], 13);
  assert.equal(datetime.minutes[datetime.pickerValue[4]], 35);
});

function loadPickerComponentDefinition() {
  const componentPath = require.resolve("../components/date-time-picker-sheet/index.js");
  const previousComponent = global.Component;
  let definition;
  global.Component = (value) => { definition = value; };
  delete require.cache[componentPath];
  require(componentPath);
  global.Component = previousComponent;
  return definition;
}

test("picker initialization does not write observed mode property", () => {
  const definition = loadPickerComponentDefinition();
  let patch;
  const context = {
    properties: {
      mode: "datetime",
      value: "2026-08-17 19:30",
      minYear: 0,
      maxYear: 0,
      minuteStep: 5
    },
    setData(value) { patch = value; }
  };

  definition.methods.initializePicker.call(context);

  assert.equal(Object.prototype.hasOwnProperty.call(patch, "mode"), false);
  assert.deepEqual(patch.pickerValue.length, 5);
  assert.equal(patch.showDate, true);
  assert.equal(patch.showTime, true);
  assert.equal(Object.prototype.hasOwnProperty.call(patch, "selectedHourIndex"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(patch, "selectedMinuteIndex"), false);
});

test("datetime wheel keeps all five column indexes without delayed visual-selection state", () => {
  const definition = loadPickerComponentDefinition();
  let patch;
  const context = {
    data: {
      mode: "datetime",
      years: [2026],
      months: Array.from({ length: 12 }, (_, index) => index + 1)
    },
    setData(value) { patch = value; }
  };

  definition.methods.onPickerChange.call(context, {
    detail: { value: [0, 7, 16, 19, 6] }
  });

  assert.deepEqual(patch.pickerValue, [0, 7, 16, 19, 6]);
  assert.equal(Object.prototype.hasOwnProperty.call(patch, "selectedHourIndex"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(patch, "selectedMinuteIndex"), false);
});
