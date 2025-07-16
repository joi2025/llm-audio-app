# Script para generar y configurar clave SSH
$ErrorActionPreference = "Stop"

# Generar nueva clave SSH
Write-Host "Generando clave SSH..." -ForegroundColor Yellow
$sshDir = "$env:USERPROFILE\.ssh"
if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir -Force
}

$sshKeyPath = Join-Path $sshDir "github_rsa"
if (Test-Path $sshKeyPath) {
    Remove-Item $sshKeyPath -Force
}

# Generar clave SSH con comentario
$comment = "github.com"
ssh-keygen -t rsa -b 4096 -C $comment -f $sshKeyPath -N ""

# Mostrar clave pública
Write-Host "" -ForegroundColor Green
Write-Host "Clave pública generada. Copia todo el contenido siguiente:" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Get-Content "$sshKeyPath.pub"
Write-Host "" -ForegroundColor Green
Write-Host "" -ForegroundColor Green

# Instrucciones
Write-Host "Ahora necesitas:" -ForegroundColor Yellow
Write-Host "1. Copiar la clave pública completa (desde ssh-rsa hasta el final)" -ForegroundColor Yellow
Write-Host "2. Ir a GitHub.com → Settings → SSH and GPG keys → New SSH key" -ForegroundColor Yellow
Write-Host "3. Darle un título (por ejemplo: 'Windows PC')" -ForegroundColor Yellow
Write-Host "4. Pegar la clave pública en el campo de clave" -ForegroundColor Yellow
Write-Host "5. Hacer clic en 'Add SSH key'" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Yellow

# Configurar el agente SSH
Write-Host "Configurando agente SSH..." -ForegroundColor Yellow
Start-Service ssh-agent
ssh-add $sshKeyPath

Write-Host "Clave SSH configurada correctamente" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "¡Importante! Ahora necesitas:" -ForegroundColor Yellow
Write-Host "1. Configurar el remoto con SSH:" -ForegroundColor Yellow
Write-Host "   git remote set-url origin git@github.com:joi2025/mi-asistente-voz.git" -ForegroundColor Yellow
Write-Host "2. Intentar hacer push nuevamente" -ForegroundColor Yellow
