@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   INSTALANDO ASISTENTE DE VOZ
echo ========================================

:: Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no está instalado o no está en el PATH
    echo Por favor, instala Python 3.8 o superior desde https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Verificar pip
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] pip no está disponible. Asegúrate de instalar Python correctamente
    pause
    exit /b 1
)

echo [1/4] Configurando entorno virtual...
if not exist "backend\venv\" (
    echo Creando entorno virtual...
    python -m venv backend\venv
    if !errorlevel! neq 0 (
        echo [ERROR] No se pudo crear el entorno virtual
        pause
        exit /b 1
    )
)

call backend\venv\Scripts\activate
if !errorlevel! neq 0 (
    echo [ERROR] No se pudo activar el entorno virtual
    pause
    exit /b 1
)

echo [2/4] Instalando dependencias de Python...
pip install --upgrade pip
pip install -r backend\requirements.txt
if !errorlevel! neq 0 (
    echo [ERROR] Error al instalar dependencias
    pause
    exit /b 1
)

echo [3/4] Configurando archivo .env...
if not exist "backend\.env" (
    echo Creando archivo .env...
    echo OPENAI_API_KEY=tu_clave_aqui > backend\.env
    echo OPENAI_MODEL=gpt-3.5-turbo >> backend\.env
    echo SERVER_HOST=0.0.0.0 >> backend\.env
    echo SERVER_PORT=8000 >> backend\.env
    echo.
    echo [IMPORTANTE] Por favor edita backend\.env y configura tu API key de OpenAI
) else (
    echo El archivo .env ya existe, no se sobrescribirá
)

echo [4/4] Instalación completada con éxito!
echo.
echo ========================================
echo   INSTALACIÓN COMPLETADA
echo ========================================
echo.
echo Para iniciar el servidor, ejecuta:
echo   1. start_backend.bat
echo.
echo Luego, en otra ventana, puedes probar con:
echo   2. python test_websocket.py
echo.
pause

