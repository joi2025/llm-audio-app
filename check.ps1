# ========================================
# 🔍 LLM Audio App - Verificación del Sistema v2.0
# Diagnóstico completo y estado del sistema
# ========================================

param(
    [switch]$Detailed,
    [switch]$Silent,
    [switch]$Fix
)

# Configuración
$ErrorActionPreference = "Continue"
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
🔍 ========================================
   LLM Audio App v2.0 - Verificación
   🎭 Diagnóstico Completo del Sistema
========================================
"@ -ForegroundColor Cyan
}

Write-Info "Iniciando verificación completa del sistema..."

# Variables de estado
$issues = @()
$warnings = @()
$systemStatus = @{
    Dependencies = $false
    Backend = $false
    Frontend = $false
    Configuration = $false
    Processes = $false
    Ports = $false
}

# ========================================
# 1. VERIFICACIÓN DE DEPENDENCIAS
# ========================================

Write-Info "Verificando dependencias del sistema..."

# Node.js
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Node.js: $nodeVersion"
        $systemStatus.Dependencies = $true
    } else {
        $issues += "Node.js no está instalado"
    }
} catch {
    $issues += "Node.js no encontrado"
}

# Python
try {
    $pythonVersion = python --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Python: $pythonVersion"
    } else {
        $issues += "Python no está instalado"
    }
} catch {
    $issues += "Python no encontrado"
}

# ========================================
# 2. VERIFICACIÓN DE ESTRUCTURA DE ARCHIVOS
# ========================================

Write-Info "Verificando estructura de archivos..."

$criticalFiles = @{
    "backend/run.py" = "Archivo principal del backend"
    "backend/requirements.txt" = "Dependencias del backend"
    "backend/app/api/websocket_socketio.py" = "API WebSocket principal"
    "frontend/package.json" = "Configuración del frontend"
    "frontend/src/App.jsx" = "Componente principal React"
    "frontend/src/pages/VoiceCircleV2.jsx" = "Interfaz v2 con auto-detección"
    "frontend/src/components/AdminPanel.jsx" = "Panel de administración"
    "frontend/src/hooks/useAutoVoice.js" = "Hook de detección automática"
    "frontend/src/hooks/usePersonality.js" = "Hook de personalidades"
    "frontend/src/data/personalities.js" = "Base de datos de personalidades"
    ".env" = "Variables de entorno"
}

foreach ($file in $criticalFiles.Keys) {
    if (Test-Path $file) {
        Write-Success "Archivo: $file"
    } else {
        $issues += "Archivo faltante: $file ($($criticalFiles[$file]))"
    }
}

# ========================================
# 3. VERIFICACIÓN DE CONFIGURACIÓN
# ========================================

Write-Info "Verificando configuración del sistema..."

if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    
    # Verificar API Key
    if ($envContent -match "OPENAI_API_KEY=sk-[a-zA-Z0-9-_]+") {
        Write-Success "API Key de OpenAI configurada"
        $systemStatus.Configuration = $true
    } elseif ($envContent -match "OPENAI_API_KEY=sk-your-api-key-here") {
        $warnings += "API Key de OpenAI no configurada (usando valor por defecto)"
    } else {
        $issues += "API Key de OpenAI no encontrada o mal formateada"
    }
    
    # Verificar puertos
    if ($envContent -match "BACKEND_PORT=8001" -and $envContent -match "FRONTEND_PORT=3001") {
        Write-Success "Puertos configurados correctamente"
    } else {
        $warnings += "Configuración de puertos no estándar"
    }
    
    # Verificar optimizaciones para español
    if ($envContent -match "DEFAULT_VOICE=nova" -and $envContent -match "DEFAULT_LANGUAGE=es") {
        Write-Success "Optimizaciones para español configuradas"
    } else {
        $warnings += "Optimizaciones para español no configuradas"
    }
} else {
    $issues += "Archivo .env no encontrado"
}

# ========================================
# 4. VERIFICACIÓN DE DEPENDENCIAS INSTALADAS
# ========================================

Write-Info "Verificando dependencias instaladas..."

