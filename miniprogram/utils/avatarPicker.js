function chooseUploadedAvatar() {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (result) => {
        const filePath = result && result.tempFilePaths && result.tempFilePaths[0];
        if (filePath) {
          resolve(filePath);
          return;
        }
        reject({ message: "未选择头像" });
      },
      fail: (error) => {
        reject({ message: (error && error.errMsg) || "选择头像失败" });
      }
    });
  });
}

module.exports = {
  chooseUploadedAvatar
};
