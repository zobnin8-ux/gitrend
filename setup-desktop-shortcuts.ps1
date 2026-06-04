# Create desktop shortcuts for GitHub Trends (Start / Stop)

$ErrorActionPreference = "Stop"
$projectDir = "D:\Gitrend"
$desktop = [Environment]::GetFolderPath("Desktop")
$wsh = New-Object -ComObject WScript.Shell

function New-Shortcut([string]$name, [string]$target, [string]$args, [string]$iconPath) {
    $lnk = Join-Path $desktop "$name.lnk"
    $sc = $wsh.CreateShortcut($lnk)
    $sc.TargetPath = $target
    if ($args) { $sc.Arguments = $args }
    $sc.WorkingDirectory = $projectDir
    if ($iconPath -and (Test-Path $iconPath)) { $sc.IconLocation = "$iconPath,0" }
    $sc.Save()
    Write-Output "Created: $lnk"
}

$icon = Join-Path $projectDir "app\icon.png"

New-Shortcut "GitHub Trends" "D:\Gitrend\GitHub-Trends-Start.bat" "" $icon
New-Shortcut "GitHub Trends - Stop" "D:\Gitrend\GitHub-Trends-Stop.bat" "" $icon

Write-Output "Done. Use GitHub Trends shortcut on Desktop to start."
