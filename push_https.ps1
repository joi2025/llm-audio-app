# Script para configurar remoto HTTPS y subir el repositorio
$ErrorActionPreference = "Stop"

# Configurar remoto HTTPS
Write-Host "Configurando remoto HTTPS..." -ForegroundColor Yellow
git remote set-url origin https://github.com/joi2025/mi-asistente-voz.git

# Verificar configuración
Write-Host "Verificando configuración del remoto..." -ForegroundColor Yellow
git remote -v

# Intentar push
Write-Host "Subiendo cambios al repositorio..." -ForegroundColor Yellow
git push -u origin main

Write-Host "Repositorio configurado y subido correctamente" -ForegroundColor Green
