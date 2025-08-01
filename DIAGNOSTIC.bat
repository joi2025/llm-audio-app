@echo off
echo 🔍 DIAGNÓSTICO COMPLETO
echo ========================================
echo.

echo 📂 Estructura del proyecto:
tree /f | findstr /i "main.py\|package.json\|requirements.txt"

echo.
echo 📋 Archivos encontrados:
echo.
echo Backend:
if exist "backend\main.py" (
    echo ✅ backend\main.py - ENCONTRADO
    echo 📍 Ruta completa: %CD%\backend\main.py
) else (
    echo ❌ backend\main.py - NO ENCONTRADO
)

if exist "requirements.txt" (
    echo ✅ requirements.txt - ENCONTRADO
) else (
    echo ❌ requirements.txt - NO ENCONTRADO
)

echo.
echo Frontend:
if exist "frontend\package.json" (
    echo ✅ frontend\package.json - ENCONTRADO
    echo 📍 Ruta completa: %CD%\frontend\package.json
) else (
    echo ❌ frontend\package.json - NO ENCONTRADO
)

echo.
echo Comandos correctos para ejecutar:
echo.
echo 1. Backend:
echo    cd backend
    echo    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

echo.
echo 2. Frontend:
echo    cd frontend
    echo    npm install
    echo    npm run dev

echo.
echo 3. Verificar backend:
echo    curl http://localhost:8000/health

echo.
echo 4. Verificar frontend:
echo    Abrir http://localhost:5173
pause
