const temporaryThumbnails = new Set();

function discardThumbnail(path) {
  if (!temporaryThumbnails.delete(path)) return;
  try {
    wx.getFileSystemManager().unlink({ filePath: path, fail() {} });
  } catch (_) {}
}

function createVideoThumbnail(source) {
  let decoder,
    canvas,
    poll,
    deadline,
    settled = false;
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  const finish = (error, path) => {
    if (settled) {
      if (path) discardThumbnail(path);
      return;
    }
    settled = true;
    clearTimeout(poll);
    clearTimeout(deadline);
    if (canvas) canvas.width = canvas.height = 0;
    let removal;
    try {
      if (decoder) removal = decoder.remove();
    } catch (_) {}
    // Release the native decoder before the page starts the next video.
    Promise.resolve(removal)
      .catch(() => {})
      .then(() => {
        if (error) reject(error);
        else resolve(path);
      });
  };
  const fail = (stage) => {
    const error = new Error("无法生成视频首帧");
    error.stage = stage;
    finish(error);
  };
  const readFrame = () => {
    if (settled) return;
    let frame;
    try {
      frame = decoder.getFrameData();
    } catch (_) {
      fail("decode");
      return;
    }
    if (!frame) {
      poll = setTimeout(readFrame, 40);
      return;
    }
    const { width, height, data } = frame;
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width <= 0 ||
      height <= 0 ||
      width * height > 16777216 ||
      !data ||
      data.byteLength !== width * height * 4
    ) {
      fail("frame");
      return;
    }
    try {
      canvas = wx.createOffscreenCanvas({ type: "2d", width, height });
      const context = canvas.getContext("2d");
      const pixels = context.createImageData(width, height);
      pixels.data.set(new Uint8Array(data));
      context.putImageData(pixels, 0, 0);
      const scale = Math.min(1, 384 / Math.max(width, height));
      wx.canvasToTempFilePath({
        canvas,
        width,
        height,
        destWidth: Math.max(1, Math.round(width * scale)),
        destHeight: Math.max(1, Math.round(height * scale)),
        fileType: "jpg",
        quality: 0.8,
        success(result) {
          if (!result.tempFilePath) return fail("export");
          temporaryThumbnails.add(result.tempFilePath);
          finish(null, result.tempFilePath);
        },
        fail: () => fail("export"),
      });
    } catch (_) {
      fail("canvas");
    }
  };
  deadline = setTimeout(() => fail("timeout"), 8000);
  try {
    decoder = wx.createVideoDecoder();
    Promise.resolve(decoder.start({ source, mode: 0, abortAudio: true })).then(
      readFrame,
      () => fail("start"),
    );
  } catch (_) {
    fail("start");
  }
  return {
    promise,
    cancel() {
      const error = new Error("首帧提取已取消");
      error.cancelled = true;
      finish(error);
    },
  };
}

module.exports = { createVideoThumbnail, discardThumbnail };
