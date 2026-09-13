/* Real WCC trees + original WXSS + synthetic controller snapshots for layout review.
 * Native controls are browser substitutes. This is not WeChat device acceptance.
 * First run test_boardgame_frontend_contract with BOARDGAME_LAYOUT_REVIEW_DIR set.
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),child=require('node:child_process');
const root=path.resolve(__dirname,'../..'),output=path.resolve(process.argv[2]||'/tmp/dragon-boardgame-ui-review');
const plain=x=>JSON.parse(JSON.stringify(x)),states=JSON.parse(fs.readFileSync(path.join(output,'controller-states.json'),'utf8'));
const compiler='/Applications/wechatwebdevtools.app/Contents/Resources/package.nw/node_modules/wcc-exec/wcc';
const files=fs.readdirSync(root,{recursive:true}).filter(f=>/\.(wxml|wxs)$/.test(f));
child.execFileSync(compiler,['-o',path.join(output,'compiled-wxml.js'),...files],{cwd:root});
const sandbox={window:{},console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(output,'compiled-wxml.js'),'utf8'),sandbox);
const entryDir=path.join(output,'entry');child.execFileSync(process.execPath,[path.join(__dirname,'renderBoardgameEntry.cjs'),entryDir]);
for(const [name,data] of Object.entries(JSON.parse(fs.readFileSync(path.join(entryDir,'states.json'),'utf8'))))states['boardgame_entry--'+name]={page:'boardgame_entry',data};
function variant(name,from,mutate){const entry=plain(states[from]);mutate(entry.data);states[name]=entry;}
variant('boardgames--long-catalog','boardgames',d=>{d.games=Array.from({length:6},(_,i)=>({...d.games[0],id:i+1,
  name:['超长中文桌游名称：星际旅行与失落的城市','AnExtraordinarilyLongEnglishBoardgameTitle','合成游戏·标准版'][i%3],
  cover_url:i%2?null:'/images/icon-dice-5.svg',min_players:10,max_players:12,min_playtime_minutes:100,max_playtime_minutes:120,
  my_tags:[{id:1,name:'想试新玩法'},{id:2,name:'周末常玩'},{id:3,name:'适合聚会'},{id:4,name:'有中文规则'}]}));});
for(const state of ['empty','loading','error'])variant('boardgames--'+state,'boardgames',d=>{d.games=[];d.loading=state==='loading';d.error=state==='error'?'暂时无法加载，点击重试':'';});
variant('boardgames--menu','boardgames',d=>{d.moreOpen=true;});
variant('boardgames--save','boardgames',d=>{d.savedOpen=true;d.savedName='周末四人游戏';});
variant('boardgames--filters','boardgames',d=>{d.filterOpen=true;d.filterTags=Array.from({length:5},(_,i)=>({id:i,name:'合成分类标签 '+(i+1),included:i===0}));});
variant('boardgame_detail--description','boardgame_detail',d=>{d.game.name='很长的桌游标题：星际旅行与失落城市';d.game.description='这段合成介绍用于核对长文的折叠、行距和中文换行。'.repeat(30);});
variant('boardgame_detail--inventory','boardgame_detail',d=>{d.tab='inventory';d.inventory=[{...states['boardgame_manage--correct'].data.selected,statusLabel:'可使用'}];});
variant('boardgame_detail--box','boardgame_detail--inventory',d=>{const b=d.inventory[0];d.inventoryOpen=true;d.boxId=b.id;d.box={...b,...b.internal,owner_type:b.owner.type,owner_user_id:b.owner.id};d.boxStatusIndex=1;});
variant('boardgame_play--advanced','boardgame_play--entry',d=>{d.detailsOpen=d.playerOptionsOpen=d.advancedOpen=d.timingOpen=true;d.form.players[0].display_name='很长很长的合成玩家名字';});
variant('boardgame_play--members','boardgame_play--entry',d=>{d.memberOpen=true;d.members=Array.from({length:12},(_,i)=>({id:i+1,nickname:'合成成员 '+(i+1),avatar_url:'/images/default-avatar.svg'}));});
variant('boardgame_stats--menu','boardgame_stats--overview',d=>{d.metricOpen=true;});
variant('boardgame_stats--filters','boardgame_stats--overview',d=>{d.filterOpen=true;});
variant('boardgame_offline--conflict','boardgame_offline',d=>{d.items=[{operation_id:'synthetic',title:'对局成绩',stateLabel:'需要核对',canResolve:true,action:'play.patch',localText:'合成成员：0 分；另一位成员：摆烂不算分了。',remoteText:'合成成员：10 分；另一位成员：未填写。'}];});
const escape=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
function flatten(nodes){return nodes.flatMap(n=>n&&n.tag==='virtual'?flatten(n.children||[]):[n]);}
const fixtureModules=new Map();
function fixtureModule(file){if(!file.endsWith('.js'))file+='.js';if(file.endsWith('/services/boardgames.js'))return {get:async()=>({items:[]})};
  if(fixtureModules.has(file))return fixtureModules.get(file);const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,exports:module.exports,require:n=>fixtureModule(path.resolve(path.dirname(file),n)),Date,Number,Math,JSON,Map,Set,console},{filename:file});fixtureModules.set(file,module.exports);return module.exports;}
function componentData(name,attrs){let def;const file=path.join(root,'components',name,'index.js');
  vm.runInNewContext(fs.readFileSync(file,'utf8'),{Component:v=>def=v,require:n=>fixtureModule(path.resolve(path.dirname(file),n)),Date,Number,Math,JSON,Map,Set,console},{filename:file});
  const props={};for(const [k,spec] of Object.entries(def.properties||{}))props[k]=attrs[k]??(spec&&spec.value!==undefined?spec.value:spec===Boolean?false:spec===String?'':null);
  const obj={...def.methods,data:{...plain(def.data||{}),...props},properties:props,setData(values){for(const [k,v] of Object.entries(values))this.data[k]=v;},triggerEvent(){}};
  if(name==='date-time-picker-sheet'&&props.visible)obj.initializePicker();
  if(name==='boardgame-filters'&&props.visible){const now=new Date(),q=props.query||{};obj.data.form={...q,year:q.year||now.getFullYear(),month:q.month||now.getMonth()+1,quarter:q.quarter||Math.floor(now.getMonth()/3)+1};}
  return obj.data;
}
function html(node,slots={}){
  if(node===null||node===undefined)return '';
  if(typeof node!=='object')return escape(node);
  const a=node.attr||{},kind=(node.tag||'virtual').replace(/^wx-/,'');
  if(kind==='slot')return (slots[a.name||'default']||[]).map(n=>html(n)).join('');
  if(['boardgame-sheet','boardgame-filters','date-time-picker-sheet'].includes(kind)){
    if(!a.visible)return '';
    const projected={};for(const c of flatten(node.children||[])){const slot=c&&c.attr&&c.attr.slot||'default';(projected[slot]||=[]).push(c);}
    return html(sandbox.$gwx(`components/${kind}/index.wxml`)(componentData(kind,a)),projected);
  }
  const children=(node.children||[]).map(n=>html(n,slots)).join('');
  if(['virtual','page','root-portal','block'].includes(kind))return children;
  if(kind==='picker')return '<div class="native-picker">'+children+'</div>';
  const tag={view:'div',text:'span',image:'img',switch:'input','scroll-view':'div','picker-view':'div','picker-view-column':'div'}[kind]||kind;
  let attrs=Object.entries(a).filter(([k])=>['class','style','src','placeholder','maxlength','value','disabled','checked'].includes(k))
    .map(([k,v])=>['disabled','checked'].includes(k)?v?' '+k:'':' '+k+'="'+escape(v)+'"').join('');
  if(kind==='switch')attrs+=' type="checkbox" role="switch" aria-label="开关"';
  if(kind==='scroll-view')attrs+=' data-scroll="'+(a.scrollX?'x':'y')+'"';
  if(kind==='image')attrs+=' data-fit="'+(a.mode==='aspectFill'?'cover':'contain')+'"';
  if(['input','image'].includes(kind))return '<'+tag+attrs+'>';
  if(kind==='textarea')return '<textarea'+attrs+'>'+escape(a.value)+'</textarea>';
  return '<'+tag+attrs+'>'+children+'</'+tag+'>';
}
function css(file){return fs.readFileSync(file,'utf8').replace(/@import\s+"([^"]+)";/g,(_,name)=>css(path.resolve(path.dirname(file),name)))
  .replace(/^page\s*\{/gm,'body {').replace(/(-?\d+(?:\.\d+)?)rpx/g,(_,n)=>`calc(${n} * 100vw / 750)`);}
const base=`html,body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}button,input,select,textarea{font-family:inherit;border:0}button{margin:0;cursor:pointer}input[type=checkbox]{appearance:none;position:relative;width:44px;height:24px;min-width:44px;flex:none;padding:0;background:#D1D5DB;border-radius:24px}input[type=checkbox]:checked{background:#FF9800}input[type=checkbox]::after{content:"";position:absolute;left:2px;top:2px;width:20px;height:20px;border-radius:50%;background:#FFFFFF}input[type=checkbox]:checked::after{left:22px}img{object-fit:contain}img[data-fit=cover]{object-fit:cover}.native-picker{min-width:0}[data-scroll=x]{overflow-x:auto}[data-scroll=y]{overflow-y:auto}textarea{resize:none}`;
const componentCss=['boardgame-sheet','boardgame-filters','date-time-picker-sheet'].map(name=>css(path.join(root,'components',name,'index.wxss'))).join('\n');
for(const [name,{page,data}] of Object.entries(states)){
  const source=`pages/${page}/${page}.wxml`,styles=base+'\n'+componentCss+'\n'+css(path.join(root,`pages/${page}/${page}.wxss`));
  fs.writeFileSync(path.join(output,name+'.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title><style>${styles}</style><body>${html(sandbox.$gwx(source)(data))}</body></html>`);
}
const imageDir=path.join(output,'images');if(!fs.existsSync(imageDir))fs.symlinkSync(path.join(root,'images'),imageDir,'dir');
const gallery=Object.keys(states).map(name=>`<section id="${name}"><h2>${name}</h2><div class="row">${[320,390].map(width=>`<div><p>${width}px</p><iframe title="${name} ${width}" src="${name}.html" width="${width}" height="844"></iframe></div>`).join('')}</div></section>`).join('');
fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>桌游一期 · 页面布局验收</title><style>body{font:14px -apple-system,sans-serif;margin:32px;background:#edf0f3;color:#111827}.row{display:flex;gap:24px;align-items:start}section{margin:32px 0 48px}iframe{border:0;background:white;border-radius:16px}h2{font-size:20px}a{color:#7C3A05}</style><h1>桌游一期 · 页面布局验收</h1><p>真实控制器数据、WCC 模板、原 WXSS。合成边界数据与浏览器控件替代，不代表微信真机渲染验收。</p>${gallery}</html>`);
fs.writeFileSync(path.join(output,'states.json'),JSON.stringify(states,null,2));
console.log(JSON.stringify({output,pages:new Set(Object.values(states).map(s=>s.page)).size,states:Object.keys(states).length,widths:[320,390]}));
