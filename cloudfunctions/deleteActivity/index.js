// 云函数：删除活动（含关联账单）
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  try {
    const { activityId } = event;

    if (!activityId) {
      return {
        errCode: -1,
        errMsg: "参数错误：缺少 activityId"
      };
    }

    const db = cloud.database();

    // 删除活动文档
    const activityRes = await db.collection("activities")
      .doc(activityId)
      .remove();

    // 删除关联账单
    const billsRes = await db.collection("bills")
      .where({ activityId })
      .get();

    const billIds = (billsRes.data || []).map(b => b._id);
    const billDeletePromises = billIds.map(id =>
      db.collection("bills").doc(id).remove()
    );
    await Promise.all(billDeletePromises);

    return {
      errCode: 0,
      errMsg: "删除成功",
      activityStats: activityRes.stats,
      billsDeleted: billIds.length
    };
  } catch (error) {
    console.error("deleteActivity 云函数执行错误:", error);
    return {
      errCode: -1,
      errMsg: error.message || "删除失败"
    };
  }
};

