# Script de instalación básico para Windows

# 1. Verificar y configurar Python
Write-Host "=== Configurando Python ==="

# Verificar si Python está instalado
$pythonPath = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonPath) {
    Write-Host "Python no encontrado. Por favor, instala Python 3.11 desde: https://www.python.org/downloads/"
    exit 1
}

# Verificar pip
python -m ensurepip --upgrade

# 2. Instalar dependencias del backend
Write-Host "=== Instalando dependencias del backend ==="
Set-Location "C:\Users\Personal\CascadeProjects\llm-audio-app\backend"
python -m pip install -r requirements.txt

# 3. Verificar Node.js
Write-Host "=== Verificando Node.js ==="

# Verificar si Node.js está instalado
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host "Node.js no encontrado. Por favor, instala Node.js LTS desde: https://nodejs.org/"
    exit 1
}

# 4. Instalar dependencias del frontend
Write-Host "=== Instalando dependencias del frontend ==="
Set-Location "C:\Users\Personal\CascadeProjects\llm-audio-app\frontend"
npm install

# 5. Configurar PATH si es necesario
Write-Host "=== Configurando PATH ==="
$pythonPath = "C:\Users\Personal\AppData\Local\Programs\Python\Python311"
$pythonScripts = "C:\Users\Personal\AppData\Local\Programs\Python\Python311\Scripts"
$nodePath = "C:\Program Files\nodejs"

# Verificar y agregar al PATH
$currentPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
if (-not $currentPath.Contains($pythonPath)) {
    [System.Environment]::SetEnvironmentVariable("Path", $currentPath + ";" + $pythonPath, "User")
}
if (-not $currentPath.Contains($pythonScripts)) {
    [System.Environment]::SetEnvironmentVariable("Path", $currentPath + ";" + $pythonScripts, "User")
}
if (-not $currentPath.Contains($nodePath)) {
    [System.Environment]::SetEnvironmentVariable("Path", $currentPath + ";" + $nodePath, "User")
}

# 6. Iniciar servidores
Write-Host "=== Iniciando servidores ==="

# Iniciar backend
Write-Host "Iniciando backend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\Personal\CascadeProjects\llm-audio-app'; python -m uvicorn backend.main:app --reload"

# Esperar un momento
Start-Sleep -Seconds 2

# Iniciar frontend
Write-Host "Iniciando frontend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\Personal\CascadeProjects\llm-audio-app\frontend'; npm run dev"

Write-Host "=== Configuración completada ==="
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Si los servidores no se inician, verifica los logs en cada ventana de PowerShell."

