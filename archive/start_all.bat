@echo off

echo Iniciando servidor backend...
cd /d "%~dp0backend"
start "Backend Server" cmd.exe /k "python -m uvicorn main:app --reload --port 8000"
echo Servidor backend iniciado en http://localhost:8000

echo Iniciando servidor frontend...
cd /d "%~dp0frontend"
start "Frontend Server" cmd.exe /k "npm run dev --port 3001"
echo Servidor frontend iniciado en http://localhost:3001

echo.
echo Ambos servidores han sido iniciados.
echo Puedes acceder a la aplicacion en http://localhost:3001
echo Presiona Ctrl+C en cada ventana para detener los servidores.
pause

