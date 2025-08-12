# 🎤 LLM Audio App - Asistente de Voz Inteligente

**Versión 2.0 - Con Sistema de Personalidades Avanzado y Detección Automática**

Un asistente de voz completo con reconocimiento automático de habla, procesamiento LLM inteligente, síntesis de voz optimizada para español, y sistema de personalidades estilo Grok.

## ✨ Características Principales

### 🎭 **Sistema de Personalidades Avanzado**
- **15 personalidades únicas** organizadas en 5 categorías
- **Voces OpenAI optimizadas** para cada personalidad
- **System prompts personalizados** para experiencias únicas
- **Interfaz visual moderna** con colores y emojis distintivos

### 🤖 **Detección Automática de Voz (v2 Auto)**
- **Sin botones**: Detección automática por silencios
- **Interrupciones naturales** durante respuestas del asistente
- **Optimizado para español** con baja latencia
- **Modo manual** disponible como alternativa

### 🔧 **Panel de Administración Renovado**
- **Interfaz con pestañas** para mejor organización
- **Verificador de API Key** integrado
- **Configuración técnica** completa
- **Logs y conversaciones** en tiempo real

### 🌐 **Arquitectura Moderna**
- **Backend**: Flask-SocketIO para WebSocket estable
- **Frontend**: React con hooks optimizados
- **Comunicación**: SocketIO para tiempo real
- **Persistencia**: localStorage para configuraciones

## 🎭 Personalidades Disponibles

### 😄 **Divertidos**
- **😂 Comediante**: Humor inteligente y chistes ingeniosos
- **🤪 Rey de Memes**: Cultura meme y humor generacional
- **🙄 Sarcástico**: Sarcasmo inteligente e ironía sutil

### 🎓 **Profesionales**
- **🎓 Profesor Universitario**: Explicaciones académicas claras
- **💼 Consultor Ejecutivo**: Consejos estratégicos empresariales
- **🔬 Científico**: Análisis riguroso y metodológico

### 💫 **Sensuales**
- **💕 Romántico**: Tono encantador y cálido
- **🌙 Misterioso**: Respuestas enigmáticas e intrigantes
- **😏 Seguro de Sí Mismo**: Confianza y carisma

### 🧠 **Serios**
- **🤔 Filósofo**: Reflexiones profundas y sabiduría
- **📊 Analista**: Datos precisos y análisis detallado
- **🧙‍♂️ Mentor Sabio**: Guía sabia y experiencia

### 🎨 **Creativos**
- **🎨 Artista Bohemio**: Creatividad e inspiración artística
- **📚 Narrador**: Historias cautivadoras y narrativa

## 🚀 Inicio Rápido

### **🔧 Setup Inicial (Solo Primera Vez)**
```powershell
# Configuración automática completa del sistema
.\setup.ps1
```

### **🚀 Inicio del Sistema (Recomendado)**
```powershell
# Iniciar sistema completo automáticamente
.\start.ps1

# Opciones adicionales:
.\start.ps1 -Silent    # Sin output detallado
.\start.ps1 -NoOpen    # No abrir navegador automáticamente
```

### **🛑 Detener Sistema**
```powershell
# Detención segura y limpieza completa
.\stop.ps1

# Opciones adicionales:
.\stop.ps1 -Force      # Detención forzada
.\stop.ps1 -KeepLogs   # Mantener archivos de log
```

### **⚡ Scripts Disponibles**
| Script | Descripción | Uso |
|--------|-------------|-----|
| `setup.ps1` | Configuración inicial automática | Solo primera vez |
| `start.ps1` | Inicio completo del sistema | Uso diario |
| `stop.ps1` | Detención segura y limpieza | Cuando termines |
| `start_production.ps1` | Script legacy (usar start.ps1) | Alternativo |

## ⚙️ Configuración

