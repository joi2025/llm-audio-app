@echo off
echo 🧹 LIMPIEZA Y PARADA DE SERVICIOS
echo ========================================

echo 📍 Deteniendo servicios...

REM Matar procesos Node.js
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul

REM Matar procesos Python
taskkill /F /IM python.exe 2>nul
taskkill /F /IM uvicorn.exe 2>nul

REM Detener Docker Compose
echo 📍 Deteniendo Docker Compose...
docker-compose down 2>nul

REM Limpiar puertos ocupados
echo 📍 Liberando puertos...
netstat -ano | findstr ":8000" | for /f "tokens=5" %%a in ('findstr ":8000"') do taskkill /F /PID %%a 2>nul
netstat -ano | findstr ":5173" | for /f "tokens=5" %%a in ('findstr ":5173"') do taskkill /F /PID %%a 2>nul
netstat -ano | findstr ":3000" | for /f "tokens=5" %%a in ('findstr ":3000"') do taskkill /F /PID %%a 2>nul

echo ✅ Limpieza completada
echo.
echo 📊 Estado:
echo   ✅ Todos los procesos detenidos
echo   ✅ Puertos liberados
echo   ✅ Docker Compose detenido
pause
