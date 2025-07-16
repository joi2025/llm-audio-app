@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   ASISTENTE DE VOZ - INICIANDO BACKEND
echo ========================================

:: Verificar si estamos en la carpeta correcta
if not exist "backend" (
    echo [ERROR] Por favor ejecuta este script desde la carpeta raíz del proyecto
    pause
    exit /b 1
)

:: Cambiar al directorio backend
cd backend

:: Verificar si el entorno virtual existe
if not exist "venv\" (
    echo [ERROR] El entorno virtual no existe. Por favor ejecuta primero el script de instalación
    pause
    exit /b 1
)

:: Activar entorno virtual
call venv\Scripts\activate
if !errorlevel! neq 0 (
    echo [ERROR] No se pudo activar el entorno virtual
    pause
    exit /b 1
)

:: Verificar si .env existe
if not exist ".env" (
    echo [ERROR] No se encontró el archivo .env. Asegúrate de configurar tu API key de OpenAI
    pause
    exit /b 1
)

echo [INFO] Iniciando el servidor...
echo [INFO] Presiona Ctrl+C para detener el servidor

echo.
echo ========================================
echo   SERVIDOR LISTO EN: http://localhost:8000
echo   RUTA WEBSOCKET: ws://localhost:8000/ws
echo ========================================
echo.

:: Iniciar el servidor
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

:: Si hay un error
if !errorlevel! neq 0 (
    echo.
    echo [ERROR] No se pudo iniciar el servidor
    pause
)

:: Pausa para que la ventana no se cierre inmediatamente
pause

