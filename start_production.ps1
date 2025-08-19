# Script de Producción - LLM Audio App
# Versión optimizada para español con detección automática de voz

Write-Host "🚀 Iniciando LLM Audio App - Modo Producción" -ForegroundColor Green
Write-Host "🎭 Con sistema de personalidades avanzado" -ForegroundColor Cyan
Write-Host "🤖 Detección automática de voz activada" -ForegroundColor Yellow

# Verificar dependencias
Write-Host "`n📋 Verificando dependencias..." -ForegroundColor Blue

# Backend
if (!(Test-Path "backend/venv")) {
    Write-Host "❌ Entorno virtual no encontrado. Ejecuta setup.ps1 primero" -ForegroundColor Red
    exit 1
}

# Frontend
if (!(Test-Path "frontend/node_modules")) {
    Write-Host "❌ Node modules no encontrados. Ejecuta setup.ps1 primero" -ForegroundColor Red
    exit 1
}

# Variables de entorno
if (!(Test-Path ".env")) {
    Write-Host "⚠️ Archivo .env no encontrado. Creando plantilla..." -ForegroundColor Yellow
    $envContent = @"
# OpenAI Configuration
OPENAI_API_KEY=tu_api_key_aqui
OPENAI_BASE_URL=https://api.openai.com/v1

# Server Configuration
BACKEND_PORT=8001
FRONTEND_PORT=3001

# Optimizations for Spanish
DEFAULT_VOICE=nova
DEFAULT_MODEL=gpt-4o-mini
DEFAULT_LANGUAGE=es
"@
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "📝 Configura tu API key en .env antes de continuar" -ForegroundColor Yellow
    exit 1
}

# Iniciar servicios
Write-Host "`n🔧 Iniciando servicios..." -ForegroundColor Blue

# Backend
Write-Host "🐍 Iniciando backend optimizado..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; backend/venv/Scripts/Activate.ps1; python backend/run.py" -WindowStyle Minimized

# Esperar backend
Start-Sleep -Seconds 3

# Frontend
Write-Host "⚛️ Iniciando frontend con v2 Auto..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/frontend'; npm run dev" -WindowStyle Minimized

# Esperar frontend
Start-Sleep -Seconds 5

Write-Host "`n✅ Servicios iniciados correctamente!" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:8001" -ForegroundColor Cyan
Write-Host "🤖 Usa el botón 'v2 Auto' para detección automática" -ForegroundColor Yellow

# Abrir navegador
Start-Process "http://localhost:3001"

Write-Host "`n🎉 ¡Listo! Tu asistente de voz con personalidades está funcionando" -ForegroundColor Green
Write-Host "Presiona cualquier tecla para salir..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
