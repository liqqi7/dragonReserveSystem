const { request } = require('./request');

const REASONS = {
  revision_mismatch:'版本已变化，请刷新后重试', already_owned:'您已拥有这款桌游',
  source_disabled:'BGG 查询暂未开启', worker_disabled:'桌游资料抓取暂未开启',
  upstream_unavailable:'来源服务暂时不可用，请稍后重试', bgg_busy:'来源服务繁忙，请稍后重试',
  candidate_not_ready:'桌游资料尚未准备好，请重新获取', version_game_mismatch:'请选择这款桌游的版本',
  intake_already_confirmed:'本次录入已保存', not_found:'内容暂不可用或没有查看权限',
  role_required:'登录成为成员后可使用这个功能', preview_timeout:'资料获取超时，请重试'
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
    return request({ url: path + query(values), ...(path === '/bgg/search' ? {timeout:15000} : {}) });
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
module.exports = { uuid, query, get, send, message };
