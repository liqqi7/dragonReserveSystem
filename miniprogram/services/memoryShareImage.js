// Keep only the last temporary share cover, never a saved-file/storage cache.
let file, pending;
const MAX_SHARE_BYTES = 512 * 1024;

function removeFile(path) {
  return new Promise((resolve, reject) => {
    try {
      wx.getFileSystemManager().unlink({filePath: path, success: resolve,
        fail: error => /ENOENT|no such file|not exist/i.test(error?.errMsg || '') ? resolve() : reject(error)});
    } catch (error) {reject(error);}
  });
}

function memoryShareImage(source) {
  if (!source) return Promise.reject(new Error('分享图片尚未就绪'));
  if (pending) return pending.source === source ? pending.promise : Promise.reject(new Error('分享图片生成中'));
  const job = {source, exporting: false};
  pending = job;
  const release = () => {if (pending === job && !job.exporting) pending = null;};
  const promise = (async () => {
    if (file?.source === source) {
      try {wx.getFileSystemManager().accessSync(file.path); return file.path;} catch (_) {}
    }
    if (file) {await removeFile(file.path); file = null;}
    return new Promise((resolve, reject) => {
      let canvas, image, settled = false;
      const finish = (error, path) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (image) image.onload = image.onerror = null;
        if (canvas) canvas.width = canvas.height = 0;
        if (error) reject(error); else resolve(path);
      };
      const timer = setTimeout(() => finish(new Error('分享图片生成超时')), 2500);
      try {
        canvas = wx.createOffscreenCanvas({type: '2d', width: 500, height: 400});
        image = canvas.createImage();
        image.onerror = () => finish(new Error('分享图片读取失败'));
        image.onload = () => {
          if (settled) return;
          try {
            const {width, height} = image;
            if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
              throw new Error('分享图片尺寸无效');
            const scale = Math.max(500 / width, 400 / height);
            const cropWidth = 500 / scale, cropHeight = 400 / scale;
            const context = canvas.getContext('2d');
            context.fillStyle = '#FFFFFF';
            context.fillRect(0, 0, 500, 400);
            context.drawImage(image, (width - cropWidth) / 2, (height - cropHeight) / 2,
              cropWidth, cropHeight, 0, 0, 500, 400);
            job.exporting = true;
            wx.canvasToTempFilePath({canvas, width: 500, height: 400, destWidth: 500, destHeight: 400,
              fileType: 'jpg', quality: 0.85,
              success(result) {
                const path = result.tempFilePath;
                // A late native export still owns a file that must be cleaned up.
                if (settled) {
                  (path ? removeFile(path) : Promise.resolve()).catch(() => {file = {path};})
                    .then(() => {job.exporting = false; release();});
                  return;
                }
                job.exporting = false;
                if (!path) return finish(new Error('分享图片导出失败'));
                file = {path};
                try {
                  wx.getFileSystemManager().getFileInfo({filePath: path,
                    success(info) {
                      if (settled) return;
                      if (!Number.isSafeInteger(info.size) || info.size <= 0 || info.size > MAX_SHARE_BYTES)
                        return finish(new Error('分享图片体积超限'));
                      file.source = source;
                      finish(null, path);
                    }, fail: () => finish(new Error('分享图片读取失败'))});
                } catch (error) {finish(error);}
              }, fail() {job.exporting = false; finish(new Error('分享图片导出失败')); release();}});
          } catch (error) {job.exporting = false; finish(error);}
        };
        image.src = source;
      } catch (error) {finish(error);}
    });
  })();
  job.promise = promise;
  promise.then(release, release);
  return promise;
}

module.exports = {memoryShareImage};
