@echo off
echo 🎯 DIAGNÓSTICO Y ARRANQUE COMPLETO
echo ========================================
echo.

REM Paso 1: Verificar estado actual
echo 📊 Verificando estado de servicios...

netstat -ano | findstr ":8000" >nul
if %errorlevel% equ 0 (
    echo ✅ Puerto 8000 (Backend): ACTIVO
) else (
    echo ❌ Puerto 8000 (Backend): INACTIVO
)

netstat -ano | findstr ":5173" >nul
if %errorlevel% equ 0 (
    echo ✅ Puerto 5173 (Frontend): ACTIVO
) else (
    echo ❌ Puerto 5173 (Frontend): INACTIVO
)

REM Paso 2: Verificar directorios y archivos
echo.
echo 📂 Verificando archivos del proyecto...

set PROJECT_ROOT=C:\Users\Personal\CascadeProjects\llm-audio-app

REM Verificar backend
echo.
echo 🔍 Backend:
if exist "%PROJECT_ROOT%\backend\main.py" (
    echo ✅ %PROJECT_ROOT%\backend\main.py - ENCONTRADO
) else (
    echo ❌ backend\main.py - NO ENCONTRADO
    dir "%PROJECT_ROOT%\backend" /b 2>nul
)

REM Verificar frontend
echo.
echo 🔍 Frontend:
if exist "%PROJECT_ROOT%\frontend\package.json" (
    echo ✅ %PROJECT_ROOT%\frontend\package.json - ENCONTRADO
) else (
    echo ❌ frontend\package.json - NO ENCONTRADO
    dir "%PROJECT_ROOT%\frontend" /b 2>nul
)

REM Paso 3: Verificar dependencias
echo.
echo 📦 Verificando dependencias...

REM Python
echo.
echo 🔍 Python:
python --version 2>nul
if %errorlevel% equ 0 (
    echo ✅ Python: Instalado
) else (
    echo ❌ Python: No instalado
)

REM Node.js
echo.
echo 🔍 Node.js:
node --version 2>nul
if %errorlevel% equ 0 (
    echo ✅ Node.js: Instalado
) else (
    echo ❌ Node.js: No instalado
)

REM Paso 4: Iniciar servicios manualmente
echo.
echo 🎯 INICIANDO SERVICIOS MANUALMENTE...

echo [1/4] Instalando dependencias backend...
cd /d "%PROJECT_ROOT%"
python -m pip install --upgrade openai
python -m pip install -r requirements.txt

echo [2/4] Iniciando backend...
echo 🎯 Backend iniciando en nueva ventana...
start cmd /k "cd /d %PROJECT_ROOT%\backend && echo === BACKEND STARTING === && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo [3/4] Iniciando frontend...
echo 🎯 Frontend iniciando en nueva ventana...
start cmd /k "cd /d %PROJECT_ROOT%\frontend && echo === FRONTEND STARTING === && npm install && npm run dev"

REM Paso 5: Verificar conexión
echo.
echo [4/4] Verificando conexión...
timeout /t 15 /nobreak >nul

echo.
echo 🔄 Verificando servicios...

REM Verificar si los servicios están corriendo
tasklist /FI "IMAGENAME eq python.exe" | findstr "python" >nul
if %errorlevel% equ 0 (
    echo ✅ Backend Python: CORRIENDO
) else (
    echo ❌ Backend Python: DETENIDO
)

tasklist /FI "IMAGENAME eq node.exe" | findstr "node" >nul
if %errorlevel% equ 0 (
    echo ✅ Frontend Node.js: CORRIENDO
) else (
    echo ❌ Frontend Node.js: DETENIDO
)

echo.
echo 🎯 URLs para verificar:
echo   - Backend: http://localhost:8000

echo   - Frontend: http://localhost:5173

echo   - Health: http://localhost:8000/health

echo   - API Docs: http://localhost:8000/docs

echo.
echo 📋 Comandos para ejecutar manualmente:
echo 1. Backend:
echo    cd "%PROJECT_ROOT%\backend"
echo    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

echo.
echo 2. Frontend:
echo    cd "%PROJECT_ROOT%\frontend"
echo    npm install

echo    npm run dev

echo.
echo 3. Verificar servicios:
echo    curl http://localhost:8000/health

echo    Abrir http://localhost:5173 en navegador

echo.
echo 🔄 Si sigue sin funcionar, ejecuta estos comandos manualmente:
echo    cd "%PROJECT_ROOT%"
echo    python -m pip install -r requirements.txt

echo    cd "%PROJECT_ROOT%\backend"
echo    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
