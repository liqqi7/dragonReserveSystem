param(
    [string]$EnvFile = "",
    [string]$AppHost = "0.0.0.0",
    [int]$AppPort = 8000,
    [int]$AppReload = 0
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $EnvFile) {
    $EnvFile = Join-Path $RootDir ".env"
}

$VenvPython = Join-Path $RootDir ".venv\Scripts\python.exe"

if (-not (Test-Path $EnvFile)) {
    throw "Missing env file: $EnvFile"
}

if (-not (Test-Path $VenvPython)) {
    throw "Missing Python runtime: $VenvPython"
}

Write-Host "Starting backend (prod-like) on http://${AppHost}:${AppPort} using ${EnvFile}"

$uvicornArgs = @(
    "-m", "uvicorn",
    "app.main:app",
    "--host", $AppHost,
    "--port", [string]$AppPort,
    "--env-file", "`"$EnvFile`""
)

if ($AppReload -eq 1) {
    $uvicornArgs += "--reload"
}

Push-Location $RootDir
try {
    & $VenvPython $uvicornArgs
}
finally {
    Pop-Location
}

