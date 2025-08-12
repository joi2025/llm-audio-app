# LLM Audio App - Ultra Simple Runner
# Solo funciona, sin complicaciones

param([switch]$Setup)

if ($Setup) {
    Write-Host "=== SETUP ===" -ForegroundColor Green
    
    # Verificar Node.js
    node --version
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Instala Node.js desde https://nodejs.org" -ForegroundColor Red
        exit 1
    }
    
    # Verificar Python
    python --version
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Instala Python desde https://python.org" -ForegroundColor Red
        exit 1
    }
    
    # Backend setup
    if (-not (Test-Path "backend/venv")) {
        Write-Host "Creando entorno virtual..." -ForegroundColor Yellow
        cd backend
        python -m venv venv
        cd ..
    }
    
    Write-Host "Instalando backend..." -ForegroundColor Yellow
    cd backend
    & "venv/Scripts/Activate.ps1"
    pip install -r requirements.txt --quiet
    deactivate
    cd ..
    
    # Frontend setup
    Write-Host "Instalando frontend..." -ForegroundColor Yellow
    cd frontend
    npm install --silent
    cd ..
    
    # Crear .env
    if (-not (Test-Path ".env")) {
        @"
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
BACKEND_PORT=8001
FRONTEND_PORT=3001
DEFAULT_VOICE=nova
DEFAULT_MODEL=gpt-4o-mini
"@ | Out-File -FilePath ".env" -Encoding UTF8
    }
    
    Write-Host "Setup completo! Configura tu API key en .env" -ForegroundColor Green
    Write-Host "Luego ejecuta: .\run.ps1" -ForegroundColor Cyan
    exit 0
}

Write-Host "=== INICIANDO APP ===" -ForegroundColor Green

# Limpiar procesos
Get-Process -Name "python","node" -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -like "*llm-audio*" -or 
    $_.ProcessName -eq "python" -or 
    $_.ProcessName -eq "node"
} | Stop-Process -Force -ErrorAction SilentlyContinue

# Iniciar backend
Write-Host "Iniciando backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/backend'; venv/Scripts/Activate.ps1; python run.py" -WindowStyle Minimized

# Esperar
Start-Sleep 3

# Iniciar frontend  
Write-Host "Iniciando frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/frontend'; npm run dev" -WindowStyle Minimized

# Esperar
Start-Sleep 5

Write-Host "App iniciada!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3001" -ForegroundColor Yellow
Write-Host "Backend: http://localhost:8001" -ForegroundColor Yellow

# Abrir navegador
Start-Process "http://localhost:3001"

Write-Host "Presiona Ctrl+C para detener o cierra las ventanas de PowerShell" -ForegroundColor Gray
