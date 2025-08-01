# Script de instalación para LLM Audio App
# Este script configura el entorno e instala todas las dependencias necesarias

# Configuración
$ErrorActionPreference = "Stop"
$ProgressPreference = 'SilentlyContinue'

# Función para mostrar mensajes de estado
function Write-Status {
    param([string]$Message)
    Write-Host "[+] $Message" -ForegroundColor Cyan
}

# Verificar Python
Write-Status "Verificando Python..."
try {
    $pythonVersion = (python --version 2>&1 | Out-String).Trim()
    if ($pythonVersion -match "Python 3.1[0-9]" -or $pythonVersion -match "Python 3.13") {
        Write-Host "  $pythonVersion detectado" -ForegroundColor Green
    } else {
        Write-Host "  Versión de Python no soportada: $pythonVersion" -ForegroundColor Yellow
        Write-Host "  Se recomienda Python 3.10 o 3.11" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Python no encontrado. Por favor instala Python 3.10 o superior" -ForegroundColor Red
    exit 1
}

# Crear y activar entorno virtual
Write-Status "Configurando entorno virtual..."
python -m venv venv
.\venv\Scripts\Activate

# Actualizar pip
Write-Status "Actualizando pip..."
python -m pip install --upgrade pip

# Instalar dependencias básicas primero
Write-Status "Instalando dependencias básicas..."
$basicDeps = @(
    "numpy==2.0.0",
    "setuptools>=65.5.1",
    "wheel>=0.40.0"
)

foreach ($dep in $basicDeps) {
    Write-Host "  Instalando $dep..."
    pip install $dep --no-cache-dir
}

# Instalar dependencias de Windows
Write-Status "Instalando dependencias de Windows..."
# Instalar pywin32 de forma correcta para TTS
python -m pip install pywin32==306
python -m pip install comtypes
python -m pip install pypiwin32==223

# Registrar las DLLs de pywin32
$pyPath = python -c "import sys; print(sys.executable)"
$pyDir = [System.IO.Path]::GetDirectoryName($pyPath)
$pywin32_postinstall = Join-Path $pyDir "Scripts\pywin32_postinstall.py"
if (Test-Path $pywin32_postinstall) {
    Write-Status "Registrando DLLs de pywin32..."
    Start-Process -FilePath $pyPath -ArgumentList $pywin32_postinstall -ArgumentList "-install" -NoNewWindow -Wait
}

# Instalar dependencias principales
Write-Status "Instalando dependencias principales..."
$mainDeps = @(
    "fastapi==0.109.0",
    "uvicorn[standard]==0.27.0",
    "python-multipart==0.0.6",
    "python-dotenv==1.0.0",
    "pydantic==2.5.0",
    "python-jose[cryptography]==3.3.0",
    "passlib[bcrypt]==1.7.4",
    "websockets==12.0",
    "httpx==0.27.0",
    "openai==1.12.0",
    "openai-whisper==20231117",
    "pydub==0.25.1",
    "soundfile==0.12.1",
    "pyttsx3==2.90"
)

foreach ($dep in $mainDeps) {
    Write-Host "  Instalando $dep..."
    pip install $dep --no-cache-dir
}

# Verificar instalación
Write-Status "Verificando la instalación..."
try {
    python -c "import fastapi, uvicorn, websockets, openai, dotenv, pyttsx3, numpy, pydantic"
    Write-Host "  ¡Todas las dependencias se instalaron correctamente!" -ForegroundColor Green
} catch {
    Write-Host "  Hubo un error al verificar las dependencias: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n¡Instalación completada con éxito!" -ForegroundColor Green
Write-Host "Para iniciar la aplicación, ejecuta: .\start.ps1" -ForegroundColor Yellow
