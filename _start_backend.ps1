# Activar el entorno virtual
if (Test-Path ".\venv\Scripts\Activate.ps1") {
    .\venv\Scripts\Activate.ps1
} else {
    Write-Host "Virtual environment not found. Please run install.ps1 first."
    exit 1
}

# Cambiar al directorio backend
Set-Location backend

# Configurar PYTHONPATH para incluir el directorio raíz del proyecto
$env:PYTHONPATH = "$PWD\.."

# Instalar el paquete en modo desarrollo
pip install -e ..

# Iniciar el servidor FastAPI
uvicorn main:app --reload --host 0.0.0.0 --port 8000
