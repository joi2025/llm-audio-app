@echo off
echo 🔍 DIAGNÓSTICO DE RUTAS ABSOLUTAS
echo ========================================
echo.

REM Establecer directorio raíz absoluto
set PROJECT_ROOT=C:\Users\Personal\CascadeProjects\llm-audio-app
echo 📍 Directorio raíz: %PROJECT_ROOT%

REM Verificar existencia de archivos clave
echo 📋 Verificando archivos...

REM Backend
echo.
echo 🔍 Backend:
if exist "%PROJECT_ROOT%\backend\main.py" (
    echo ✅ %PROJECT_ROOT%\backend\main.py
    set BACKEND_FILE=%PROJECT_ROOT%\backend\main.py
) else (
    echo ❌ backend\main.py no encontrado
)

if exist "%PROJECT_ROOT%\requirements.txt" (
    echo ✅ %PROJECT_ROOT%\requirements.txt
    set REQUIREMENTS_FILE=%PROJECT_ROOT%\requirements.txt
) else (
    echo ❌ requirements.txt no encontrado
)

REM Frontend
echo.
echo 🔍 Frontend:
if exist "%PROJECT_ROOT%\frontend\package.json" (
    echo ✅ %PROJECT_ROOT%\frontend\package.json
    set FRONTEND_PACKAGE=%PROJECT_ROOT%\frontend\package.json
) else (
    echo ❌ frontend\package.json no encontrado
)

REM Mostrar rutas absolutas
echo.
echo 📊 RUTAS ABSOLUTAS:
echo Backend: %PROJECT_ROOT%\backend
echo Frontend: %PROJECT_ROOT%\frontend
echo Requirements: %PROJECT_ROOT%\requirements.txt

echo.
echo 🎯 COMANDOS ABSOLUTOS:
echo.
echo 1. Backend (desde directorio raíz):
echo    cd /d "%PROJECT_ROOT%"
echo    python -m pip install --upgrade openai
echo    cd backend

echo    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

echo.
echo 2. Frontend (desde directorio raíz):
echo    cd /d "%PROJECT_ROOT%\frontend"
echo    npm install

echo    npm run dev

echo.
echo 3. Verificar manualmente:
echo    dir "%PROJECT_ROOT%\backend"
echo    dir "%PROJECT_ROOT%\frontend"

echo.
echo 4. Ejecutar con rutas absolutas:
echo    cd /d "%PROJECT_ROOT%"
echo    python -m pip install -r requirements.txt

echo    cd /d "%PROJECT_ROOT%\backend"
echo    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

echo.
echo 5. Frontend absoluto:
echo    cd /d "%PROJECT_ROOT%\frontend"
echo    npm install

echo    npm run dev
pause
