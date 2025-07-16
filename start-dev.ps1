# Script para iniciar el entorno de desarrollo
Write-Host "Iniciando entorno de desarrollo..." -ForegroundColor Cyan

# Verificar si Docker está en ejecución
$dockerRunning = docker info 2>&1 | Out-Null
if (-not $?) {
    Write-Host "Docker no está en ejecución. Iniciando Docker..." -ForegroundColor Yellow
    Start-Process -FilePath "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    # Esperar a que Docker se inicie
    $maxAttempts = 30
    $attempt = 0
    $dockerReady = $false
    
    while ($attempt -lt $maxAttempts -and -not $dockerReady) {
        $attempt++
        Write-Host "Esperando a que Docker se inicie (intento $attempt/$maxAttempts)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        $dockerRunning = docker info 2>&1 | Out-Null
        if ($?) {
            $dockerReady = $true
            Write-Host "Docker está listo!" -ForegroundColor Green
        }
    }
    
    if (-not $dockerReady) {
        Write-Host "No se pudo iniciar Docker. Por favor, inicia Docker manualmente y vuelve a intentarlo." -ForegroundColor Red
        exit 1
    }
}

# Navegar al directorio del proyecto
Set-Location $PSScriptRoot

# Verificar si el archivo .env existe
if (-not (Test-Path .\.env)) {
    # Si no existe, copiar de .env.example
    if (Test-Path .\.env.example) {
        Write-Host "Creando archivo .env a partir de .env.example..." -ForegroundColor Yellow
        Copy-Item -Path .\.env.example -Destination .\.env -Force
        Write-Host "Por favor, configura las variables de entorno en el archivo .env" -ForegroundColor Yellow
        notepad .\.env
        Write-Host "Presiona cualquier tecla para continuar después de configurar el archivo .env..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    } else {
        Write-Host "Error: No se encontró el archivo .env ni .env.example" -ForegroundColor Red
        exit 1
    }
}

# Construir e iniciar los contenedores
Write-Host "Construyendo e iniciando los contenedores..." -ForegroundColor Cyan
docker-compose up --build -d

# Mostrar logs
Write-Host "Mostrando logs (presiona Ctrl+C para salir)..." -ForegroundColor Cyan
Write-Host "Puedes acceder a la aplicación en http://localhost:3002" -ForegroundColor Green
Write-Host "API disponible en http://localhost:8001" -ForegroundColor Green
Write-Host "Documentación de la API: http://localhost:8001/docs" -ForegroundColor Green
docker-compose logs -f
