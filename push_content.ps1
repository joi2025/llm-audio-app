# Script para subir el contenido al repositorio
$ErrorActionPreference = "Stop"

# Configurar remoto SSH
Write-Host "Configurando remoto SSH..." -ForegroundColor Yellow
git remote set-url origin git@github.com:joi2025/mi-asistente-voz.git

# Verificar configuración
Write-Host "Verificando configuración del remoto..." -ForegroundColor Yellow
git remote -v

# Agregar archivos
Write-Host "Agregando archivos..." -ForegroundColor Yellow
git add .

# Hacer commit
Write-Host "Haciendo commit..." -ForegroundColor Yellow
git commit -m "Subida inicial del proyecto"

# Hacer push
Write-Host "Subiendo cambios..." -ForegroundColor Yellow
git push -u origin main

Write-Host "¡Contenido subido exitosamente!" -ForegroundColor Green
