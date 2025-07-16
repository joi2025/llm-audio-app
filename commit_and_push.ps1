# Script para hacer un commit inicial y subir los cambios
$ErrorActionPreference = "Stop"

# Verificar estado actual
Write-Host "Verificando estado del repositorio..." -ForegroundColor Yellow
git status

# Agregar todos los archivos
Write-Host "Agregando archivos al repositorio..." -ForegroundColor Yellow
git add .

# Crear commit inicial
Write-Host "Creando commit inicial..." -ForegroundColor Yellow
git commit -m "Initial commit"

# Verificar remoto
Write-Host "Verificando configuración del remoto..." -ForegroundColor Yellow
git remote -v

# Intentar push
Write-Host "Subiendo cambios al repositorio..." -ForegroundColor Yellow
git push -u origin main

Write-Host "Repositorio subido correctamente" -ForegroundColor Green
