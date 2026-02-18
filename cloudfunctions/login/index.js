// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    
    // 尝试多种方式获取 openid
    let openid = wxContext.OPENID || 
                 wxContext.openid || 
                 process.env.WX_OPENID ||
                 (context.userInfo && context.userInfo.openId);
    
    if (!openid) {
      console.error("无法获取 openid");
      console.error("wxContext:", wxContext);
      console.error("context:", context);
      return {
        errCode: -1,
        errMsg: "无法获取 openid"
      };
    }
    
    // 返回标准格式
    return {
      openid,
      appid: wxContext.APPID || wxContext.appid || process.env.WX_APPID,
      env: wxContext.ENV || wxContext.env
    };
  } catch (error) {
    console.error("云函数执行错误:", error);
    return {
      errCode: -1,
      errMsg: error.message || "云函数执行失败"
    };
  }
};