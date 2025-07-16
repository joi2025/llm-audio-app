# Voice Advance Reparador Automático v2
# Ejecuta este script en PowerShell como administrador para reparar y diagnosticar el stack

Write-Host "=== Reparador Voice Advance v2 ===" -ForegroundColor Cyan

# 1. Verifica Docker Desktop
Write-Host "[1/9] Verificando Docker Desktop..."
$dockerRunning = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
if (!$dockerRunning) {
    Write-Host "Docker Desktop NO está corriendo. Intenta iniciarlo manualmente." -ForegroundColor Red
    Start-Process "Docker Desktop"
    Start-Sleep -Seconds 10
} else {
    Write-Host "Docker Desktop está corriendo." -ForegroundColor Green
}

# 2. Verifica conexión Docker
Write-Host "[2/9] Comprobando conexión Docker..."
docker version > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "No se puede conectar con Docker. Reinicia Docker Desktop o el PC." -ForegroundColor Red
    exit 1
} else {
    Write-Host "Docker responde correctamente." -ForegroundColor Green
}

# 3. Elimina el warning de 'version' en docker-compose.yml
Write-Host "[3/9] Limpiando docker-compose.yml..."
$composeFile = "docker-compose.yml"
if (Test-Path $composeFile) {
    (Get-Content $composeFile) | Where-Object {$_ -notmatch '^version:'} | Set-Content $composeFile
    Write-Host "Warning de 'version' eliminado si existía." -ForegroundColor Green
}

# 4. Elimina cualquier healthcheck de NATS en docker-compose.yml
Write-Host "[4/9] Eliminando healthcheck de NATS si existe..."
if (Test-Path $composeFile) {
    $lines = Get-Content $composeFile
    $newLines = @()
    $skip = $false
    foreach ($line in $lines) {
        if ($line -match '^\s*healthcheck:') { $skip = $true; continue }
        if ($skip -and ($line -match '^\s*[a-zA-Z0-9_-]+:') ) { $skip = $false }
        if (-not $skip) { $newLines += $line }
    }
    $newLines | Set-Content $composeFile
    Write-Host "Healthcheck de NATS eliminado si existía." -ForegroundColor Green
}

# 5. Verifica archivos críticos
Write-Host "[5/9] Verificando archivos críticos..."
$criticalFiles = @(
    ".env.example", ".env", "docker-compose.yml", "start_all.ps1", "README.md",
    "frontend/package.json", "frontend/Dockerfile", "backend/requirements.txt", "backend/Dockerfile"
)
foreach ($file in $criticalFiles) {
    if (!(Test-Path $file)) {
        Write-Host "FALTA: $file" -ForegroundColor Red
    } else {
        Write-Host "OK: $file" -ForegroundColor Green
    }
}

# 6. Reinstala dependencias frontend si falta node_modules
Write-Host "[6/9] Verificando dependencias frontend..."
if (!(Test-Path "frontend/node_modules")) {
    Write-Host "Instalando dependencias npm (frontend)..."
    Push-Location frontend
    npm install
    Pop-Location
} else {
    Write-Host "Dependencias npm OK." -ForegroundColor Green
}

# 7. Reconstruye imágenes Docker y arranca servicios
Write-Host "[7/9] Reconstruyendo imágenes Docker..."
docker-compose build --no-cache
Write-Host "[8/9] Arrancando servicios..."
docker-compose up -d

# 8. Diagnóstico profundo de NATS: SIEMPRE guarda logs e inspect
Write-Host "`n[9/9] Diagnóstico avanzado de NATS..." -ForegroundColor Cyan

# Guardar logs de NATS
try {
    docker-compose logs nats | Out-File -Encoding UTF8 "nats_logs.txt"
    Write-Host "Logs de NATS guardados en nats_logs.txt" -ForegroundColor Gray
} catch { Write-Host "No se pudieron guardar logs de NATS." -ForegroundColor Yellow }

# Guardar docker inspect del contenedor
try {
    docker inspect llm-audio-app-nats-1 | Out-File -Encoding UTF8 "nats_container_inspect.json"
    Write-Host "docker inspect del contenedor guardado en nats_container_inspect.json" -ForegroundColor Gray
} catch { Write-Host "No se pudo guardar docker inspect del contenedor." -ForegroundColor Yellow }

# Guardar docker inspect de la imagen
try {
    docker image inspect nats:latest | Out-File -Encoding UTF8 "nats_image_inspect.json"
    Write-Host "docker inspect de la imagen guardado en nats_image_inspect.json" -ForegroundColor Gray
} catch { Write-Host "No se pudo guardar docker inspect de la imagen." -ForegroundColor Yellow }

# Comprobar estado unhealthy y limpiar si es necesario
$natsStatus = (docker ps -a --filter "name=nats" --format "{{.Status}}")
if ($natsStatus -match "unhealthy") {
    Write-Host "NATS sigue unhealthy. Realizando limpieza profunda..." -ForegroundColor Yellow
    docker-compose down -v
    docker container prune -f
    docker image prune -a -f
    docker volume prune -f
    docker-compose up -d nats
    Start-Sleep -Seconds 5
    $natsStatus2 = (docker ps -a --filter "name=nats" --format "{{.Status}}")
    if ($natsStatus2 -match "unhealthy") {
        Write-Host "NATS sigue unhealthy tras limpieza profunda. Prueba a cambiar la imagen a una versión estable anterior (ej: nats:2.9-alpine) en docker-compose.yml." -ForegroundColor Red
        Write-Host "Adjunta los archivos nats_logs.txt, nats_container_inspect.json y nats_image_inspect.json para soporte avanzado." -ForegroundColor Red
    } else {
        Write-Host "NATS ahora está OK tras la limpieza." -ForegroundColor Green
    }
} else {
    Write-Host "NATS está sano o no existe ningún problema." -ForegroundColor Green
}

Write-Host "`n--- Reparación finalizada ---" -ForegroundColor Cyan
Write-Host "Abre http://localhost:3000 cuando todo esté en verde."

