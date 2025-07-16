# Configuración del Sistema

## Variables de Entorno

### STT (Speech-to-Text)
```bash
# Modelo de Whisper
WHISPER_MODEL=tiny  # Opciones: tiny, base, small, medium, large

# Dispositivo
WHISPER_DEVICE=cpu  # Opciones: cpu, cuda
```

### TTS (Text-to-Speech)
```bash
# Proveedor
TTS_PROVIDER=edge    # Opciones: edge, coqui

# Configuración de voz
TTS_VOICE=en-US     # Voz por defecto
TTS_RATE=1.0        # Velocidad (0.5-2.0)
TTS_VOLUME=1.0      # Volumen (0.0-1.0)
```

### LLM (Language Model)
```bash
# Proveedor
LLM_PROVIDER=openai  # Opciones: openai, llama

# Modelo
LLM_MODEL=gpt-3.5-turbo  # Modelo por defecto

# API Key
OPENAI_API_KEY=your-key-here  # Requerido para OpenAI
```

## Configuración del Servidor
```bash
# Puerto de la API
API_PORT=8000

# Nivel de log
LOG_LEVEL=INFO

# Orígenes CORS permitidos
CORS_ORIGINS=*  # Por defecto permite todos
```

## Configuración de Docker
```bash
# Puerto Prometheus
PROMETHEUS_PORT=9090

# Directorio de audio
AUDIO_DIR=/app/audio

# Dispositivo de audio
AUDIO_DEVICE=/dev/snd
```

## Ejemplo de .env
```bash
# STT
WHISPER_MODEL=tiny
WHISPER_DEVICE=cpu

# TTS
TTS_PROVIDER=edge
TTS_VOICE=en-US
TTS_RATE=1.0
TTS_VOLUME=1.0

# LLM
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
OPENAI_API_KEY=your-key-here

# Servidor
API_PORT=8000
LOG_LEVEL=INFO
CORS_ORIGINS=*
```

## Consideraciones de Seguridad

### Variables Sensibles
- `OPENAI_API_KEY` debe mantenerse en secreto
- Usar variables de entorno en producción
- No hardcodear claves en el código

### Validación de Entrada
- Validar tipos de archivo
- Limitar tamaño de archivos
- Validar tokens de acceso

### Manejo de Errores
- Logging estructurado
- Manejo de timeouts
- Validación de respuestas
