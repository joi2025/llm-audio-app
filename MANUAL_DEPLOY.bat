@echo off
echo 🎯 DESPLIEGUE PASO A PASO - CONTROL TOTAL
echo ========================================
echo.

REM Paso 1: Verificar estructura
echo [1/6] Verificando estructura del proyecto...
echo.

REM Verificar directorios clave
if exist "backend" (
    echo ✅ Backend: ENCONTRADO
    dir backend /b | findstr /c:"main.py" >nul
    if %errorlevel% equ 0 (
        echo ✅ main.py: ENCONTRADO
    ) else (
        echo ❌ main.py: NO ENCONTRADO
    )
) else (
    echo ❌ Backend: NO ENCONTRADO
)

if exist "frontend" (
    echo ✅ Frontend: ENCONTRADO
    if exist "frontend\package.json" (
        echo ✅ package.json: ENCONTRADO
    ) else (
        echo ❌ package.json: NO ENCONTRADO
    )
) else (
    echo ❌ Frontend: NO ENCONTRADO
)

if exist "docker-compose.yml" (
    echo ✅ docker-compose.yml: ENCONTRADO
) else (
    echo ❌ docker-compose.yml: NO ENCONTRADO
)

echo.
echo [2/6] Verificando Docker services...
docker-compose config
if %errorlevel% neq 0 (
    echo ❌ Error en configuracion de docker-compose
    pause
    exit /b 1
)

echo.
echo [3/6] Levantando servicios con Docker...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ❌ Error al levantar servicios Docker
    docker-compose logs
    pause
    exit /b 1
)

echo.
echo [4/6] Esperando estabilización...
timeout /t 10 /nobreak

echo.
echo [5/6] Verificando servicios activos...
docker-compose ps

echo.
echo [6/6] URLs disponibles:
echo   Backend API: http://localhost:8000
echo   Health Check: http://localhost:8000/health
echo   API Docs: http://localhost:8000/docs
echo.
echo 🎯 Para ejecutar el frontend manualmente:
echo   cd frontend
echo   npm install
echo   npm run dev
echo.
echo 🎯 Para ejecutar el backend manualmente:
echo   cd backend
echo   python -m pip install -r requirements.txt
echo   python -m uvicorn main:app --reload
echo.
echo 📋 Comandos útiles:
echo   Ver logs: docker-compose logs -f
echo   Ver estado: docker-compose ps
echo   Detener: docker-compose down
pause
