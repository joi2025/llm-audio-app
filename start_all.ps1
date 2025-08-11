Param()
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidsDir = Join-Path $root '.pids'
if (-not (Test-Path $pidsDir)) { New-Item -ItemType Directory -Path $pidsDir | Out-Null }

$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'

# Backend
Write-Host '[backend] preparing venv and deps...'
$venvPy = Join-Path $backend '.venv/Scripts/python.exe'
if (-not (Test-Path $venvPy)) {
  & python -m venv (Join-Path $backend '.venv')
}
& $venvPy -m pip install -q --upgrade pip
& $venvPy -m pip install -q -r (Join-Path $backend 'requirements.txt')

Write-Host '[backend] starting run.py on :8001'
$backendProc = Start-Process -FilePath $venvPy -ArgumentList 'run.py' -WorkingDirectory $backend -PassThru
Set-Content -Path (Join-Path $pidsDir 'backend.pid') -Value $backendProc.Id
Write-Host "[backend] PID $($backendProc.Id)"

# Frontend
Write-Host '[frontend] preparing deps...'
Push-Location $frontend
if (-not (Test-Path 'node_modules')) {
  npm install
}
Write-Host '[frontend] starting dev server on :3001'
$frontendProc = Start-Process -FilePath 'npm' -ArgumentList 'run','dev' -WorkingDirectory $frontend -PassThru
Pop-Location
Set-Content -Path (Join-Path $pidsDir 'frontend.pid') -Value $frontendProc.Id
Write-Host "[frontend] PID $($frontendProc.Id)"

Write-Host "All services starting. PIDs saved under $pidsDir"
