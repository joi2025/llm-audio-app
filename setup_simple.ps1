# LLM Audio App - Setup Script Simple
# Version funcional sin caracteres especiales

Write-Host "Configurando LLM Audio App..." -ForegroundColor Green

# Verificar Node.js
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Node.js detectado: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Node.js no encontrado. Instala desde https://nodejs.org" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: Node.js no encontrado. Instala desde https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Verificar Python
try {
    $pythonVersion = python --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Python detectado: $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Python no encontrado. Instala desde https://python.org" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: Python no encontrado. Instala desde https://python.org" -ForegroundColor Red
    exit 1
}

# Crear entorno virtual backend
Write-Host "Configurando backend..." -ForegroundColor Cyan
if (-not (Test-Path "backend/venv")) {
    cd backend
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: No se pudo crear entorno virtual" -ForegroundColor Red
        exit 1
    }
    cd ..
    Write-Host "Entorno virtual creado" -ForegroundColor Green
}

# Instalar dependencias backend
cd backend
& "venv/Scripts/Activate.ps1"
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: No se pudieron instalar dependencias del backend" -ForegroundColor Red
    exit 1
}
deactivate
cd ..
Write-Host "Dependencias backend instaladas" -ForegroundColor Green

# Instalar dependencias frontend
Write-Host "Configurando frontend..." -ForegroundColor Cyan
cd frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: No se pudieron instalar dependencias del frontend" -ForegroundColor Red
    exit 1
}
cd ..
Write-Host "Dependencias frontend instaladas" -ForegroundColor Green

# Crear .env
if (-not (Test-Path ".env")) {
    Write-Host "Creando archivo .env..." -ForegroundColor Yellow
    @"
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1

# Server Configuration
BACKEND_PORT=8001
FRONTEND_PORT=3001

# Optimizations for Spanish
DEFAULT_VOICE=nova
DEFAULT_MODEL=gpt-4o-mini
DEFAULT_LANGUAGE=es
DEFAULT_TEMPERATURE=0.6
DEFAULT_MAX_TOKENS=120

# Features
PERSONALITIES_ENABLED=true
AUTO_VOICE_ENABLED=true
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "Archivo .env creado" -ForegroundColor Green
}

Write-Host "" -ForegroundColor White
Write-Host "SETUP COMPLETADO!" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "IMPORTANTE: Configura tu OPENAI_API_KEY en el archivo .env" -ForegroundColor Red
Write-Host "" -ForegroundColor White
Write-Host "Para iniciar: .\start_simple.ps1" -ForegroundColor Cyan
Write-Host "Para detener: .\stop_simple.ps1" -ForegroundColor Cyan
