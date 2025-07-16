<#
.SYNOPSIS
    Script de despliegue para LLM Audio App
#>

# Configuración
$ErrorActionPreference = "Stop"
$projectRoot = "C:\\Users\\Personal\\CascadeProjects\\llm-audio-app"
$logFile = "$projectRoot\\deploy_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

# Función para escribir logs
function Write-Log {
    param([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $message"
    Add-Content -Path $logFile -Value $logMessage -ErrorAction SilentlyContinue
    Write-Host $logMessage
}

# Función para ejecutar comandos
function Invoke-CommandWithLog {
    param([string]$command, [string]$stepName)
    
    Write-Log "EJECUTANDO: $stepName"
    $output = Invoke-Expression $command 2>&1 | Out-String
    
    if ($LASTEXITCODE -ne 0) {
        Write-Log "ERROR en $stepName"
        Write-Log "Salida del comando: $output"
        throw "Error en $stepName"
    }
    
    return $output
}

try {
    # Iniciar log
    Write-Log "=== INICIO DE DESPLIEGUE ==="
    
    # 1. Verificar Docker
    try {
        $dockerVersion = docker --version
        Write-Log "Docker detectado: $dockerVersion"
    } catch {
        Write-Log "ERROR: Docker no está instalado o no está en el PATH"
        exit 1
    }

    # 2. Navegar al directorio del proyecto
    Set-Location -Path $projectRoot
    Write-Log "Directorio actual: $(Get-Location)"
    
    # 3. Validar archivo docker-compose.yml
    $composeFile = "$projectRoot\docker-compose.yml"
    if (-not (Test-Path $composeFile)) {
        throw "No se encontró el archivo docker-compose.yml"
    }
    
    # Verificación básica del contenido
    $content = Get-Content $composeFile -Raw
    if (-not ($content -match 'services:')) {
        throw "El archivo docker-compose.yml no contiene la sección 'services:'"
    }

    # 3. Detener contenedores previos
    Write-Log "Deteniendo contenedores previos..."
    docker-compose down --remove-orphans 2>&1 | Out-Null

    # 4. Construir imágenes
    Write-Log "Construyendo imágenes..."
    $buildOutput = Invoke-CommandWithLog -command "docker-compose build --no-cache" -stepName "Construcción de imágenes"
    
    # 5. Iniciar servicios
    Write-Log "Iniciando servicios..."
    $upOutput = Invoke-CommandWithLog -command "docker-compose up -d" -stepName "Inicio de servicios"

    # 6. Verificar estado
    Start-Sleep -Seconds 10
    Write-Log "Verificando estado de los servicios..."
    $status = docker-compose ps 2>&1
    Write-Log "Estado actual:`n$status"

    # 7. Verificar que los servicios estén arriba
    $services = @("backend", "frontend", "nats")
    $running = docker-compose ps --services --filter "status=running"
    
    foreach ($service in $services) {
        if ($running -notcontains $service) {
            Write-Log "ADVERTENCIA: El servicio $service no está en ejecución"
            $logs = docker-compose logs $service 2>&1 | Out-String
            Write-Log "Logs de $service : $logs"
        }
    }

    Write-Log "=== DESPLIEGUE FINALIZADO ==="
    Write-Log "Frontend: http://localhost:3000"
    Write-Log "Backend API: http://localhost:8000/docs"
    Write-Log "NATS: nats://localhost:4222"
    Write-Log "Log completo: $logFile"

} catch {
    Write-Log "ERROR CRÍTICO: $($_.Exception.Message)"
    Write-Log "Último error: $($Error[0])"
    exit 1
}

