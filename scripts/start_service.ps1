# Script para iniciar el servicio con supervisord

# Función para verificar si supervisord está instalado
function Test-Supervisord {
    return Get-Command supervisord -ErrorAction SilentlyContinue
}

# Función para instalar supervisord
function Install-Supervisord {
    Write-Host "Installing supervisord..."
    pip install supervisor
}

# Función para iniciar el servicio
function Start-Service {
    Write-Host "Starting service..."
    
    # Crear directorio de logs si no existe
    if (!(Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs"
    }
    
    # Iniciar supervisord
    Start-Process -NoNewWindow -PassThru supervisord -ArgumentList "-c config/supervisord.conf"
}

# Función principal
function Main {
    if (!(Test-Supervisord)) {
        Install-Supervisord
    }
    
    Start-Service
}

# Ejecutar script
Main
