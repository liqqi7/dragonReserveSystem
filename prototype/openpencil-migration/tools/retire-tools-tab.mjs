import fs from 'node:fs';
export function retireToolsTab(document){
 const toolsPage=document.pages.find(p=>p.name==='工具'),home=document.pages.find(p=>p.name==='首页');if(!toolsPage||!home)throw Error('Expected current tools and home Pages');
 const all=new Map();function index(n){all.set(n.id,n);(n.children??[]).forEach(index)}document.pages.flatMap(p=>p.children).forEach(index);
 const report={removedIds:[],movedStates:[],updatedNavigationSlots:[],removedMaster:'u30Cl',homeEntryRef:'SUsjV'};
 function deleted(n){report.removedIds.push(n.id);(n.children??[]).forEach(deleted)}
 const memoryGlyph=structuredClone(all.get('Z50zWz__glyph'));
 for(const id of ['x2L4V5','yqArW'])deleted(all.get(id));deleted(all.get('u30Cl'));
 const section=structuredClone(all.get('nAXow'));section.id='home-chwazi-section';section.name='子分区标识 · 首页 · Chwazi 随机选人';section.x=-2633;section.y=8078;section.children.forEach((n,i)=>{n.id='home-chwazi-label-'+i;n.name='随机选人-'+i;n.content=['随','机','选','人'][i]});home.children.push(section);
 for(const [i,id]of ['XiWkQ','QtAWX','AHJRA'].entries()){const n=all.get(id);n.x=-2513+i*430;n.y=8078;n.name=n.name.replace('状态 · Chwazi','状态 · 首页 · Chwazi');home.children.push(n);report.movedStates.push(id)}
 document.pages=document.pages.filter(p=>p!==toolsPage);
 function update(n){
  if(n.children)n.children=n.children.filter(c=>c.id!=='u30Cl');
  if(/^Tab\/工具/.test(n.name??'')){
   n.name=n.name.replace('工具','记忆');const icon=n.children.find(c=>(c.name??'').startsWith('图标/')),label=n.children.find(c=>c.type==='text');if(!icon||!label)throw Error('Unexpected nav slot '+n.id);icon.name=icon.name.replace('工具','记忆');const glyph=icon.children?.find(c=>c.type==='path');if(!glyph)throw Error('Expected editable nav path '+n.id);for(const key of ['d','x','y','width','height'])glyph[key]=memoryGlyph[key];glyph.name=glyph.name.replace('工具','记忆');label.content='记忆';label.name=label.name.replace('工具','记忆');report.updatedNavigationSlots.push(n.id);
  }
  if(n.id==='rZHp1')n.name='底部 Tab 状态列 · 记忆选中';
  if(n.id==='Nf65a'){n.name='底部 Tab 状态标题 · 记忆选中';n.content='记忆选中'}
  if(n.id==='x1ZlL'){n.name='底部 Tab 状态描述 · 记忆选中';n.content='用于浏览记忆内容，以及投稿、预览图片和视频。'}
  if(n.id==='tyCVh')n.content='底部导航统一引用首页、记忆、排行、我的四个选中状态，中央保留新建入口；底部安全区由页面独立引用，避免重复叠加。';
  if(n.id==='m9URt')n.name='业务组件 / 首页快捷入口卡片';
  if(n.id==='ZbWQT'){n.name='首页快捷入口标题';n.content='首页快捷入口卡片'}
  if(n.id==='gvSBK'){n.name='首页快捷入口说明';n.content='首页小工具区的可扩展入口卡片，包含 Chwazi 随机选人与桌游库，保留图文层级和插画素材。'}
  if(n.id==='SUsjV')n.name='component/首页快捷入口 · 可扩展';
  (n.children??[]).forEach(update);
 }
 document.pages.flatMap(p=>p.children).forEach(update);
 // Native measurement after retiring the duplicate Tools-selected specimen.
 const nav=all.get('o93HK'),drawer=all.get('ghmzx'),dialog=all.get('G0WeS6');drawer.y=nav.y+1488+156;dialog.y=drawer.y+2653+156;report.templateReflow={navigationHeight:1488,drawerY:drawer.y,dialogY:dialog.y};
 const order=['首页','记忆','排行榜','我的','探索','模板','素材'];document.pages.sort((a,b)=>order.indexOf(a.name)-order.indexOf(b.name));
 report.newIds=[section.id,...section.children.map(n=>n.id)];report.pages=document.pages.map(p=>({id:p.id,name:p.name,roots:p.children.length}));return report;
}
if(process.argv[1]?.endsWith('retire-tools-tab.mjs')){const d=JSON.parse(fs.readFileSync('../龙城小程序.op'));const report=retireToolsTab(d);fs.writeFileSync('audit/tools-retired-candidate.op',JSON.stringify(d,null,2));fs.writeFileSync('audit/tools-retirement-intent.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
