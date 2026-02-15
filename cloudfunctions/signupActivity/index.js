// 云函数：报名活动
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { activityId, nickname } = event;
    
    if (!activityId || !nickname) {
      return {
        errCode: -1,
        errMsg: "参数错误：缺少 activityId 或 nickname"
      };
    }

    const db = cloud.database();
    const _ = db.command;

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
    
    // 检查是否已报名
    if (participants.includes(nickname)) {
      return {
        errCode: 0,
        errMsg: "已报名",
        alreadySignedUp: true
      };
    }

    // 添加参与者
    const newParticipants = [...participants, nickname];

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
