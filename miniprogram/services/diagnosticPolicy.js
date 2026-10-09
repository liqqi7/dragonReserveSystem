function isNormalHomeDiagnostic(event, payload) {
  if (!payload) return false;
  return event === "home_presentation_snapshot" && payload.reason === "all_ready_state_committed" ||
    event === "home_media_attempt" && payload.stage === "attempt_succeeded" && !payload.slowAttempt &&
    !/failed|timeout|invalid|error/.test(Object.keys(payload.evidence || {}).join(" "));
}

module.exports = { isNormalHomeDiagnostic };
