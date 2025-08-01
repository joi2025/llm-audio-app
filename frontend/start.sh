#!/bin/bash

echo "🚀 Iniciando LLM Audio Frontend..."
echo "📋 Limpiando código muerto..."

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js primero."
    exit 1
fi

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado. Por favor instala npm primero."
    exit 1
fi

echo "✅ Node.js y npm detectados"

# Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Verificar puerto disponible
PORT=5173
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Puerto $PORT ocupado. Liberando..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo "🎯 Iniciando servidor de desarrollo..."
echo "🔗 La aplicación estará disponible en: http://localhost:$PORT"
echo "📊 Logs en tiempo real:"
echo "----------------------------------------"

npm run dev