### **Variables de Entorno (.env)**
```env
OPENAI_API_KEY=tu_api_key_aqui
OPENAI_BASE_URL=https://api.openai.com/v1
BACKEND_PORT=8001
FRONTEND_PORT=3001
DEFAULT_VOICE=nova
DEFAULT_MODEL=gpt-4o-mini
```

## 🎯 Modos de Uso

### **🤖 v2 Auto (Recomendado)**
- Detección automática de voz por silencios
- Interrupciones naturales
- Optimizado para conversaciones fluidas
- Sin necesidad de botones

### **👆 v2 Voz (Manual)**
- Control manual con botón
- Ideal para entornos ruidosos
- Mayor control sobre la grabación

### **💻 Usuario (Clásico)**
- Interfaz tradicional con grabación manual
- Chat de texto disponible
- Historial de conversaciones visible

### **🛠️ Admin**
- Panel de administración completo
- Configuración de personalidades
- Monitoreo de logs y conversaciones
- Verificación de API Key

## 🔧 Optimizaciones Implementadas

### **Para Español**
- Voces OpenAI optimizadas (Nova por defecto)
- System prompts en español
- Configuración de temperatura ajustada (0.6)
- Pausas naturales en TTS

### **Para Eficiencia**
- Tokens reducidos (120 max por defecto)
- Penalties para evitar repeticiones
- Detección VAD optimizada
- Conexiones SocketIO estables

### **Para UX**
- Interfaz moderna con gradientes
- Estados visuales claros
- Responsive design
- Persistencia de configuraciones

## 📊 Arquitectura Técnica

```
Frontend (React + Vite)
├── hooks/
│   ├── usePersonality.js     # Gestión de personalidades
│   ├── useAutoVoice.js       # Detección automática
│   ├── useSocketIO.js        # Comunicación tiempo real
│   └── useMicVAD.js         # Voice Activity Detection
├── pages/
│   ├── VoiceCircleV2.jsx    # Interfaz v2 con auto-detección
│   └── VoiceCircle.jsx      # Interfaz v1 manual
├── components/
│   ├── AdminPanelNew.jsx    # Panel admin renovado
│   └── VoiceAvatar.jsx      # Círculo de voz visual
└── data/
    └── personalities.js      # Base de datos personalidades

Backend (Flask + SocketIO)
├── app/api/
│   └── websocket_socketio.py # Handlers SocketIO optimizados
├── app/services/
│   ├── openai_service.py    # Integración OpenAI
│   └── database.py          # SQLite para persistencia
└── run.py                   # Servidor principal
```

## 🎤 Voces Optimizadas para Español

| Voz | Personalidades | Descripción |
|-----|---------------|-------------|
| **Nova** | Comediante, Consultor | Voz femenina clara, ideal para español |
| **Alloy** | Rey de Memes, Profesor | Voz equilibrada y versátil |
| **Echo** | Científico, Analista | Voz masculina clara y profesional |
| **Onyx** | Sarcástico, Mentor | Voz masculina profunda y autoritaria |
| **Shimmer** | Romántico, Artista | Voz femenina suave y expresiva |
| **Fable** | Misterioso, Narrador | Voz expresiva con carácter único |

## 🔒 Seguridad y Mejores Prácticas

- API Keys nunca hardcodeadas
- Variables de entorno para configuración
- Validación de entrada en backend
- Manejo de errores robusto
- Logs detallados para debugging

## 🚀 Despliegue en Producción

El sistema está optimizado para:
- **Baja latencia**: < 2 segundos respuesta completa
- **Bajo costo API**: Tokens optimizados para español
- **Alta estabilidad**: SocketIO con reconexión automática
- **Escalabilidad**: Arquitectura modular y extensible

## 📝 Changelog v2.0

### ✅ **Nuevas Características**
- Sistema de personalidades avanzado (15 personalidades)
- Detección automática de voz sin botones
- Panel de administración renovado con pestañas
- Optimizaciones específicas para español
- Interfaz moderna con gradientes y efectos

