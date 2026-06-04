# GitHub Trends - stop server on port 3000

$ErrorActionPreference = "SilentlyContinue"
$projectDir = if ($PSScriptRoot) { $PSScriptRoot } else { "D:\Gitrend" }
$port = 3000
$pidFile = Join-Path $projectDir "data\server.pid"
$lockFile = Join-Path $projectDir "data\launch.lock"

if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
}

if (Test-Path $pidFile) {
    $savedPid = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($savedPid -match '^\d+$') {
        Stop-Process -Id ([int]$savedPid) -Force -ErrorAction SilentlyContinue
        Write-Output "Stopped server PID $savedPid."
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

$procIds = @()
try {
    $procIds = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
}
catch {
    # fallback: kill node processes on port via netstat
}

if ($procIds) {
    foreach ($procId in $procIds) {
        if ($procId -gt 0) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Output "Stopped listeners on port $port (PIDs: $($procIds -join ','))."
}
else {
    Write-Output "No server listening on port $port."
}

# Close minimized server cmd windows titled GitHub Trends Server
Get-Process cmd.exe -ErrorAction SilentlyContinue | ForEach-Object {
    $title = $_.MainWindowTitle
    if ($title -match 'GitHub Trends Server') {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
}
