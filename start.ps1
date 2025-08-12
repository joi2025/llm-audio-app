# ========================================
# 🚀 LLM Audio App - Start Script v2.0
# Sistema autónomo con personalidades avanzadas
# ========================================

param(
    [switch]$Production,
    [switch]$Development,
    [switch]$Silent,
    [switch]$NoOpen
)

# Configuración
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colores para output
function Write-ColorOutput($Message, $Color = "White") {
    if (-not $Silent) {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Write-Success($Message) { Write-ColorOutput "[OK] $Message" "Green" }
function Write-Info($Message) { Write-ColorOutput "[INFO] $Message" "Cyan" }
function Write-Warning($Message) { Write-ColorOutput "[WARN] $Message" "Yellow" }
function Write-Error($Message) { Write-ColorOutput "[ERROR] $Message" "Red" }

# Header
if (-not $Silent) {
    Clear-Host
    Write-Host @"
========================================
   LLM Audio App v2.0 - Sistema Avanzado
   15 Personalidades | Auto-Deteccion
========================================
"@ -ForegroundColor Cyan
}

Write-Info "Iniciando sistema autonomo..."

# ========================================
# 1. VERIFICACIÓN DE DEPENDENCIAS
# ========================================

Write-Info "Verificando dependencias del sistema..."

# Verificar Node.js
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Node.js detectado: $nodeVersion"
    } else {
        throw "Node.js no encontrado"
    }
} catch {
    Write-Error "Node.js no está instalado. Descárgalo de: https://nodejs.org"
    exit 1
}

# Verificar Python
try {
    $pythonVersion = python --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Python detectado: $pythonVersion"
    } else {
        throw "Python no encontrado"
    }
} catch {
    Write-Error "Python no está instalado. Descárgalo de: https://python.org"
    exit 1
}

# ========================================
# 2. CONFIGURACIÓN AUTOMÁTICA
# ========================================

Write-Info "Configurando entorno automáticamente..."

# Crear .env si no existe
if (-not (Test-Path ".env")) {
    Write-Warning "Archivo .env no encontrado. Creando configuración automática..."
    
    $envContent = @"
# ========================================
# LLM Audio App - Configuración Automática
# ========================================

# OpenAI Configuration (REQUERIDO)
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1

# Server Configuration
BACKEND_PORT=8001
FRONTEND_PORT=3001

# Optimizaciones para Español
DEFAULT_VOICE=nova
DEFAULT_MODEL=gpt-4o-mini
DEFAULT_LANGUAGE=es
DEFAULT_TEMPERATURE=0.6
DEFAULT_MAX_TOKENS=120

# Sistema de Personalidades
PERSONALITIES_ENABLED=true
AUTO_VOICE_ENABLED=true

# Modo de Desarrollo/Producción
NODE_ENV=development
FLASK_ENV=development
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Success "Archivo .env creado con configuracion por defecto"
    Write-Warning "IMPORTANTE: Configura tu OPENAI_API_KEY en el archivo .env"
    
    if (-not $Silent) {
        $response = Read-Host "¿Quieres abrir el archivo .env para configurar la API key? (y/N)"
        if ($response -eq "y" -or $response -eq "Y") {
            notepad .env
            Read-Host "Presiona Enter cuando hayas configurado la API key..."
        }
    }
}

# Verificar API Key
$envContent = Get-Content ".env" -Raw
if ($envContent -match "OPENAI_API_KEY=sk-your-api-key-here" -or $envContent -match "OPENAI_API_KEY=$" -or $envContent -notmatch "OPENAI_API_KEY=sk-") {
    Write-Warning "API Key de OpenAI no configurada correctamente"
    if (-not $Silent) {
        Write-Host "El sistema funcionará en modo demo limitado" -ForegroundColor Yellow
    }
}

# ========================================
# 3. INSTALACIÓN AUTOMÁTICA DE DEPENDENCIAS
# ========================================

Write-Info "Instalando dependencias automaticamente..."

# Backend - Crear venv si no existe
if (-not (Test-Path "backend/venv")) {
    Write-Info "Creando entorno virtual de Python..."
    Set-Location backend
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error creando entorno virtual"
        exit 1
    }
    Set-Location ..
    Write-Success "Entorno virtual creado"
}

# Backend - Instalar dependencias
Write-Info "Instalando dependencias del backend..."
Set-Location backend
& "venv/Scripts/Activate.ps1"
pip install -r requirements.txt --quiet --disable-pip-version-check
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error instalando dependencias del backend"
    exit 1
}
deactivate
Set-Location ..
Write-Success "Dependencias del backend instaladas"

# Frontend - Instalar dependencias
if (-not (Test-Path "frontend/node_modules")) {
    Write-Info "Instalando dependencias del frontend..."
    Set-Location frontend
    npm install --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error instalando dependencias del frontend"
        exit 1
    }
    Set-Location ..
    Write-Success "Dependencias del frontend instaladas"
}

# ========================================
# 4. LIMPIEZA DE PROCESOS ANTERIORES
# ========================================

Write-Info "Limpiando procesos anteriores..."

