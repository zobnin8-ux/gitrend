# Creates Gitrend.lnk in project root — always via Gitrend.vbs (no console window).
$ErrorActionPreference = "Stop"

$LauncherDir = $PSScriptRoot
$ProjectRoot = Split-Path $LauncherDir -Parent
$VbsPath = Join-Path $LauncherDir "Gitrend.vbs"

if (-not (Test-Path $VbsPath)) {
  Write-Error "Gitrend.vbs not found in launcher folder."
  exit 1
}

$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut((Join-Path $ProjectRoot "Gitrend.lnk"))
$link.TargetPath = $env:ComSpec
$link.Arguments = "/c wscript.exe //B //Nologo `"$VbsPath`""
$link.WorkingDirectory = $LauncherDir
$link.WindowStyle = 7
$link.Description = "GitHub Trends Tracker"
$link.Save()

Write-Host "OK:" (Join-Path $ProjectRoot "Gitrend.lnk")
