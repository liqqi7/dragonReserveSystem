// 云函数：报名活动
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 获取参与者名称（兼容 string 与 {name, userId} 格式）
function getParticipantName(p) {
  return typeof p === "string" ? p : (p && p.name);
}

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { activityId, nickname, userId } = event;
    
    if (!activityId || !nickname) {
      return {
        errCode: -1,
        errMsg: "参数错误：缺少 activityId 或 nickname"
      };
    }

    const db = cloud.database();

    // 获取活动文档
    const docRes = await db.collection("activities")
      .doc(activityId)
      .get();

    if (!docRes.data) {
      return {
        errCode: -2,
        errMsg: "活动不存在"
      };
    }

    const participants = docRes.data.participants || [];
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID || wxContext.openid || "";

    // 按 userId 校验：同一用户不能重复报名，允许不同用户重名
    const alreadySigned = openid && participants.some(p => typeof p === "object" && p.userId && p.userId === openid);
    if (alreadySigned) {
      return {
        errCode: 0,
        errMsg: "已报名",
        alreadySignedUp: true
      };
    }

    // 添加参与者（新格式：{name, userId}，使用服务端 openid 确保准确）
    const newParticipant = { name: nickname, userId: openid || null };
    const newParticipants = [...participants, newParticipant];

    // 更新活动文档（云函数有管理员权限，可以更新任何文档）
    const updateRes = await db.collection("activities")
      .doc(activityId)
      .update({
        data: {
          participants: newParticipants,
          updatedAt: db.serverDate()
        }
      });

    return {
      errCode: 0,
      errMsg: "报名成功",
      stats: updateRes.stats,
      participants: newParticipants
    };
  } catch (error) {
    console.error("云函数执行错误:", error);
    return {
      errCode: -1,
      errMsg: error.message || "云函数执行失败"
    };
  }
};
