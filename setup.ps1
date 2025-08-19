# ========================================
# 🔧 LLM Audio App - Setup Automático v2.0
# Configuración completa del sistema
# ========================================

param(
    [switch]$SkipDependencies,
    [switch]$Silent,
    [switch]$Development
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

function Write-Success($Message) { Write-ColorOutput "✅ $Message" "Green" }
function Write-Info($Message) { Write-ColorOutput "ℹ️  $Message" "Cyan" }
function Write-Warning($Message) { Write-ColorOutput "⚠️  $Message" "Yellow" }
function Write-Error($Message) { Write-ColorOutput "❌ $Message" "Red" }

# Header
if (-not $Silent) {
    Clear-Host
    Write-Host @"
🔧 ========================================
   LLM Audio App v2.0 - Setup Automático
   🎭 Sistema de Personalidades Avanzado
========================================
"@ -ForegroundColor Cyan
}

Write-Info "Iniciando configuración automática del sistema..."

# ========================================
# 1. VERIFICACIÓN DE REQUISITOS DEL SISTEMA
# ========================================

Write-Info "Verificando requisitos del sistema..."

# Verificar PowerShell
$psVersion = $PSVersionTable.PSVersion
if ($psVersion.Major -lt 5) {
    Write-Error "PowerShell 5.0+ requerido. Versión actual: $psVersion"
    exit 1
}
Write-Success "PowerShell $psVersion detectado"

# Verificar permisos de ejecución
try {
    $executionPolicy = Get-ExecutionPolicy
    if ($executionPolicy -eq "Restricted") {
        Write-Warning "Política de ejecución restrictiva detectada"
        Write-Info "Intentando cambiar política de ejecución..."
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
        Write-Success "Política de ejecución actualizada"
    }
} catch {
    Write-Warning "No se pudo cambiar la política de ejecución automáticamente"
}

# ========================================
# 2. INSTALACIÓN DE DEPENDENCIAS
# ========================================

if (-not $SkipDependencies) {
    Write-Info "Verificando e instalando dependencias..."
    
    # Verificar/Instalar Node.js
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Node.js ya instalado: $nodeVersion"
        } else {
            throw "Node.js no encontrado"
        }
    } catch {
        Write-Warning "Node.js no encontrado. Intentando instalación automática..."
        
        # Verificar si Chocolatey está disponible
        try {
            choco --version 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Info "Instalando Node.js via Chocolatey..."
                choco install nodejs -y
                Write-Success "Node.js instalado via Chocolatey"
            } else {
                throw "Chocolatey no disponible"
            }
        } catch {
            Write-Error @"
Node.js no está instalado y no se pudo instalar automáticamente.
Por favor:
1. Descarga Node.js desde: https://nodejs.org
2. Instala la versión LTS
3. Reinicia PowerShell
4. Ejecuta este script nuevamente
"@
            exit 1
        }
    }
    
    # Verificar/Instalar Python
    try {
        $pythonVersion = python --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Python ya instalado: $pythonVersion"
        } else {
            throw "Python no encontrado"
        }
    } catch {
        Write-Warning "Python no encontrado. Intentando instalación automática..."
        
        try {
            choco --version 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Info "Instalando Python via Chocolatey..."
                choco install python -y
                Write-Success "Python instalado via Chocolatey"
                
                # Refrescar PATH
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            } else {
                throw "Chocolatey no disponible"
            }
        } catch {
            Write-Error @"
Python no está instalado y no se pudo instalar automáticamente.
Por favor:
1. Descarga Python desde: https://python.org
2. Instala la versión 3.8+
3. Asegúrate de marcar "Add Python to PATH"
4. Reinicia PowerShell
5. Ejecuta este script nuevamente
"@
            exit 1
        }
    }
}

# ========================================
# 3. CONFIGURACIÓN DEL PROYECTO
# ========================================

Write-Info "Configurando estructura del proyecto..."

# Crear directorios necesarios
$directories = @(
    "backend/logs",
    "frontend/logs", 
    ".pids",
    "docs",
    "backups"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Success "Directorio creado: $dir"
    }
}

# ========================================
# 4. CONFIGURACIÓN DEL BACKEND
# ========================================

Write-Info "Configurando backend Python..."

# Crear entorno virtual
if (-not (Test-Path "backend/venv")) {
    Write-Info "Creando entorno virtual Python..."
    Set-Location backend
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error creando entorno virtual Python"
        exit 1
    }
    Set-Location ..
    Write-Success "Entorno virtual Python creado"
}

# Instalar dependencias del backend
Write-Info "Instalando dependencias del backend..."
Set-Location backend
& "venv/Scripts/Activate.ps1"

# Actualizar pip
python -m pip install --upgrade pip --quiet

# Instalar dependencias
if (Test-Path "requirements.txt") {
    pip install -r requirements.txt --quiet --disable-pip-version-check
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error instalando dependencias del backend"
        exit 1
    }
    Write-Success "Dependencias del backend instaladas"
} else {
    Write-Warning "requirements.txt no encontrado en backend"
}

deactivate
Set-Location ..

# ========================================
# 5. CONFIGURACIÓN DEL FRONTEND
# ========================================

Write-Info "Configurando frontend React..."

