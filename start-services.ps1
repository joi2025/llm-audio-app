# Script para iniciar manualmente los servicios
Write-Host "Iniciando servicios..." -ForegroundColor Cyan

# 1. Iniciar PostgreSQL
Write-Host "Iniciando PostgreSQL..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "docker" -ArgumentList "run -d --name postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=voice_assistant -p 5432:5432 -v postgres_data:/var/lib/postgresql/data postgres:15-alpine"

# Esperar a que PostgreSQL esté listo
Write-Host "Esperando a que PostgreSQL esté listo..." -ForegroundColor Yellow
do {
    Start-Sleep -Seconds 2
    $postgresReady = docker exec postgres pg_isready -U postgres -d voice_assistant 2>&1
    Write-Host "." -NoNewline -ForegroundColor Yellow
} while (-not ($postgresReady -like "*accepting connections*"))
Write-Host ""
Write-Host "PostgreSQL está listo!" -ForegroundColor Green

# 2. Iniciar Redis
Write-Host "Iniciando Redis..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "docker" -ArgumentList "run -d --name redis -p 6379:6379 -v redis_data:/data redis:7-alpine redis-server --appendonly yes"

# Esperar a que Redis esté listo
Write-Host "Esperando a que Redis esté listo..." -ForegroundColor Yellow
do {
    Start-Sleep -Seconds 2
    $redisReady = docker exec redis redis-cli ping 2>&1
    Write-Host "." -NoNewline -ForegroundColor Yellow
} while ($redisReady -ne "PONG")
Write-Host ""
Write-Host "Redis está listo!" -ForegroundColor Green

# 3. Construir e iniciar el backend
Write-Host "Construyendo el backend..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\backend"
docker build -t llm-audio-backend .

Write-Host "Iniciando el backend..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "docker" -ArgumentList "run -d --name backend -p 8001:8001 -v ${PWD}:/app -v ${PWD}/logs:/app/logs --env-file .env --link postgres --link redis llm-audio-backend"

# 4. Construir e iniciar el frontend
Write-Host "Construyendo el frontend..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\frontend"
docker build -t llm-audio-frontend .

Write-Host "Iniciando el frontend..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "docker" -ArgumentList "run -d --name frontend -p 3002:3002 -v ${PWD}:/app -v /app/node_modules --env-file .env --link backend llm-audio-frontend"

# Mostrar estado de los contenedores
Set-Location -Path $PSScriptRoot
Write-Host ""
Write-Host "Servicios iniciados correctamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend:   http://localhost:3002" -ForegroundColor Cyan
Write-Host "Backend:    http://localhost:8001" -ForegroundColor Cyan
Write-Host "API Docs:   http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host "PostgreSQL: localhost:5432" -ForegroundColor Cyan
Write-Host "Redis:      localhost:6379" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para ver los logs: docker logs -f backend" -ForegroundColor Yellow
