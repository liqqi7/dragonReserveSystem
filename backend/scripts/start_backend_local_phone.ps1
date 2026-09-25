param(
    [string]$MiniProgramHost = "",
    [int]$AppPort = 8002,
    [switch]$InitializeOnly,
    [switch]$Stop
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ProjectDir = Split-Path -Parent $RootDir
$Python = Join-Path $RootDir ".venv\Scripts\python.exe"
$TestEnv = Join-Path $RootDir ".env.test"
$DataDir = Join-Path $RootDir "storage\local-phone-test"
$DbFile = Join-Path $DataDir "local-phone.sqlite3"
$MpConfig = Join-Path $ProjectDir "miniprogram\services\config.js"
$SessionFile = Join-Path $DataDir "session.json"

function Get-TestEnvValue([string]$Key) {
    foreach ($line in Get-Content -LiteralPath $TestEnv -Encoding UTF8) {
        if ($line -match '^\s*([^#=\s]+)\s*=\s*(.*)$' -and $matches[1] -eq $Key) {
            return $matches[2].Trim().Trim('"', "'")
        }
    }
    return ""
}

function Get-LanAddress {
    $candidates = @(
        [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
            Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -ne 'Loopback' } |
            ForEach-Object {
                $props = $_.GetIPProperties()
                if (-not @($props.GatewayAddresses).Count) { return }
                $props.UnicastAddresses | Where-Object {
                    $_.Address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
                    $_.Address.ToString() -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)'
                } | ForEach-Object { $_.Address.ToString() }
            } | Select-Object -Unique
    )
    if ($candidates.Count -ne 1) {
        throw "Cannot select a unique LAN IPv4 address ($($candidates -join ', ')). Specify -MiniProgramHost <computer LAN IPv4>."
    }
    return $candidates[0]
}

function New-RandomHex([int]$ByteCount) {
    $bytes = New-Object byte[] $ByteCount
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return [BitConverter]::ToString($bytes).Replace('-', '')
}
function Test-Port([int]$Port) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $result = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $result.AsyncWaitHandle.WaitOne(250)) { return $false }
        $client.EndConnect($result)
        return $true
    } catch { return $false } finally { $client.Dispose() }
}