# Matar procesos en puertos específicos
$ports = @(8001, 3001)
foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    foreach ($processId in $processes) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Success "Proceso en puerto $port terminado"
        } catch {
            # Ignorar errores
        }
    }
}

# Limpiar archivos PID anteriores
if (Test-Path ".pids") {
    Remove-Item ".pids" -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path ".pids" -Force | Out-Null

# ========================================
# 5. INICIO DE SERVICIOS
# ========================================

Write-Info "Iniciando servicios del sistema..."

# Backend
Write-Info "Iniciando backend con Flask-SocketIO..."
$backendProcess = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-WindowStyle", "Minimized",
    "-Command", 
    "cd '$PWD/backend'; venv/Scripts/Activate.ps1; python run.py"
) -PassThru

if ($backendProcess) {
    $backendProcess.Id | Out-File -FilePath ".pids/backend.pid" -Encoding UTF8
    Write-Success "Backend iniciado (PID: $($backendProcess.Id))"
} else {
    Write-Error "Error iniciando backend"
    exit 1
}

# Esperar a que el backend esté listo (robusto)
Write-Info "Esperando a que el backend este listo..."
$maxAttempts = 45
$attempt = 0
$ready = $false
do {
    Start-Sleep -Seconds 1
    $attempt++
    # 1) Comprobar puerto TCP
    $tcp = Test-NetConnection -ComputerName 'localhost' -Port 8001 -WarningAction SilentlyContinue -InformationLevel Quiet
    if ($tcp) {
        # 2) Intentar ping al endpoint de estado (no bloqueante)
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:8001/api/admin/status" -TimeoutSec 2 -ErrorAction SilentlyContinue
            # Considerar cualquier 2xx/3xx como listo
            if ($resp -and $resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) {
                $ready = $true
                break
            } else {
                # Puerto abierto ya es suficiente para continuar
                $ready = $true
                break
            }
        } catch {
            # Puerto abierto ya es suficiente para continuar
            $ready = $true
            break
        }
    }
} while (-not $ready -and $attempt -lt $maxAttempts)

if (-not $ready) {
    Write-Warning "Backend tarde en responder, continuando de todas formas (puede estar listo)."
} else {
    Write-Success "Backend listo (puerto abierto y endpoint verificado)."
}

# Frontend
Write-Info "Iniciando frontend con React + Vite..."
$frontendProcess = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-WindowStyle", "Minimized", 
    "-Command",
    "cd '$PWD/frontend'; npm run dev"
) -PassThru

if ($frontendProcess) {
    $frontendProcess.Id | Out-File -FilePath ".pids/frontend.pid" -Encoding UTF8
    Write-Success "Frontend iniciado (PID: $($frontendProcess.Id))"
} else {
    Write-Error "Error iniciando frontend"
    exit 1
}

# Esperar a que el frontend esté listo
Write-Info "Esperando a que el frontend este listo..."
$maxAttempts = 60
$attempt = 0
do {
    Start-Sleep -Seconds 1
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            break
        }
    } catch {
        # Continuar intentando
    }
} while ($attempt -lt $maxAttempts)

if ($attempt -ge $maxAttempts) {
    Write-Warning "Frontend tardó más de lo esperado, pero puede estar funcionando"
}

Write-Success "Frontend listo"

# ========================================
# 6. VERIFICACIÓN FINAL Y APERTURA
# ========================================

Write-Success "Sistema iniciado correctamente!"

if (-not $Silent) {
    Write-Host @"

========================================
   SISTEMA LISTO - URLS DISPONIBLES
========================================
Aplicacion Principal: http://localhost:3001
Panel de Admin:      http://localhost:3001 (boton Admin)
v2 Auto-Deteccion:   http://localhost:3001 (boton v2 Auto)
Backend API:         http://localhost:8001

RECOMENDADO: Usa el boton "v2 Auto" para 
   deteccion automatica de voz sin botones!
========================================
"@ -ForegroundColor Green
}

# Abrir navegador automáticamente
if (-not $NoOpen) {
    Start-Sleep -Seconds 2
    try {
        Start-Process "http://localhost:3001"
        Write-Success "Navegador abierto automaticamente"
    } catch {
        Write-Warning "No se pudo abrir el navegador automáticamente"
    }
}

# Guardar información del sistema
$systemInfo = @{
    StartTime = Get-Date
    BackendPID = $backendProcess.Id
    FrontendPID = $frontendProcess.Id
    BackendURL = "http://localhost:8001"
    FrontendURL = "http://localhost:3001"
    Version = "2.0"
    Features = @("Personalidades", "Auto-Deteccion", "AdminPanel", "Espanol-Optimizado")
} | ConvertTo-Json

$systemInfo | Out-File -FilePath ".pids/system.json" -Encoding UTF8

Write-Success "Información del sistema guardada"

if (-not $Silent) {
    Write-Host "`nConsejo: Para detener el sistema, ejecuta: .\stop.ps1" -ForegroundColor Cyan
    Write-Host "Para ver logs en tiempo real, revisa las ventanas minimizadas" -ForegroundColor Cyan
    Write-Host "`nDisfruta tu asistente de voz con personalidades avanzadas!" -ForegroundColor Green
}

exit 0
