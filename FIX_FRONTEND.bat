@echo off
echo CORRIGIENDO DEPENDENCIAS FRONTEND
echo =================================

echo Instalando dependencias faltantes...
cd /d "C:\Users\Personal\CascadeProjects\llm-audio-app\frontend"

REM Instalar TailwindCSS y dependencias faltantes
echo Instalando TailwindCSS...
npm install -D tailwindcss postcss autoprefixer

REM Instalar PostCSS plugin
echo Instalando PostCSS plugin...
npm install -D @tailwindcss/postcss

REM Verificar instalación
echo Verificando instalación...
if exist "node_modules\@tailwindcss\postcss" (
    echo ✅ @tailwindcss/postcss instalado
) else (
    echo ❌ Error al instalar
)

REM Iniciar frontend
echo Iniciando frontend...
npm run dev
pause
