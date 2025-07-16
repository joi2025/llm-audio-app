# Voice Advance Reparador Automático
# Ejecuta este script en PowerShell como administrador si tienes problemas de arranque

Write-Host "--- Reparador Voice Advance ---" -ForegroundColor Cyan

# 1. Verifica Docker Desktop
Write-Host "[1/7] Verificando Docker Desktop..."
$dockerRunning = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
if (!$dockerRunning) {
    Write-Host "Docker Desktop NO está corriendo. Intenta iniciarlo manualmente." -ForegroundColor Red
    Start-Process "Docker Desktop"
    Start-Sleep -Seconds 10
} else {
    Write-Host "Docker Desktop está corriendo." -ForegroundColor Green
}

# 2. Verifica conexión Docker
Write-Host "[2/7] Comprobando conexión Docker..."
docker version > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "No se puede conectar con Docker. Reinicia Docker Desktop o el PC." -ForegroundColor Red
    exit 1
} else {
    Write-Host "Docker responde correctamente." -ForegroundColor Green
}

# 3. Elimina el warning de 'version' en docker-compose.yml
Write-Host "[3/7] Limpiando docker-compose.yml..."
$composeFile = "docker-compose.yml"
if (Test-Path $composeFile) {
    (Get-Content $composeFile) | Where-Object {$_ -notmatch '^version:'} | Set-Content $composeFile
    Write-Host "Warning de 'version' eliminado si existía." -ForegroundColor Green
}

# 4. Verifica archivos críticos
Write-Host "[4/7] Verificando archivos críticos..."
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

# 5. Reinstala dependencias frontend si falta node_modules
Write-Host "[5/7] Verificando dependencias frontend..."
if (!(Test-Path "frontend/node_modules")) {
    Write-Host "Instalando dependencias npm (frontend)..."
    Push-Location frontend
    npm install
    Pop-Location
} else {
    Write-Host "Dependencias npm OK." -ForegroundColor Green
}

# 6. Reconstruye imágenes Docker
Write-Host "[6/7] Reconstruyendo imágenes Docker..."
docker-compose build --no-cache

# 7. Arranca servicios
Write-Host "[7/7] Arrancando servicios..."
docker-compose up -d

Write-Host "--- Reparación finalizada ---" -ForegroundColor Cyan
Write-Host "Abre http://localhost:3000 cuando todo esté en verde."

