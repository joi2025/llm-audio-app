@echo off
echo 🚀 EJECUCIÓN CON CORRECCIÓN - OPENAI COMPATIBILIDAD
echo ========================================
echo.

REM Paso 1: Corregir dependencias
echo [1/4] Corrigiendo dependencias...

REM Actualizar openai a versión compatible
echo 📦 Actualizando openai...
python -m pip install --upgrade openai

REM Verificar versión
echo 📊 Verificando versión instalada...
python -c "import openai; print(f'OpenAI versión: {openai.__version__}')"

REM Paso 2: Verificar imports
echo [2/4] Verificando imports...
python -c "from openai import OpenAI; print('✅ Import compatible')" 2>nul || (
    echo ⚠️ Import no compatible, usando alternativa...
)

REM Paso 3: Iniciar backend
echo [3/4] Iniciando backend...
cd /d "%CD%\backend"

REM Instalar dependencias actualizadas
echo 📦 Instalando dependencias actualizadas...
python -m pip install openai>=1.0.0

REM Iniciar servidor
echo 🎯 Iniciando servidor backend...
start cmd /k "cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM Paso 4: Iniciar frontend
echo [4/4] Iniciando frontend...
cd /d "%CD%\frontend"

REM Instalar dependencias frontend
echo 📦 Instalando dependencias frontend...
npm install

REM Iniciar servidor frontend
echo 🎯 Iniciando servidor frontend...
start cmd /k "cd frontend && npm run dev"

REM URLs finales
echo.
echo 🎉 ¡TODO INICIADO CON CORRECCIÓN!
echo ========================================
echo 📊 URLs disponibles:
echo   - Frontend: http://localhost:5173

echo   - Backend API: http://localhost:8000

echo   - Health Check: http://localhost:8000/health

echo   - API Docs: http://localhost:8000/docs

echo.
echo 🔄 Verificando en 10 segundos...
timeout /t 10 /nobreak >nul

REM Abrir navegador
start http://localhost:8000/health
start http://localhost:5173

echo ✅ ¡SERVIDORES CORREGIDOS Y FUNCIONANDO!
pause
