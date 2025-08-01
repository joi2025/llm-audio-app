@echo off
echo CORRIGIENDO TODOS LOS ERRORES
echo ==============================

echo PASO 1: Backend - Error OpenAI
echo ==============================
cd /d "C:\Users\Personal\CascadeProjects\llm-audio-app"

REM Actualizar OpenAI
echo Actualizando OpenAI...
python -m pip install --upgrade openai>=1.0.0

REM Verificar versión
echo Verificando versión...
python -c "import openai; print(f'Versión: {openai.__version__}')"

REM PASO 2: Frontend - Error TailwindCSS
echo ================================
echo PASO 2: Frontend - TailwindCSS
cd "C:\Users\Personal\CascadeProjects\llm-audio-app\frontend"

REM Instalar dependencias faltantes
echo Instalando dependencias faltantes...
npm install -D tailwindcss postcss autoprefixer @tailwindcss/postcss

REM PASO 3: Iniciar servicios
echo ==============================
echo Iniciando servicios corregidos...

REM Backend
echo Iniciando backend corregido...
start cmd /k "cd C:\Users\Personal\CascadeProjects\llm-audio-app\backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM Frontend
echo Iniciando frontend corregido...
start cmd /k "cd C:\Users\Personal\CascadeProjects\llm-audio-app\frontend && npm run dev"

echo.
echo ✅ Servidores corregidos iniciados!
echo URLs:
echo   - Backend: http://localhost:8000

echo   - Frontend: http://localhost:3002
pause
