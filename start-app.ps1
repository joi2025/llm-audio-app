# Script para iniciar la aplicación completa
Write-Host "Iniciando la aplicación de asistente de voz..." -ForegroundColor Cyan

# Función para verificar si un comando existe
function Test-CommandExists {
    param ($command)
    $exists = $null -ne (Get-Command $command -ErrorAction SilentlyContinue)
    return $exists
}

# Verificar si Python está instalado
if (-not (Test-CommandExists "python")) {
    Write-Host "Error: Python no está instalado o no está en el PATH" -ForegroundColor Red
    exit 1
}

# Verificar si Node.js está instalado
if (-not (Test-CommandExists "node")) {
    Write-Host "Error: Node.js no está instalado o no está en el PATH" -ForegroundColor Red
    exit 1
}

# Verificar si npm está instalado
if (-not (Test-CommandExists "npm")) {
    Write-Host "Error: npm no está instalado o no está en el PATH" -ForegroundColor Red
    exit 1
}

# Ruta al directorio del proyecto
$backendPath = "$PSScriptRoot\backend"
$frontendPath = "$PSScriptRoot\frontend"

# Verificar que existan los directorios
if (-not (Test-Path $backendPath)) {
    Write-Host "Error: No se encontró el directorio del backend" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Host "Error: No se encontró el directorio del frontend" -ForegroundColor Red
    exit 1
}

# Función para iniciar el backend
function Start-Backend {
    param (
        [string]$path
    )
    
    Write-Host "Iniciando el backend..." -ForegroundColor Yellow
    
    # Verificar si el entorno virtual existe
    $venvPath = "$path\venv"
    if (-not (Test-Path $venvPath)) {
        Write-Host "Creando entorno virtual..." -ForegroundColor Yellow
        python -m venv $venvPath
    }
    
    # Activar el entorno virtual e instalar dependencias
    $activateScript = "$venvPath\Scripts\Activate.ps1"
    if (Test-Path $activateScript) {
        & $activateScript
        pip install -r "$path\requirements.txt"
        pip install pydantic-settings python-multipart openai
    } else {
        Write-Host "Error: No se pudo encontrar el script de activación del entorno virtual" -ForegroundColor Red
        exit 1
    }
    
    # Iniciar el servidor en segundo plano
    $scriptBlock = {
        param($path)
        Set-Location $path
        python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001
    }
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {$scriptBlock -f $path}" -WorkingDirectory $path
}

# Función para iniciar el frontend
function Start-Frontend {
    param (
        [string]$path
    )
    
    Write-Host "Iniciando el frontend..." -ForegroundColor Yellow
    
    # Verificar si node_modules existe
    $nodeModulesPath = "$path\node_modules"
    if (-not (Test-Path $nodeModulesPath)) {
        Write-Host "Instalando dependencias de Node.js..." -ForegroundColor Yellow
        Set-Location $path
        npm install
    }
    
    # Iniciar el servidor de desarrollo en segundo plano
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WorkingDirectory $path
}

# Iniciar el backend
Start-Backend -path $backendPath

# Esperar un momento para que el backend se inicie
Start-Sleep -Seconds 5

# Iniciar el frontend
Start-Frontend -path $frontendPath

# Esperar un momento para que el frontend se inicie
Start-Sleep -Seconds 5

# Abrir el navegador
$frontendUrl = "http://localhost:3000"
Write-Host "Abriendo $frontendUrl en el navegador..." -ForegroundColor Green
Start-Process $frontendUrl

Write-Host "¡Aplicación iniciada correctamente!" -ForegroundColor Green
Write-Host "Backend: http://localhost:8001" -ForegroundColor Cyan
Write-Host "Frontend: $frontendUrl" -ForegroundColor Cyan
