# Script para ejecutar pruebas con control de logs

# Función para iniciar la aplicación en modo de prueba
function Start-TestServer {
    param([string]$Port = "8000")
    
    Write-Host "Starting test server..."
    $rootPath = "C:\Users\Personal\CascadeProjects\llm-audio-app"
    $venvPath = Join-Path $rootPath "frontend\src\venv"
    $pythonPath = Join-Path $venvPath "Scripts\python.exe"
    Start-Process -NoNewWindow -PassThru $pythonPath -ArgumentList "-m uvicorn src.api.main:app --host 0.0.0.0 --port $Port --env-file $rootPath\.env.test --log-config $rootPath\config\logging.yaml"
}

# Función para ejecutar pruebas
function Run-Tests {
    Write-Host "Running tests..."
    
    # Ejecutar pruebas unitarias
    Write-Host "Running unit tests..."
    $rootPath = "C:\Users\Personal\CascadeProjects\llm-audio-app"
    $venvPath = Join-Path $rootPath "frontend\src\venv"
    $pythonPath = Join-Path $venvPath "Scripts\python.exe"
    Set-Location $rootPath
    & $pythonPath -m pytest tests/test_stt.py tests/test_tts.py -v
    
    # Ejecutar pruebas de integración
    Write-Host "Running integration tests..."
    & $pythonPath -m pytest tests/test_integration.py -v
}

# Función para verificar logs
function Verify-Logs {
    Write-Host "Verifying logs..."
    
    # Verificar logs de error
    $rootPath = "C:\Users\Personal\CascadeProjects\llm-audio-app"
    $logPath = Join-Path $rootPath "logs"
    $errorLogs = Get-ChildItem -Path $logPath -Filter *.log -Recurse | Select-String -Pattern "ERROR"
    if ($errorLogs) {
        Write-Host "Found error logs:" -ForegroundColor Red
        $errorLogs
    }
    
    # Verificar logs de warning
    $warningLogs = Get-ChildItem -Path $logPath -Filter *.log -Recurse | Select-String -Pattern "WARNING"
    if ($warningLogs) {
        Write-Host "Found warning logs:" -ForegroundColor Yellow
        $warningLogs
    }
}

# Función principal
function Main {
    # Iniciar servidor de prueba
    Start-TestServer
    Start-Sleep -Seconds 2
    
    # Ejecutar pruebas
    Run-Tests
    
    # Verificar logs
    Verify-Logs
}

# Ejecutar script
Main
