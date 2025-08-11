Param([switch]$Force)
$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidsDir = Join-Path $root '.pids'
if (-not (Test-Path $pidsDir)) { Write-Host 'No PID dir found. Nothing to stop.'; exit 0 }

function Stop-IfExists($pidPath, $name) {
  if (Test-Path $pidPath) {
    try {
      $procId = Get-Content $pidPath | Select-Object -First 1
      if ($procId) {
        Write-Host "[stop] $name PID $procId"
        Stop-Process -Id $procId -ErrorAction SilentlyContinue -Force:$Force
      }
    } catch { Write-Host "[stop] could not stop $name`: $($_)" }
    Remove-Item $pidPath -ErrorAction SilentlyContinue
  }
}

Stop-IfExists (Join-Path $pidsDir 'frontend.pid') 'frontend'
Stop-IfExists (Join-Path $pidsDir 'backend.pid') 'backend'

# Also close titled windows started by .bat (best effort)
Get-Process | Where-Object { $_.MainWindowTitle -like 'llm-backend-8001*' -or $_.MainWindowTitle -like 'llm-frontend-3001*' } | ForEach-Object {
  try { $_ | Stop-Process -Force:$Force } catch {}
}

Write-Host 'All services stopped (best effort).'