if ($Stop) {
    if (-not (Test-Path -LiteralPath $SessionFile)) { throw "No local session record at $SessionFile" }
    $session = Get-Content -LiteralPath $SessionFile -Raw | ConvertFrom-Json
    $serverProcess = Get-Process -Id $session.backend_pid -ErrorAction SilentlyContinue
    if ($serverProcess -and $serverProcess.StartTime.Ticks -eq $session.backend_start_ticks) {
        Stop-Process -Id $serverProcess.Id -Force
    }
    $current = [System.IO.File]::ReadAllText($MpConfig)
    if ($current.Contains("const API_BASE_URL = `"$($session.api_url)`";")) {
        if (-not (Test-Path -LiteralPath $session.config_backup)) { throw "Backup missing: $($session.config_backup)" }
        [System.IO.File]::WriteAllBytes($MpConfig, [System.IO.File]::ReadAllBytes($session.config_backup))
        Write-Host "Restored mini-program config: $($session.config_backup)"
    } else {
        Write-Warning 'Mini-program config changed after launch; not overwriting it.'
    }
    Remove-Item -LiteralPath $SessionFile -Force
    Write-Host 'Local phone test backend stopped.'
    return
}
if (-not (Test-Path -LiteralPath $Python)) { throw "Python virtual environment not found: $Python" }
if (-not (Test-Path -LiteralPath $TestEnv)) { throw "Missing $TestEnv (WeChat test credentials are required)." }
New-Item -ItemType Directory -Path $DataDir -Force | Out-Null

# The existing .env.test is used only as the source of the WeChat test app credentials.
# All database, media, public URL and invitation credentials below are explicitly isolated.
$wechatId = Get-TestEnvValue 'WECHAT_APP_ID'
$wechatSecret = Get-TestEnvValue 'WECHAT_APP_SECRET'
if (-not $wechatId -or -not $wechatSecret) { throw "WECHAT_APP_ID/WECHAT_APP_SECRET missing from backend/.env.test." }

if ($InitializeOnly) {
    Push-Location $RootDir
    try { & $Python -m scripts.init_local_phone_db --db-file $DbFile; if ($LASTEXITCODE -ne 0) { throw 'Local schema initialization failed.' } }
    finally { Pop-Location }
    return
}

if ($AppPort -lt 1 -or $AppPort -gt 65535) { throw 'AppPort must be in 1..65535.' }
if (-not $MiniProgramHost) { $MiniProgramHost = Get-LanAddress }
if ($MiniProgramHost -notmatch '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)') {
    throw 'MiniProgramHost must be the computer LAN IPv4 address (RFC1918), not localhost or a public host.'
}
$localIps = @([System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | ForEach-Object { $_.ToString() })
if ($MiniProgramHost -notin $localIps) { throw "Address $MiniProgramHost is not assigned to this computer: $($localIps -join ', ')" }
if (Test-Port $AppPort) { throw "Port $AppPort is already occupied. Choose -AppPort <another free port>." }

if (-not (Test-Path -LiteralPath $MpConfig)) { throw "Mini-program config not found: $MpConfig" }
if (Test-Path -LiteralPath $SessionFile) { throw "Local test session record exists. Run this script with -Stop first: $SessionFile" }
$originalConfig = [System.IO.File]::ReadAllBytes($MpConfig)
$configText = [System.Text.Encoding]::UTF8.GetString($originalConfig)
if ($configText -match 'API_ENVIRONMENT\s*=\s*["'']test["'']') {
    throw 'Mini-program config already points to a test backend. Stop the other test session before starting this one.'
}

$origin = "http://${MiniProgramHost}:$AppPort"
$env:APP_ENV = 'test'
$env:APP_DEBUG = 'false'
$env:DATABASE_URL = "sqlite:///$($DbFile.Replace('\', '/'))"
$env:MEDIA_ROOT = Join-Path $DataDir 'media'
$env:MEDIA_URL_PREFIX = '/media'
$env:ACTIVITY_COVER_CDN_BASE_URL = ''
$env:PUBLIC_BASE_URL = $origin
$env:TEST_REQUEST_LOG_FILE = Join-Path $DataDir 'requests.log'
$env:WECHAT_APP_ID = $wechatId
$env:WECHAT_APP_SECRET = $wechatSecret
$env:JWT_SECRET_KEY = New-RandomHex 32
$env:ADMIN_INVITE_CODE = New-RandomHex 12
$env:USER_INVITE_CODE = New-RandomHex 12

Push-Location $RootDir
try { & $Python -m scripts.init_local_phone_db --db-file $DbFile; if ($LASTEXITCODE -ne 0) { throw 'Local schema initialization failed.' } }
finally { Pop-Location }

$backup = Join-Path $DataDir ('config-before-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.js')
[System.IO.File]::WriteAllBytes($backup, $originalConfig)
$server = $null
$started = $false
try {
    $template = [System.IO.File]::ReadAllText("${MpConfig}.template")
    $newConfig = $template -replace 'const API_BASE_URL = "[^"]+";', "const API_BASE_URL = `"$origin/api/v1`";"
    $newConfig = $newConfig -replace 'const API_ENVIRONMENT = "[^"]+";', 'const API_ENVIRONMENT = "test";'
    $stdout = Join-Path $DataDir 'uvicorn.stdout.log'
    $stderr = Join-Path $DataDir 'uvicorn.stderr.log'
    $server = Start-Process -FilePath $Python -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', "$AppPort") -WorkingDirectory $RootDir -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if ($server.HasExited) { break }
        try {
            $health = Invoke-RestMethod -Uri "$origin/api/v1/health" -TimeoutSec 2
            if ($health.status -eq 'ok') { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ready) { throw "Backend did not become healthy. Check $stderr" }
    $session = @{
        backend_pid = $server.Id
        backend_start_ticks = $server.StartTime.Ticks
        api_url = "$origin/api/v1"
        config_backup = $backup
    }
    [System.IO.File]::WriteAllText($SessionFile, ($session | ConvertTo-Json), [System.Text.UTF8Encoding]::new($false))
    [System.IO.File]::WriteAllText($MpConfig, $newConfig, [System.Text.UTF8Encoding]::new($false))
    $started = $true
    Write-Host "Local phone test is ready: $origin/api/v1/health"
    Write-Host "SQLite: $DbFile; media: $env:MEDIA_ROOT"
    Write-Host "Test admin invitation code (local only): $env:ADMIN_INVITE_CODE"
    Write-Host "Stop and restore the prior mini-program config: .\scripts\start_backend_local_phone.ps1 -Stop"
    Write-Host 'Use WeChat DevTools Real-device debugging and a reachable LAN/Wi-Fi. Do not upload the HTTP test config.'
} finally {
    if (-not $started) {
        if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
        $currentConfig = [System.IO.File]::ReadAllText($MpConfig)
        if ($currentConfig.Contains("const API_BASE_URL = `"$origin/api/v1`";")) {
            [System.IO.File]::WriteAllBytes($MpConfig, $originalConfig)
        }
        if (Test-Path -LiteralPath $SessionFile) { Remove-Item -LiteralPath $SessionFile -Force }
    }
}