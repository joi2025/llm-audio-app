# LLM Audio App - Start Script Simple
# Version funcional sin caracteres especiales

Write-Host "Iniciando LLM Audio App..." -ForegroundColor Green

# Limpiar procesos anteriores
Write-Host "Limpiando procesos anteriores..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "python" -or $_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Crear .env si no existe
if (-not (Test-Path ".env")) {
    Write-Host "Creando archivo .env..." -ForegroundColor Yellow
    @"
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
BACKEND_PORT=8001
FRONTEND_PORT=3001
DEFAULT_VOICE=nova
DEFAULT_MODEL=gpt-4o-mini
DEFAULT_LANGUAGE=es
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "IMPORTANTE: Configura tu OPENAI_API_KEY en .env" -ForegroundColor Red
}

# Verificar dependencias
Write-Host "Verificando dependencias..." -ForegroundColor Cyan

# Backend
if (-not (Test-Path "backend/venv")) {
    Write-Host "Creando entorno virtual..." -ForegroundColor Yellow
    cd backend
    python -m venv venv
    cd ..
}

if (-not (Test-Path "backend/venv/Scripts/python.exe")) {
    Write-Host "Error: Entorno virtual no creado correctamente" -ForegroundColor Red
    exit 1
}

# Frontend
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "Instalando dependencias frontend..." -ForegroundColor Yellow
    cd frontend
    npm install
    cd ..
}

# Instalar dependencias backend
Write-Host "Instalando dependencias backend..." -ForegroundColor Yellow
cd backend
& "venv/Scripts/Activate.ps1"
pip install -r requirements.txt --quiet
deactivate
cd ..

# Iniciar backend
Write-Host "Iniciando backend..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    Set-Location $args[0]
    cd backend
    & "venv/Scripts/Activate.ps1"
    python run.py
} -ArgumentList $PWD

# Esperar backend
Start-Sleep -Seconds 5

# Iniciar frontend
Write-Host "Iniciando frontend..." -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $args[0]
    cd frontend
    npm run dev
} -ArgumentList $PWD

# Esperar frontend
Start-Sleep -Seconds 8

Write-Host "Sistema iniciado!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8001" -ForegroundColor Cyan

# Abrir navegador
Start-Process "http://localhost:3001"

Write-Host "Para detener: .\stop_simple.ps1" -ForegroundColor Yellow
Write-Host "Jobs creados - Backend: $($backendJob.Id), Frontend: $($frontendJob.Id)" -ForegroundColor Gray

# Guardar job IDs
"$($backendJob.Id),$($frontendJob.Id)" | Out-File -FilePath ".jobs" -Encoding UTF8
