// Image failures change presentation state only. A refresh retries the original URL.
function imageError(event) {
  const path=event.currentTarget.dataset.path;
  if(typeof path!=='string'||!/(?:^|\.)(?:cover_url|avatar_url|cover|avatar)$/.test(path))return;
  const keys=path.replace(/\[(\d+)\]/g,'.$1').split('.');
  if(keys.some(key=>['__proto__','prototype','constructor'].includes(key)))return;
  let current=this.data;
  for(const key of keys){if(!current||!Object.prototype.hasOwnProperty.call(current,key))return;current=current[key];}
  if(typeof current==='string'&&current)this.setData({[path]:null});
}
module.exports={imageError};
