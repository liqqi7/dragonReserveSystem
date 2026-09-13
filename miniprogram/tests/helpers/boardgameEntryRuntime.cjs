const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.resolve(__dirname,'../..');
const plain = v => JSON.parse(JSON.stringify(v));
function runtime(transport, values = {}) {
  const storage = new Map(Object.entries({userId:1,userRole:'user',userNickname:'测试成员',accessToken:'synthetic-token',...values}));
  const cache = new Map(), requests = [], navigations = [], timers = new Map();
  let timerId = 0;
  const wx = {getStorageSync:k => storage.get(k) || '', setStorageSync:(k,v) => storage.set(k,plain(v)),
    removeStorageSync:k => storage.delete(k),
    navigateTo:o => navigations.push(o.url), redirectTo:o => navigations.push(o.url),
    request(o) {
      const u = new URL(o.url), request = {path:u.pathname.replace('/api/v1',''), query:Object.fromEntries(u.searchParams),
        method:o.method || 'GET', data:o.data, key:o.header['Idempotency-Key'], timeout:o.timeout};
      requests.push(plain(request));
      // Pass actual request headers to optional live transports without logging credentials.
      Promise.resolve().then(() => transport(request, {headers:{...o.header}})).then(
        data => o.success({statusCode:200,data,header:{}}),
        error => error.statusCode ? o.success({statusCode:error.statusCode,data:error.body || {},header:{}}) : o.fail({errMsg:'synthetic connection lost'}));
    }};
  function load(file, onPage) {
    if (cache.has(file)) return cache.get(file);
    if (file.endsWith('/services/config.js')) return {getApiBaseUrl:() => 'https://synthetic.invalid/api/v1'};
    if (file.endsWith('/services/logger.js')) return {createTraceId:() => 'synthetic-test',logInfo(){},logError(){},summarizeError(){},logRequestTransportFail(){}};
    const module = {exports:{}};
    vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,exports:module.exports,wx,Promise,Map,Set,Date,Math,Error,JSON,console,
      setTimeout:fn => {timers.set(++timerId,fn); return timerId;},clearTimeout:id => timers.delete(id),
      require:n => load(path.resolve(path.dirname(file),n.endsWith('.js') ? n : n+'.js')), Page:onPage},{filename:file});
    cache.set(file,module.exports); return module.exports;
  }
  let definition; load(path.join(root,'pages/boardgame_entry/boardgame_entry.js'),value => {definition=value;});
  const page = {...definition,data:plain(definition.data)};
  page.setData = values => Object.entries(values).forEach(([key,value]) => {
    if (value === undefined) throw new Error('undefined setData: '+key);
    const parts=key.split('.'); let target=page.data;
    parts.slice(0,-1).forEach(p => {target=target[p];}); target[parts.at(-1)]=plain(value);
  });
  page.onLoad({});
  return {page,storage,requests,navigations,timers};
}
const event = (dataset = {}, value) => ({currentTarget:{dataset},detail:{value}});
module.exports = {runtime,event,plain};
