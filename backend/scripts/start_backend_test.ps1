param(
    [string]$EnvFile = "",
    [string]$AppHost = "127.0.0.1",
    [int]$AppPort = 8001,
    [int]$AppReload = 0,
    [string]$MiniProgramHost = "",
    [switch]$CheckOnly,
    [switch]$Stop
)
$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Python = Join-Path $RootDir ".venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $Python)) { throw "Missing Python runtime: $Python" }
$Arguments = @((Join-Path $RootDir 'scripts\test_environment.py'), '--app-host', $AppHost, '--app-port', "$AppPort")
if ($EnvFile) { $Arguments += @('--env-file', $EnvFile) }
if ($MiniProgramHost) { $Arguments += @('--mini-program-host', $MiniProgramHost) }
if ($AppReload -eq 1) { $Arguments += '--reload' }
if ($CheckOnly) { $Arguments += '--check-only' }
if ($Stop) { $Arguments += '--stop' }
& $Python @Arguments
exit $LASTEXITCODE
