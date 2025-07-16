# Script para configurar Git
$ErrorActionPreference = "Stop"

# Configurar información del usuario
Write-Host "Configurando información del usuario..." -ForegroundColor Yellow
git config --global user.email "net2016b@gmail.com"
git config --global user.name "joi2025"

# Configurar manejo de finales de línea
Write-Host "Configurando manejo de finales de línea..." -ForegroundColor Yellow
git config --global core.autocrlf true
git config --global core.safecrlf true

# Crear .gitattributes
Write-Host "Creando archivo .gitattributes..." -ForegroundColor Yellow
$gitAttributes = "* text=auto eol=lf"
$gitAttributes | Out-File -FilePath ".gitattributes" -Encoding UTF8

# Verificar configuración
Write-Host "Verificando configuración..." -ForegroundColor Yellow
git config --list

Write-Host "Git configurado correctamente" -ForegroundColor Green
