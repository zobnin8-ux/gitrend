# GitHub Trends - reliable launcher (ASCII-only for Windows PowerShell)
# Fixes: wrong Node on PATH, native module mismatch, silent failures, double-click races.
# Usage: launch-app.ps1 [-Silent]  — Silent = no console, hidden server, auto-shutdown on tab close

param(
    [switch]$Silent
)

$ErrorActionPreference = "Stop"

$projectDir = if ($PSScriptRoot) { $PSScriptRoot } else { "D:\Gitrend" }
$port = 3000
$url = "http://localhost:$port"
$dataDir = Join-Path $projectDir "data"
$logFile = Join-Path $dataDir "launch.log"
$serverLog = Join-Path $dataDir "server.log"
$lockFile = Join-Path $dataDir "launch.lock"
$pidFile = Join-Path $dataDir "server.pid"

$caPath = Join-Path $env:USERPROFILE "node-ca\avast-root-ca.pem"
if (Test-Path $caPath) {
    $env:NODE_EXTRA_CA_CERTS = $caPath
}

if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
}

function Write-Log([string]$text) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $text"
    Add-Content -Path $logFile -Value $line -Encoding UTF8
    if (-not $Silent) {
        Write-Host $line
    }
}

function Show-Error([string]$title, [string]$message) {
    Write-Log "ERROR: $title - $message"
    if (-not $Silent) {
        Write-Host ""
        Write-Host "ERROR: $title" -ForegroundColor Red
        Write-Host $message -ForegroundColor Red
        Write-Host "Log: $logFile" -ForegroundColor Yellow
    }
    try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
        [System.Windows.Forms.MessageBox]::Show(
            "$message`n`nLog: $logFile",
            $title,
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        ) | Out-Null
    }
    catch {
        # no GUI
    }
}

function Get-NodeCandidates {
    $list = [System.Collections.Generic.List[string]]::new()

    # Node bundled with Cursor (v22) often matches prebuilt better-sqlite3 in this project.
    $cursor = Join-Path $env:LOCALAPPDATA "Programs\cursor\resources\app\resources\helpers\node.exe"
    if (Test-Path $cursor) { $list.Add($cursor) }

    $pf = Join-Path ${env:ProgramFiles} "nodejs\node.exe"
    if (Test-Path $pf) { $list.Add($pf) }

    $pfx86 = Join-Path ${env:ProgramFiles(x86)} "nodejs\node.exe"
    if (Test-Path $pfx86) { $list.Add($pfx86) }

    Get-Command node.exe -All -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.Source -and -not $list.Contains($_.Source)) {
            $list.Add($_.Source)
        }
    }

    return $list
}

function Resolve-GitCmd {
    $cmd = Get-Command git.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd -and $cmd.Source) { return $cmd.Source }

    $candidates = @(
        (Join-Path ${env:ProgramFiles} "Git\cmd\git.exe"),
        (Join-Path ${env:ProgramFiles(x86)} "Git\cmd\git.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Git\cmd\git.exe")
    )
    foreach ($path in $candidates) {
        if ($path -and (Test-Path $path)) { return $path }
    }
    return $null
}

function Resolve-NodeJs {
    # Use the first Node where better-sqlite3 already loads (avoids Node 24 mismatch).
    foreach ($candidate in (Get-NodeCandidates)) {
        if (Test-NativeSqlite $candidate) {
            $nodeDir = Split-Path $candidate -Parent
            $env:PATH = "$nodeDir;" + (
                $env:PATH -split ';' | Where-Object { $_ -and ($_ -ne $nodeDir) }
            ) -join ';'
            return $candidate
        }
    }

    # Fallback: system Node + rebuild (needs Python + build tools on Windows)
    $pf = Join-Path ${env:ProgramFiles} "nodejs\node.exe"
    if (Test-Path $pf) {
        $nodeDir = Split-Path $pf -Parent
        $env:PATH = "$nodeDir;" + ($env:PATH -split ';' | Where-Object { $_ }) -join ';'
        return $pf
    }

    throw "Node.js not found. Install Node.js 20 or 22 LTS from https://nodejs.org/"
}

function Test-NativeSqlite([string]$nodeExe) {
    $code = @"
try {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.close();
  process.exit(0);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
"@
    Push-Location $projectDir
    try {
        & $nodeExe -e $code 2>&1 | Out-Null
        return $LASTEXITCODE -eq 0
    }
    finally {
        Pop-Location
    }
}

function Resolve-NpmCmd([string]$nodeExe) {
    $nodeDir = Split-Path $nodeExe -Parent
    $candidates = @(
        (Join-Path $nodeDir "npm.cmd"),
        (Join-Path ${env:ProgramFiles} "nodejs\npm.cmd"),
        (Join-Path ${env:ProgramFiles(x86)} "nodejs\npm.cmd")
    )
    foreach ($path in $candidates) {
        if ($path -and (Test-Path $path)) { return $path }
    }
    $fromPath = Get-Command npm.cmd -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty Source -First 1
    if ($fromPath -and (Test-Path $fromPath)) { return $fromPath }

    throw @"
npm.cmd not found. Node.js npm is required alongside node.exe.

Install Node.js 22 LTS from https://nodejs.org/
(or add C:\Program Files\nodejs to PATH).
"@
}

function Invoke-NpmLog([string]$npmCmd, [string[]]$npmArgs) {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & $npmCmd @npmArgs 2>&1
        $output | ForEach-Object { Write-Log $_ }
        if ($LASTEXITCODE -ne 0) {
            throw "npm $($npmArgs -join ' ') failed (exit $LASTEXITCODE)"
        }
    }
    finally {
        $ErrorActionPreference = $prevEap
    }
}

