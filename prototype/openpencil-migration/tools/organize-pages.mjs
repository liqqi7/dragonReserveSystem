import fs from 'node:fs';
import {splitTemplates} from './split-templates.mjs';
import {retireToolsTab} from './retire-tools-tab.mjs';
const names=['首页','工具','排行榜','记忆','我的','探索','模板','素材'];
export function organizePages(document){
 if(document.pages?.length)throw Error('Expected single-page migration input');
 let pages=names.map((name,i)=>({id:'dragon-page-'+['home','tools','ranking','memory','profile','exploration','templates','assets'][i],name,children:[]}));
 const assignments=[];
 for(const node of document.children){
  let name;
  if(['lnq9c','qCoEK'].includes(node.id))name='模板';
  else if(['NPxFx','eXTHv','qAMWN'].includes(node.id))name='素材';
  else if(node.x < -2633 || ((node.y??0)>9000&&(node.x??0)<0))name='探索';
  else if(node.x<1117)name='首页';
  else if(node.x<3117)name='工具';
  else if(node.x<5317)name='排行榜';
  else if(node.x<9067)name='我的';
  else if(node.x<14000)name='记忆';
  else throw Error('Unassigned root '+node.id);
  pages.find(p=>p.name===name).children.push(node);
 }
 for(const page of pages){
  // Preserve authored origins too: moving large canvases changes native raster rounding.
  const dx=0,dy=0;
  for(const node of page.children){assignments.push({id:node.id,name:node.name,pageId:page.id,pageName:page.name,originalX:node.x??0,originalY:node.y??0,dx,dy});node.x=(node.x??0)+dx;node.y=(node.y??0)+dy;}
 }
 document.children=[];document.pages=pages;
 const templateSplit=splitTemplates(document),toolsRetirement=retireToolsTab(document);pages=document.pages;const oldById=new Map(assignments.map(r=>[r.id,r]));
 const nativeBaseline=JSON.parse(fs.readFileSync('audit/template-layout-baseline.json','utf8'));
 const finalAssignments=pages.flatMap(page=>page.children.map(n=>{const old=oldById.get(n.id),b=nativeBaseline[n.id];const originalX=old?.originalX??b?.x??n.x,originalY=old?.originalY??b?.y??n.y;if(originalX===undefined||originalY===undefined)throw Error('Missing original root position '+n.id);return {id:n.id,name:n.name,pageId:page.id,pageName:page.name,originalX,originalY,dx:(n.x??0)-originalX,dy:(n.y??0)-originalY};}));
 return {pageCount:pages.length,pages:pages.map(p=>({id:p.id,name:p.name,rootCount:p.children.length})),assignments:finalAssignments,templateSplit,toolsRetirement};
}
if(process.argv[1]?.endsWith('organize-pages.mjs')){
 const doc=JSON.parse(fs.readFileSync('../龙城小程序.op','utf8'));
 const report=organizePages(doc);
 fs.writeFileSync('audit/pages-candidate.op',JSON.stringify(doc,null,2));
 fs.writeFileSync('audit/page-organization.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report.pages));
 const master={id:'probe-master',type:'frame',name:'Template',reusable:true,width:100,height:60,layout:'horizontal',fill:[{type:'solid',color:'#FF0000'}],children:[{id:'probe-label',type:'text',content:'模板',fontFamily:'Noto Sans SC',fontSize:16,fill:[{type:'solid',color:'#FFFFFF'}]}]};
 const probe={version:'1.2',formatVersion:'1.2',children:[],pages:[{id:'probe-home',name:'首页',children:[{id:'probe-instance',type:'ref',ref:'probe-master',x:0,y:0,width:100,height:60}]},{id:'probe-templates',name:'模板',children:[master]}]};
 fs.writeFileSync('audit/cross-page-probe-before.op',JSON.stringify(probe));
 master.fill[0].color='#0000FF';master.children[0].content='同步';
 fs.writeFileSync('audit/cross-page-probe-after.op',JSON.stringify(probe));
}
