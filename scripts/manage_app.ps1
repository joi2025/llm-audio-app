# Script de gestión de la aplicación
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('start', 'stop', 'restart', 'status')]
    [string]$Action,

    [Parameter()]
    [string]$Port = "8000",

    [Parameter()]
    [string]$LogLevel = "INFO"
)

# Configuración
$APP_NAME = "llm-audio-app"
$LOG_DIR = "logs"
$CONFIG_DIR = "config"
$LOG_FILE = "$LOG_DIR/app.log"

# Función para verificar si el proceso está en ejecución
function Test-ProcessRunning {
    param([string]$ProcessName)
    return Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
}

# Función para iniciar la aplicación
function Start-Application {
    Write-Host "Starting $APP_NAME..."
    
    # Crear directorio de logs si no existe
    if (!(Test-Path $LOG_DIR)) {
        New-Item -ItemType Directory -Path $LOG_DIR
    }
    
    # Crear directorio de configuración si no existe
    if (!(Test-Path $CONFIG_DIR)) {
        New-Item -ItemType Directory -Path $CONFIG_DIR
    }
    
    # Iniciar aplicación con logging configurado
    Start-Process -NoNewWindow -PassThru python -ArgumentList "-m uvicorn src.api.main:app --host 0.0.0.0 --port $Port --log-config $CONFIG_DIR/logging.yaml"
}

# Función para detener la aplicación
function Stop-Application {
    Write-Host "Stopping $APP_NAME..."
    $process = Test-ProcessRunning -ProcessName "python"
    if ($process) {
        Stop-Process -Name "python" -Force
    }
}

# Función para mostrar el estado
function Get-ApplicationStatus {
    $process = Test-ProcessRunning -ProcessName "python"
    if ($process) {
        Write-Host "$APP_NAME is running (PID: $($process.Id))"
    } else {
        Write-Host "$APP_NAME is not running"
    }
}

# Función para reiniciar la aplicación
function Restart-Application {
    Stop-Application
    Start-Sleep -Seconds 2
    Start-Application
}

# Función para mostrar logs
function Show-Logs {
    Write-Host "Showing logs from $LOG_FILE..."
    if (Test-Path $LOG_FILE) {
        Get-Content $LOG_FILE -Tail 50
    } else {
        Write-Host "No log file found"
    }
}

# Ejecutar acción solicitada
switch ($Action) {
    "start" {
        Start-Application
    }
    "stop" {
        Stop-Application
    }
    "restart" {
        Restart-Application
    }
    "status" {
        Get-ApplicationStatus
        Show-Logs
    }
}
