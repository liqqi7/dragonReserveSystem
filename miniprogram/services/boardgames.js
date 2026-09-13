const { request } = require('./request');

const REASONS = {
  revision_mismatch: '这条记录已被修改，请刷新后核对',
  duplicate_confirmation_required: '发现相似对局，请核对后再保存',
  checkin_required: '签到后才可以记录活动对局',
  activity_checkin_required: '签到后才可以记录活动对局',
  score_status_value_conflict: '已记分需要填写分数，特殊状态请清空分数',
  scoresheet_update_required: '计分规则已变更，请同时更新计分表',
  final_score_conflict: '最终分数与计分表不一致，请到计分表中修改',
  game_and_single_scoring_mode_required: '先选择游戏和对局模式',
  reason_required: '请填写修改原因',
  player_mapping_required: '请先匹配导入记录中的玩家',
  source_changed: '来源数据有更新，请先核对差异',
  streak_result_filter_not_supported: '连胜需要保留胜负完整顺序，请先清除胜负结果筛选',
  source_sheet_update_requires_confirmation: '这局已有计分表，请明确确认是否替换来源结构',
  non_owned_copy_requires_explicit_inventory: '这盒在来源中不是当前拥有，请手动核对实物状态',
  source_disabled: 'BGG 查询暂未开启，可以先手动录入',
  upstream_unavailable: '来源服务暂时不可用，请稍后重试',
  bgg_busy: '来源服务正在处理其他查询，请稍后重试',
  worker_disabled: '桌游资料抓取暂未开启，请稍后再试',
  search_name_required: '请先输入桌游名称',
  candidate_not_ready: '候选资料尚未准备好，请等待或重新获取',
  version_game_mismatch: '所选版本不属于这款游戏，请重新选择',
  intake_already_confirmed: '这次录入已经保存，请查看已录入的桌游',
  bgg_already_bound: '这款游戏已被收录，请重新核对后复用已有资料',
  not_found: '内容暂不可用或没有查看权限',
  role_required: '登录成为成员后可使用这个功能',
  preview_changed:'相关记录已变化，请关闭后重新预览影响',
  merge_conflict:'存在身份或关联冲突，请重新核对目标记录',
  account_already_bound:'这个账号已有玩家身份，请把重复记录合并到该身份',
  same_game_correction:'请选择与当前不同的游戏',
  quantity_split_confirmation_required:'请逐局核对来源包含的全部对局',
  explicit_segments_required:'请先完成每一局的日期、玩家和成绩核对',
  source_slot_mismatch:'来源玩家已变化，请重新核对匹配关系',
  segment_slot_mismatch:'分局玩家与来源不一致，请重新逐局核对',
  incompatible_expansion:'请填写扩展的兼容说明，或换用已确认兼容的扩展',
  duplicate_source_slot:'同一局不能重复引用同一位来源玩家'
};

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const n = Math.floor(Math.random() * 16);
    return (c === 'x' ? n : (n & 3) | 8).toString(16);
  });
}
function query(values = {}) {
  const parts = [];
  Object.keys(values).forEach(k => {
    const v = values[k];
    if (v === null || v === undefined || v === '') return;
    (Array.isArray(v) ? v : [v]).forEach(item => parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(item)}`));
  });
  return parts.length ? `?${parts.join('&')}` : '';
}
function get(path, values) {
  // BGG's name lookup may take longer than a normal local API request.
  return request({ url: path + query(values), ...(path === '/bgg/search' ? {timeout:45000} : {}) });
}
function send(path, method, data, key) {
  return request({ url: path, method, data, idempotencyKey: key || (method === 'POST' ? uuid() : undefined) });
}
function message(error) {
  if (error instanceof Error && !error.statusCode) return error.message;
  if (error && error.statusCode === 0) return '网络未连接，请稍后重试';
  if (error && error.statusCode === 401) return '登录已过期，请重新登录';
  const reason = error && error.body && error.body.details && error.body.details.reason;
  return REASONS[reason] || (error && error.statusCode === 403 ? '当前账号没有操作权限' :
    error && error.statusCode === 404 ? REASONS.not_found : error && error.statusCode === 409 ? '数据已变化，请刷新后核对' :
    error && error.statusCode === 422 ? '填写内容不符合要求，请检查必填项和数值' : '暂时无法完成操作，请稍后重试');
}
function errorOf(result) {
  return { statusCode: result.http_status, body: { details: result.error || {} }, current: result.current, operation_id:result.operation_id };
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatScore(player) {
  const labels = { unrecorded:'未填写', gave_up:'摆烂 · 未获胜', unfinished:'没开完', table_flip:'掀桌了' };
  return player.score_status === 'recorded' ? String(player.score) : labels[player.score_status] || '未填写';
}
module.exports = { uuid, query, get, send, message, errorOf, today, formatScore };
