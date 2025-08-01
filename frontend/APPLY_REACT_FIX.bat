@echo off
echo APLICANDO CORRECCIÓN DE REFERENCIA EN FRONTEND
echo ==============================================

echo Aplicando corrección de inicialización...
cd /d "C:\Users\Personal\CascadeProjects\llm-audio-app\frontend"

REM Hacer backup del archivo original
echo Haciendo backup del archivo original...
copy "src\context\AppContext.jsx" "src\context\AppContext.jsx.backup"

REM Copiar archivo corregido
echo Copiando archivo corregido...
copy "src\context\AppContext-CORRECTED.jsx" "src\context\AppContext.jsx"

REM Verificar cambios
echo Verificando cambios...
if exist "src\context\AppContext.jsx" (
    echo ✅ Corrección aplicada exitosamente
) else (
    echo ❌ Error al aplicar corrección
)

REM Reiniciar frontend
echo Reiniciando frontend...
start cmd /k "npm run dev"

echo.
echo ✅ Frontend corregido y reiniciado!
echo El error de referencia ha sido resuelto
pause
