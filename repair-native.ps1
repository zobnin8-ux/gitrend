# Reinstall better-sqlite3 native binary (run if app fails to start after Node upgrade)

$ErrorActionPreference = "Stop"
$projectDir = if ($PSScriptRoot) { $PSScriptRoot } else { "D:\Gitrend" }
Set-Location $projectDir

$npmCmd = $null
$nodeExe = $null

foreach ($candidate in @(
    (Join-Path ${env:ProgramFiles} "nodejs\node.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\cursor\resources\app\resources\helpers\node.exe")
)) {
    if (-not (Test-Path $candidate)) { continue }
    $nodeDir = Split-Path $candidate -Parent
    $npm = Join-Path ${env:ProgramFiles} "nodejs\npm.cmd"
    if (-not (Test-Path $npm)) {
        $npm = Join-Path $nodeDir "npm.cmd"
    }
    if (Test-Path $npm) {
        $nodeExe = $candidate
        $npmCmd = $npm
        break
    }
}

if (-not $npmCmd) {
    Write-Host "ERROR: npm.cmd not found. Install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

$nodeDir = Split-Path $nodeExe -Parent
$npmDir = Split-Path $npmCmd -Parent
$env:PATH = "$nodeDir;$npmDir;" + ($env:PATH -split ';' | Where-Object { $_ }) -join ';'

Write-Host "Node: $(& $nodeExe -v) ($nodeExe)"
Write-Host "npm:  $npmCmd"
Write-Host "Reinstalling better-sqlite3..."

& $npmCmd install better-sqlite3@11.8.1 --force
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Double-click Gitrend.lnk in the project folder."
