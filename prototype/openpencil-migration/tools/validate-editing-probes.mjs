import fs from 'node:fs';
import Ajv from 'ajv';
const doc=JSON.parse(fs.readFileSync('audit/reviewed-candidate.op','utf8'));
const nodes=new Map();function walk(n){nodes.set(n.id,n);for(const c of n.children??[])walk(c);}doc.children.forEach(walk);
const children=['nX3OK','wg9gj'].map(id=>structuredClone(nodes.get(id)));
for(const n of children){n.x=0;n.y=0;}
for(const [id,ref,width]of[['header350','nX3OK',350],['header420','nX3OK',420],['card173','wg9gj',173],['card240','wg9gj',240]])children.push({id,type:'ref',ref,x:0,y:0,descendants:{[ref]:{width}}});
for(const [id,width,height]of[['alpha120',120,40],['alpha200',200,70]])children.push({id,type:'frame',layout:'none',width,height,fill:structuredClone(nodes.get('V3pVBu').fill),children:[]});
fs.writeFileSync('audit/resize-probe.op',JSON.stringify({version:'1.2',formatVersion:'1.2',images:doc.images,children}));
const schema=JSON.parse(fs.readFileSync('audit/openpencil-schema.json','utf8'));
const validate=new Ajv({strict:false,allErrors:false,allowUnionTypes:true,inlineRefs:false,validateFormats:false,logger:false}).compile(schema);
const valid=validate(doc);const result={candidate:'reviewed-candidate.op',schemaValid:valid,errors:validate.errors};fs.writeFileSync('audit/reviewed-candidate-schema-validation.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(!valid)process.exitCode=1;
const layouts=fs.readFileSync('audit/visibility-edit-probe-layout.jsonl','utf8').split(/\r?\n/).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}});const byId=new Map(layouts.map(n=>[n.id,n]));const cases=[];
for(const kind of ['native','absolute','role','absent'])for(const shown of [false,true]){const id=kind+shown,root=byId.get(id),blue=byId.get(id+'-blue'),expectedHeight=shown?60:40,expectedBlueY=shown?40:20;cases.push({kind,shown,expectedHeight,actualHeight:root.h,expectedBlueY,actualBlueY:blue.y,passes:root.h===expectedHeight&&blue.y===expectedBlueY});}
fs.writeFileSync('audit/visibility-edit-probe-validation.json',JSON.stringify({cases,conclusion:'Native hidden nodes still occupy layout; absolute positioning preserves the current hidden snapshot but showing it again requires removing the constraints. Neither overlay role nor visibility alone preserves both behaviors.',strictBehaviorParity:false},null,2));