/* Render the real WCC tree and WXSS for browser layout review; not a native WeChat renderer. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),child=require('node:child_process');
const {runtime,event,plain}=require('../helpers/boardgameEntryRuntime.cjs');
const root=path.resolve(__dirname,'../..'),output=path.resolve(process.argv[2]||'/tmp/dragon-boardgame-entry-review');
fs.mkdirSync(output,{recursive:true});
const compiler='/Applications/wechatwebdevtools.app/Contents/Resources/package.nw/node_modules/wcc-exec/wcc';
child.execFileSync(compiler,['-o',path.join(output,'wxml.js'),'pages/boardgame_entry/boardgame_entry.wxml'],{cwd:root});
const sandbox={window:{},console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(output,'wxml.js'),'utf8'),sandbox);
const render=sandbox.$gwx('pages/boardgame_entry/boardgame_entry.wxml');
const escape=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
function html(node) {
 if(node===null||node===undefined)return '';
 if(typeof node!=='object')return escape(node);
 const a=node.attr||{},children=(node.children||[]).map(html).join('');
 if(node.tag==='virtual'||node.tag==='wx-page')return children;
 if(node.tag==='wx-date-time-picker-sheet')return '';
 const kind=node.tag.replace('wx-',''),tag={view:'div',text:'span',image:'img',switch:'input',picker:'select'}[kind]||kind;
 let attrs=Object.entries(a).filter(([k])=>['class','src','placeholder','maxlength','value','disabled','checked'].includes(k))
  .map(([k,v])=>['disabled','checked'].includes(k)?v?' '+k:'':' '+k+'="'+escape(v)+'"').join('');
 if(kind==='switch')attrs+=' type="checkbox" role="switch" aria-label="开关"';
 if(kind==='picker')return '<div>'+children+'</div>';
 if(['input','image'].includes(kind))return '<'+tag+attrs+'>';
 if(kind==='textarea')return '<textarea'+attrs+'>'+escape(a.value)+'</textarea>';
 return '<'+tag+attrs+'>'+children+'</'+tag+'>';
}
const css=fs.readFileSync(path.join(root,'pages/boardgame_entry/boardgame_entry.wxss'),'utf8')
 .replace(/^page\s*\{/gm,'body {').replace(/(-?\d+(?:\.\d+)?)rpx/g,(_,n)=>'calc('+n+' * 100vw / 750)');
const base='html,body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}button,input,select,textarea{font-family:inherit;border:0}input[type=checkbox]{width:42px;height:26px;flex:none;accent-color:#FF9800}img{object-fit:contain}select{box-sizing:border-box;width:100%;min-height:48px;border-radius:12px;padding:12px;background:white;font-size:14px}';
const snapshots={};
function capture(name,p){
 snapshots[name]=plain(p.data);
 fs.writeFileSync(path.join(output,name+'.html'),'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+name+' · 录入布局验证</title><style>'+base+'\n'+css+'</style><body>'+html(render(p.data))+'</body></html>');
}
async function run(){
 const item={bgg_id:1,item_id:1,revision:1,name:'合成桌游：星际旅行与失落的城市 / AnExtraordinarilyLongEnglishBoardgameTitle',game_type:'base',year_published:2020,
 min_players:2,max_players:4,min_playtime_minutes:60,max_playtime_minutes:90,detail_state:'ready',version_count:2,cover_url:null,
 description:'这是用于布局验证的合成简介。玩家一起探索，比较不同版本的语言、年份和出版商。'.repeat(12)};
 const preview={id:'synthetic',state:'ready',revision:2,items:[item],missing_ids:[]};
 const versions=[{bgg_version_id:101,name:'简体中文版（第二次印刷）',languages:['Chinese'],publishers:['合成出版商 / ALongPublisherNameForLayoutVerification'],year_published:2024},
 {bgg_version_id:102,name:'English edition',languages:['English'],publishers:['Synthetic Publisher'],year_published:2022}];
 const {page:p}=runtime(r=>r.path==='/bgg/search'?{items:[item],total:1,next_offset:null}:
 r.path==='/boardgame-intake-previews'?preview:r.path.endsWith('/items/1')?{game:item,versions,total:2,next_offset:null}:{game_id:1,inventory_ids:[1]});
 capture('initial',p);p.inputQuery(event({},'星际旅行'));await p.search();capture('search',p);
 p.applyPreview({...preview,state:'queued',items:[]},p._generation);capture('pending',p);
 p.applyPreview({...preview,state:'failed',items:[],retryable:true},p._generation);capture('failed',p);
 p.applyPreview(preview,p._generation);
 await p.chooseCandidate(event({id:1}));capture('version',p);p.chooseVersion(event({id:101}));p.continueEntry();p.ownerChange(event({},1));
 p.field(event({key:'purchase_price'},'0'));p.dateConfirm({detail:{dateValue:'2026-01-02'}});capture('form',p);
 await p.save();capture('success',p);p.newEntry();p.inputQuery(event({},'未知桌游'));await p.search();p.manualEntry();capture('manual',p);
 const recovery=runtime(()=>({}),{'boardgames:intake:pending:v1:1':{key:'4104df99-21b9-4c0e-b6e6-f94a549b3ad4',payload:{source:'manual',game:{name:'待确认的桌游'},inventory:null}}});
 capture('recover',recovery.page);
 fs.writeFileSync(path.join(output,'states.json'),JSON.stringify(snapshots,null,2));
 const groups=Object.keys(snapshots).map(name=>'<section><h2>'+name+'</h2><div class="row">'+[320,390].map(width=>'<div><p>'+width+'px</p><iframe title="'+name+' '+width+'" src="'+name+'.html" width="'+width+'" height="780"></iframe></div>').join('')+'</div></section>').join('');
 fs.writeFileSync(path.join(output,'index.html'),'<!doctype html><meta charset="utf-8"><title>桌游名称录入 · 布局验收</title><style>body{font:14px -apple-system,sans-serif;margin:32px;background:#edf0f3;color:#111827}.row{display:flex;gap:24px;align-items:start}section{margin:32px 0 48px}iframe{border:0;border-radius:16px;background:#f5f5f5}h2{font-size:20px}</style><h1>桌游名称录入 · 布局验收</h1><p>真实页面控制器 + WCC 模板编译结果 + 原 WXSS；浏览器控件替代原生控件。合成数据，不代表微信真机渲染验收。</p>'+groups);
 console.log(JSON.stringify({output,states:Object.keys(snapshots),widths:[320,390]}));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
