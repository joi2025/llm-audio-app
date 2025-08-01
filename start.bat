@echo off
chcp 65001 >nul
title Asistente de Voz - Inicio Rápido

echo ==========================================
echo  Asistente de Voz - Inicio Rápido
echo ==========================================
echo.

:: Verificar Python
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python no está instalado o no está en el PATH.
    echo.
    echo Por favor, instale Python 3.8 o superior desde:
    echo https://www.python.org/downloads/
    echo.
    echo IMPORTANTE: Marque "Add Python to PATH" durante la instalación.
    pause
    exit /b 1
)

:: Verificar Node.js
npm --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js no está instalado o no está en el PATH.
    echo.
    echo Por favor, instale Node.js LTS desde:
    echo https://nodejs.org/
    pause
    exit /b 1
)

:: Crear y activar entorno virtual
echo Creando entorno virtual...
python -m venv venv
call venv\Scripts\activate.bat

:: Instalar dependencias de Python
echo Instalando dependencias de Python...
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Error al instalar dependencias de Python.
    pause
    exit /b 1
)

:: Instalar dependencias de Node.js
echo Instalando dependencias de Node.js...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Error al instalar dependencias de Node.js.
    pause
    exit /b 1
)

:: Construir frontend
echo Construyendo aplicación frontend...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Error al construir el frontend.
    pause
    exit /b 1
)

cd ..

:: Iniciar servidores
echo Iniciando servidores...
start "Backend" cmd /k "@echo off && chcp 65001 && title Backend - Asistente de Voz && call venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

timeout /t 5 /nobreak >nul

start "Frontend" cmd /k "@echo off && chcp 65001 && title Frontend - Asistente de Voz && cd frontend && npm run dev -- --port 5173 --host"

timeout /t 5 /nobreak >nul

start "" "http://localhost:5173"

echo.
echo ==========================================
echo  El Asistente de Voz se está ejecutando
echo ==========================================
echo.
echo - Backend:  http://localhost:8000
echo - Frontend: http://localhost:5173
echo.
echo Presiona cualquier tecla para mostrar/ocultar esta ventana...
pause >nul
