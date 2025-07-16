@echo off
setlocal enabledelayedexpansion

:: Título de la ventana
title ASISTENTE DE VOZ - INICIANDO
color 0A

:: Verificar e instalar dependencias
call :check_dependencies

:: Mostrar menú principal
:menu_principal
cls
echo ========================================
echo   ASISTENTE DE VOZ - MENU PRINCIPAL
echo ========================================
echo.
echo 1. Iniciar todo (Backend + Frontend)
echo 2. Iniciar solo Backend
echo 3. Iniciar solo Frontend
echo 4. Detener todo
echo 5. Salir
echo.
set /p opcion=Selecciona una opción (1-5): 

if "%opcion%"=="1" goto iniciar_todo
if "%opcion%"=="2" goto iniciar_backend
if "%opcion%"=="3" goto iniciar_frontend
if "%opcion%"=="4" goto detener_todo
if "%opcion%"=="5" exit /b
goto menu_principal

:: Función para verificar e instalar dependencias
:check_dependencies
if not exist "%CD%\backend\venv\Scripts\python.exe" (
    echo [INFO] Creando entorno virtual...
    python -m venv "%CD%\backend\venv"
    if errorlevel 1 (
        echo [ERROR] No se pudo crear el entorno virtual. Asegúrate de tener Python instalado.
        pause
        exit /b 1
    )
    
    echo [INFO] Instalando dependencias...
    call "%CD%\backend\venv\Scripts\activate"
    "%CD%\backend\venv\Scripts\python.exe" -m pip install --upgrade pip
    "%CD%\backend\venv\Scripts\pip.exe" install fastapi uvicorn python-dotenv openai python-multipart websockets
    
    if exist "%CD%\backend\requirements.txt" (
        "%CD%\backend\venv\Scripts\pip.exe" install -r "%CD%\backend\requirements.txt"
    )
    
    echo [INFO] Dependencias instaladas correctamente.
    echo.
) else (
    echo [INFO] Entorno virtual encontrado en: %CD%\backend\venv
)

goto :eof

:inicio
cls
echo ========================================
echo   ASISTENTE DE VOZ - MENU PRINCIPAL
echo ========================================
echo.
echo 1. Iniciar todo (Backend + Frontend)
echo 2. Iniciar solo Backend
echo 3. Iniciar solo Frontend
echo 4. Detener todo
echo 5. Salir
echo.
set /p opcion="Selecciona una opción (1-5): "

if "%opcion%"=="1" goto iniciar_todo
if "%opcion%"=="2" goto iniciar_backend
if "%opcion%"=="3" goto iniciar_frontend
if "%opcion%"=="4" goto detener_todo
if "%opcion%"=="5" exit /b
goto inicio

:iniciar_todo
cls
echo ========================================
echo   INICIANDO BACKEND Y FRONTEND
echo ========================================
echo.

echo [1/4] Deteniendo procesos existentes...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq BACKEND*" >nul 2>&1
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq FRONTEND*" >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/4] Iniciando Backend...
set VENV_PYTHON="%CD%\backend\venv\Scripts\python.exe"
set VENV_ACTIVATE="%CD%\backend\venv\Scripts\activate"

if exist %VENV_PYTHON% (
    echo [INFO] Usando Python del entorno virtual: %VENV_PYTHON%
    start "BACKEND" cmd /k "@echo off && title BACKEND - SERVIDOR && cd /d %~dp0backend && call %VENV_ACTIVATE% && echo Entorno virtual activado. Iniciando servidor... && %VENV_PYTHON% -m uvicorn main:app --host 0.0.0.0 --port 8000 && pause"
) else if exist "%CD%\backend\.venv\Scripts\python.exe" (
    set VENV_PYTHON="%CD%\backend\.venv\Scripts\python.exe"
    set VENV_ACTIVATE="%CD%\backend\.venv\Scripts\activate"
    echo [INFO] Usando Python del entorno virtual: %VENV_PYTHON%
    start "BACKEND" cmd /k "@echo off && title BACKEND - SERVIDOR && cd /d %~dp0backend && call %VENV_ACTIVATE% && echo Entorno virtual activado. Iniciando servidor... && %VENV_PYTHON% -m uvicorn main:app --host 0.0.0.0 --port 8000 && pause"
) else (
    echo [ERROR] No se encontró el entorno virtual con Python en las rutas esperadas.
    echo Rutas verificadas:
    echo - %CD%\backend\venv\Scripts\python.exe
    echo - %CD%\backend\.venv\Scripts\python.exe
    echo.
    echo Por favor, asegúrate de que el entorno virtual esté creado correctamente.
    pause
    exit /b 1
)

