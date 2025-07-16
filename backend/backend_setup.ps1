# Script para configurar y probar el backend
$ErrorActionPreference = "Stop"

# Función para mostrar el mensaje final
function Show-Status {
    param([string]$status, [string]$message)
    if ($status -eq "UP") {
        Write-Host "BACKEND UP - READY" -ForegroundColor Green
    } else {
        Write-Host "BACKEND KO: $message" -ForegroundColor Red
    }
    exit
}

try {
    # Navegar al directorio del backend
    Set-Location "C:\Users\Personal\CascadeProjects\llm-audio-app\backend"
    
    # Crear y activar venv si no existe
    if (-not (Test-Path "venv")) {
        python -m venv venv
    }
    .\venv\Scripts\Activate.ps1

    # Instalar dependencias
    pip install -r requirements.txt --force-reinstall --no-cache-dir 2>&1 | Out-Null

    # Iniciar el servidor en una nueva ventana
    Start-Process powershell -ArgumentList "-NoExit", "python run.py --reload 2>&1 | Select-String -Pattern 'ERROR|Uvicorn running'" -WindowStyle Hidden

    # Esperar 5 segundos para que el servidor arranque
    Start-Sleep -Seconds 5

    # Probar la conexión WebSocket
    $wsTest = Start-Process wscat -ArgumentList "-c ws://localhost:8001/ws/assistant --no-color" -PassThru -NoNewWindow
    
    # Esperar un poco para que la conexión se establezca
    Start-Sleep -Seconds 2

    # Verificar el estado del proceso
    if ($wsTest.ExitCode -eq 0) {
        Show-Status "UP" "WebSocket connected successfully"
    } else {
        Show-Status "KO" "WebSocket connection failed"
    }

} catch {
    Show-Status "KO" $($_.Exception.Message)
}
