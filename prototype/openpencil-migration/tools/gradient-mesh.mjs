import fs from 'node:fs';
function rgba(s){let hex=s.slice(1);if(hex.length===3||hex.length===4)hex=[...hex].map(c=>c+c).join('');if(hex.length===6)hex+='ff';return [...hex.matchAll(/../g)].map(m=>parseInt(m[0],16)/255);}
function hex(c){return '#'+c.map(v=>Math.max(0,Math.min(255,Math.round(v*255))).toString(16).padStart(2,'0')).join('');}
function sample(stops,t){let a=stops[0],b=stops.at(-1);if(t<=a.position)return rgba(a.color);if(t>=b.position)return rgba(b.color);for(let i=1;i<stops.length;i++)if(t<=stops[i].position){a=stops[i-1];b=stops[i];break;}const q=(t-a.position)/(b.position-a.position),ca=rgba(a.color),cb=rgba(b.color),alpha=ca[3]*(1-q)+cb[3]*q;return [0,1,2].map(i=>alpha>0?(ca[i]*ca[3]*(1-q)+cb[i]*cb[3]*q)/alpha:0).concat(alpha);}
export function gradientMeshGrid(g){
 if(g.gradientType==='radial')return 65;
 const angle=(g.rotation??0)*Math.PI/180,cx=g.center?.x??.5,cy=g.center?.y??.5,len=g.size?.height??1;
 const ts=[[0,0],[0,1],[1,0],[1,1]].map(([u,v])=>.5+(-Math.sin(angle)*(u-cx)-Math.cos(angle)*(v-cy))/len);
 const stops=[...g.colors].sort((a,b)=>a.position-b.position);
 return stops.length===2&&Math.min(...ts)>=stops[0].position-1e-8&&Math.max(...ts)<=stops[1].position+1e-8?2:65;
}
export function gradientMesh(g,grid=65){
 const colors=[...g.colors].sort((a,b)=>a.position-b.position),stops=[],cx=g.center?.x??.5,cy=g.center?.y??.5,sx=g.size?.width??1,sy=g.size?.height??1,angle=(g.rotation??0)*Math.PI/180;
 for(let row=0;row<grid;row++)for(let col=0;col<grid;col++){
  const u=col/(grid-1)-cx,v=row/(grid-1)-cy;
  const q=g.gradientType==='radial'?Math.hypot((u*Math.cos(angle)-v*Math.sin(angle))/(sx/2),(u*Math.sin(angle)+v*Math.cos(angle))/(sy/2)):.5+(-Math.sin(angle)*u-Math.cos(angle)*v)/sy;
  const color=sample(colors,q);color[3]*=g.opacity??1;stops.push({row,col,color:hex(color)});
 }
 return {type:'mesh_gradient',rows:grid,cols:grid,stops,...(g.blendMode?{blendMode:g.blendMode}:{}),explain:'Pencil gradient parameters: '+JSON.stringify(g)};
}
if(process.argv.includes('--probes')){
 const source=JSON.parse(fs.readFileSync('audit/source.json','utf8')).nodes,rows=new Map(source.map(r=>[r.node.id,r]));
 const target=JSON.parse(fs.readFileSync('../龙城小程序.op','utf8'));const targetRows=new Map();function walk(n){targetRows.set(n.id,n);n.children?.forEach(walk)}target.children.forEach(walk);
 const ids=['lPk75','fRU6t','V7DnK8','f50mB'];const children=[];
 for(const id of ids){let r=rows.get(id),original=r.node;for(let grid of[2,33,65,129]){let n=structuredClone(targetRows.get(id));n.id=id+'__mesh'+grid;n.x=0;n.y=0;n.fill=(Array.isArray(original.fill)?original.fill:[original.fill]).map(g=>g.type==='gradient'&&(g.gradientType==='radial'||id==='fRU6t')?gradientMesh(g,grid):targetRows.get(id).fill.find(f=>f.type==='linear_gradient')).reverse();children.push(n);}}
 fs.writeFileSync('audit/mesh-gradient-probe.op',JSON.stringify({version:'1.2',formatVersion:'1.2',children}));console.log('Gradient mesh probe variants',children.length);
}