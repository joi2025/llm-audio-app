# Script de instalación y configuración avanzada para Windows
# Versión mejorada con verificaciones exhaustivas y optimizaciones

# Configuración de logging
$logFile = "C:\Users\Personal\CascadeProjects\llm-audio-app\setup.log"
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Write-Host $logEntry
    Add-Content -Path $logFile -Value $logEntry
}

# Función para verificar y configurar Python con optimizaciones
function Configure-Python-Advanced {
    Write-Log "Iniciando configuración de Python..."
    
    # Verificar versiones disponibles
    $pythonVersions = @(
        "3.11.4",
        "3.10.11",
        "3.9.18"
    )
    
    # Verificar si Python está instalado correctamente
    $pythonInstalled = $false
    $pythonPath = $null
    $pythonVersions | ForEach-Object {
        $version = $_
        $pythonPath = "C:\Users\Personal\AppData\Local\Programs\Python\Python$($version.Replace('.', ''))"
        if (Test-Path $pythonPath) {
            $pythonInstalled = $true
            Write-Log "Python $version encontrado en: $pythonPath"
            break
        }
    }
    
    if (-not $pythonInstalled) {
        Write-Log "Python no encontrado. Iniciando instalación..."
        
        # Descargar la última versión estable
        $pythonUrl = "https://www.python.org/ftp/python/3.11.4/python-3.11.4-amd64.exe"
        $pythonInstaller = Join-Path $env:TEMP "python-installer.exe"
        
        try {
            Write-Log "Descargando Python..."
            Invoke-WebRequest -Uri $pythonUrl -OutFile $pythonInstaller -ErrorAction Stop
            
            Write-Log "Instalando Python..."
            $installArgs = @(
                "/quiet",
                "InstallAllUsers=1",
                "PrependPath=1",
                "Include_test=0",
                "TargetDir=$pythonPath"
            )
            Start-Process -FilePath $pythonInstaller -ArgumentList $installArgs -Wait -ErrorAction Stop
            
            # Verificar instalación
            if (Test-Path $pythonPath) {
                Write-Log "Python instalado correctamente"
            } else {
                Write-Log "Error: Python no se instaló correctamente"
                exit 1
            }
        }
        catch {
            Write-Log "Error al instalar Python: $_"
            exit 1
        }
        finally {
            if (Test-Path $pythonInstaller) {
                Remove-Item $pythonInstaller
            }
        }
    }
    
    # Optimizaciones de Python
    Write-Log "Aplicando optimizaciones de Python..."
    python -m pip install --upgrade pip setuptools wheel
    python -m pip install --upgrade uvloop
    
    # Verificar instalación de uvloop
    try {
        python -c "import uvloop" -ErrorAction Stop
        Write-Log "uvloop instalado correctamente"
    }
    catch {
        Write-Log "Advertencia: uvloop no se pudo instalar"
    }
}

# Función para configurar Node.js con verificaciones adicionales
function Configure-NodeJs-Advanced {
    Write-Log "Iniciando configuración de Node.js..."
    
    # Verificar Node.js
    $nodePath = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodePath) {
        Write-Log "Node.js no encontrado. Iniciando instalación..."
        
        # Descargar Node.js LTS
        $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
        $nodeInstaller = Join-Path $env:TEMP "node-installer.msi"
        
        try {
            Write-Log "Descargando Node.js..."
            Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller -ErrorAction Stop
            
            Write-Log "Instalando Node.js..."
            $installArgs = @(
                "/i",
                $nodeInstaller,
                "/quiet",
                "INSTALLDIR=C:\Program Files\nodejs"
            )
            Start-Process -FilePath msiexec -ArgumentList $installArgs -Wait -ErrorAction Stop
            
            # Verificar instalación
            if (Test-Path "C:\Program Files\nodejs") {
                Write-Log "Node.js instalado correctamente"
            } else {
                Write-Log "Error: Node.js no se instaló correctamente"
                exit 1
            }
        }
        catch {
            Write-Log "Error al instalar Node.js: $_"
            exit 1
        }
        finally {
            if (Test-Path $nodeInstaller) {
                Remove-Item $nodeInstaller
            }
        }
    }
    
    # Optimizaciones de Node.js
    Write-Log "Aplicando optimizaciones de Node.js..."
    npm config set cache "C:\Users\Personal\AppData\Local\npm-cache" --global
    npm config set prefix "C:\Program Files\nodejs" --global
    npm config set scripts-prepend-node-path true --global
}

