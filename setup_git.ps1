# Script para configurar y subir el repositorio a GitHub
$ErrorActionPreference = "Stop"

# Inicializar git si no existe
if (-not (Test-Path ".git")) {
    Write-Host "Inicializando git..." -ForegroundColor Yellow
    git init
}

# Configurar el remoto
Write-Host "Configurando remoto..." -ForegroundColor Yellow
$remoteUrl = "https://github.com/joi2025/mi-asistente-voz.git"

# Eliminar remoto existente si hay
if (git remote -v | Select-String -Pattern "origin") {
    git remote remove origin
}

# Agregar nuevo remoto
Write-Host "Agregando remoto..." -ForegroundColor Yellow
git remote add origin $remoteUrl

# Agregar archivos
Write-Host "Agregando archivos..." -ForegroundColor Yellow
git add .

# Crear archivo .gitignore si no existe
if (-not (Test-Path ".gitignore")) {
    Write-Host "Creando .gitignore..." -ForegroundColor Yellow
    $gitignoreContent = @"
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual Environment
venv/
ENV/
env/

# Logs
*.log
logs/

# Environment variables
.env
.env.backup
.env.example

# IDE
.vscode/
.idea/

# Node
node_modules/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS
.DS_Store
Thumbs.db
"@
    $gitignoreContent | Out-File -FilePath ".gitignore" -Encoding UTF8
}

# Crear commit inicial
Write-Host "Creando commit inicial..." -ForegroundColor Yellow
git commit -m "Initial commit"

# Subir cambios
Write-Host "Subiendo cambios..." -ForegroundColor Yellow
git push -u origin main

Write-Host "Repositorio configurado y subido correctamente" -ForegroundColor Green
