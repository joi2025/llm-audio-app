# ========================================
# 🛑 LLM Audio App - Stop Script v2.0
# Detención segura y limpieza completa
# ========================================

param(
    [switch]$Force,
    [switch]$Silent,
    [switch]$KeepLogs
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

function Write-Success($Message) { Write-ColorOutput "[OK] $Message" "Green" }
function Write-Info($Message) { Write-ColorOutput "[INFO] $Message" "Cyan" }
function Write-Warning($Message) { Write-ColorOutput "[WARN] $Message" "Yellow" }
function Write-Error($Message) { Write-ColorOutput "[ERROR] $Message" "Red" }

# Header
if (-not $Silent) {
    Clear-Host
    Write-Host @"
========================================
   LLM Audio App v2.0 - Detencion Segura
   Limpieza Completa del Sistema
========================================
"@ -ForegroundColor Red
}

Write-Info "Iniciando detencion segura del sistema..."

# ========================================
# 1. DETENER PROCESOS POR PID
# ========================================

$stoppedProcesses = 0

if (Test-Path ".pids") {
    Write-Info "Deteniendo procesos registrados..."
    
    # Leer información del sistema
    if (Test-Path ".pids/system.json") {
        try {
            $systemInfo = Get-Content ".pids/system.json" -Raw | ConvertFrom-Json
            Write-Info "Sistema iniciado: $($systemInfo.StartTime)"
            Write-Info "Versión: $($systemInfo.Version)"
        } catch {
            Write-Warning "No se pudo leer información del sistema"
        }
    }
    
    # Detener backend
    if (Test-Path ".pids/backend.pid") {
        $backendPID = Get-Content ".pids/backend.pid" -Raw
        if ($backendPID) {
            try {
                $process = Get-Process -Id $backendPID -ErrorAction SilentlyContinue
                if ($process) {
                    if ($Force) {
                        Stop-Process -Id $backendPID -Force
                    } else {
                        $process.CloseMainWindow()
                        Start-Sleep -Seconds 2
                        if (-not $process.HasExited) {
                            Stop-Process -Id $backendPID -Force
                        }
                    }
                    Write-Success "Backend detenido (PID: $backendPID)"
                    $stoppedProcesses++
                } else {
                    Write-Warning "Proceso backend no encontrado (PID: $backendPID)"
                }
            } catch {
                Write-Warning "Error deteniendo backend: $($_.Exception.Message)"
            }
        }
    }
    
    # Detener frontend
    if (Test-Path ".pids/frontend.pid") {
        $frontendPID = Get-Content ".pids/frontend.pid" -Raw
        if ($frontendPID) {
            try {
                $process = Get-Process -Id $frontendPID -ErrorAction SilentlyContinue
                if ($process) {
                    if ($Force) {
                        Stop-Process -Id $frontendPID -Force
                    } else {
                        $process.CloseMainWindow()
                        Start-Sleep -Seconds 2
                        if (-not $process.HasExited) {
                            Stop-Process -Id $frontendPID -Force
                        }
                    }
                    Write-Success "Frontend detenido (PID: $frontendPID)"
                    $stoppedProcesses++
                } else {
                    Write-Warning "Proceso frontend no encontrado (PID: $frontendPID)"
                }
            } catch {
                Write-Warning "Error deteniendo frontend: $($_.Exception.Message)"
            }
        }
    }
}

# ========================================
# 2. DETENER PROCESOS POR PUERTO
# ========================================

Write-Info "Verificando y limpiando puertos..."

$ports = @(8001, 3001)
$portProcesses = 0

foreach ($port in $ports) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        foreach ($connection in $connections) {
            $processId = $connection.OwningProcess
            try {
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($process) {
                    $processName = $process.ProcessName
                    if ($Force) {
                        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    } else {
                        $process.CloseMainWindow()
                        Start-Sleep -Seconds 1
                        if (-not $process.HasExited) {
                            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                        }
                    }
                    Write-Success "Proceso en puerto $port detenido ($processName, PID: $processId)"
                    $portProcesses++
                }
            } catch {
                Write-Warning "Error deteniendo proceso en puerto $port (PID: $processId)"
            }
        }
    } catch {
        # Puerto no en uso, continuar
    }
}

# ========================================
# 3. DETENER PROCESOS RELACIONADOS
# ========================================

Write-Info "Limpiando procesos relacionados..."

$relatedProcesses = @("node", "python", "flask", "vite")
$relatedStopped = 0

