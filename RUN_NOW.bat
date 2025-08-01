@echo off
echo 🚀 EJECUCIÓN INMEDIATA - LLM AUDIO APP
echo ========================================
echo.

REM Paso 1: Verificar ubicación actual
echo 📍 Ubicación actual: %CD%

REM Paso 2: Verificar estructura clave
echo [1/5] Verificando estructura...

set PROJECT_ROOT=%CD%
set BACKEND_PATH=%PROJECT_ROOT%\backend
set FRONTEND_PATH=%PROJECT_ROOT%\frontend

if exist "%PROJECT_ROOT%\requirements.txt" (
    echo ✅ requirements.txt encontrado
    echo 📦 Backend Python: INSTALAR DEPENDENCIAS
)

if exist "%FRONTEND_PATH%\package.json" (
    echo ✅ Frontend package.json encontrado
    echo 📦 Frontend: INSTALAR DEPENDENCIAS
)

REM Paso 3: Ejecutar Docker services
echo.
echo [2/5] Levantando servicios Docker...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ❌ Error Docker - verificando manualmente...
    goto :manual_start
)

echo.
echo [3/5] Instalando dependencias backend...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias backend
    goto :manual_start
)

echo.
echo [4/5] Instalando dependencias frontend...
cd /d "%FRONTEND_PATH%"
npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias frontend
    goto :manual_start
)

echo.
echo [5/5] Iniciando aplicaciones...

echo 🎯 Iniciando backend...
cd /d "%PROJECT_ROOT%"
start cmd /k "echo === BACKEND === && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo 🎯 Iniciando frontend...
cd /d "%FRONTEND_PATH%"
start cmd /k "echo === FRONTEND === && npm run dev"

echo.
echo 🎉 ¡TODO INICIADO!
echo ========================================
echo 📊 URLs Disponibles:
echo   - Backend API: http://localhost:8000
necho   - Health Check: http://localhost:8000/health
necho   - API Docs: http://localhost:8000/docs
necho   - Frontend: http://localhost:5173

echo.
echo 📋 Comandos útiles:
echo   - Ver logs: docker-compose logs -f
necho   - Ver estado: docker-compose ps
necho   - Detener: docker-compose down
pause

exit /b

:manual_start
echo.
echo ⚠️ INICIANDO MANUALMENTE...
echo 📋 Ejecuta estos comandos manualmente:
echo.
echo 1. Backend:
echo    cd "%PROJECT_ROOT%"
echo    python -m pip install -r requirements.txt
echo    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

echo.
echo 2. Frontend:
echo    cd "%FRONTEND_PATH%"
echo    npm install

echo    npm run dev

echo.
echo 3. Docker:
echo    docker-compose up -d
pause
