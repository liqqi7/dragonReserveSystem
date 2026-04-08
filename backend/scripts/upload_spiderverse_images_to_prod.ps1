# 上传电影「纯静态图3」Spider-Verse 样式图到生产机（与 activity_type_style_service 中 URL 一致）。
# 约定：*-lg.png = 长方形大图，*-sm.png = 正方形小图。
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$localDir = Join-Path $repoRoot "backend\storage\images"
$sshTarget = "ubuntu@124.156.228.148"
$remoteDir = "~/apps/dragonReserveSystem/backend/storage/images/"
$names = @(
  "movie-image-spiderverse-lg.png",
  "movie-image-spiderverse-sm.png"
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
Write-Host "Verify: curl -sI https://dragon.liqqihome.top/media/images/movie-image-spiderverse-lg.png"
