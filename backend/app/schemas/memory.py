from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.services.memory_media import IMAGE_MAX_BYTES, VIDEO_MAX_BYTES


class MediaDeclaration(BaseModel):
    kind: Literal["image", "video"]
    size: int = Field(gt=0)

    @model_validator(mode="after")
    def original_size(self):
        if self.size > (IMAGE_MAX_BYTES if self.kind == "image" else VIDEO_MAX_BYTES):
            raise ValueError("原图片和原视频每个文件最多 20MB")
        return self


class MemoryMetadata(BaseModel):
    caption: str = Field(default="", max_length=50)
    location_name: str = Field(default="", max_length=128)
    activity_id: int | None = Field(default=None, gt=0)


class MemoryDraftRequest(MemoryMetadata):
    client_submission_id: str = Field(min_length=8, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    media: list[MediaDeclaration] = Field(default_factory=list, max_length=10)


class MemoryReviewRequest(BaseModel):
    action: Literal["publish", "reject", "offline"]
    expected_revision: int = Field(gt=0)
    selected_media_ids: list[int] = Field(default_factory=list, max_length=10)
    manually_reviewed: bool = False
    individual: bool = False


class MemoryCleanupRequest(BaseModel):
    expected_revision: int = Field(gt=0)
    confirmed: bool = False
    media_id: int | None = Field(default=None, gt=0)
