"""Bounded standard-codec processing for private memory uploads."""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import math
from pathlib import Path
import subprocess
import warnings

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.exceptions import AppError

IMAGE_MAX_BYTES = 20 * 1024**2
VIDEO_MAX_BYTES = 20 * 1024**2
IMAGE_OUTPUT_MAX_BYTES = 10 * 1024**2
MAX_DURATION = 30
MAX_FILES = 10
MAX_IMAGE_PIXELS = 60_000_000
MAX_VIDEO_PIXELS = 40_000_000


@dataclass(frozen=True)
class ProcessedMedia:
    display: Path
    thumbnail: Path
    width: int
    height: int
    duration: float = 0

    @property
    def total_bytes(self) -> int:
        return self.display.stat().st_size + self.thumbnail.stat().st_size


def reject(message: str, status: int = 422) -> None:
    raise AppError("MEMORY_MEDIA_INVALID", message, status)


def validate_original(path: Path, kind: str) -> int:
    if kind not in {"image", "video"}:
        reject("文件类型不支持")
    size = path.stat().st_size
    maximum = IMAGE_MAX_BYTES if kind == "image" else VIDEO_MAX_BYTES
    if not 0 < size <= maximum:
        reject("原图片不能超过 20MB" if kind == "image" else "原视频不能超过 20MB", 413)
    return size


def file_digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(256 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def private_path(root: Path, key: str) -> Path:
    root = root.resolve()
    path = (root / key).resolve()
    if not key or not path.is_relative_to(root) or path == root:
        reject("文件路径无效")
    return path


def validate_static_image(image) -> None:
    if image.format not in {"JPEG", "PNG"} or getattr(image, "n_frames", 1) != 1:
        reject("目前支持静态 JPEG、PNG 图片")
    if image.width * image.height > MAX_IMAGE_PIXELS:
        reject("图片分辨率过大")


def _save_image(image: Image.Image, path: Path, transparent: bool, quality: int = 85) -> None:
    if transparent:
        image.convert("RGBA").save(path, "PNG", optimize=True)
    else:
        image.convert("RGB").save(path, "JPEG", quality=quality, optimize=True, progressive=True)


def compress_image(source: Path, directory: Path, *, original: bool = True) -> ProcessedMedia:
    if original:
        validate_original(source, "image")
    directory.mkdir(parents=True, exist_ok=False)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(source) as opened:
                validate_static_image(opened)
                image = ImageOps.exif_transpose(opened)
                image.load()
                transparent = "A" in image.getbands() or "transparency" in image.info
                # Normalize orientation before discarding EXIF, GPS and other metadata.
                if "icc_profile" in image.info:
                    from io import BytesIO
                    from PIL import ImageCms
                    image = ImageCms.profileToProfile(
                        image, ImageCms.ImageCmsProfile(BytesIO(image.info["icc_profile"])),
                        ImageCms.createProfile("sRGB"), outputMode="RGBA" if transparent else "RGB",
                    )
                else:
                    image = image.convert("RGBA" if transparent else "RGB")
                image.info.clear()
                image.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
                extension = "png" if transparent else "jpg"
                display = directory / f"display.{extension}"
                for quality in (85, 80, 75):
                    _save_image(image, display, transparent, quality)
                    if transparent or display.stat().st_size <= 1536 * 1024:
                        break
                thumb = image.copy()
                thumb.thumbnail((600, 600), Image.Resampling.LANCZOS)
                thumbnail = directory / f"thumbnail.{extension}"
                _save_image(thumb, thumbnail, transparent, 80)
                result = ProcessedMedia(display, thumbnail, image.width, image.height)
                if result.total_bytes > IMAGE_OUTPUT_MAX_BYTES:
                    reject("图片处理结果过大，请更换图片")
                return result
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError,
            Image.DecompressionBombWarning) as exc:
        reject("图片损坏或格式不支持")


def _run(arguments: list[str], timeout: int) -> subprocess.CompletedProcess:
    try:
        result = subprocess.run(arguments, capture_output=True, timeout=timeout, check=False,
                                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except FileNotFoundError as exc:
        raise AppError("MEMORY_PROCESSOR_UNAVAILABLE", "视频处理工具尚未配置", 503) from exc
    except subprocess.TimeoutExpired as exc:
        raise AppError("MEMORY_PROCESSOR_TIMEOUT", "视频处理超时，请稍后重试", 503) from exc
    if result.returncode:
        reject("视频损坏或格式不支持")
    return result


def inspect_video(source: Path, ffprobe: str) -> dict:
    result = _run([ffprobe, "-v", "error", "-protocol_whitelist", "file,pipe", "-show_streams",
                   "-show_format", "-of", "json", str(source)], 20)
    try:
        payload = json.loads(result.stdout)
        videos = [s for s in payload["streams"] if s.get("codec_type") == "video"
                  and not s.get("disposition", {}).get("attached_pic")]
        if len(videos) != 1:
            reject("请选择只有一个画面的普通视频")
        video = videos[0]
        duration = max(float(payload["format"].get("duration", 0)), float(video.get("duration", 0)))
        width, height = int(video["width"]), int(video["height"])
        if not math.isfinite(duration) or not 0 < duration <= MAX_DURATION:
            reject("视频时长不能超过 30 秒")
        if min(width, height) <= 0 or width * height > MAX_VIDEO_PIXELS:
            reject("视频分辨率不支持")
        return {"width": width, "height": height, "duration": duration, "video": video,
                "audio": [s for s in payload["streams"] if s.get("codec_type") == "audio"]}
    except (KeyError, TypeError, ValueError, OverflowError) as exc:
        reject("无法读取视频信息")


def compress_video(source: Path, directory: Path, ffmpeg: str, ffprobe: str) -> ProcessedMedia:
    validate_original(source, "video")
    info = inspect_video(source, ffprobe)
    directory.mkdir(parents=True, exist_ok=False)
    display = directory / "display.mp4"
    # Bound both landscape and portrait frames; the encoder must receive even dimensions.
    scale = "scale=w='min(iw,if(gte(iw,ih),1280,720))':h='min(ih,if(gte(iw,ih),720,1280))':force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos"
    _run([ffmpeg, "-nostdin", "-v", "error", "-protocol_whitelist", "file,pipe", "-threads", "1",
          "-i", str(source), "-map", "0:v:0", "-map", "0:a:0?", "-map_metadata", "-1",
          "-vf", scale, "-fpsmax", "30", "-c:v", "libx264", "-preset", "medium",
          "-crf", "26", "-maxrate", "2M", "-bufsize", "4M", "-pix_fmt", "yuv420p",
          "-threads", "1", "-filter_threads", "1", "-c:a", "aac", "-b:a", "96k",
          "-movflags", "+faststart", "-fs", str(VIDEO_MAX_BYTES), str(display)], 180)
    processed = inspect_video(display, ffprobe)
    if abs(processed["duration"] - info["duration"]) > 0.25:
        reject("视频处理不完整，请重试")
    if bool(processed["audio"]) != bool(info["audio"]):
        reject("视频声音处理失败")
    thumbnail = directory / "thumbnail.jpg"
    _run([ffmpeg, "-nostdin", "-v", "error", "-threads", "1", "-i", str(display),
          "-frames:v", "1", "-vf", "scale=600:600:force_original_aspect_ratio=decrease",
          "-filter_threads", "1", "-q:v", "3", str(thumbnail)], 20)
    if display.stat().st_size <= 0 or thumbnail.stat().st_size <= 0:
        reject("视频处理结果为空")
    return ProcessedMedia(display, thumbnail, processed["width"], processed["height"], processed["duration"])
