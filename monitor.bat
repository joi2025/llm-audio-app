@echo off
echo 📊 MONITOREO EN TIEMPO REAL
echo ========================================

:inicio
cls
echo 🔄 Estado Actual - %date% %time%
echo ========================================

REM Verificar puertos
echo 🔍 Verificando puertos...
netstat -ano | findstr ":8000" >nul
if %errorlevel% equ 0 (
    echo ✅ Backend (8000): ACTIVO
) else (
    echo ❌ Backend (8000): INACTIVO
)

netstat -ano | findstr ":5173" >nul
if %errorlevel% equ 0 (
    echo ✅ Frontend (5173): ACTIVO
) else (
    echo ❌ Frontend (5173): INACTIVO
)

REM Verificar Docker containers
echo.
echo 🐳 Docker Containers:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

REM Verificar URLs
echo.
echo 🌐 URLs Disponibles:
echo   Backend: http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo   Health: http://localhost:8000/health

echo.
echo 🎯 Acciones Rapidas:
echo   [1] Abrir Frontend en navegador
echo   [2] Abrir API Docs (Swagger)
echo   [3] Ver logs backend
echo   [4] Ver logs frontend
echo   [5] Refrescar estado
echo   [6] Salir

set /p opcion="Selecciona una opcion (1-6): "

if "%opcion%"=="1" start http://localhost:5173
if "%opcion%"=="2" start http://localhost:8000/docs
if "%opcion%"=="3" docker logs backend-container 2>nul || echo Backend logs no disponibles
if "%opcion%"=="4" docker logs frontend-container 2>nul || echo Frontend logs no disponibles
if "%opcion%"=="5" goto inicio
if "%opcion%"=="6" exit /b

pause
goto inicio