foreach ($processName in $relatedProcesses) {
    try {
        $processes = Get-Process -Name $processName -ErrorAction SilentlyContinue
        foreach ($process in $processes) {
            # Verificar si es de nuestro proyecto
            $commandLine = ""
            try {
                $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
            } catch {
                # Ignorar errores de acceso
            }
            
            if ($commandLine -like "*llm-audio-app*" -or 
                $commandLine -like "*run.py*" -or 
                $commandLine -like "*vite*" -or
                $commandLine -like "*3001*" -or
                $commandLine -like "*8001*") {
                
                try {
                    if ($Force) {
                        Stop-Process -Id $process.Id -Force
                    } else {
                        $process.CloseMainWindow()
                        Start-Sleep -Seconds 1
                        if (-not $process.HasExited) {
                            Stop-Process -Id $process.Id -Force
                        }
                    }
                    Write-Success "Proceso relacionado detenido ($processName, PID: $($process.Id))"
                    $relatedStopped++
                } catch {
                    Write-Warning "Error deteniendo proceso $processName (PID: $($process.Id))"
                }
            }
        }
    } catch {
        # Proceso no encontrado, continuar
    }
}

# ========================================
# 4. LIMPIEZA DE ARCHIVOS TEMPORALES
# ========================================

Write-Info "Limpiando archivos temporales..."

$cleanedFiles = 0

# Limpiar PIDs
if (Test-Path ".pids") {
    try {
        Remove-Item ".pids" -Recurse -Force
        Write-Success "Archivos PID eliminados"
        $cleanedFiles++
    } catch {
        Write-Warning "Error eliminando archivos PID"
    }
}

# Limpiar logs temporales (si no se especifica mantenerlos)
if (-not $KeepLogs) {
    $logPaths = @(
        "backend/logs/temp",
        "frontend/logs/temp",
        "*.log.tmp",
        "*.pid",
        ".temp"
    )
    
    foreach ($logPath in $logPaths) {
        if (Test-Path $logPath) {
            try {
                Remove-Item $logPath -Recurse -Force -ErrorAction SilentlyContinue
                Write-Success "Archivos temporales eliminados: $logPath"
                $cleanedFiles++
            } catch {
                # Ignorar errores
            }
        }
    }
}

# Limpiar caché de Node.js si existe
$nodeCachePaths = @(
    "frontend/.vite",
    "frontend/dist",
    "frontend/node_modules/.cache"
)

foreach ($cachePath in $nodeCachePaths) {
    if (Test-Path $cachePath) {
        try {
            Remove-Item $cachePath -Recurse -Force -ErrorAction SilentlyContinue
            Write-Success "Caché eliminado: $cachePath"
            $cleanedFiles++
        } catch {
            # Ignorar errores
        }
    }
}

# ========================================
# 5. VERIFICACIÓN FINAL
# ========================================

Write-Info "Verificando limpieza completa..."

$stillRunning = @()

# Verificar puertos
foreach ($port in $ports) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            $stillRunning += "Puerto $port aún en uso"
        }
    } catch {
        # Puerto libre
    }
}

# Verificar procesos específicos
$checkProcesses = @("python", "node")
foreach ($processName in $checkProcesses) {
    try {
        $processes = Get-Process -Name $processName -ErrorAction SilentlyContinue
        foreach ($process in $processes) {
            try {
                $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
                if ($commandLine -like "*llm-audio-app*") {
                    $stillRunning += "$processName (PID: $($process.Id))"
                }
            } catch {
                # Ignorar errores de acceso
            }
        }
    } catch {
        # Proceso no encontrado
    }
}

# ========================================
# 6. REPORTE FINAL
# ========================================

if (-not $Silent) {
    Write-Host @"

========================================
   REPORTE DE DETENCION COMPLETA
========================================
"@ -ForegroundColor Red

    Write-Host "ESTADISTICAS:" -ForegroundColor Cyan
    Write-Host "   - Procesos registrados detenidos: $stoppedProcesses" -ForegroundColor White
    Write-Host "   - Procesos en puertos detenidos: $portProcesses" -ForegroundColor White
    Write-Host "   - Procesos relacionados detenidos: $relatedStopped" -ForegroundColor White
    Write-Host "   - Archivos temporales limpiados: $cleanedFiles" -ForegroundColor White
    
    if ($stillRunning.Count -gt 0) {
        Write-Host "`nADVERTENCIA: PROCESOS AUN EJECUTANDOSE:" -ForegroundColor Yellow
        foreach ($item in $stillRunning) {
            Write-Host "   • $item" -ForegroundColor Yellow
        }
        Write-Host "`nConsejo: Usa -Force para detencion forzada: .\stop.ps1 -Force" -ForegroundColor Cyan
    } else {
        Write-Host "`nSISTEMA COMPLETAMENTE DETENIDO" -ForegroundColor Green
    }
    
    Write-Host @"

COMANDOS UTILES:
   .\start.ps1          - Iniciar sistema completo
   .\start.ps1 -Silent  - Iniciar sin output detallado
   .\stop.ps1 -Force    - Detencion forzada
   .\stop.ps1 -KeepLogs - Mantener archivos de log

Sistema LLM Audio App v2.0 detenido correctamente
========================================
"@ -ForegroundColor Cyan
}

# Código de salida
if ($stillRunning.Count -gt 0) {
    exit 1  # Algunos procesos aun ejecutandose
} else {
    Write-Success "Detencion completa exitosa"
    exit 0  # Detención exitosa
}