Set-Location frontend

# Verificar package.json
if (-not (Test-Path "package.json")) {
    Write-Error "package.json no encontrado en frontend"
    exit 1
}

# Limpiar caché si existe
if (Test-Path "node_modules") {
    Write-Info "Limpiando instalación anterior..."
    Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item "package-lock.json" -Force -ErrorAction SilentlyContinue
}

# Instalar dependencias
Write-Info "Instalando dependencias del frontend..."
npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error instalando dependencias del frontend"
    exit 1
}

Write-Success "Dependencias del frontend instaladas"
Set-Location ..

# ========================================
# 6. CONFIGURACIÓN DE VARIABLES DE ENTORNO
# ========================================

Write-Info "Configurando variables de entorno..."

if (-not (Test-Path ".env")) {
    Write-Info "Creando archivo de configuración .env..."
    
    $envContent = @"
# ========================================
# LLM Audio App v2.0 - Configuración
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

# Configuración de Desarrollo
NODE_ENV=development
FLASK_ENV=development
DEBUG=true

# Configuración de Logs
LOG_LEVEL=INFO
LOG_TO_FILE=true

# Configuración de Audio
AUDIO_SAMPLE_RATE=16000
AUDIO_CHUNK_SIZE=1024
VAD_THRESHOLD=0.5

# Configuración de Seguridad
CORS_ORIGINS=http://localhost:3001
MAX_CONTENT_LENGTH=16777216
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Success "Archivo .env creado con configuración completa"
} else {
    Write-Success "Archivo .env ya existe"
}

# ========================================
# 7. CONFIGURACIÓN DE SCRIPTS
# ========================================

Write-Info "Configurando scripts de ejecución..."

# Hacer scripts ejecutables (ya están creados)
$scripts = @("start.ps1", "stop.ps1", "setup.ps1")
foreach ($script in $scripts) {
    if (Test-Path $script) {
        Write-Success "Script disponible: $script"
    }
}

# ========================================
# 8. VERIFICACIÓN FINAL
# ========================================

Write-Info "Realizando verificación final del sistema..."

$issues = @()

# Verificar estructura de archivos críticos
$criticalFiles = @(
    "backend/run.py",
    "backend/requirements.txt",
    "frontend/package.json",
    "frontend/src/App.jsx",
    ".env"
)

foreach ($file in $criticalFiles) {
    if (-not (Test-Path $file)) {
        $issues += "Archivo crítico faltante: $file"
    }
}

# Verificar dependencias instaladas
try {
    Set-Location backend
    & "venv/Scripts/Activate.ps1"
    $pipList = pip list --quiet 2>$null
    if ($pipList -notmatch "flask") {
        $issues += "Flask no instalado en backend"
    }
    deactivate
    Set-Location ..
} catch {
    $issues += "Error verificando dependencias del backend"
}

try {
    Set-Location frontend
    if (-not (Test-Path "node_modules/react")) {
        $issues += "React no instalado en frontend"
    }
    Set-Location ..
} catch {
    $issues += "Error verificando dependencias del frontend"
}

# ========================================
# 9. REPORTE FINAL
# ========================================

if (-not $Silent) {
    Write-Host @"

🔧 ========================================
   SETUP COMPLETO - REPORTE FINAL
========================================
"@ -ForegroundColor Green

    if ($issues.Count -eq 0) {
        Write-Host "✅ CONFIGURACIÓN EXITOSA" -ForegroundColor Green
        Write-Host @"

🎉 EL SISTEMA ESTÁ LISTO PARA USAR!

🚀 COMANDOS DISPONIBLES:
   .\start.ps1          - Iniciar sistema completo
   .\start.ps1 -Silent  - Iniciar sin output detallado  
   .\stop.ps1           - Detener sistema
   .\stop.ps1 -Force    - Detención forzada

🎭 CARACTERÍSTICAS INSTALADAS:
   ✅ Sistema de 15 personalidades avanzadas
   ✅ Detección automática de voz (sin botones)
   ✅ Panel de administración renovado
   ✅ Optimizaciones para español
   ✅ Interfaz moderna con React + Vite
   ✅ Backend Flask-SocketIO estable

⚠️  IMPORTANTE: 
   Configura tu OPENAI_API_KEY en el archivo .env
   antes de iniciar el sistema.

🎯 PRÓXIMO PASO:
   1. Edita .env y añade tu API key de OpenAI
   2. Ejecuta: .\start.ps1
   3. Abre http://localhost:3001
   4. ¡Disfruta tu asistente de voz!
"@ -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  CONFIGURACIÓN CON PROBLEMAS" -ForegroundColor Yellow
        Write-Host "`nProblemas encontrados:" -ForegroundColor Red
        foreach ($issue in $issues) {
            Write-Host "   • $issue" -ForegroundColor Red
        }
        Write-Host "`n💡 Revisa los problemas y ejecuta el setup nuevamente" -ForegroundColor Cyan
    }
    
    Write-Host "`n========================================" -ForegroundColor Green
}

# Código de salida
if ($issues.Count -eq 0) {
    Write-Success "Setup completado exitosamente"
    exit 0
} else {
    Write-Error "Setup completado con $($issues.Count) problema(s)"
    exit 1
}
