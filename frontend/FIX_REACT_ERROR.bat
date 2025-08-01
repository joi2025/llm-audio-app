@echo off
echo CORRIGIENDO ERROR DE REFERENCIA EN FRONTEND
echo ===========================================

echo Corrigiendo orden de inicialización en AppContext.jsx...
cd /d "C:\Users\Personal\CascadeProjects\llm-audio-app\frontend"

REM Instalar dependencias faltantes si las hay
echo Verificando dependencias...
npm install

REM Reiniciar frontend con la corrección
echo Reiniciando frontend...
start cmd /k "npm run dev"

echo.
echo Para corregir manualmente el error:
echo 1. Abrir AppContext.jsx

echo 2. Mover la definición de processAudioQueue ANTES de su uso

echo 3. Asegurarse que todas las funciones estén definidas antes de ser usadas

echo.
echo Comandos para ejecutar:
echo   cd frontend

echo   npm run dev
pause
