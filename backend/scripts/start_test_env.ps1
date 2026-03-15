param(
    [string]$EnvFile = "",
    [string]$AppHost = "127.0.0.1",
    [int]$AppPort = 8001,
    [int]$AppReload = 1
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $EnvFile) {
    $EnvFile = Join-Path $RootDir ".env.test"
}

$VenvPython = Join-Path $RootDir ".venv\Scripts\python.exe"

function Get-DotenvValue {
    param(
        [string]$Key,
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return ""
    }

    foreach ($rawLine in Get-Content -Path $Path -Encoding UTF8) {
        $line = $rawLine.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            continue
        }

        $parts = $line.Split("=", 2)
        if ($parts[0].Trim() -eq $Key) {
            return $parts[1].Trim()
        }
    }

    return ""
}

function Test-PortOpen {
    param(
        [string]$TargetHost,
        [int]$Port
    )

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($TargetHost, $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(500)) {
            return $false
        }
        $client.EndConnect($async)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Dispose()
    }
}

function Wait-ForPort {
    param(
        [string]$TargetHost,
        [int]$Port,
        [int]$MaxAttempts = 20
    )

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        if (Test-PortOpen -TargetHost $TargetHost -Port $Port) {
            return $true
        }
        Start-Sleep -Milliseconds 500
    }

    return $false
}

if (-not (Test-Path $EnvFile)) {
    throw "Missing env file: $EnvFile"
}

if (-not (Test-Path $VenvPython)) {
    throw "Missing Python runtime: $VenvPython"
}

$mysqlHost = if ($env:MYSQL_HOST) { $env:MYSQL_HOST } else { Get-DotenvValue -Key "MYSQL_HOST" -Path $EnvFile }
$mysqlPortText = if ($env:MYSQL_PORT) { $env:MYSQL_PORT } else { Get-DotenvValue -Key "MYSQL_PORT" -Path $EnvFile }

if (-not $mysqlHost) { $mysqlHost = "127.0.0.1" }
if (-not $mysqlPortText) { $mysqlPortText = "3307" }
$mysqlPort = [int]$mysqlPortText

$sshHost = if ($env:SSH_TEST_DB_HOST) { $env:SSH_TEST_DB_HOST } else { Get-DotenvValue -Key "SSH_TEST_DB_HOST" -Path $EnvFile }
$sshUser = if ($env:SSH_TEST_DB_USER) { $env:SSH_TEST_DB_USER } else { Get-DotenvValue -Key "SSH_TEST_DB_USER" -Path $EnvFile }
$sshRemoteHost = if ($env:SSH_TEST_DB_REMOTE_HOST) { $env:SSH_TEST_DB_REMOTE_HOST } else { Get-DotenvValue -Key "SSH_TEST_DB_REMOTE_HOST" -Path $EnvFile }
$sshRemotePortText = if ($env:SSH_TEST_DB_REMOTE_PORT) { $env:SSH_TEST_DB_REMOTE_PORT } else { Get-DotenvValue -Key "SSH_TEST_DB_REMOTE_PORT" -Path $EnvFile }
$sshLocalHost = if ($env:SSH_TEST_DB_LOCAL_HOST) { $env:SSH_TEST_DB_LOCAL_HOST } else { Get-DotenvValue -Key "SSH_TEST_DB_LOCAL_HOST" -Path $EnvFile }
$sshLocalPortText = if ($env:SSH_TEST_DB_LOCAL_PORT) { $env:SSH_TEST_DB_LOCAL_PORT } else { Get-DotenvValue -Key "SSH_TEST_DB_LOCAL_PORT" -Path $EnvFile }
$sshIdentityFile = if ($env:SSH_TEST_DB_IDENTITY_FILE) { $env:SSH_TEST_DB_IDENTITY_FILE } else { Get-DotenvValue -Key "SSH_TEST_DB_IDENTITY_FILE" -Path $EnvFile }

if (-not $sshHost) { $sshHost = "124.156.228.148" }
if (-not $sshUser) { $sshUser = "ubuntu" }
if (-not $sshRemoteHost) { $sshRemoteHost = "127.0.0.1" }
if (-not $sshRemotePortText) { $sshRemotePortText = "3306" }
if (-not $sshLocalHost) { $sshLocalHost = $mysqlHost }
if (-not $sshLocalPortText) { $sshLocalPortText = [string]$mysqlPort }

$sshRemotePort = [int]$sshRemotePortText
$sshLocalPort = [int]$sshLocalPortText

$tunnelProcess = $null
$appProcess = $null

try {
    if (Test-PortOpen -TargetHost $sshLocalHost -Port $sshLocalPort) {
        Write-Host "Reusing existing DB tunnel on ${sshLocalHost}:${sshLocalPort}"
    }
    else {
        Write-Host "Starting SSH tunnel: ${sshLocalHost}:${sshLocalPort} -> ${sshRemoteHost}:${sshRemotePort} via ${sshUser}@${sshHost}"

        $sshArgs = @(
            "-o", "ExitOnForwardFailure=yes",
            "-o", "ServerAliveInterval=30",
            "-o", "ServerAliveCountMax=3",
            "-N",
            "-L", "${sshLocalHost}:${sshLocalPort}:${sshRemoteHost}:${sshRemotePort}"
        )

        if ($sshIdentityFile) {
            $sshArgs += @("-i", $sshIdentityFile)
        }

        $sshArgs += "${sshUser}@${sshHost}"

        $tunnelProcess = Start-Process -FilePath "ssh" -ArgumentList $sshArgs -PassThru -WindowStyle Hidden

        if (-not (Wait-ForPort -TargetHost $sshLocalHost -Port $sshLocalPort)) {
            throw "SSH tunnel did not become ready on ${sshLocalHost}:${sshLocalPort}"
        }
    }

    Write-Host "Starting backend on http://${AppHost}:${AppPort} using ${EnvFile}"

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
        $appProcess = Start-Process -FilePath "`"$VenvPython`"" -ArgumentList $uvicornArgs -PassThru -NoNewWindow -Wait
    }
    finally {
        Pop-Location
    }
}
finally {
    if ($appProcess -and -not $appProcess.HasExited) {
        Stop-Process -Id $appProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($tunnelProcess -and -not $tunnelProcess.HasExited) {
        Write-Host "Stopping SSH tunnel (pid=$($tunnelProcess.Id))"
        Stop-Process -Id $tunnelProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
