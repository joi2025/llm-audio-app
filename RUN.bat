@echo off
echo INICIANDO SERVIDORES LLM AUDIO APP
echo =====================================

REM Backend
echo Iniciando backend...
cd backend
start cmd /k python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

REM Frontend
echo Iniciando frontend...
cd frontend
start cmd /k npm install && npm run dev

echo Servidores iniciados
pause
