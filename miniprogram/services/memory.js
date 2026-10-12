const { request, resolveApiBaseUrl, toUserMessage } = require("./request");
const { createTraceId, logRequestFailure, logPageError } = require("./logger");
const { parseLocalDateTime } = require("../utils/activityDetail");
const { formatTime } = require("../utils/dateFormat");

const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
const VIDEO_MAX_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 10;

function durationLabel(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function activityTime(value) {
  const date = parseLocalDateTime(value);
  if (!date) return "";
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${formatTime(date.getHours(), date.getMinutes())}`;
}

function createdLabel(value, now = new Date()) {
  const date = parseLocalDateTime(value);
  if (!date) return "";
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((midnight - day) / 86400000);
  const prefix =
    days === 0
      ? "今天"
      : days === 1
        ? "昨天"
        : `${date.getMonth() + 1}/${date.getDate()}`;
  return `${prefix} ${formatTime(date.getHours(), date.getMinutes())}`;
}

function send(url, method = "GET", data, auth = true) {
  return request({ url, method, data, auth, apiVersion: 1 });
}

function query(values) {
  return Object.keys(values)
    .filter(
      (key) =>
        values[key] !== undefined && values[key] !== null && values[key] !== "",
    )
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(values[key])}`,
    )
    .join("&");
}

function list(values = {}, admin = false) {
  return send(
    `${admin ? "/admin" : ""}/memories?${query(values)}`,
    "GET",
    undefined,
    admin,
  );
}

function detail(id, admin = false) {
  return send(
    `${admin ? "/admin" : ""}/memories/${id}`,
    "GET",
    undefined,
    admin,
  );
}

function mediaUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return resolveApiBaseUrl(1).replace(/\/api\/v1\/?$/, "") + value;
}

function presentation(memory) {
  const media = (memory.media || []).map((item) => ({
    ...item,
    url: mediaUrl(item.url),
    thumbnail_url: mediaUrl(item.thumbnail_url),
    selectable: item.state === "ready",
    stateLabel:
      {
        ready: "待人工审核",
        waiting: "待上传",
        uploaded: "待处理",
        working: "处理中",
        failed: "处理失败",
      }[item.state] || "",
  }));
  const first = media[0] || {};
  return {
    ...memory,
    media,
    activityTime: activityTime(memory.activity_start_time),
    createdLabel: createdLabel(memory.created_at),
    sizeLabel:
      memory.total_original_bytes == null
        ? ""
        : `${(memory.total_original_bytes / 1024 ** 2).toFixed(1)} MB`,
    mediaLabel:
      memory.video_count > 0
        ? durationLabel(memory.total_duration)
        : "图片",
    cover: first.thumbnail_url || "",
    videoCover: first.kind === "video",
    coverRatio:
      first.width > 0 && first.height > 0
        ? Math.max(0.65, Math.min(1.8, first.height / first.width))
        : 1,
    author: {
      ...(memory.author || {}),
      avatar_url:
        mediaUrl((memory.author || {}).avatar_url) ||
        "/images/default-avatar.svg",
    },
  };
}

function mediaReviewStatus(item, parentStatus) {
  if (parentStatus === "draft" || parentStatus === "processing") return parentStatus;
  if (item.publication_status === "published") return "published";
  if (item.publication_status === "offline") return "offline";
  if (item.publication_status === "excluded") return "rejected";
  return item.state === "ready" ? "pending" : "failed";
}

function reviewCards(submission) {
  return (submission.media || []).map((item) => presentation({
    ...submission,
    id: item.id,
    memory_id: submission.id,
    media_id: item.id,
    status: mediaReviewStatus(item, submission.status),
    media: [item],
    media_count: 1,
    image_count: item.kind === "image" ? 1 : 0,
    video_count: item.kind === "video" ? 1 : 0,
    total_original_bytes: item.original_bytes,
    total_duration: item.duration || 0,
  }));
}

