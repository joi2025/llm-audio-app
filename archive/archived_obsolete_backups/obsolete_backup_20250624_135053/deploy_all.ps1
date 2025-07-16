<#
.SYNOPSIS
    DESPLIEGUE CONFIABLE LLM-AUDIO-APP
#>

$PROJECT_ROOT = "C:\Users\Personal\CascadeProjects\llm-audio-app"
$COMPOSE_FILE = "$PROJECT_ROOT\docker-compose.yml"
$LOG_FILE = "$PROJECT_ROOT\deploy_log_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

function Write-Log {
    param([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $log_entry = "[$timestamp] $message"
    Add-Content -Path $LOG_FILE -Value $log_entry
    Write-Host $log_entry
}

# 1. INICIO
Write-Log "=== INICIO DE DESPLIEGUE ==="

# 2. VERIFICACIÃ“N BÃSICA
if (-not (Test-Path $COMPOSE_FILE)) {
    Write-Log "ERROR: No se encontrÃ³ docker-compose.yml"
    exit 1
}

$yamlContent = Get-Content $COMPOSE_FILE -Raw
if (-not $yamlContent.Contains("version:") -or -not $yamlContent.Contains("services:")) {
    Write-Log "ERROR: Formato bÃ¡sico de YAML incorrecto"
    exit 1
}

# 3. EJECUCIÃ“N PRINCIPAL
try {
    Write-Log "Deteniendo contenedores previos..."
    docker-compose -f $COMPOSE_FILE down 2>&1 | Out-File -Append -FilePath $LOG_FILE

    Write-Log "Construyendo imÃ¡genes..."
    docker-compose -f $COMPOSE_FILE build 2>&1 | Tee-Object -FilePath $LOG_FILE -Append
    if ($LASTEXITCODE -ne 0) { throw "Error en construcciÃ³n" }

    Write-Log "Iniciando servicios..."
    docker-compose -f $COMPOSE_FILE up -d 2>&1 | Out-File -Append -FilePath $LOG_FILE

    # 4. VERIFICACIÃ“N FINAL
    Start-Sleep -Seconds 10
    Write-Log "Estado de los servicios:"
    docker-compose -f $COMPOSE_FILE ps 2>&1 | Tee-Object -FilePath $LOG_FILE -Append

    Write-Log "=== DESPLIEGUE EXITOSO ==="
    Write-Log "Frontend: http://localhost:3000"
    Write-Log "Backend API: http://localhost:8000/docs"
    Write-Log "Log completo: $LOG_FILE"

} catch {
    Write-Log "ERROR CRÃTICO: $($_.Exception.Message)"
    exit 1
}

