const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function loadMediaModules(wx, logger = {}, timers = {}, previewTimers = {}) {
  const loaded = {};
  function load(name) {
    if (loaded[name]) return loaded[name];
    const module = {exports: {}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../services', name + '.js'), 'utf8'), {
      module, wx, setTimeout, clearTimeout, ...timers, ...(name === 'memoryPreviewSession' ? previewTimers : {}),
      require(id) {
        if (id === './config') return {getApiBaseUrl: () => 'https://test.invalid/api/v1',
          isLocalTestMediaUrl: url => /^http:\/\/192\.168\.10\.2:8002\//.test(url)};
        if (id === './logger') return {logPageError() {}, ...logger};
        return load(id.replace('./', ''));
      },
    });
    loaded[name] = module.exports; return module.exports;
  }
  return {session: load('memoryMediaSession'), previewMedia: load('memoryPreviewMedia'), images: load('memoryImages'), previews: load('memoryPreviewSession'), shares: load('memoryShareImage')};
}
module.exports = {loadMediaModules};
