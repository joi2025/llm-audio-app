# LLM Audio Frontend

## 🎯 Descripción
Aplicación React para interacción con LLM mediante voz. Permite grabar audio, transcribirlo y obtener respuestas de un asistente de IA.

## 🚀 Inicio Rápido

### Opción 1: Windows (Recomendado)
```bash
start.bat
```

### Opción 2: Linux/Mac
```bash
chmod +x start.sh
./start.sh
```

### Opción 3: Manual
```bash
npm install
npm run dev
```

## 📋 Requisitos Previos
- Node.js 16+
- npm 7+
- Navegador web moderno (Chrome, Firefox, Safari)

## 🔧 Configuración

### Variables de Entorno (crear .env en la raíz)
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

### Microphone Permissions
La aplicación requiere permisos de micrófono. Asegúrate de:
1. Usar HTTPS o localhost
2. Otorgar permisos cuando el navegador lo solicite

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── AudioRecorder/  # Grabador de audio
│   ├── Conversation/   # Visualización de conversación
│   └── AdminPanel/     # Panel de administración
├── context/            # Contextos de React
├── hooks/             # Hooks personalizados
├── services/          # Servicios y APIs
└── App.jsx           # Componente principal
```

## 🧪 Testing
```bash
npm run test
```

## 🏗️ Build para Producción
```bash
npm run build
```

## 🐛 Solución de Problemas

### Error: "Cannot access microphone"
- Verificar que el sitio use HTTPS o localhost
- Revisar permisos del navegador
- Verificar que el micrófono esté conectado

### Error: "Connection failed"
- Verificar que el backend esté ejecutándose
- Verificar URLs en variables de entorno
- Verificar firewall y red

### Error: "npm install fails"
- Limpiar cache: `npm cache clean --force`
- Eliminar node_modules y package-lock.json
- Reinstalar: `npm install`

## 📞 Soporte
Si encuentras problemas:
1. Verifica los logs en la consola del navegador
2. Revisa la sección de solución de problemas
3. Contacta al equipo de desarrollo

## 🔄 Flujo de Trabajo
1. Usuario graba audio
2. Audio se envía al backend
3. Backend procesa con LLM
4. Respuesta se muestra en interfaz
5. Conversación se guarda en contexto

## 📝 Notas de Desarrollo
- Usa componentes funcionales con hooks
- Context API para estado global
- Axios para peticiones HTTP
- WebSocket para comunicación real-time