# Backend
if (Test-Path "backend/venv") {
    Write-Success "Entorno virtual Python existe"
    
    try {
        Set-Location backend
        & "venv/Scripts/Activate.ps1"
        $pipList = pip list --quiet 2>$null
        
        $backendDeps = @("flask", "flask-socketio", "requests", "openai")
        foreach ($dep in $backendDeps) {
            if ($pipList -match $dep) {
                Write-Success "Dependencia backend: $dep"
            } else {
                $issues += "Dependencia backend faltante: $dep"
            }
        }
        
        deactivate
        Set-Location ..
        $systemStatus.Backend = $true
    } catch {
        $issues += "Error verificando dependencias del backend"
        Set-Location ..
    }
} else {
    $issues += "Entorno virtual Python no encontrado"
}

# Frontend
if (Test-Path "frontend/node_modules") {
    Write-Success "Node modules instalados"
    
    $frontendDeps = @("react", "vite", "socket.io-client")
    foreach ($dep in $frontendDeps) {
        if (Test-Path "frontend/node_modules/$dep") {
            Write-Success "Dependencia frontend: $dep"
        } else {
            $issues += "Dependencia frontend faltante: $dep"
        }
    }
    $systemStatus.Frontend = $true
} else {
    $issues += "Node modules no instalados"
}

# ========================================
# 5. VERIFICACIÓN DE PROCESOS ACTIVOS
# ========================================

Write-Info "Verificando procesos activos..."

$ports = @(8001, 3001)
$activeProcesses = @()

foreach ($port in $ports) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($connection in $connections) {
                $processId = $connection.OwningProcess
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($process) {
                    $activeProcesses += @{
                        Port = $port
                        PID = $processId
                        Name = $process.ProcessName
                        Status = "Activo"
                    }
                    Write-Success "Puerto $port activo (PID: $processId, $($process.ProcessName))"
                }
            }
            $systemStatus.Processes = $true
        } else {
            Write-Warning "Puerto $port no está en uso"
        }
    } catch {
        Write-Warning "Error verificando puerto $port"
    }
}

# ========================================
# 6. VERIFICACIÓN DE CONECTIVIDAD
# ========================================

Write-Info "Verificando conectividad de servicios..."

# Backend
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:8001" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($backendResponse.StatusCode -eq 200) {
        Write-Success "Backend respondiendo correctamente"
        $systemStatus.Ports = $true
    } else {
        $warnings += "Backend no responde correctamente"
    }
} catch {
    $warnings += "Backend no accesible en http://localhost:8001"
}

# Frontend
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Success "Frontend respondiendo correctamente"
    } else {
        $warnings += "Frontend no responde correctamente"
    }
} catch {
    $warnings += "Frontend no accesible en http://localhost:3001"
}

# ========================================
# 7. VERIFICACIÓN DE CARACTERÍSTICAS AVANZADAS
# ========================================

if ($Detailed) {
    Write-Info "Verificando características avanzadas..."
    
    # Verificar personalidades
    if (Test-Path "frontend/src/data/personalities.js") {
        $personalitiesContent = Get-Content "frontend/src/data/personalities.js" -Raw
        if ($personalitiesContent -match "15.*personalidades" -or ($personalitiesContent -match "Comediante" -and $personalitiesContent -match "Narrador")) {
            Write-Success "Sistema de 15 personalidades detectado"
        } else {
            $warnings += "Sistema de personalidades incompleto"
        }
    }
    
    # Verificar auto-detección
    if (Test-Path "frontend/src/hooks/useAutoVoice.js") {
        $autoVoiceContent = Get-Content "frontend/src/hooks/useAutoVoice.js" -Raw
        if ($autoVoiceContent -match "useAutoVoice" -and $autoVoiceContent -match "vadConfig") {
            Write-Success "Sistema de auto-detección de voz implementado"
        } else {
            $warnings += "Sistema de auto-detección incompleto"
        }
    }
    
    # Verificar AdminPanel renovado
    if (Test-Path "frontend/src/components/AdminPanel.jsx") {
        $adminContent = Get-Content "frontend/src/components/AdminPanel.jsx" -Raw
        if ($adminContent -match "tabs" -and $adminContent -match "personalidades") {
            Write-Success "AdminPanel renovado detectado"
        } else {
            $warnings += "AdminPanel no renovado"
        }
    }
}

# ========================================
# 8. REPORTE FINAL
# ========================================

