import fs from 'node:fs';
const baseline=JSON.parse(fs.readFileSync('audit/template-layout-baseline.json','utf8'));
export function splitTemplates(document){
 const page=document.pages.find(p=>p.name==='模板');if(!page)throw Error('Templates page missing');
 const library=page.children.find(n=>n.id==='lnq9c'),archive=page.children.find(n=>n.id==='qCoEK');if(!library||library.children.length!==5)throw Error('Unexpected or already split library');
 const [title,brand,foundation,common,business]=library.children;
 const categories=[foundation,common,business].map(n=>({header:n,items:n.children.slice(1)}));
 const report={previousRootCount:page.children.length,originalLibraryHeight:baseline.lnq9c.h,promoted:[],columns:4,columnGap:200,sectionGap:156};
 const roots=[];
 function place(n,x,y,prefix){const b=baseline[n.id];if(!b)throw Error('Missing native measurement '+n.id);const originalWidth=n.width;if(typeof n.width!=='number')n.width=b.w;n.x=x;n.y=y;if(prefix)n.name=prefix+' / '+n.name.replace(/^二级分类 · /,'');roots.push(n);report.promoted.push({id:n.id,name:n.name,x,y,width:n.width,originalWidth,baselineHeight:b.h});return b.h;}
 library.children=[title];library.height='fit_content';place(library,40,40);place(brand,40,230);
 let y=1176;for(let i=0;i<categories.length;i++){const {header}=categories[i];header.children=header.children.slice(0,1);header.height='fit_content';place(header,40+2552*i,i===0?y:230);}
 y+=109+156;for(const item of categories[0].items)y+=place(item,40,y,'基础规范')+156;
 let commonY=230+111+156;for(const item of categories[1].items)commonY+=place(item,2592,commonY,'通用组件')+156;
 const businessY=[497,497];for(const item of categories[2].items){const col=businessY[0]<=businessY[1]?0:1;businessY[col]+=place(item,5144+col*2552,businessY[col],'业务组件')+156;}
 const old=archive.children[0];old.x=0;old.y=0;archive.width=baseline.CTjxq.w;archive.height=baseline.CTjxq.h;archive.name='归档 / 旧版表单控件';place(archive,40,y);
 page.children=roots;report.rootCount=roots.length;report.designHeight=Math.max(y+archive.height,commonY-156,...businessY.map(v=>v-156))-40;report.designWidth=10048;
 return report;
}
if(process.argv[1]?.endsWith('split-templates.mjs')){const d=JSON.parse(fs.readFileSync('../龙城小程序.op','utf8'));const r=splitTemplates(d);fs.writeFileSync('audit/split-templates-candidate.op',JSON.stringify(d,null,2));fs.writeFileSync('audit/template-split-plan.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r));}
