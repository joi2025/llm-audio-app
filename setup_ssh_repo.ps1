# Script para configurar SSH para el repositorio
$ErrorActionPreference = "Stop"

# Verificar si ya existe una clave SSH
Write-Host "Verificando claves SSH existentes..." -ForegroundColor Yellow
$sshDir = "$env:USERPROFILE\.ssh"
$existingKeys = Get-ChildItem -Path $sshDir -Filter "*.pub" -ErrorAction SilentlyContinue

if ($existingKeys.Count -eq 0) {
    Write-Host "No se encontraron claves SSH existentes. Generando nueva clave..." -ForegroundColor Yellow
    
    # Generar nueva clave SSH
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
}

# Configurar remoto para usar SSH
Write-Host "Configurando remoto SSH..." -ForegroundColor Yellow
git remote set-url origin git@github.com:joi2025/mi-asistente-voz.git

# Verificar configuración
Write-Host "Verificando configuración del remoto..." -ForegroundColor Yellow
git remote -v

Write-Host "SSH configurado correctamente" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "¡Importante! Ahora necesitas:" -ForegroundColor Yellow
Write-Host "1. Agregar la clave pública a GitHub" -ForegroundColor Yellow
Write-Host "2. Intentar hacer push nuevamente" -ForegroundColor Yellow
