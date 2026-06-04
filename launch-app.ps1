# GitHub Trends - start server (ASCII-only for Windows PowerShell)

$ErrorActionPreference = "SilentlyContinue"

$projectDir = "D:\Gitrend"
$port = 3000
$url = "http://127.0.0.1:$port"
$logFile = Join-Path $projectDir "data\launch.log"
$serverLog = Join-Path $projectDir "data\server.log"

$caPath = Join-Path $env:USERPROFILE "node-ca\avast-root-ca.pem"
if (Test-Path $caPath) {
    $env:NODE_EXTRA_CA_CERTS = $caPath
}

$dataDir = Join-Path $projectDir "data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
}

function Write-Log([string]$text) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $text"
    Add-Content -Path $logFile -Value $line -Encoding UTF8
    Write-Host $line
}

function Test-NeedsBuild {
    $buildId = Join-Path $projectDir ".next\BUILD_ID"
    if (-not (Test-Path $buildId)) { return $true }
    $builtAt = (Get-Item $buildId).LastWriteTime
    $roots = @(
        (Join-Path $projectDir "app"),
        (Join-Path $projectDir "lib"),
        (Join-Path $projectDir "components")
    )
    foreach ($root in $roots) {
        if (-not (Test-Path $root)) { continue }
        $newer = Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Extension -match '^\.(ts|tsx|js|jsx|css|mjs)$' -and $_.LastWriteTime -gt $builtAt } |
            Select-Object -First 1
        if ($newer) { return $true }
    }
    return $false
}

function Stop-ServerOnPort([int]$listenPort) {
    $procIds = Get-NetTCPConnection -LocalPort $listenPort -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    if (-not $procIds) { return }
    foreach ($procId in $procIds) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    Write-Log "Stopped PIDs: $($procIds -join ',')"
    Start-Sleep -Seconds 2
}

function Wait-ForServer([string]$checkUrl, [int]$maxSeconds) {
    for ($i = 0; $i -lt $maxSeconds; $i++) {
        Start-Sleep -Seconds 1
        try {
            $resp = Invoke-WebRequest -Uri $checkUrl -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($resp.StatusCode -eq 200) { return $true }
        }
        catch {
            # still starting
        }
    }
    return $false
}

Write-Log "===== START ====="
Set-Location $projectDir

Stop-ServerOnPort $port

if (Test-NeedsBuild) {
    Write-Log "Building (npm run build)..."
    & npm.cmd run build 2>&1 | ForEach-Object { Write-Log $_ }
    if ($LASTEXITCODE -ne 0) {
        Write-Log "BUILD FAILED exit=$LASTEXITCODE"
        exit 1
    }
    Write-Log "BUILD OK"
}
else {
    Write-Log "SKIP BUILD - .next is up to date"
}

"" | Set-Content -Path $serverLog -Encoding UTF8
Write-Log "Starting server (npm run start)..."

$startCmd = "cd /d `"$projectDir`" && npm run start >> `"$serverLog`" 2>&1"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $startCmd -WindowStyle Hidden

Write-Log "Waiting for $url (up to 120 sec)..."

if (-not (Wait-ForServer $url 120)) {
    Write-Log "SERVER TIMEOUT"
    if (Test-Path $serverLog) {
        Get-Content $serverLog -Tail 20 | ForEach-Object { Write-Log "server: $_" }
    }
    exit 1
}

Write-Log "SERVER OK"

$edge = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

$chrome = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($edge) {
    Start-Process $edge -ArgumentList "--app=$url"
}
elseif ($chrome) {
    Start-Process $chrome -ArgumentList "--app=$url"
}
else {
    Start-Process $url
}

Write-Log "DONE $url"
exit 0