function validateFile(file) {
  if (
    !file ||
    !["image", "video"].includes(file.kind) ||
    !Number.isFinite(file.size) ||
    file.size <= 0
  ) {
    throw new Error("无法读取原文件信息，请重新选择");
  }
  if (file.size > (file.kind === "image" ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES)) {
    throw new Error(
      file.kind === "image" ? "原图片不能超过 20MB" : "原视频不能超过 20MB",
    );
  }
  if (
    file.kind === "video" &&
    (!Number.isFinite(file.duration) ||
      file.duration <= 0 ||
      file.duration > 30)
  ) {
    throw new Error("视频时长不能超过 30 秒");
  }
  return file;
}

function readOriginal(selected) {
  return new Promise((resolve, reject) => {
    const fail = (stage, cause) => {
      const detail = String(
        (cause && (cause.errMsg || cause.message)) || "未知错误",
      )
        .replace(/(?:wxfile|https?|file):\/\/[^\s"'<>]+/gi, "[文件路径]")
        .replace(/[A-Za-z]:[\\/][^\r\n"'<>]+/g, "[文件路径]")
        .slice(0, 200);
      const message =
        stage === "video_info" ? "无法读取视频信息" : "无法访问原文件";
      const diagnostic = new Error(`${message}：${detail}`);
      logPageError("memory_read_original", diagnostic, {
        stage,
        kind: selected && selected.fileType,
        errNo: cause && cause.errno,
      });
      reject(
        /ffmpeg/i.test(detail)
          ? new Error("开发者工具缺少 FFmpeg，请配置后重新打开开发者工具")
          : diagnostic,
      );
    };
    try {
      wx.getFileSystemManager().getFileInfo({
        filePath: selected.tempFilePath,
        success(info) {
          const file = {
            path: selected.tempFilePath,
            thumbnail:
              selected.fileType === "video"
                ? selected.thumbTempFilePath || ""
                : selected.tempFilePath,
            kind: selected.fileType,
            size: Number(info.size),
            duration: Number(selected.duration) || 0,
          };
          const finish = () => {
            try {
              resolve(validateFile(file));
            } catch (error) {
              reject(error);
            }
          };
          if (file.kind === "video") {
            try {
              wx.getVideoInfo({
                src: file.path,
                success(video) {
                  file.duration = Number(video.duration);
                  finish();
                },
                fail: (error) => fail("video_info", error),
              });
            } catch (error) {
              fail("video_info", error);
            }
          } else finish();
        },
        fail: (error) => fail("file_info", error),
      });
    } catch (error) {
      fail("file_info", error);
    }
  });
}

function upload(id, slot, file, onProgress) {
  const path = `/memory-drafts/${id}/media/${slot}`;
  const traceId = createTraceId("memory-upload");
  const token = wx.getStorageSync("accessToken");
  let task;
  const start = Date.now();
  const promise = new Promise((resolve, reject) => {
    const fail = (error) => {
      logRequestFailure(
        {
          url: path,
          method: "POST",
          traceId,
          requestId: traceId,
          duration: Date.now() - start,
          statusCode: error.statusCode || 0,
        },
        error,
      );
      reject(error);
    };
    task = wx.uploadFile({
      url: resolveApiBaseUrl(1) + path,
      filePath: file.path,
      name: "file",
      timeout: 120000,
      header: { Authorization: `Bearer ${token}`, "X-Request-Id": traceId },
      success(response) {
        let body;
        try {
          body = JSON.parse(response.data);
        } catch (error) {
          fail({ message: "上传响应无效，请重试" });
          return;
        }
        if (response.statusCode >= 200 && response.statusCode < 300)
          resolve(body);
        else
          fail({
            statusCode: response.statusCode,
            message: toUserMessage(body.message, body.code),
            body,
          });
      },
      fail(error) {
        fail({
          message: "上传未完成，请重试",
          statusCode: 0,
          errMsg: error.errMsg,
        });
      },
    });
    if (onProgress && task && task.onProgressUpdate)
      task.onProgressUpdate(onProgress);
  });
  return {
    promise,
    abort() {
      if (task) task.abort();
    },
  };
}

module.exports = {
  send,
  list,
  detail,
  presentation,
  reviewCards,
  mediaReviewStatus,
  mediaUrl,
  validateFile,
  readOriginal,
  upload,
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  MAX_FILES,
  durationLabel,
  activityTime,
};
