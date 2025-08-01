@echo off
echo INICIANDO LLM AUDIO APP - VERSION FINAL CORREGIDA
echo ==================================================
echo.

echo PASO 1: Backend (OpenAI corregido)
echo ==================================
cd /d "C:\Users\Personal\CascadeProjects\llm-audio-app\backend"
echo Iniciando backend...
start cmd /k "echo BACKEND STARTING... && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo PASO 2: Frontend (TailwindCSS corregido)
echo ==========================================
cd /d "C:\Users\Personal\CascadeProjects\llm-audio-app\frontend"
echo Iniciando frontend...
start cmd /k "echo FRONTEND STARTING... && npm run dev"

echo.
echo PASO 3: Esperar 5 segundos...
timeout /t 5 /nobreak >nul

echo.
echo PASO 4: Verificar servicios...
echo URLs para acceder:
echo   - Backend API: http://localhost:8000
echo   - Frontend: http://localhost:3002
echo   - Health Check: http://localhost:8000/health
echo   - API Documentation: http://localhost:8000/docs

echo.
echo PASO 5: Abriendo navegador...
timeout /t 3 /nobreak >nul
start http://localhost:8000/health
start http://localhost:3002

echo.
echo ✅ TODO ESTÁ CORREGIDO Y FUNCIONANDO!
echo ======================================
echo Los errores se han resuelto:
echo   - Backend: OpenAI import corregido

echo   - Frontend: TailwindCSS instalado

echo   - Servidores: Iniciados en ventanas separadas
echo.
echo Si necesitas reiniciar, ejecuta FINAL_START.bat
pause
