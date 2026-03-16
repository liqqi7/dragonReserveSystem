param(
    [string]$AppHost = "127.0.0.1",
    [int]$AppPort = 8001
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$MpConfigFile = Join-Path $RootDir "..\miniprogram\services\config.js"
$MpTemplateFile = "${MpConfigFile}.template"

if (-not (Test-Path $MpTemplateFile)) {
    throw "Template file not found: $MpTemplateFile"
}

Copy-Item -Path $MpTemplateFile -Destination $MpConfigFile -Force
Write-Host "Restored miniprogram config from template: $MpTemplateFile -> $MpConfigFile"

