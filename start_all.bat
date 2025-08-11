@echo off
setlocal ENABLEDELAYEDEXPANSION

REM === Paths ===
set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend

REM === Backend ===
pushd "%BACKEND%"
if not exist .venv\Scripts\python.exe (
  echo [backend] creating venv...
  python -m venv .venv
)

echo [backend] installing deps...
.cmd /c .venv\Scripts\python -m pip install -q --upgrade pip >nul 2>&1
.cmd /c .venv\Scripts\python -m pip install -q -r requirements.txt >nul 2>&1

echo [backend] starting server on port %PORT% (default 8001)...
start "llm-backend-8001" cmd /k ".venv\Scripts\python run.py"
popd

REM === Frontend ===
pushd "%FRONTEND%"
if not exist node_modules (
  echo [frontend] installing npm deps...
  call npm install
)

echo [frontend] starting dev server on http://localhost:3001 ...
start "llm-frontend-3001" cmd /k "npm run dev"
popd

echo.
echo ==== All services starting. Windows opened titled: llm-backend-8001, llm-frontend-3001 ====
echo.
exit /b 0
