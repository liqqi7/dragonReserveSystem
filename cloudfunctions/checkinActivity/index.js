// 云函数：活动签到（基于已报名的参与者）
const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 获取参与者名称（兼容 string 与 {name, userId}）
function getParticipantName(p) {
  return typeof p === "string" ? p : (p && p.name);
}

exports.main = async (event, context) => {
  try {
    const { activityId, nickname, lat, lng } = event;

    if (!activityId || !nickname) {
      return {
        errCode: -1,
        errMsg: "参数错误：缺少 activityId 或 nickname"
      };
    }

    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID || wxContext.openid || "";

    const db = cloud.database();

    const docRes = await db.collection("activities")
      .doc(activityId)
      .get();

    if (!docRes.data) {
      return {
        errCode: -2,
        errMsg: "活动不存在"
      };
    }

    const activity = docRes.data;

    if (activity.status === "已取消") {
      return {
        errCode: -3,
        errMsg: "活动已取消，无法签到"
      };
    }

    const participants = activity.participants || [];

    // 查找当前用户对应的参与者：优先按 userId，其次按昵称（当参与者未绑定 userId 或用户未登录时）
    let index = -1;
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const name = getParticipantName(p);
      const userId = typeof p === "object" && p !== null ? (p.userId || "") : "";

      if (openid && userId && userId === openid) {
        index = i;
        break;
      }

      if (name === nickname) {
        // 昵称匹配：用户未登录，或参与者未绑定 userId（兼容旧数据、手动添加等）
        if (!openid || !userId) {
          index = i;
          break;
        }
      }
    }

    if (index === -1) {
      return {
        errCode: -4,
        errMsg: "未报名该活动，无法签到"
      };
    }

    const participant = participants[index];
    const isObject = typeof participant === "object" && participant !== null;
    const checkedInAt = isObject ? participant.checkedInAt : null;

    if (checkedInAt) {
      return {
        errCode: 0,
        errMsg: "已签到",
        alreadyCheckedIn: true
      };
    }

    const newParticipant = isObject
      ? {
          ...participant,
          name: participant.name || nickname,
          userId: participant.userId || openid || null,
          checkedInAt: db.serverDate(),
          checkinLat: lat !== undefined ? lat : null,
          checkinLng: lng !== undefined ? lng : null
        }
      : {
          name: participant || nickname,
          userId: openid || null,
          avatarUrl: "",
          checkedInAt: db.serverDate(),
          checkinLat: lat !== undefined ? lat : null,
          checkinLng: lng !== undefined ? lng : null
        };

    const newParticipants = [...participants];
    newParticipants[index] = newParticipant;

    await db.collection("activities")
      .doc(activityId)
      .update({
        data: {
          participants: newParticipants,
          updatedAt: db.serverDate()
        }
      });

    return {
      errCode: 0,
      errMsg: "签到成功",
      alreadyCheckedIn: false
    };
  } catch (error) {
    console.error("checkinActivity 云函数执行错误:", error);
    return {
      errCode: -1,
      errMsg: error.message || "签到失败"
    };
  }
};

