# Upload 外出活动两套静态图到生产机（与 activity_type_style_service 中 URL 文件名一致）。
# 约定：*-lg.png = 长方形（大图），*-sm.png = 正方形（小图）。
# 依赖：本机已可 ssh ubuntu@124.156.228.148；源文件在 backend/storage/images/
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$localDir = Join-Path $repoRoot "backend\storage\images"
$sshTarget = "ubuntu@124.156.228.148"
$remoteDir = "~/apps/dragonReserveSystem/backend/storage/images/"
$names = @(
  "outing-tram-lg.png",
  "outing-tram-sm.png",
  "outing-cycling-lg.png",
  "outing-cycling-sm.png"
)
foreach ($n in $names) {
  $p = Join-Path $localDir $n
  if (-not (Test-Path $p)) { throw "Missing local file: $p" }
}
ssh -o BatchMode=yes $sshTarget "mkdir -p $remoteDir"
foreach ($n in $names) {
  $p = Join-Path $localDir $n
  scp -o BatchMode=yes $p "${sshTarget}:${remoteDir}${n}"
  Write-Host "OK $n"
}
Write-Host "Verify: curl -sI https://dragon.liqqihome.top/media/images/outing-tram-lg.png"
