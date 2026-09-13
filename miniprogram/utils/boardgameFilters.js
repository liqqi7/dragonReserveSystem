const api=require('../services/boardgames');
const PERIODS=[{value:'all',label:'全部时间'},{value:'month',label:'按月'},{value:'quarter',label:'按季度'},{value:'year',label:'按年'},{value:'custom',label:'自定日期'}];
function load(options={}){let query={scope:'all',period:'all'};try{if(options.query)query={...query,...JSON.parse(decodeURIComponent(options.query))};}catch(e){};['game_id','inventory_id'].forEach(k=>{if(Number(options[k]))query[k]=Number(options[k]);});if(Number(options.activity_id))query.activity_ids=[Number(options.activity_id)];delete query.cursor;return query;}
function clean(query){const q={...query};delete q.cursor;delete q.limit;['year','month','quarter','from','to'].forEach(k=>{if(!({month:['year','month'],quarter:['year','quarter'],year:['year'],custom:['from','to']}[q.period]||[]).includes(k))delete q[k];});Object.keys(q).forEach(k=>{if(q[k]===''||q[k]===null||q[k]===undefined||Array.isArray(q[k])&&!q[k].length)delete q[k];});return q;}
function link(page,query){return `/pages/${page}/${page}?query=${encodeURIComponent(JSON.stringify(clean(query)))}`;}
function percent(value){return value===null||value===undefined?'—':`${(Number(value)*100).toFixed(1)}%`;}
function number(value,suffix=''){return value===null||value===undefined?'未记录':String(value)+suffix;}
module.exports={PERIODS,load,clean,link,percent,number};
