@echo off
setlocal enabledelayedexpansion

echo ========================================
echo 🚀 DEPLOYMENT AUTOMATICO - LLM AUDIO APP
echo ========================================
echo.

REM Paso 1: Verificar herramientas
echo [PASO 1/8] Verificando herramientas...

set TOOLS_OK=1
set MISSING_TOOLS=

REM Verificar Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker no esta instalado
    set TOOLS_OK=0
    set MISSING_TOOLS=%MISSING_TOOLS% Docker
) else (
    echo ✅ Docker instalado
)

REM Verificar Docker Compose
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose no esta instalado
    set TOOLS_OK=0
    set MISSING_TOOLS=%MISSING_TOOLS% Docker-Compose
) else (
    echo ✅ Docker Compose instalado
)

REM Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python no esta instalado
    set TOOLS_OK=0
    set MISSING_TOOLS=%MISSING_TOOLS% Python
) else (
    echo ✅ Python instalado
)

REM Verificar npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm no esta instalado
    set TOOLS_OK=0
    set MISSING_TOOLS=%MISSING_TOOLS% npm
) else (
    echo ✅ npm instalado
)

if %TOOLS_OK%==0 (
    echo.
    echo ❌ ERROR: Herramientas faltantes: %MISSING_TOOLS%
    echo Por favor instala las herramientas faltantes antes de continuar.
    pause
    exit /b 1
)

echo.
echo [PASO 2/8] Buscando docker-compose.yml...

REM Buscar docker-compose.yml en directorios comunes
set DOCKER_PATH=
set FOUND_PATH=

for %%d in ("%CD%" "%CD%\.." "%CD%\..\.." "%CD%\..\..\..") do (
    if exist "%%~d\docker-compose.yml" (
        set DOCKER_PATH=%%~d
        set FOUND_PATH=1
        goto :found_docker
    )
)

:found_docker
if not defined FOUND_PATH (
    echo ❌ No se encontro docker-compose.yml
    echo Buscando en directorios relacionados...
    
    REM Buscar en estructura esperada
    if exist "%CD%\..\docker-compose.yml" (
        set DOCKER_PATH=%CD%\..
    ) else if exist "%CD%\..\..\docker-compose.yml" (
        set DOCKER_PATH=%CD%\..\..
    ) else (
        echo ❌ No se pudo encontrar docker-compose.yml
        echo Por favor ejecuta este script desde el directorio correcto.
        pause
        exit /b 1
    )
)

echo ✅ Docker Compose encontrado en: %DOCKER_PATH%

REM Paso 3: Levantar servicios con Docker
echo.
echo [PASO 3/8] Levantando servicios con Docker Compose...
cd /d %DOCKER_PATH%
docker-compose up -d

if %errorlevel% neq 0 (
    echo ❌ Error al levantar servicios Docker
    pause
    exit /b 1
)

echo ✅ Servicios Docker levantados correctamente

REM Paso 4: Esperar estabilización
echo.
echo [PASO 4/8] Esperando estabilización de servicios...
timeout /t 5 /nobreak >nul

REM Paso 5: Verificar backend
echo.
echo [PASO 5/8] Verificando backend...

REM Buscar backend en estructura esperada
set BACKEND_PATH=

if exist "%DOCKER_PATH%\backend" (
    set BACKEND_PATH=%DOCKER_PATH%\backend
) else if exist "%DOCKER_PATH%\..\backend" (
    set BACKEND_PATH=%DOCKER_PATH%\..\backend
) else if exist "%DOCKER_PATH%\..\..\backend" (
    set BACKEND_PATH=%DOCKER_PATH%\..\..\backend
) else (
    echo ❌ No se encontro directorio backend
    pause
    exit /b 1
)

echo ✅ Backend encontrado en: %BACKEND_PATH%

REM Paso 6: Verificar frontend
echo.
echo [PASO 6/8] Verificando frontend...

REM Buscar frontend en estructura esperada
set FRONTEND_PATH=

if exist "%DOCKER_PATH%\frontend" (
    set FRONTEND_PATH=%DOCKER_PATH%\frontend
) else if exist "%DOCKER_PATH%\..\frontend" (
    set FRONTEND_PATH=%DOCKER_PATH%\..\frontend
) else if exist "%DOCKER_PATH%\..\..\frontend" (
    set FRONTEND_PATH=%DOCKER_PATH%\..\..\frontend
) else (
    echo ❌ No se encontro directorio frontend
    pause
    exit /b 1
)

echo ✅ Frontend encontrado en: %FRONTEND_PATH%

REM Paso 7: Instalar dependencias y ejecutar
echo.
echo [PASO 7/8] Instalando dependencias...

REM Backend dependencies
echo 📦 Instalando dependencias backend...
cd /d %BACKEND_PATH%
if exist requirements.txt (
    echo Instalando requirements.txt...
    python -m pip install -r requirements.txt
) else (
    echo requirements.txt no encontrado, buscando alternativas...
    if exist pyproject.toml (
        echo Instalando con poetry...
        python -m pip install poetry
        poetry install
    ) else if exist Pipfile (
        echo Instalando con pipenv...
        python -m pip install pipenv
        pipenv install
    ) else (
        echo ⚠️ No se encontraron archivos de dependencias Python
    )
)

REM Frontend dependencies
echo 📦 Instalando dependencias frontend...
cd /d %FRONTEND_PATH%
if exist package.json (
    npm install
) else (
    echo ❌ package.json no encontrado en frontend
    pause
    exit /b 1
)

REM Paso 8: Iniciar aplicaciones
echo.
echo [PASO 8/8] Iniciando aplicaciones...

echo 🎯 Iniciando backend...
cd /d %BACKEND_PATH%
start cmd /k "echo Backend iniciando... && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo 🎯 Iniciando frontend...
cd /d %FRONTEND_PATH%
start cmd /k "echo Frontend iniciando... && npm run dev"

echo.
echo ========================================
echo 🎉 DEPLOYMENT COMPLETADO
echo ========================================
echo.
echo 📊 Estado de servicios:
echo   ✅ Backend: http://localhost:8000
echo   ✅ Frontend: http://localhost:5173 (Vite)
echo   ✅ Docker services: Levantados
echo.
echo 🔍 Verificación:
echo   - Backend: curl http://localhost:8000/health (o /docs)
echo   - Frontend: Abre http://localhost:5173 en tu navegador
echo.
echo 🛑 Para detener todo:
echo   - Cierra las ventanas de CMD abiertas
echo   - Ejecuta: docker-compose down
echo.
echo 📋 Logs disponibles en:
echo   - Backend: Ventana CMD del backend
necho   - Frontend: Ventana CMD del frontend
pause
