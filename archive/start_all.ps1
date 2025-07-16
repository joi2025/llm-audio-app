# Detener cualquier instancia previa para un arranque limpio
Write-Host "Deteniendo contenedores existentes para asegurar un arranque limpio..." -ForegroundColor Yellow
docker-compose down

# Arrancar todos los servicios en segundo plano
Write-Host "Arrancando servicios con docker-compose..." -ForegroundColor Cyan
docker-compose up -d --build

# Comprobar el estado inicial de los contenedores
Write-Host "Estado de los contenedores después del arranque:" -ForegroundColor Cyan
docker-compose ps

# Esperar de forma inteligente a que el frontend esté disponible
$url = "http://localhost:3000"
$maxRetries = 15
$retryDelay = 3 # segundos
$frontendReady = $false

Write-Host "Esperando a que el frontend esté disponible en $url... (hasta $(($maxRetries * $retryDelay))) segundos)" -ForegroundColor Cyan
for ($i=1; $i -le $maxRetries; $i++) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-Host "¡Frontend listo y respondiendo!" -ForegroundColor Green
            $frontendReady = $true
            break
        }
    } catch {
        Write-Host "Intento $i/${maxRetries}: Frontend no disponible aún. Reintentando en $retryDelay segundos..."
    }
    Start-Sleep -Seconds $retryDelay
}

# Acción final basada en el resultado
if ($frontendReady) {
    Write-Host "Abriendo la aplicación en el navegador..." -ForegroundColor Green
    Start-Process $url
    Write-Host "Script finalizado. ¡Disfruta de la aplicación!"
} else {
    Write-Host "ERROR: El frontend no respondió a tiempo." -ForegroundColor Red
    Write-Host "Revisa los logs con 'docker-compose logs frontend' y 'docker-compose logs backend' para diagnosticar el problema."
}

