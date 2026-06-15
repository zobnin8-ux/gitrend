# Creates Gitrend.lnk in project root (same as Jarvis.lnk in Jarvis)
$ErrorActionPreference = "Stop"

$LauncherDir = $PSScriptRoot
$ProjectRoot = Split-Path $LauncherDir -Parent
$ExePath = Join-Path $LauncherDir "Gitrend.exe"
$VbsPath = Join-Path $LauncherDir "Gitrend.vbs"

if (Test-Path $ExePath) {
  $Target = $ExePath
} elseif (Test-Path $VbsPath) {
  $Target = $VbsPath
} else {
  Write-Error "Nothing to launch. Run: npm run launcher:build"
  exit 1
}

$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut((Join-Path $ProjectRoot "Gitrend.lnk"))
$link.TargetPath = $Target
$link.WorkingDirectory = $LauncherDir
$link.Description = "GitHub Trends Tracker"
$link.Save()

Write-Host "OK:" (Join-Path $ProjectRoot "Gitrend.lnk")
