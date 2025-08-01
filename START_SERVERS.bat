@echo off
echo DIAGNOSTICO Y ARRANQUE COMPLETO
echo ========================================
echo.

REM Verificar estado de servicios
echo Verificando estado de servicios...
netstat -ano | findstr ":8000" >nul
if %errorlevel% equ 0 (
    echo Puerto 8000 ACTIVO
) else (
    echo Puerto 8000 INACTIVO
)

netstat -ano | findstr ":5173" >nul
if %errorlevel% equ 0 (
    echo Puerto 5173 ACTIVO
) else (
    echo Puerto 5173 INACTIVO
)

REM Verificar archivos
echo.
echo Verificando archivos del proyecto...

set PROJECT_ROOT=C:\Users\Personal\CascadeProjects\llm-audio-app

REM Backend
echo.
echo Backend:
if exist "%PROJECT_ROOT%\backend\main.py" (
    echo backend\main.py - ENCONTRADO
) else (
    echo backend\main.py - NO ENCONTRADO
)

REM Frontend
echo.
echo Frontend:
if exist "%PROJECT_ROOT%\frontend\package.json" (
    echo frontend\package.json - ENCONTRADO
) else (
    echo frontend\package.json - NO ENCONTRADO
)

REM Instalar dependencias backend
echo.
echo Instalando dependencias backend...
cd /d "%PROJECT_ROOT%"
python -m pip install --upgrade openai
python -m pip install -r requirements.txt

REM Iniciar backend
echo.
echo Iniciando backend...
start cmd /k "cd /d %PROJECT_ROOT%\backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM Iniciar frontend
echo.
echo Iniciando frontend...
start cmd /k "cd /d %PROJECT_ROOT%\frontend && npm install && npm run dev"

echo.
echo Servidores iniciados en ventanas separadas
echo URLs:
echo   - Backend: http://localhost:8000

echo   - Frontend: http://localhost:5173
pause
