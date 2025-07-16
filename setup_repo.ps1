# Script para configurar el repositorio Git y subir el contenido
$ErrorActionPreference = "Stop"

# Configuración
$repoUrl = "git@github.com:joi2025/mi-asistente-voz.git"
$branch = "main"

# Verificar si es un repositorio Git
$isGitRepo = Test-Path -Path ".git" -PathType Container

if (-not $isGitRepo) {
    Write-Host "Inicializando repositorio Git..." -ForegroundColor Yellow
    git init
}

# Configurar remoto
Write-Host "Configurando remoto..." -ForegroundColor Yellow
$currentRemote = git remote get-url origin 2>$null

if ($LASTEXITCODE -ne 0 -or -not $currentRemote) {
    git remote add origin $repoUrl
    Write-Host "Remoto configurado correctamente" -ForegroundColor Green
} else {
    git remote set-url origin $repoUrl
    Write-Host "Remoto actualizado correctamente" -ForegroundColor Green
}

# Verificar rama
$currentBranch = git branch --show-current 2>$null
if (-not $currentBranch) {
    git checkout -b $branch
}

# Agregar y hacer commit
Write-Host "Agregando archivos..." -ForegroundColor Yellow
git add .

try {
    Write-Host "Haciendo commit..." -ForegroundColor Yellow
    git commit -m "Subida inicial del proyecto"
    
    # Forzar push en caso de que el historial sea diferente
    Write-Host "Subiendo cambios..." -ForegroundColor Yellow
    git push -u origin $branch --force
    
    Write-Host "¡Contenido subido exitosamente!" -ForegroundColor Green
} catch {
    Write-Host "Error al hacer commit o push: $_" -ForegroundColor Red
    Write-Host "Intenta ejecutar 'git status' para ver el estado actual" -ForegroundColor Yellow
}
