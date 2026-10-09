function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDate(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function formatTime(hour, minute) {
  return `${pad(hour)}:${pad(minute)}`;
}

module.exports = { pad, formatDate, formatTime };
