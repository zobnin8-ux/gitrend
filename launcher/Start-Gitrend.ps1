# GitHub Trends HUD launcher — hidden server, browser, auto-shutdown when tab closes.
$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
& (Join-Path $ProjectRoot "launch-app.ps1") -Silent
