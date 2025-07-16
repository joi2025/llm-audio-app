# Script principal de inicio
$ErrorActionPreference = "Stop"

# Funciones auxiliares
function Start-Backend {
    Write-Host "Iniciando backend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "cd backend; python run.py --reload" -WindowStyle Hidden
}

function Start-Frontend {
    Write-Host "Iniciando frontend..." -ForegroundColor Yellow
    Start-Process npm -ArgumentList "run dev" -WorkingDirectory "frontend" -WindowStyle Hidden
}

# Iniciar servicios
Write-Host "Iniciando servicios..." -ForegroundColor Green
Start-Backend
Start-Sleep -Seconds 2
Start-Frontend

Write-Host "Servicios iniciados correctamente" -ForegroundColor Green
