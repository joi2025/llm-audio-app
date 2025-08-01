@echo off
echo 🎯 INICIO CORREGIDO - LLM AUDIO APP
echo ========================================
echo.

REM Paso 1: Verificar directorio actual
echo 📍 Directorio actual: %CD%

REM Paso 2: Verificar ubicación del backend
echo [1/4] Verificando backend...

if exist "backend\main.py" (
    echo ✅ backend\main.py encontrado
    goto :start_backend
) else (
    echo ❌ backend\main.py no encontrado
    goto :find_files
)

:start_backend
echo [2/4] Iniciando backend...
cd /d "%CD%"

REM Instalar dependencias si es necesario
echo 📦 Instalando dependencias backend...
python -m pip install -r requirements.txt

echo 🎯 Iniciando servidor backend...
start cmd /k "cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
goto :start_frontend

:find_files
echo 🔍 Buscando archivos main.py...
dir /s /b main.py 2>nul
if %errorlevel% equ 0 (
    echo ✅ Archivos main.py encontrados
) else (
    echo ❌ No se encontraron archivos main.py
    pause
    exit /b 1
)

:start_frontend
echo [3/4] Iniciando frontend...
cd /d "%CD%\frontend"

REM Instalar dependencias si es necesario
echo 📦 Instalando dependencias frontend...
npm install

echo 🎯 Iniciando servidor frontend...
start cmd /k "npm run dev"

:final
echo [4/4] Verificando servicios...
timeout /t 5 /nobreak >nul

echo.
echo 🎉 ¡SERVIDORES INICIADOS!
echo ========================================
echo 📊 URLs disponibles:
echo   - Backend API: http://localhost:8000
necho   - Health Check: http://localhost:8000/health
necho   - API Docs: http://localhost:8000/docs

echo   - Frontend: http://localhost:5173
echo.
echo 🔄 Verificando en 10 segundos...
timeout /t 10 /nobreak >nul

REM Abrir navegador
start http://localhost:8000/health
start http://localhost:5173

echo ✅ ¡TODO LISTO!
pause