function Repair-NativeSqlite([string]$npmCmd) {
    Write-Log "Rebuilding better-sqlite3 for current Node..."
    Push-Location $projectDir
    try {
        Invoke-NpmLog $npmCmd @("rebuild", "better-sqlite3")
    }
    finally {
        Pop-Location
    }
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
    if (Test-Path $pidFile) {
        $savedPid = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($savedPid -match '^\d+$') {
            Stop-Process -Id ([int]$savedPid) -Force -ErrorAction SilentlyContinue
            Write-Log "Stopped saved PID $savedPid"
        }
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }

    $procIds = @()
    try {
        $procIds = Get-NetTCPConnection -LocalPort $listenPort -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
    }
    catch {
        # Get-NetTCPConnection may be unavailable
    }

    if ($procIds) {
        foreach ($procId in $procIds) {
            if ($procId -gt 0) {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        }
        Write-Log "Stopped port $listenPort PIDs: $($procIds -join ',')"
        Start-Sleep -Seconds 2
    }
}

function Wait-ForServer([string]$checkUrl, [int]$maxSeconds) {
    for ($i = 0; $i -lt $maxSeconds; $i++) {
        Start-Sleep -Seconds 1
        try {
            $resp = Invoke-WebRequest -Uri $checkUrl -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
                return $true
            }
        }
        catch {
            # still starting or 500
        }
    }
    return $false
}

function Open-Browser([string]$openUrl) {
    Write-Log "Opening browser: $openUrl"
    Start-Process $openUrl
}

function Test-ServerAlreadyUp([string]$checkUrl) {
    try {
        $resp = Invoke-WebRequest -Uri $checkUrl -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        return ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500)
    }
    catch {
        return $false
    }
}

# --- main ---

Write-Log "===== START ====="
Set-Location $projectDir

# Double-click guard: if another launch is in progress, wait for it to finish
if (Test-Path $lockFile) {
    $lockAge = (Get-Date) - (Get-Item $lockFile).LastWriteTime
    if ($lockAge.TotalMinutes -lt 10) {
        $elapsed = [int]$lockAge.TotalSeconds
        $maxWait = 180
        $remaining = [Math]::Max(20, $maxWait - $elapsed)
        Write-Log "Launch already in progress (${elapsed}s ago) - waiting up to ${remaining}s for server..."

        if (Test-ServerAlreadyUp $url) {
            Open-Browser $url
            exit 0
        }

        if (Wait-ForServer $url $remaining) {
            Open-Browser $url
            exit 0
        }

        Write-Log "Server not ready after waiting ${remaining}s"
        Show-Error "GitHub Trends" @"
Application is still starting (build may take 1-2 minutes on first run).

Wait 30 seconds and click the shortcut once — do not double-click.
Log: $logFile
"@
        exit 1
    }
    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
}

"" | Set-Content -Path $lockFile -Encoding ASCII