echo [3/4] Iniciando Frontend...
start "FRONTEND" cmd /k "@echo off && title FRONTEND - INTERFAZ && cd /d %~dp0frontend && echo Instalando dependencias... && npm install >nul 2>&1 && echo Iniciando servidor de desarrollo... && npm run dev"

echo [4/4] Abriendo navegador...
timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo ========================================
echo   ¡SERVIDORES INICIADOS!
echo ========================================
echo.
echo 1. Backend:  http://localhost:8000
echo 2. Frontend: http://localhost:3000
echo 3. WebSocket: ws://localhost:8000/ws
echo.
goto fin

:iniciar_backend
cls
echo ========================================
echo   INICIANDO SOLO BACKEND
echo ========================================
echo.

echo [1/2] Deteniendo procesos de backend...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq BACKEND*" >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/2] Iniciando Backend...
set VENV_PYTHON="%CD%\backend\venv\Scripts\python.exe"
set VENV_ACTIVATE="%CD%\backend\venv\Scripts\activate"

if exist %VENV_PYTHON% (
    echo [INFO] Usando Python del entorno virtual: %VENV_PYTHON%
    start "BACKEND" cmd /k "@echo off && title BACKEND - SERVIDOR && cd /d %~dp0backend && call %VENV_ACTIVATE% && echo Entorno virtual activado. Iniciando servidor... && %VENV_PYTHON% -m uvicorn main:app --host 0.0.0.0 --port 8000 && pause"
) else if exist "%CD%\backend\.venv\Scripts\python.exe" (
    set VENV_PYTHON="%CD%\backend\.venv\Scripts\python.exe"
    set VENV_ACTIVATE="%CD%\backend\.venv\Scripts\activate"
    echo [INFO] Usando Python del entorno virtual: %VENV_PYTHON%
    start "BACKEND" cmd /k "@echo off && title BACKEND - SERVIDOR && cd /d %~dp0backend && call %VENV_ACTIVATE% && echo Entorno virtual activado. Iniciando servidor... && %VENV_PYTHON% -m uvicorn main:app --host 0.0.0.0 --port 8000 && pause"
) else (
    echo [ERROR] No se encontró el entorno virtual con Python en las rutas esperadas.
    echo Rutas verificadas:
    echo - %CD%\backend\venv\Scripts\python.exe
    echo - %CD%\backend\.venv\Scripts\python.exe
    echo.
    echo Por favor, asegúrate de que el entorno virtual esté creado correctamente.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BACKEND INICIADO EN http://localhost:8000
echo ========================================
echo.
goto fin

:iniciar_frontend
cls
echo ========================================
echo   INICIANDO SOLO FRONTEND
echo ========================================
echo.

echo [1/2] Deteniendo procesos de frontend...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq FRONTEND*" >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/2] Iniciando Frontend...
start "FRONTEND" cmd /k "@echo off && title FRONTEND - INTERFAZ && cd /d %~dp0frontend && echo Instalando dependencias... && npm install >nul 2>&1 && echo Iniciando servidor de desarrollo... && npm run dev"

echo.
echo ========================================
echo   FRONTEND INICIADO EN http://localhost:3000
echo ========================================
echo.
goto fin

:detener_todo
cls
echo ========================================
echo   DETENIENDO TODOS LOS SERVICIOS
echo ========================================
echo.

echo [1/1] Deteniendo procesos...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq BACKEND*" >nul 2>&1
taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq FRONTEND*" >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   TODOS LOS SERVICIOS HAN SIDO DETENIDOS
echo ========================================
echo.
goto fin

:fin
pause
goto inicio
