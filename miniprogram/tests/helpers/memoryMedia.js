const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function loadMediaModules(wx, logger = {}, timers = {}) {
  const loaded = {};
  function load(name) {
    if (loaded[name]) return loaded[name];
    const module = {exports: {}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../services', name + '.js'), 'utf8'), {
      module, wx, setTimeout, clearTimeout, ...timers,
      require(id) {
        if (id === './config') return {isLocalTestMediaUrl: url => /^http:\/\/192\.168\.10\.2:8002\//.test(url)};
        if (id === './logger') return {logPageError() {}, ...logger};
        return load(id.replace('./', ''));
      },
    });
    loaded[name] = module.exports; return module.exports;
  }
  return {session: load('memoryMediaSession'), videos: load('memoryVideoPreload'), images: load('memoryImages')};
}
module.exports = {loadMediaModules};
