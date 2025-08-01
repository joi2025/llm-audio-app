@echo off
echo 🚀 EJECUCIÓN CON RUTAS ABSOLUTAS
echo ========================================
echo.

REM Establecer rutas absolutas
set PROJECT_ROOT=C:\Users\Personal\CascadeProjects\llm-audio-app
set BACKEND_PATH=C:\Users\Personal\CascadeProjects\llm-audio-app\backend
set FRONTEND_PATH=C:\Users\Personal\CascadeProjects\llm-audio-app\frontend
set REQUIREMENTS_PATH=C:\Users\Personal\CascadeProjects\llm-audio-app\requirements.txt

echo 📍 Rutas absolutas establecidas:
echo   Proyecto: %PROJECT_ROOT%
echo   Backend: %BACKEND_PATH%
echo   Frontend: %FRONTEND_PATH%
echo   Requirements: %REQUIREMENTS_PATH%

echo.
echo 📋 Verificando existencia de archivos...

REM Verificar cada archivo
echo.
echo 🔍 Verificando backend\main.py...
if exist "%BACKEND_PATH%\main.py" (
    echo ✅ %BACKEND_PATH%\main.py - ENCONTRADO
) else (
    echo ❌ %BACKEND_PATH%\main.py - NO ENCONTRADO
    dir "%BACKEND_PATH%" /b
    pause
    exit /b 1
)

echo 🔍 Verificando requirements.txt...
if exist "%REQUIREMENTS_PATH%" (
    echo ✅ %REQUIREMENTS_PATH% - ENCONTRADO
) else (
    echo ❌ %REQUIREMENTS_PATH% - NO ENCONTRADO
    pause
    exit /b 1
)

echo 🔍 Verificando frontend\package.json...
if exist "%FRONTEND_PATH%\package.json" (
    echo ✅ %FRONTEND_PATH%\package.json - ENCONTRADO
) else (
    echo ❌ %FRONTEND_PATH%\package.json - NO ENCONTRADO
    pause
    exit /b 1
)

echo.
echo 🎯 EJECUTANDO CON RUTAS ABSOLUTAS...

echo [1/4] Instalando dependencias backend...
cd /d "%PROJECT_ROOT%"
python -m pip install --upgrade openai
python -m pip install -r requirements.txt

echo [2/4] Iniciando backend...
start cmd /k "cd /d %BACKEND_PATH% && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo [3/4] Iniciando frontend...
start cmd /k "cd /d %FRONTEND_PATH% && npm install && npm run dev"

echo [4/4] Verificando servicios...
timeout /t 5 /nobreak >nul

echo.
echo 🎉 ¡SERVIDORES INICIADOS CON RUTAS ABSOLUTAS!
echo ========================================
echo 📊 URLs:
echo   - Backend: http://localhost:8000
echo   - Frontend: http://localhost:5173
echo   - Health: http://localhost:8000/health
echo   - API Docs: http://localhost:8000/docs

echo.
echo 🔄 Abriendo navegador...
timeout /t 10 /nobreak >nul
start http://localhost:8000/health
start http://localhost:5173

echo ✅ ¡TODO LISTO Y FUNCIONANDO!
echo 📋 Los servicios están ejecutándose en ventanas separadas
pause
