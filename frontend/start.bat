@echo off
echo Iniciando LLM Audio Frontend...
echo.

REM Verificar si Node.js esta instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js no esta instalado. Por favor instala Node.js primero.
    pause
    exit /b 1
)

REM Verificar si npm esta instalado
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm no esta instalado. Por favor instala npm primero.
    pause
    exit /b 1
)

echo ✅ Node.js y npm detectados

REM Instalar dependencias si es necesario
if not exist "node_modules" (
    echo 📦 Instalando dependencias...
    npm install
)

REM Verificar puerto disponible
set PORT=5173
netstat -ano | findstr ":%PORT%" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Puerto %PORT% ocupado. Liberando...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%"') do taskkill /F /PID %%a 2>nul
    timeout /t 2 >nul
)

echo.
echo 🎯 Iniciando servidor de desarrollo...
echo 🔗 La aplicacion estara disponible en: http://localhost:%PORT%
echo 📊 Logs en tiempo real:
echo ----------------------------------------

npm run dev
pause
