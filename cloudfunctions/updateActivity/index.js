// 云函数：更新活动（管理员权限，不受数据库 _openid 限制）
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  try {
    const {
      activityId,
      date,
      name,
      status,
      remark,
      participants,
      maxParticipants,
      startTime,
      endTime,
      locationName,
      locationAddress,
      locationLatitude,
      locationLongitude,
      signupDeadline
    } = event;

    if (!activityId) {
      return {
        errCode: -1,
        errMsg: "参数错误：缺少 activityId"
      };
    }

    const db = cloud.database();

    const updateData = {
      updatedAt: db.serverDate()
    };
    if (date !== undefined) updateData.date = date;
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (remark !== undefined) updateData.remark = remark;
    if (participants !== undefined) updateData.participants = participants;
    if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (locationName !== undefined) updateData.locationName = locationName;
    if (locationAddress !== undefined) updateData.locationAddress = locationAddress;
    if (locationLatitude !== undefined) updateData.locationLatitude = locationLatitude;
    if (locationLongitude !== undefined) updateData.locationLongitude = locationLongitude;
    if (signupDeadline !== undefined) updateData.signupDeadline = signupDeadline;

    const updateRes = await db.collection("activities")
      .doc(activityId)
      .update({
        data: updateData
      });

    return {
      errCode: 0,
      errMsg: "更新成功",
      stats: updateRes.stats
    };
  } catch (error) {
    console.error("updateActivity 云函数执行错误:", error);
    return {
      errCode: -1,
      errMsg: error.message || "更新失败"
    };
  }
};
