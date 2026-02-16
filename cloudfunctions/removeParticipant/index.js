// 云函数：删除活动参与者
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
    const { activityId, participantName, isAdmin } = event;
    
    if (!activityId || !participantName) {
      return {
        errCode: -1,
        errMsg: "参数错误：缺少 activityId 或 participantName"
      };
    }

    const db = cloud.database();
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID || wxContext.openid || "";

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
    const participant = participants.find(p => getParticipantName(p) === participantName);
    
    if (!participant) {
      return {
        errCode: 0,
        errMsg: "参与者不存在",
        alreadyRemoved: true
      };
    }

    // 非管理员只能删除自己：参与者有 userId 时，必须与当前用户 openid 一致
    if (!isAdmin) {
      const participantUserId = typeof participant === "object" && participant.userId;
      if (participantUserId && openid && participantUserId !== openid) {
        return {
          errCode: -3,
          errMsg: "只能删除自己的报名记录"
        };
      }
    }

    // 从参与者列表中删除
    const newParticipants = participants.filter(p => getParticipantName(p) !== participantName);

    // 更新活动文档（云函数有管理员权限，可以更新任何文档）
    const updateRes = await db.collection("activities")
      .doc(activityId)
      .update({
        data: {
          participants: newParticipants,
          updatedAt: db.serverDate()
        }
      });

    // 处理包含该成员的记账记录
    const billsRes = await db.collection("bills")
      .where({
        activityId: activityId
      })
      .get();

    const billsToDelete = [];
    const billsToUpdate = [];

    billsRes.data.forEach(bill => {
      const billParticipants = bill.participants || [];
      const isPayer = bill.payer === participantName;
      const isParticipant = billParticipants.includes(participantName);

      if (isPayer) {
        // 如果该成员是付款人，删除整条记录
        billsToDelete.push(bill._id);
      } else if (isParticipant) {
        // 如果该成员是参与人，从参与人列表中移除
        const newBillParticipants = billParticipants.filter(p => p !== participantName);

        if (newBillParticipants.length === 0) {
          // 如果删除后没有参与人了，删除整条记账记录
          billsToDelete.push(bill._id);
        } else {
          // 重新计算人均金额
          const newPerShare = parseFloat((bill.totalAmount / newBillParticipants.length).toFixed(2));
          billsToUpdate.push({
            id: bill._id,
            data: {
              participants: newBillParticipants,
              perShare: newPerShare,
              updatedAt: db.serverDate()
            }
          });
        }
      }
    });

    // 执行删除操作（云函数有管理员权限）
    const deletePromises = billsToDelete.map(id =>
      db.collection("bills").doc(id).remove()
    );

    // 执行更新操作（云函数有管理员权限）
    const updatePromises = billsToUpdate.map(item =>
      db.collection("bills").doc(item.id).update({ data: item.data })
    );

    await Promise.all([...deletePromises, ...updatePromises]);

    return {
      errCode: 0,
      errMsg: "删除成功",
      stats: updateRes.stats,
      participants: newParticipants,
      billsDeleted: billsToDelete.length,
      billsUpdated: billsToUpdate.length
    };
  } catch (error) {
    console.error("云函数执行错误:", error);
    return {
      errCode: -1,
      errMsg: error.message || "云函数执行失败"
    };
  }
};
