# Script para instalar dependencias e iniciar el servidor

# 1. Configuración inicial
$ErrorActionPreference = "Stop"
$backendPath = "$PSScriptRoot\backend"
$venvPath = "$backendPath\venv"

# 2. Función para escribir logs
function Write-Log {
    param([string]$message)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $message" -ForegroundColor Cyan
}

# 3. Verificar e instalar dependencias
try {
    Write-Log "Verificando entorno virtual..."
    if (-not (Test-Path $venvPath)) {
        Write-Log "Creando entorno virtual..."
        python -m venv $venvPath
    }

    # Activar el entorno virtual
    $activateScript = "$venvPath\Scripts\Activate.ps1"
    if (-not (Test-Path $activateScript)) {
        throw "No se pudo encontrar el script de activación del entorno virtual"
    }
    
    # Ejecutar comandos en el entorno virtual
    $env:PYTHONPATH = $backendPath
    & $activateScript

    Write-Log "Instalando dependencias..."
    python -m pip install --upgrade pip
    
    # Instalar dependencias básicas primero
    python -m pip install numpy openai uvicorn pyttsx3 comtypes pywin32
    
    # Instalar dependencias del requirements.txt si existe
    $requirementsPath = "$backendPath\requirements.txt"
    if (Test-Path $requirementsPath) {
        # Instalar sin dependencias opcionales problemáticas
        python -m pip install -r $requirementsPath --no-deps
        
        # Instalar dependencias restantes manualmente
        python -m pip install numpy>=1.24.0 openai>=1.12.0 pydub>=0.25.1 soundfile>=0.12.1 librosa>=0.10.0
    }

    # 4. Iniciar el servidor
    Write-Log "Iniciando servidor backend..."
    $serverProcess = Start-Process -FilePath "python" -ArgumentList "-m uvicorn main:app --reload --host 0.0.0.0 --port 8001 --log-level debug" -WorkingDirectory $backendPath -PassThru -NoNewWindow -RedirectStandardError "$backendPath\error.log" -RedirectStandardOutput "$backendPath\output.log"
    
    # 5. Esperar a que el servidor esté listo
    $maxAttempts = 10
    $attempt = 0
    $isServerReady = $false
    
    Write-Log "Verificando conexión WebSocket..."
    do {
        $attempt++
        try {
            $wsTest = New-Object System.Net.WebSockets.ClientWebSocket
            $cancellationToken = New-Object System.Threading.CancellationToken
            $connection = $wsTest.ConnectAsync("ws://localhost:8001/ws/assistant", $cancellationToken)
            Start-Sleep -Milliseconds 500
            
            if ($wsTest.State -eq 'Open') {
                $isServerReady = $true
                $wsTest.Dispose()
                break
            }
            $wsTest.Dispose()
        } catch {
            if ($attempt -ge $maxAttempts) {
                throw "No se pudo conectar al WebSocket después de $maxAttempts intentos"
            }
            Start-Sleep -Milliseconds 500
        }
    } while ($attempt -lt $maxAttempts)

    if ($isServerReady) {
        Write-Host "`n✅ Servidor funcionando correctamente en http://localhost:8001" -ForegroundColor Green
        Write-Host "✅ WebSocket disponible en ws://localhost:8001/ws/assistant" -ForegroundColor Green
        Write-Host "`nPresiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
        
        # Mostrar logs en tiempo real
        Get-Content -Path "$backendPath\output.log" -Wait -Tail 20
    } else {
        Write-Host "`n❌ Error al iniciar el servidor. Revisando logs..." -ForegroundColor Red
        if (Test-Path "$backendPath\error.log") {
            Write-Host "=== Últimos errores ===" -ForegroundColor Red
            Get-Content -Tail 20 "$backendPath\error.log"
        }
        if (Test-Path "$backendPath\output.log") {
            Write-Host "=== Últimos logs ===" -ForegroundColor Yellow
            Get-Content -Tail 20 "$backendPath\output.log"
        }
        throw "No se pudo iniciar el servidor correctamente"
    }
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Detalles: $($_.ScriptStackTrace)`n" -ForegroundColor Red
    exit 1
}
