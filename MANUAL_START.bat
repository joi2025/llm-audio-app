@echo off
echo MANUAL STARTUP GUIDE
echo ======================
echo.

echo PASO 1: Backend Python
echo =====================
echo.
echo 1. Abrir nueva ventana CMD
echo 2. Ejecutar:
echo    cd C:\Users\Personal\CascadeProjects\llm-audio-app\backend
echo    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
echo.

echo PASO 2: Frontend Node.js
echo =========================
echo.
echo 1. Abrir otra ventana CMD
echo 2. Ejecutar:
echo    cd C:\Users\Personal\CascadeProjects\llm-audio-app\frontend
echo    npm install
echo    npm run dev
echo.

echo PASO 3: Verificar
echo =================
echo 1. Abrir navegador:
echo    http://localhost:8000/health
echo    http://localhost:5173
echo.

echo PASO 4: Comandos útiles
echo ========================
echo Verificar puertos:
echo    netstat -ano | findstr 8000
echo    netstat -ano | findstr 5173
echo.
echo Verificar procesos:
echo    tasklist | findstr python
echo    tasklist | findstr node
echo.
echo PASO 5: Ejecutar manualmente:
echo    cd C:\Users\Personal\CascadeProjects\llm-audio-app\backend

echo    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
echo.
echo    cd C:\Users\Personal\CascadeProjects\llm-audio-app\frontend

echo    npm run dev
pause
