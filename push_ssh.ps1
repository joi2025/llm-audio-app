# Script para subir el repositorio usando SSH
$ErrorActionPreference = "Stop"

# Cambiar remoto a SSH
Write-Host "Configurando remoto SSH..." -ForegroundColor Yellow
git remote set-url origin git@github.com:joi2025/mi-asistente-voz.git

# Verificar remoto
Write-Host "Verificando configuración del remoto..." -ForegroundColor Yellow
git remote -v

# Intentar push
Write-Host "Subiendo cambios al repositorio..." -ForegroundColor Yellow
git push -u origin main

Write-Host "Repositorio subido correctamente" -ForegroundColor Green
