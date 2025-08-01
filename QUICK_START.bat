@echo off
echo 🎯 INICIO RÁPIDO - LLM AUDIO APP
echo ========================================
echo.

REM Verificar que estamos en el directorio correcto
if not exist "requirements.txt" (
    echo ❌ No estás en el directorio raíz del proyecto
    echo 📍 Ve a: C:\Users\Personal\CascadeProjects\llm-audio-app
    pause
    exit /b 1
)

echo ✅ Directorio correcto: %CD%
echo.

REM Ejecutar todo en orden
echo 🚀 INICIANDO TODO...
echo.

REM 1. Docker services
echo 📦 Levantando Docker services...
docker-compose up -d

REM 2. Backend
echo 📦 Backend Python...
python -m pip install -r requirements.txt
start cmd /k "python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM 3. Frontend
echo 📦 Frontend Node.js...
cd frontend
npm install
start cmd /k "npm run dev"

REM 4. URLs
echo.
echo 🎉 ¡TODO INICIADO!
echo ========================================
echo 📊 URLs:
echo   - Frontend: http://localhost:5173
necho   - Backend: http://localhost:8000
necho   - Health: http://localhost:8000/health
necho   - API Docs: http://localhost:8000/docs
echo.
echo 🔄 Verificar en 30 segundos...
timeout /t 30
start http://localhost:5173
pause
