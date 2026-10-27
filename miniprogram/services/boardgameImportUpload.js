const {getApiBaseUrl}=require('./config');
function upload(filePath,params,key){const token=wx.getStorageSync('accessToken');return new Promise((resolve,reject)=>wx.uploadFile({url:getApiBaseUrl()+'/boardgame-imports/bgstats-file',filePath,name:'file',formData:params,header:{Authorization:`Bearer ${token}`,'Idempotency-Key':key},timeout:60000,
 success(r){let body;try{body=JSON.parse(r.data);}catch(e){return reject({statusCode:r.statusCode,body:{}});}if(r.statusCode>=200&&r.statusCode<300)resolve(body);else reject({statusCode:r.statusCode,body});},fail(){reject({statusCode:0});}}));}
module.exports={upload};