### 🔧 **Mejoras Técnicas**
- Migración a Flask-SocketIO para estabilidad
- Hooks React optimizados
- VAD (Voice Activity Detection) mejorado
- Sistema de persistencia con localStorage
- Manejo de errores robusto

### 🎯 **Optimizaciones de Rendimiento**
- Reducción de tokens para menor costo
- Configuración de temperatura optimizada
- Penalties para evitar repeticiones
- Conexiones WebSocket más estables
- Carga lazy de componentes

---

**🎉 ¡Disfruta tu asistente de voz personalizado con detección automática!**

## Structure

- `frontend/`: React app
- `backend/`: Flask app
  - `app/api/`: REST and WS endpoints
  - `app/db.py`: SQLite helpers (conversations, logs, settings)
  - `app/config.py`: env loading and model defaults
  - `run.py`: dev entry point
- `.pids/`: runtime PIDs for start/stop scripts
- `backend/data/app.db`: SQLite database (gitignored)

## Features

- User mode (Voice Advance):
  - Record audio and stream via WS; automatic STT → Chat → TTS
  - Send text; receive LLM reply + TTS
  - Stop button to halt playback and save tokens
  - Conversation history panel and logs panel

- Admin mode (Pro):
  - Server status and API key check
  - Settings editor: quality tiers (low → high), voice name/gender/style/mood, max tokens in/out
  - Conversation history listing with token in/out and cost estimate
  - Logs listing

## Requirements

- Node.js 18+
- Python 3.10+
- OpenAI API key

## Environment

Create `backend/.env` (already set up to be loaded explicitly):

```
PORT=8001
OPENAI_API_KEY=YOUR_KEY_HERE
# Optional overrides
# OPENAI_BASE_URL=https://api.openai.com/v1
# STT_MODEL=whisper-1
# CHAT_MODEL=gpt-4o-mini
# TTS_MODEL=gpt-4o-mini-tts
# TTS_VOICE=alloy
```

Note: `.env` is gitignored.

## Run (Windows)

Use the PowerShell scripts in project root:

```
powershell -ExecutionPolicy Bypass -File .\start_all.ps1
# or
powershell -ExecutionPolicy Bypass -File .\restart_all.ps1
# to stop
powershell -ExecutionPolicy Bypass -File .\stop_all.ps1
```

Frontend: http://localhost:3001
Backend health: http://127.0.0.1:8001/health

## Admin API

- `GET /api/admin/status` → `{ status, ws, key_ok, errors }`
- `GET /api/admin/settings` → key/value dict
- `POST /api/admin/settings` body: `{ key: value, ... }`
- `GET /api/admin/conversations?limit=100`
- `DELETE /api/admin/conversations`
- `GET /api/admin/logs?limit=200`

## Pricing tiers and models

Tiers map to internal model selections:
- low, medium_low → `gpt-4o-mini`
- medium → `CHAT_MODEL` from env (default `gpt-4o-mini`)
- medium_high, high → `gpt-4o`

TTS model defaults to `TTS_MODEL` (`gpt-4o-mini-tts`), with option to prefer higher tier mapping.

Token and cost estimates are rough (1 token ≈ 4 chars) and demo prices; adjust to real prices in `backend/app/api/websocket.py` `_estimate_cost()`.

## Git hygiene

- Secrets: `.env` is ignored (`backend/.env`). Ensure you do not commit keys.
- Data: `backend/data/` ignored.

## Development notes

- Env loading is forced from `backend/.env` in `app/config.py` to avoid CWD issues.
- WebSocket path: `/ws/assistant` (frontend reads from `VITE_WS_URL`)
- Admin UI at frontend: toggle User/Admin in header.

## Scripts

- `start_all.ps1`: creates venv, installs Python deps, installs Node deps, starts backend (8001) and frontend (3001).
- `stop_all.ps1`: stops processes using saved PIDs; best-effort window close.
- `restart_all.ps1`: stop then start.

## Roadmap

- Auth for Admin endpoints
- Better pricing integration with real rates
- Unit tests
- Deploy pipeline
