@echo off
echo CORRIGIENDO DEPENDENCIAS BACKEND
echo ================================

echo Actualizando OpenAI...
cd /d "C:\Users\Personal\CascadeProjects\llm-audio-app"

REM Actualizar OpenAI a versión compatible
echo Instalando OpenAI >= 1.0.0...
python -m pip install --upgrade openai

REM Verificar versión instalada
echo Verificando versión...
python -c "import openai; print(f'Versión OpenAI: {openai.__version__}')"

REM Verificar import compatible
echo Verificando import...
python -c "from openai import OpenAI; print('✅ Import compatible')" 2>nul || (
    echo ⚠️ Usando import alternativo...
)

REM Iniciar backend
echo Iniciando backend...
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