try {
    $nodeExe = Resolve-NodeJs
    $nodeVer = & $nodeExe -v 2>&1
    $npmCmd = Resolve-NpmCmd $nodeExe
    $npmDir = Split-Path $npmCmd -Parent
    $nodeDir = Split-Path $nodeExe -Parent
    $gitCmd = Resolve-GitCmd
    $gitDir = if ($gitCmd) { Split-Path $gitCmd -Parent } else { $null }
    $pathPrefix = if ($gitDir) { "$nodeDir;$npmDir;$gitDir" } else { "$nodeDir;$npmDir" }
    $env:PATH = "$pathPrefix;" + (
        $env:PATH -split ';' | Where-Object {
            $_ -and ($_ -ne $nodeDir) -and ($_ -ne $npmDir) -and ($_ -ne $gitDir)
        }
    ) -join ';'
    Write-Log "Node: $nodeExe ($nodeVer)"
    Write-Log "npm: $npmCmd"
    if ($gitCmd) { Write-Log "git: $gitCmd" }

    if (-not (Test-Path (Join-Path $projectDir "node_modules"))) {
        Write-Log "Installing dependencies (npm install)..."
        Push-Location $projectDir
        try {
            Invoke-NpmLog $npmCmd @("install")
        }
        finally {
            Pop-Location
        }
    }

    if (-not (Test-NativeSqlite $nodeExe)) {
        Write-Log "better-sqlite3 mismatch for $nodeVer - trying rebuild..."
        Repair-NativeSqlite $npmCmd
        if (-not (Test-NativeSqlite $nodeExe)) {
            $other = Get-NodeCandidates | Where-Object { $_ -ne $nodeExe }
            foreach ($alt in $other) {
                if (Test-NativeSqlite $alt) {
                    $nodeExe = $alt
                    $nodeDir = Split-Path $nodeExe -Parent
                    $env:PATH = "$nodeDir;" + ($env:PATH -split ';' | Where-Object { $_ }) -join ';'
                    $nodeVer = & $nodeExe -v 2>&1
                    Write-Log "Switched to compatible Node: $nodeExe ($nodeVer)"
                    break
                }
            }
        }
        if (-not (Test-NativeSqlite $nodeExe)) {
            throw @"
better-sqlite3 does not match Node.js ($nodeVer).

Fix (pick one):
  1) Install Node.js 22 LTS from https://nodejs.org/ (recommended)
  2) Or run in project folder: npm run rebuild:native
     (requires Python + Visual Studio Build Tools on Windows)
"@
        }
    }
    Write-Log "Native modules OK"

    if (Test-ServerAlreadyUp $url) {
        Write-Log "Server already running on port $port"
        Open-Browser $url
        exit 0
    }

    Stop-ServerOnPort $port

    if (Test-NeedsBuild) {
        Write-Log "Building (npm run build) - may take 1-2 min..."
        Push-Location $projectDir
        try {
            Invoke-NpmLog $npmCmd @("run", "build")
        }
        finally {
            Pop-Location
        }
        Write-Log "BUILD OK"
    }
    else {
        Write-Log "SKIP BUILD - .next is up to date"
    }

    "" | Set-Content -Path $serverLog -Encoding UTF8
    Write-Log "Starting server on port $port..."

    $nodeDir = Split-Path $nodeExe -Parent
    $gitCmd = Resolve-GitCmd
    $gitDir = if ($gitCmd) { Split-Path $gitCmd -Parent } else { $null }
    $pathForServer = if ($gitDir) { "$nodeDir;$npmDir;$gitDir" } else { "$nodeDir;$npmDir" }

    if ($Silent) {
        $startBat = Join-Path $dataDir "_run-server.cmd"
        $npmCmdEsc = $npmCmd -replace '"', '""'
        @"
@echo off
cd /d "$projectDir"
set "PATH=$pathForServer;%PATH%"
set "GITREND_AUTO_SHUTDOWN=1"
"$npmCmdEsc" run start >> "$serverLog" 2>&1
"@ | Set-Content -Path $startBat -Encoding ASCII

        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $env:ComSpec
        $psi.Arguments = "/c `"`"$startBat`"`""
        $psi.WorkingDirectory = $projectDir
        $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
        $psi.CreateNoWindow = $true
        $psi.UseShellExecute = $false

        $serverProc = [System.Diagnostics.Process]::Start($psi)
        if ($serverProc) {
            $serverProc.Id | Set-Content -Path $pidFile -Encoding ASCII
            Write-Log "Server PID $($serverProc.Id) (hidden, auto-shutdown enabled)"
        }
    }
    else {
        $startBat = Join-Path $dataDir "_run-server.cmd"
        $npmCmdEsc = $npmCmd -replace '"', '""'
        @"
@echo off
title GitHub Trends Server
cd /d "$projectDir"
set "PATH=$pathForServer;%PATH%"
"$npmCmdEsc" run start >> "$serverLog" 2>&1
"@ | Set-Content -Path $startBat -Encoding ASCII

        $serverProc = Start-Process -FilePath $startBat -PassThru -WindowStyle Minimized
        if ($serverProc) {
            $serverProc.Id | Set-Content -Path $pidFile -Encoding ASCII
            Write-Log "Server PID $($serverProc.Id) (minimized window: GitHub Trends Server)"
        }
    }

    Write-Log "Waiting for $url (up to 90 sec)..."
    if (-not (Wait-ForServer $url 90)) {
        $tail = @()
        if (Test-Path $serverLog) {
            $tail = Get-Content $serverLog -Tail 25 -ErrorAction SilentlyContinue
            $tail | ForEach-Object { Write-Log "server: $_" }
        }
        $hint = "Server did not respond. Check minimized window 'GitHub Trends Server' or data\server.log"
        if ($tail -match 'NODE_MODULE_VERSION') {
            $hint = "Node.js version mismatch. Run: npm rebuild better-sqlite3`n`n$hint"
        }
        throw $hint
    }

    Write-Log "SERVER OK"
    Open-Browser $url
    Write-Log "DONE $url"
    exit 0
}
catch {
    Show-Error "GitHub Trends - start failed" $_.Exception.Message
    exit 1
}
finally {
    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
}
