#!/usr/bin/env node
/* Generate the ignored, machine-local API configuration after a fresh checkout. */
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_API = 'http://127.0.0.1:8001/api/v1';

function initialize(projectRoot, apiBase = DEFAULT_API) {
  const directory = path.join(projectRoot, 'miniprogram', 'services');
  const destination = path.join(directory, 'config.js');
  if (fs.existsSync(destination)) return {created:false};
  let url;
  try { url = new URL(apiBase); }
  catch (_) { throw new Error('API 地址必须是完整的 HTTP 或 HTTPS URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash
      || url.pathname.replace(/\/$/, '') !== '/api/v1') {
    throw new Error('API 地址需以 /api/v1 结尾，不能包含账号密码、查询参数或片段');
  }
  const source = fs.readFileSync(path.join(directory, 'config.js.template'), 'utf8');
  const apiPattern = /^const API_BASE_URL = .*;$/m;
  const envPattern = /^const API_ENVIRONMENT = .*;$/m;
  if (!apiPattern.test(source) || !envPattern.test(source)) throw new Error('API 配置模板格式已变化，请检查模板');
  const output = source.replace(apiPattern, () => `const API_BASE_URL = ${JSON.stringify(url.href.replace(/\/$/, ''))};`)
    .replace(envPattern, () => `const API_ENVIRONMENT = ${JSON.stringify(url.protocol === 'http:' ? 'local' : 'custom')};`);
  try {
    fs.writeFileSync(destination, output, {flag:'wx', mode:0o600});
  } catch (error) {
    if (error.code === 'EEXIST') return {created:false};
    throw error;
  }
  return {created:true};
}

if (require.main === module) {
  try {
    if (process.argv.length > 3) throw new Error('用法：node scripts/init_miniprogram_config.cjs [API地址]');
    const result = initialize(path.resolve(__dirname, '..'), process.argv[2]);
    console.log(result.created
      ? '已生成 miniprogram/services/config.js。请在微信开发者工具重新编译；已有页面数据仍需同分支后端。'
      : 'miniprogram/services/config.js 已存在，保留原配置。');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {initialize};
