const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function runtime(transport){
 let definition;const requests=[];const timers=new Map();let timer=0;
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../../pages/boardgame_library/boardgame_library.js'),'utf8'),{
  Page:v=>definition=v,require:n=>n.includes('boardgames')?{get:(url,q)=>{requests.push({url,q});return transport(url,q)},message:e=>e.message}: {imageError(){}},
  wx:{getWindowInfo:()=>({statusBarHeight:44}),getMenuButtonBoundingClientRect:()=>({top:48,height:32})},
  setTimeout:fn=>{timers.set(++timer,fn);return timer},clearTimeout:id=>timers.delete(id),console
 });
 const page={...definition,data:JSON.parse(JSON.stringify(definition.data)),setData(values){Object.assign(this.data,JSON.parse(JSON.stringify(values)))}};
 page.onLoad({});return {page,requests,timers};
}
module.exports={runtime};
