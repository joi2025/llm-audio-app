@echo off
echo CORRIGIENDO TAILWINDCSS COMPATIBILIDAD
echo ======================================

echo Instalando TailwindCSS v3 para compatibilidad...
cd /d "C:\Users\Personal\CascadeProjects\llm-audio-app\frontend"

REM Desinstalar TailwindCSS v4 e instalar v3
npm uninstall tailwindcss
npm install -D tailwindcss@^3.4.0

REM Verificar instalación
echo Verificando instalación...
if exist "node_modules\tailwindcss" (
    echo ✅ TailwindCSS v3 instalado
) else (
    echo ❌ Error al instalar
)

REM Iniciar frontend con compatibilidad
echo Iniciando frontend...
npm run dev
pause
