<#
.SYNOPSIS
   Gestor avanzado de servicios LLM-Audio-App
#>

# Configuración
$LOG_DIR = "$PSScriptRoot/logs"
New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null

# 1. Verificar e instalar PM2 si no existe
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando PM2..."
    npm install -g pm2
}

# 2. Detener servicios existentes
pm2 delete all

# 3. Iniciar servicios
pm2 start "$PSScriptRoot/ecosystem.config.js"

# 4. Configurar inicio automático
pm2 startup | Out-Null
pm2 save

# 5. Mostrar estado
Write-Host "`n=== SERVICIOS LLM-AUDIO-APP ==="
Write-Host "Backend:  http://localhost:8000"
Write-Host "Frontend: http://localhost:3001"
Write-Host "Logs:     $LOG_DIR"
Write-Host "`nComandos útiles:"
Write-Host "- pm2 status    : Ver estado"
Write-Host "- pm2 logs      : Mostrar logs"
Write-Host "- pm2 monit     : Monitor en tiempo real"

# Mantener terminal abierta
Read-Host "`nPresiona Enter para ver el estado..."
pm2 status

