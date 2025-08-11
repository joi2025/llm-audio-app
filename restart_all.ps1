Param([switch]$Force)
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$stop = Join-Path $root 'stop_all.ps1'
$start = Join-Path $root 'start_all.ps1'

Write-Host 'Restarting all services...'
& powershell -ExecutionPolicy Bypass -File $stop @PSBoundParameters
& powershell -ExecutionPolicy Bypass -File $start
Write-Host 'Done.'
