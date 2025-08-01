@echo off
echo 🏥 VERIFICACION DE SALUD DEL SISTEMA
echo ========================================

echo 📊 Verificando estado de servicios...
echo.

REM Verificar Docker
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Docker: Funcionando
) else (
    echo ❌ Docker: No instalado o no funciona
)

REM Verificar Docker Compose
docker-compose --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Docker Compose: Funcionando
) else (
    echo ❌ Docker Compose: No instalado
)

REM Verificar Python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version') do echo ✅ Python: %%i
) else (
    echo ❌ Python: No instalado
)

REM Verificar Node.js
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do echo ✅ Node.js: %%i
) else (
    echo ❌ Node.js: No instalado
)

REM Verificar npm
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do echo ✅ npm: v%%i
) else (
    echo ❌ npm: No instalado
)

echo.
echo 🔍 Verificando puertos...

REM Verificar puerto 8000 (Backend)
netstat -ano | findstr ":8000" >nul
if %errorlevel% equ 0 (
    echo ✅ Puerto 8000 (Backend): OCUPADO
) else (
    echo ⚪ Puerto 8000 (Backend): LIBRE
)

REM Verificar puerto 5173 (Frontend Vite)
netstat -ano | findstr ":5173" >nul
if %errorlevel% equ 0 (
    echo ✅ Puerto 5173 (Frontend): OCUPADO
) else (
    echo ⚪ Puerto 5173 (Frontend): LIBRE
)

REM Verificar puerto 3000 (Frontend Alternativo)
netstat -ano | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo ✅ Puerto 3000 (Frontend): OCUPADO
) else (
    echo ⚪ Puerto 3000 (Frontend): LIBRE
)

echo.
echo 📂 Verificando estructura de archivos...

REM Verificar archivos clave
if exist docker-compose.yml (
    echo ✅ docker-compose.yml: ENCONTRADO
) else (
    echo ❌ docker-compose.yml: NO ENCONTRADO
)

if exist backend (
    echo ✅ Directorio backend: ENCONTRADO
) else (
    echo ❌ Directorio backend: NO ENCONTRADO
)

if exist frontend (
    echo ✅ Directorio frontend: ENCONTRADO
) else (
    echo ❌ Directorio frontend: NO ENCONTRADO
)

if exist frontend\package.json (
    echo ✅ frontend/package.json: ENCONTRADO
) else (
    echo ❌ frontend/package.json: NO ENCONTRADO
)

echo.
echo 🎯 RESUMEN:
echo   - Ejecuta deploy.bat para iniciar todo
echo   - Ejecuta cleanup.bat para detener todo
echo   - Verifica README.md para instrucciones detalladas
pause
