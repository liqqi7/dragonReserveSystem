import fs from 'node:fs';
const p='tools/convert.mjs';let s=fs.readFileSync(p,'utf8');const old="if(n.id==='IzknT'){for(const child of out.children??[])child.role='overlay';note(n.id,'overflow_repair_guard','Keep authored 396 px height and overflowing 737/748 px cards; skip native expansion repair.');}";
const next=`if(n.type==='frame'&&n.clip!==true&&typeof n.height==='number'&&(n.layout??'horizontal')!=='none'){
  const flowChildren=row.children.map(id=>rows.get(id)).filter(r=>r&&r.node.enabled!==false&&r.node.layoutPosition!=='absolute');
  if(flowChildren.some(r=>r.bounds.y+r.bounds.height>row.bounds.height+.5)){
   for(const child of out.children??[])child.role='overlay';
   note(n.id,'overflow_repair_guard','Keep authored fixed height '+n.height+' px and overflowing flow children. Native flex still lays out children; role skips the extra target-only expansion/reflow repair.');
  }
 }`;
if(!s.includes(old))throw Error('Previous overflow guard was not found');s=s.replace(old,next);fs.writeFileSync(p,s);
fs.writeFileSync('audit/review-fixes-15.json',JSON.stringify({evidence:'Native layout expands GJ7w0 from source height22 to25, KfjhU254to257, and aO3Fi666to702. The source deliberately allows children outside fixed frame bounds.',change:'Generalize the existing IzknT repair guard to numeric, unclipped Auto Layout frames whose visible flow children exceed the original height. Native flex layout remains enabled; only target post-layout expansion is skipped.',reviewRequired:'Render all 164 regions, inspect rank pages and changed regions, verify no new errors or component regressions.'},null,2));