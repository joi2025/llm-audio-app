# Script para configurar el entorno de desarrollo local
Write-Host "=== Configuración del Entorno de Desarrollo Local ===" -ForegroundColor Cyan

# Función para verificar si un comando existe
function Test-CommandExists {
    param($command)
    $exists = $null -ne (Get-Command $command -ErrorAction SilentlyContinue)
    return $exists
}

# Verificar requisitos previos
Write-Host "`nVerificando requisitos previos..." -ForegroundColor Yellow

# Verificar Python
if (-not (Test-CommandExists "python")) {
    Write-Host "Python no está instalado. Por favor instala Python 3.10 o superior." -ForegroundColor Red
    exit 1
}

# Verificar Node.js
if (-not (Test-CommandExists "node")) {
    Write-Host "Node.js no está instalado. Por favor instala Node.js 18 o superior." -ForegroundColor Red
    exit 1
}

# Verificar npm
if (-not (Test-CommandExists "npm")) {
    Write-Host "npm no está instalado. Por favor instala Node.js que incluye npm." -ForegroundColor Red
    exit 1
}

# Mostrar versiones
Write-Host "`n=== Versiones instaladas ===" -ForegroundColor Green
Write-Host "Python: $(python --version 2>&1 | Out-String)"
Write-Host "Node.js: $(node --version)"
Write-Host "npm: $(npm --version)"

# Configuración del Backend
Write-Host "`n=== Configurando Backend ===" -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\backend"

# Crear y activar entorno virtual
if (-not (Test-Path -Path ".\venv")) {
    Write-Host "Creando entorno virtual..."
    python -m venv venv
}

Write-Host "Activando entorno virtual..."
.\venv\Scripts\Activate.ps1

# Instalar dependencias
Write-Host "Instalando dependencias de Python..."
pip install --upgrade pip
pip install -r requirements.txt

# Configurar variables de entorno
if (-not (Test-Path -Path ".\.env")) {
    Write-Host "Creando archivo .env..."
    if (Test-Path -Path ".\.env.example") {
        Copy-Item -Path ".\.env.example" -Destination ".\.env"
        Write-Host "Por favor, configura las variables en el archivo .env" -ForegroundColor Yellow
        notepad .\.env
    } else {
        Write-Host "No se encontró el archivo .env.example" -ForegroundColor Red
        exit 1
    }
}

# Iniciar el servidor de desarrollo del backend en segundo plano
Write-Host "Iniciando servidor backend..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    Set-Location -Path $using:PSScriptRoot\backend
    .\venv\Scripts\Activate.ps1
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
}

# Configuración del Frontend
Write-Host "`n=== Configurando Frontend ===" -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\frontend"

# Instalar dependencias
Write-Host "Instalando dependencias de Node.js..."
npm install

# Configurar variables de entorno
if (-not (Test-Path -Path ".\.env")) {
    Write-Host "Creando archivo .env..."
    @"
VITE_API_URL=http://localhost:8001/api/v1
VITE_WEBSOCKET_URL=ws://localhost:8001/ws/assistant
"@ | Out-File -FilePath ".\.env" -Encoding UTF8
}

# Iniciar el servidor de desarrollo del frontend en segundo plano
Write-Host "Iniciando servidor frontend..." -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    Set-Location -Path $using:PSScriptRoot\frontend
    npm run dev -- --host 0.0.0.0 --port 3002
}

# Mostrar información
Write-Host "`n=== Servicios en ejecución ===" -ForegroundColor Green
Write-Host "Backend:   http://localhost:8001" -ForegroundColor Cyan
Write-Host "API Docs:  http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host "Frontend:  http://localhost:3002" -ForegroundColor Cyan

Write-Host "`nPresiona Ctrl+C para detener los servidores" -ForegroundColor Yellow

# Mantener el script en ejecución
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    # Limpieza al salir
    Write-Host "`nDeteniendo servidores..." -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    Write-Host "Servidores detenidos." -ForegroundColor Green
}
