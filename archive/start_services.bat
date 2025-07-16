@echo off
SETLOCAL

echo === INICIANDO SISTEMA LLM-AUDIO-APP ===
echo Este script usa PowerShell para mejor control

echo.
powershell -ExecutionPolicy Bypass -File "%~dp0start_services.ps1"

pause

