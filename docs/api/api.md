# API Documentation

## Endpoints

### 1. `/transcribe` (POST)
- Transcribe audio a texto
- Soporta archivos WAV/MP3
- Manejo de streaming

**Request**
```json
{
  "file": "audio.wav",
  "language": "es"
}
```

**Response**
```json
{
  "text": "Transcripción del audio",
  "confidence": 0.95,
  "duration": "12.34"
}
```

### 2. `/chat` (POST)
- Procesa mensajes de chat
- Soporta audio y texto
- Respuesta con texto y audio

**Request**
```json
{
  "message": "Hola",
  "audio": "audio.wav",
  "language": "es"
}
```

**Response**
```json
{
  "text": "Respuesta del LLM",
  "audio_url": "/audio/response.wav",
  "duration": "5.67"
}
```

### 3. `/health` (GET)
- Estado del servicio
- Métricas de rendimiento

**Response**
```json
{
  "status": "healthy",
  "services": {
    "stt": "online",
    "tts": "online",
    "llm": "online"
  }
}
```

### 4. `/metrics` (GET)
- Métricas Prometheus
- Uso de recursos
- Tiempos de respuesta

## Errores

**Códigos de Error**
- `400`: Bad Request
- `404`: Not Found
- `422`: Unprocessable Entity
- `500`: Internal Server Error

**Ejemplo de Error**
```json
{
  "detail": {
    "error": "Invalid audio format",
    "code": 422
  }
}
```

## Configuración

### Variables de Entorno
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

# API
API_PORT=8000
```

## Seguridad

- Validación de tipos
- Límites de tamaño
- Timeout de procesamiento
- Rate limiting
- Manejo de errores
