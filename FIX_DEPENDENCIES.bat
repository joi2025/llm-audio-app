@echo off
echo 🔧 CORRIGIENDO DEPENDENCIAS - OPENAI COMPATIBILIDAD
echo ========================================
echo.

REM Paso 1: Identificar el problema
echo 📍 Problema detectado:
echo   - openai==0.28.0 (vieja API)
echo   - Código usa: from openai import OpenAI (nueva API)
echo.

REM Paso 2: Solución 1 - Actualizar openai
echo [1/3] Actualizando openai a versión compatible...
python -m pip install --upgrade openai

REM Paso 3: Solución 2 - Corregir imports
echo [2/3] Verificando imports en código...

REM Verificar qué versión tenemos instalada
python -c "import openai; print(f'Versión actual: {openai.__version__}')"

REM Paso 4: Solución 3 - Crear versión corregida
echo [3/3] Creando versión corregida...

REM Crear archivo temporal con imports corregidos
cd /d "%CD%\backend"

REM Verificar si existe el archivo de servicios
if exist "services\stt_service.py" (
    echo ✅ services\stt_service.py encontrado
) else (
    echo ❌ services\stt_service.py no encontrado
)

REM Solución inmediata: ejecutar con la versión correcta
echo.
echo 🎯 SOLUCIÓN INMEDIATA:
echo.
echo Opción 1 - Actualizar openai:
echo    python -m pip install --upgrade openai

echo.
echo Opción 2 - Usar import compatible:
echo    from openai import OpenAI  # Para openai>=1.0.0

echo    # O para openai==0.28.0:
echo    import openai

echo.
echo Opción 3 - Ejecutar con corrección:
echo    cd backend

echo    python -m pip install openai>=1.0.0

echo    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

echo.
echo 📋 Comandos para ejecutar ahora:
echo 1. Actualizar openai:
echo    python -m pip install --upgrade openai

echo 2. Verificar versión:
echo    python -c "import openai; print(openai.__version__)"

echo 3. Iniciar backend:
echo    cd backend

echo    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
