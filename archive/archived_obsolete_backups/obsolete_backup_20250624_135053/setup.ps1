# Script de instalación y configuración para Windows
# Este script:
# 1. Verifica y configura Python
# 2. Instala las dependencias del backend
# 3. Verifica y configura Node.js
# 4. Instala las dependencias del frontend
# 5. Configura el PATH necesario
# 6. Ejecuta los servidores

# Función para verificar y configurar Python
function Configure-Python {
    Write-Host "Verificando Python..."
    
    # Verificar si Python está instalado
    $pythonPath = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonPath) {
        Write-Host "Python no encontrado. Instalando..."
        # Descargar e instalar Python
        $pythonUrl = "https://www.python.org/ftp/python/3.11.4/python-3.11.4-amd64.exe"
        $pythonInstaller = "C:\Users\Personal\Downloads\python-installer.exe"
        Invoke-WebRequest -Uri $pythonUrl -OutFile $pythonInstaller
        
        # Ejecutar el instalador de Python con opciones necesarias
        Start-Process -FilePath $pythonInstaller -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1 Include_test=0" -Wait
        
        # Limpiar archivo de instalación
        Remove-Item $pythonInstaller
    }
    
    # Verificar pip
    python -m ensurepip --upgrade
}

# Función para verificar y configurar Node.js
function Configure-NodeJs {
    Write-Host "Verificando Node.js..."
    
    # Verificar si Node.js está instalado
    $nodePath = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodePath) {
        Write-Host "Node.js no encontrado. Instalando..."
        # Descargar e instalar Node.js LTS
        $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
        $nodeInstaller = "C:\Users\Personal\Downloads\node-installer.msi"
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller
        
        # Ejecutar el instalador de Node.js
        Start-Process -FilePath msiexec -ArgumentList "/i $nodeInstaller /quiet" -Wait
        
        # Limpiar archivo de instalación
        Remove-Item $nodeInstaller
    }
}

# Función para configurar el PATH
function Configure-Path {
    Write-Host "Configurando PATH..."
    
    # Agregar Python y Scripts a PATH
    $pythonPath = "C:\Users\Personal\AppData\Local\Programs\Python\Python311"
    $pythonScripts = "C:\Users\Personal\AppData\Local\Programs\Python\Python311\Scripts"
    $npmPath = "C:\Program Files\nodejs"
    
    # Verificar y agregar al PATH
    $currentPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    if (-not $currentPath.Contains($pythonPath)) {
        [System.Environment]::SetEnvironmentVariable("Path", $currentPath + ";" + $pythonPath, "User")
    }
    if (-not $currentPath.Contains($pythonScripts)) {
        [System.Environment]::SetEnvironmentVariable("Path", $currentPath + ";" + $pythonScripts, "User")
    }
    if (-not $currentPath.Contains($npmPath)) {
        [System.Environment]::SetEnvironmentVariable("Path", $currentPath + ";" + $npmPath, "User")
    }
    
    # Actualizar PATH actual
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# Función para instalar dependencias
function Install-Dependencies {
    Write-Host "Instalando dependencias..."
    
    # Instalar dependencias del backend
    Set-Location -Path "C:\Users\Personal\CascadeProjects\llm-audio-app\backend"
    python -m pip install -r requirements.txt
    
    # Instalar dependencias del frontend
    Set-Location -Path "C:\Users\Personal\CascadeProjects\llm-audio-app\frontend"
    npm install
}

# Función para iniciar los servidores
function Start-Servers {
    Write-Host "Iniciando servidores..."
    
    # Iniciar backend en una nueva ventana
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\Personal\CascadeProjects\llm-audio-app'; python -m uvicorn backend.main:app --reload"
    
    # Esperar un momento para que el backend se inicie
    Start-Sleep -Seconds 2
    
    # Iniciar frontend en otra ventana
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\Personal\CascadeProjects\llm-audio-app\frontend'; npm run dev"
}

# Ejecutar las funciones en orden
Configure-Python
Configure-NodeJs
Configure-Path
Install-Dependencies
Start-Servers

Write-Host "Configuración completada. Los servidores están iniciando..."
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Puedes acceder a la aplicación una vez que ambos servidores estén listos."

