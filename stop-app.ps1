# GitHub Trends - stop server on port 3000

$ErrorActionPreference = "SilentlyContinue"
$port = 3000

$procIds = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

if ($procIds) {
    foreach ($procId in $procIds) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    Write-Output "Server stopped (PIDs: $($procIds -join ','))."
}
else {
    Write-Output "Server was not running."
}