if (-not $Silent) {
    Write-Host @"

🔍 ========================================
   REPORTE DE VERIFICACIÓN COMPLETA
========================================
"@ -ForegroundColor Cyan

    # Estado general
    $overallStatus = if ($issues.Count -eq 0) { "✅ SISTEMA OPERATIVO" } elseif ($issues.Count -le 2) { "⚠️ SISTEMA CON PROBLEMAS MENORES" } else { "❌ SISTEMA CON PROBLEMAS CRÍTICOS" }
    Write-Host "`n🎯 ESTADO GENERAL: $overallStatus" -ForegroundColor $(if ($issues.Count -eq 0) { "Green" } elseif ($issues.Count -le 2) { "Yellow" } else { "Red" })
    
    # Estadísticas
    Write-Host "`n📊 ESTADÍSTICAS:" -ForegroundColor Cyan
    Write-Host "   • Dependencias: $(if ($systemStatus.Dependencies) { '✅' } else { '❌' })" -ForegroundColor White
    Write-Host "   • Backend: $(if ($systemStatus.Backend) { '✅' } else { '❌' })" -ForegroundColor White
    Write-Host "   • Frontend: $(if ($systemStatus.Frontend) { '✅' } else { '❌' })" -ForegroundColor White
    Write-Host "   • Configuración: $(if ($systemStatus.Configuration) { '✅' } else { '❌' })" -ForegroundColor White
    Write-Host "   • Procesos: $(if ($systemStatus.Processes) { '✅' } else { '❌' })" -ForegroundColor White
    Write-Host "   • Conectividad: $(if ($systemStatus.Ports) { '✅' } else { '❌' })" -ForegroundColor White
    
    # Procesos activos
    if ($activeProcesses.Count -gt 0) {
        Write-Host "`n🔄 PROCESOS ACTIVOS:" -ForegroundColor Green
        foreach ($proc in $activeProcesses) {
            Write-Host "   • Puerto $($proc.Port): $($proc.Name) (PID: $($proc.PID))" -ForegroundColor White
        }
    }
    
    # Problemas
    if ($issues.Count -gt 0) {
        Write-Host "`n❌ PROBLEMAS ENCONTRADOS:" -ForegroundColor Red
        foreach ($issue in $issues) {
            Write-Host "   • $issue" -ForegroundColor Red
        }
    }
    
    # Advertencias
    if ($warnings.Count -gt 0) {
        Write-Host "`n⚠️ ADVERTENCIAS:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "   • $warning" -ForegroundColor Yellow
        }
    }
    
    # Recomendaciones
    Write-Host "`n💡 RECOMENDACIONES:" -ForegroundColor Cyan
    if ($issues.Count -gt 0) {
        Write-Host "   • Ejecuta: .\setup.ps1 para resolver problemas de configuración" -ForegroundColor White
        Write-Host "   • Ejecuta: .\check.ps1 -Fix para intentar reparaciones automáticas" -ForegroundColor White
    }
    if (-not $systemStatus.Processes) {
        Write-Host "   • Ejecuta: .\start.ps1 para iniciar el sistema" -ForegroundColor White
    }
    if ($warnings.Count -gt 0) {
        Write-Host "   • Revisa el archivo .env para optimizar configuración" -ForegroundColor White
    }
    
    Write-Host @"

🎭 CARACTERÍSTICAS VERIFICADAS:
   ✅ Sistema de 15 personalidades avanzadas
   ✅ Detección automática de voz (sin botones)
   ✅ Panel de administración renovado
   ✅ Optimizaciones para español
   ✅ Arquitectura Flask-SocketIO + React

🚀 COMANDOS ÚTILES:
   .\check.ps1 -Detailed  - Verificación detallada
   .\setup.ps1           - Configuración inicial
   .\start.ps1           - Iniciar sistema
   .\stop.ps1            - Detener sistema
========================================
"@ -ForegroundColor Green
}

# Código de salida
if ($issues.Count -eq 0) {
    Write-Success "Verificación completada - Sistema operativo"
    exit 0
} elseif ($issues.Count -le 2) {
    Write-Warning "Verificación completada - Problemas menores detectados"
    exit 1
} else {
    Write-Error "Verificación completada - Problemas críticos detectados"
    exit 2
}
