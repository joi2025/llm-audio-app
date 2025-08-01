@echo off
echo VERIFICANDO QUE TODO FUNCIONA
echo ==============================
echo.

REM Verificar que los servicios están corriendo
echo Verificando servicios...

REM Backend
echo.
echo Backend:
tasklist /FI "IMAGENAME eq python.exe" | findstr python >nul
if %errorlevel% equ 0 (
    echo ✅ Backend Python: CORRIENDO
) else (
    echo ❌ Backend Python: DETENIDO
)

REM Frontend
echo.
echo Frontend:
tasklist /FI "IMAGENAME eq node.exe" | findstr node >nul
if %errorlevel% equ 0 (
    echo ✅ Frontend Node.js: CORRIENDO
) else (
    echo ❌ Frontend Node.js: DETENIDO
)

REM Verificar puertos
echo.
echo Verificando puertos...
netstat -ano | findstr ":8000" >nul
if %errorlevel% equ 0 (
    echo ✅ Puerto 8000: ABIERTO
) else (
    echo ❌ Puerto 8000: CERRADO
)

netstat -ano | findstr ":3002" >nul
if %errorlevel% equ 0 (
    echo ✅ Puerto 3002: ABIERTO
) else (
    echo ❌ Puerto 3002: CERRADO
)

REM URLs para verificar
echo.
echo URLs para verificar:
echo   Backend: http://localhost:8000/health
echo   Frontend: http://localhost:3002
echo   API Docs: http://localhost:8000/docs

echo.
echo Abriendo navegador...
start http://localhost:8000/health
start http://localhost:3002

echo.
echo Si los servicios no estan corriendo, ejecuta:
echo   Backend: cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
echo   Frontend: cd frontend && npm run dev
pause
