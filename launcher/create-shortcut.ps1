# Creates GitHub Trends.lnk in project root — hidden VBS launch + clear icon.
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$LauncherDir = $PSScriptRoot
$ProjectRoot = Split-Path $LauncherDir -Parent
$VbsPath = Join-Path $LauncherDir "Gitrend.vbs"
$ShortcutPath = Join-Path $ProjectRoot "GitHub Trends.lnk"
$LegacyShortcut = Join-Path $ProjectRoot "Gitrend.lnk"
$PngPath = Join-Path $LauncherDir "gitrend-icon.png"
$FallbackPngPath = Join-Path $ProjectRoot "app\icon.png"
$IcoPath = Join-Path $LauncherDir "Gitrend.ico"

if (-not (Test-Path $VbsPath)) {
  Write-Error "Gitrend.vbs not found in launcher folder."
  exit 1
}

function Convert-PngToIco {
  param(
    [Parameter(Mandatory = $true)][string]$SourcePng,
    [Parameter(Mandatory = $true)][string]$DestIco
  )

  $png = [System.Drawing.Image]::FromFile($SourcePng)
  try {
    $sizes = @(16, 32, 48, 64, 128, 256)
    $imageData = New-Object System.Collections.Generic.List[byte[]]

    foreach ($size in $sizes) {
      $bmp = New-Object System.Drawing.Bitmap $size, $size
      try {
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        try {
          $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
          $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $g.Clear([System.Drawing.Color]::Transparent)
          $g.DrawImage($png, 0, 0, $size, $size)
        }
        finally {
          $g.Dispose()
        }

        $ms = New-Object System.IO.MemoryStream
        try {
          $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
          $imageData.Add($ms.ToArray())
        }
        finally {
          $ms.Dispose()
        }
      }
      finally {
        $bmp.Dispose()
      }
    }

    $stream = [System.IO.File]::Create($DestIco)
    try {
      $writer = New-Object System.IO.BinaryWriter($stream)
      $writer.Write([UInt16]0)
      $writer.Write([UInt16]1)
      $writer.Write([UInt16]$sizes.Count)

      $offset = 6 + ($sizes.Count * 16)
      foreach ($i in 0..($sizes.Count - 1)) {
        $size = $sizes[$i]
        $bytes = $imageData[$i]
        $writer.Write([Byte]([Math]::Min($size, 255)))
        $writer.Write([Byte]([Math]::Min($size, 255)))
        $writer.Write([Byte]0)
        $writer.Write([Byte]0)
        $writer.Write([UInt16]1)
        $writer.Write([UInt16]32)
        $writer.Write([UInt32]$bytes.Length)
        $writer.Write([UInt32]$offset)
        $offset += $bytes.Length
      }

      foreach ($bytes in $imageData) {
        $writer.Write($bytes)
      }

      $writer.Flush()
    }
    finally {
      $stream.Close()
    }
  }
  finally {
    $png.Dispose()
  }
}

function Ensure-LauncherIcon {
  $sourcePng = if (Test-Path $PngPath) { $PngPath } elseif (Test-Path $FallbackPngPath) { $FallbackPngPath } else { $null }
  if (-not $sourcePng) {
    return $null
  }

  $pngTime = (Get-Item $sourcePng).LastWriteTimeUtc
  $icoOk = (Test-Path $IcoPath) -and ((Get-Item $IcoPath).Length -gt 1024) -and ((Get-Item $IcoPath).LastWriteTimeUtc -ge $pngTime)
  if ($icoOk) {
    return $IcoPath
  }

  Convert-PngToIco -SourcePng $sourcePng -DestIco $IcoPath
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

$desktop = [Environment]::GetFolderPath("Desktop")
$legacyDesktop = Join-Path $desktop "GitHub Trends.lnk"
$legacyStopDesktop = Join-Path $desktop "GitHub Trends - Stop.lnk"
foreach ($old in @($legacyDesktop, $legacyStopDesktop)) {
  if (Test-Path $old) {
    Remove-Item $old -Force
  }
}

Write-Host "OK: $ShortcutPath"
