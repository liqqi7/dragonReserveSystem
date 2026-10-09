const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync, execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const templatePath = path.join(root, 'miniprogram/services/config.js.template');
const template = fs.readFileSync(templatePath, 'utf8');
const readScript = name => fs.readFileSync(path.join(root, 'backend/scripts', name), 'utf8');
const psSource = readScript('start_backend_test.ps1');
const bashSource = readScript('start_backend_test.sh');
const psBlock = psSource.slice(psSource.indexOf('        $apiHost ='),
  psSource.indexOf('\n    }', psSource.indexOf('        $apiHost =')));
const bashFunctions = bashSource.slice(bashSource.indexOf('set_local_config()'),
  bashSource.indexOf('\nif [ ! -f "$ENV_FILE" ]'));
const ps = 'pwsh';
const gitPath = process.platform === 'win32'
  ? (spawnSync('where.exe', ['git'], { encoding: 'utf8', windowsHide: true }).stdout || '').split(/\r?\n/)[0]
  : '';
const gitBash = gitPath ? path.resolve(path.dirname(gitPath), '../bin/bash.exe') : '';
const bash = gitBash && fs.existsSync(gitBash) ? gitBash : 'bash';
const available = command => spawnSync(command, ['--version'], { windowsHide: true }).status === 0;
const psAvailable = available(ps);
const bashAvailable = available(bash);
const psQuote = value => `'${value.replace(/'/g, "''")}'`;
const normalize = value => value.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trimEnd();

function checkConfig(source, origin) {
  const module = { exports: {} };
  vm.runInNewContext(source, { module });
  assert.equal(module.exports.getApiBaseUrl(), `${origin}/api/v1`);
  assert.equal(module.exports.getApiEnvironment(), 'test');
  assert.equal(module.exports.getMediaUrl('images/test.png'), `${origin}/media/images/test.png`);
  assert.equal(typeof module.exports.resolveLocalMediaUrl, 'function');
  assert.equal(typeof module.exports.isLocalTestMediaUrl, 'function');
  const expected = template.replace(/const API_BASE_URL = "[^"]+";/,
    `const API_BASE_URL = "${origin}/api/v1";`)
    .replace('const API_ENVIRONMENT = "production";', 'const API_ENVIRONMENT = "test";');
  assert.equal(normalize(source), normalize(expected));
}

for (const host of ['127.0.0.1', '192.168.1.20', '0.0.0.0']) {
  const origin = `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:8001`;
  test(`PowerShell test config preserves shared helpers for ${host}`, { skip: !psAvailable }, t => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'media-config-'));
    t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
    const output = path.join(temp, 'config.js');
    execFileSync(ps, ['-NoProfile', '-Command', `
      $ErrorActionPreference = 'Stop'
      $AppHost = ${psQuote(host)}
      $MiniProgramHost = ''
      $AppPort = 8001
      $RootDir = ${psQuote(temp)}
      $MpTemplateFile = ${psQuote(templatePath)}
      $MpConfigFile = ${psQuote(output)}
      ${psBlock}
    `], { windowsHide: true });
    checkConfig(fs.readFileSync(output, 'utf8'), origin);
  });

  test(`Bash test config preserves helpers and restores production for ${host}`, { skip: !bashAvailable }, t => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'media-config-'));
    t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
    const output = path.join(temp, 'config.js');
    const options = { windowsHide: true, env: {
      ...process.env, APP_HOST: host, APP_PORT: '8001', MP_CONFIG_FILE: output,
      MP_TEMPLATE_FILE: templatePath, APP_PID: '', TUNNEL_PID: ''
    } };
    execFileSync(bash, ['-c', `${bashFunctions}\nset_local_config`], options);
    checkConfig(fs.readFileSync(output, 'utf8'), origin);
    execFileSync(bash, ['-c', `${bashFunctions}\ncleanup`], options);
    assert.equal(fs.readFileSync(output, 'utf8'), template);
    assert.equal((bashSource.match(/trap cleanup EXIT INT TERM/g) || []).length, 1);
    assert.ok(bashSource.indexOf('trap cleanup EXIT INT TERM') <
      bashSource.indexOf('if port_is_open "$SSH_TEST_DB_LOCAL_HOST"'));
  });
}

test('local phone script keeps the shared media helper', { skip: !psAvailable }, () => {
  const source = readScript('start_backend_local_phone.ps1');
  const start = source.indexOf('    $template =');
  const block = source.slice(start, source.indexOf('    $stdout =', start));
  const output = execFileSync(ps, ['-NoProfile', '-Command', `
    $MpConfig = ${psQuote(templatePath.replace(/\.template$/, ''))}
    $origin = 'http://192.168.1.20:8001'
    ${block}
    Write-Output $newConfig
  `], { windowsHide: true, encoding: 'utf8' });
  checkConfig(output, 'http://192.168.1.20:8001');
});
