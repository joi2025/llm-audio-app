# Verificar si el archivo .env existe
if (-not (Test-Path .env)) {
    Write-Host "❌ No se encontró el archivo .env. Creando uno nuevo..."
    Copy-Item .env.example -Destination .env
}

# Verificar si las variables necesarias están configuradas
$envFile = Get-Content .env

# Verificar OpenAI API Key
if (-not ($envFile -match "OPENAI_API_KEY")) {
    Write-Host "❌ No se encontró OPENAI_API_KEY en el archivo .env"
    Write-Host "Por favor, configura tu clave de API de OpenAI en el archivo .env"
    exit 1
}

# Verificar WebSocket URL
if (-not ($envFile -match "VITE_WEBSOCKET_URL")) {
    Write-Host "❌ No se encontró VITE_WEBSOCKET_URL en el archivo .env"
    Write-Host "Añadiendo configuración predeterminada..."
    Add-Content -Path .env -Value "VITE_WEBSOCKET_URL=ws://localhost:8001/ws/assistant"
}

Write-Host "✅ Variables de entorno configuradas correctamente!" -ForegroundColor Green
