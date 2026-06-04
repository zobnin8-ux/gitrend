# Reinstall better-sqlite3 native binary (run if app fails to start after Node upgrade)

$ErrorActionPreference = "Stop"
$projectDir = if ($PSScriptRoot) { $PSScriptRoot } else { "D:\Gitrend" }
Set-Location $projectDir

$cursor = Join-Path $env:LOCALAPPDATA "Programs\cursor\resources\app\resources\helpers\node.exe"
if (Test-Path $cursor) {
    $nodeDir = Split-Path $cursor -Parent
    $env:PATH = "$nodeDir;" + ($env:PATH -split ';' | Where-Object { $_ }) -join ';'
    Write-Host "Using Node: $(& $cursor -v)"
}
else {
    Write-Host "Using Node from PATH: $(node -v)"
}

Write-Host "Reinstalling better-sqlite3..."
& npm.cmd install better-sqlite3@11.8.1 --force
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Now run GitHub-Trends-Start.bat"