# Función para configurar el PATH con verificación
function Configure-Path-Advanced {
    Write-Log "Configurando PATH..."
    
    # Rutas necesarias
    $pathsToAdd = @(
        "C:\Users\Personal\AppData\Local\Programs\Python\Python311",
        "C:\Users\Personal\AppData\Local\Programs\Python\Python311\Scripts",
        "C:\Program Files\nodejs",
        "C:\Program Files\nodejs\node_modules\npm\bin"
    )
    
    # Obtener PATH actual
    $currentPath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    # Verificar y agregar rutas
    foreach ($path in $pathsToAdd) {
        if (-not $currentPath.Contains($path) -and -not $userPath.Contains($path)) {
            Write-Log "Agregando $path al PATH"
            [System.Environment]::SetEnvironmentVariable("Path", $currentPath + ";" + $path, "Machine")
        }
    }
    
    # Actualizar PATH actual
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + 
                [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    # Verificar PATH
    Write-Log "Verificando PATH..."
    foreach ($path in $pathsToAdd) {
        if ($env:Path.Contains($path)) {
            Write-Log "✓ $path está en PATH"
        } else {
            Write-Log "✗ $path no está en PATH"
        }
    }
}

# Función para instalar dependencias con verificación
function Install-Dependencies-Advanced {
    Write-Log "Iniciando instalación de dependencias..."
    
    # Configurar entorno virtual para backend
    Set-Location -Path "C:\Users\Personal\CascadeProjects\llm-audio-app\backend"
    
    Write-Log "Configurando entorno virtual..."
    python -m venv .venv
    .\.venv\Scripts\activate
    
    Write-Log "Instalando dependencias del backend..."
    python -m pip install -r requirements.txt
    
    # Verificar instalación
    $requiredPackages = @(
        "fastapi",
        "uvicorn",
        "httpx",
        "python-dotenv"
    )
    
    foreach ($package in $requiredPackages) {
        try {
            python -c "import $package" -ErrorAction Stop
            Write-Log "✓ $package instalado correctamente"
        }
        catch {
            Write-Log "✗ Error al verificar $package"
        }
    }
    
    # Instalar dependencias del frontend
    Set-Location -Path "C:\Users\Personal\CascadeProjects\llm-audio-app\frontend"
    
    Write-Log "Instalando dependencias del frontend..."
    npm install --legacy-peer-deps
    
    # Verificar instalación del frontend
    if (Test-Path "node_modules") {
        Write-Log "✓ Dependencias del frontend instaladas correctamente"
    } else {
        Write-Log "✗ Error al instalar dependencias del frontend"
    }
}

# Función para iniciar servidores con monitorización
function Start-Servers-Advanced {
    Write-Log "Iniciando servidores..."
    
    # Función para verificar conexión
    function Test-Connection {
        param([string]$Url)
        try {
            $result = Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec 5 -ErrorAction SilentlyContinue
            return $result.StatusCode -eq 200
        }
        catch {
            return $false
        }
    }
    
    # Iniciar backend
    Write-Log "Iniciando servidor backend..."
    Set-Location -Path "C:\Users\Personal\CascadeProjects\llm-audio-app"
    $backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\Personal\CascadeProjects\llm-audio-app'; .\.venv\Scripts\activate; python -m uvicorn backend.main:app --reload" -PassThru
    
    # Esperar a que el backend esté listo
    $backendReady = $false
    for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Seconds 2
        if (Test-Connection "http://localhost:8000") {
            $backendReady = $true
            break
        }
    }
    
    if ($backendReady) {
        Write-Log "✓ Backend iniciado correctamente"
    } else {
        Write-Log "✗ Error: Backend no se inició correctamente"
    }
    
    # Iniciar frontend
    Write-Log "Iniciando servidor frontend..."
    Set-Location -Path "C:\Users\Personal\CascadeProjects\llm-audio-app\frontend"
    $frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -PassThru
    
    # Esperar a que el frontend esté listo
    $frontendReady = $false
    for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Seconds 2
        if (Test-Connection "http://localhost:5173") {
            $frontendReady = $true
            break
        }
    }
    
    if ($frontendReady) {
        Write-Log "✓ Frontend iniciado correctamente"
    } else {
        Write-Log "✗ Error: Frontend no se inició correctamente"
    }
    
    # Mostrar resumen final
    Write-Log ""`nResumen de la instalación:"
    Write-Log "Backend: $(if($backendReady) {"✓"} else {"✗"}) http://localhost:8000"
    Write-Log "Frontend: $(if($frontendReady) {"✓"} else {"✗"}) http://localhost:5173"
    Write-Log "Log completo: $logFile"
}

# Ejecutar las funciones principales
try {
    Write-Log "=== Inicio del proceso de instalación ==="
    Configure-Python-Advanced
    Configure-NodeJs-Advanced
    Configure-Path-Advanced
    Install-Dependencies-Advanced
    Start-Servers-Advanced
    Write-Log "=== Proceso de instalación completado ==="
}
catch {
    Write-Log "=== ERROR CRÍTICO ==="
    Write-Log "Error fatal: $_"
    Write-Log "Verifique el log completo en: $logFile"
    exit 1
}

