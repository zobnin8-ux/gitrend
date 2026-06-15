# Creates GitHub Trends.lnk in project root — hidden VBS launch + clear icon.
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$LauncherDir = $PSScriptRoot
$ProjectRoot = Split-Path $LauncherDir -Parent
$VbsPath = Join-Path $LauncherDir "Gitrend.vbs"
$ShortcutPath = Join-Path $ProjectRoot "GitHub Trends.lnk"
$LegacyShortcut = Join-Path $ProjectRoot "Gitrend.lnk"
$PngPath = Join-Path $ProjectRoot "app\icon.png"
$IcoPath = Join-Path $LauncherDir "Gitrend.ico"

if (-not (Test-Path $VbsPath)) {
  Write-Error "Gitrend.vbs not found in launcher folder."
  exit 1
}

function Ensure-LauncherIcon {
  if (-not (Test-Path $PngPath)) {
    return $null
  }

  $pngTime = (Get-Item $PngPath).LastWriteTimeUtc
  if ((Test-Path $IcoPath) -and (Get-Item $IcoPath).LastWriteTimeUtc -ge $pngTime) {
    return $IcoPath
  }

  $bitmap = [System.Drawing.Bitmap]::FromFile($PngPath)
  try {
    $hIcon = $bitmap.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    try {
      $stream = [System.IO.File]::Create($IcoPath)
      try {
        $icon.Save($stream)
      }
      finally {
        $stream.Close()
      }
    }
    finally {
      $icon.Dispose()
    }
  }
  finally {
    $bitmap.Dispose()
  }

  return $IcoPath
}

$iconPath = Ensure-LauncherIcon

$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut($ShortcutPath)
$link.TargetPath = $env:ComSpec
$link.Arguments = "/c wscript.exe //B //Nologo `"$VbsPath`""
$link.WorkingDirectory = $LauncherDir
$link.WindowStyle = 7
$link.Description = "GitHub Trends - launch without terminal"
if ($iconPath) {
  $link.IconLocation = "$iconPath,0"
}
$link.Save()

if (Test-Path $LegacyShortcut) {
  Remove-Item $LegacyShortcut -Force
}

Write-Host "OK: $ShortcutPath"
