@echo off
echo 🎯 GUÍA PASO A PASO - ARRANQUE MANUAL
echo ========================================
echo.

REM Paso 1: Establecer rutas absolutas
set PROJECT_ROOT=C:\Users\Personal\CascadeProjects\llm-audio-app

echo 📍 RUTAS ABSOLUTAS:
echo   Proyecto: %PROJECT_ROOT%
echo   Backend: %PROJECT_ROOT%\backend

echo   Frontend: %PROJECT_ROOT%\frontend

echo.
echo 🎯 PASO 1: Verificar directorio actual
echo 📍 Asegúrate de estar en: %PROJECT_ROOT%

echo.
echo 🎯 PASO 2: Instalar dependencias backend
echo 📦 Ejecutar:
echo    cd "%PROJECT_ROOT%"
echo    python -m pip install --upgrade openai

echo    python -m pip install -r requirements.txt

echo.
echo 🎯 PASO 3: Iniciar backend
echo 📦 Ejecutar:
echo    cd "%PROJECT_ROOT%\backend"
echo    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

echo.
echo 🎯 PASO 4: En otra ventana CMD, iniciar frontend
echo 📦 Ejecutar:
echo    cd "%PROJECT_ROOT%\frontend"
echo    npm install

echo    npm run dev

echo.
echo 🎯 PASO 5: Verificar conexión
echo 📦 Ejecutar:
echo    Abrir http://localhost:8000/health en navegador

echo    Abrir http://localhost:5173 en navegador

echo.
echo 🎯 PASO 6: Si hay errores
echo 📦 Verificar:
echo    ¿Están los servicios corriendo?
echo    tasklist | findstr python

echo    tasklist | findstr node

echo.
echo 📋 Comandos útiles:
echo    Ver puertos: netstat -ano | findstr ":8000"
echo    Ver puertos: netstat -ano | findstr ":5173"
echo    Ver logs: Abrir ventanas CMD donde se ejecutaron los servicios

echo.
echo 🔄 Para ejecutar todo de una vez:
echo    Ejecutar: COMPLETE_STARTUP.bat
pause
