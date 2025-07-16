# Arquitectura del Sistema

## Vista General

```
+-------------------+
|     Frontend      |
+-------------------+
          ↓
+-------------------+
|   FastAPI Server  |
|  +---------------+ |
|  | STT Service   | |
|  +---------------+ |
|  | TTS Service   | |
|  +---------------+ |
|  | LLM Client    | |
|  +---------------+ |
+-------------------+
          ↓
+-------------------+
|    Audio Files    |
|    +-----------+  |
|    |  /audio   |  |
|    +-----------+  |
+-------------------+
```

## Componentes Principales

### 1. STT Service (Speech-to-Text)
- Utiliza Whisper para transcripción
- Soporte para archivos y streaming
- Manejo de archivos grandes (>25MB)
- Event sourcing para trazabilidad

### 2. TTS Service (Text-to-Speech)
- Proveedores:
  - Edge TTS (Microsoft)
  - Coqui TTS
- Configurable por ambiente
- Soporte para diferentes voces

### 3. LLM Client
- Proveedores:
  - OpenAI
  - llama.cpp
- Streaming de respuestas
- Métricas de uso
- Validación de roles

## Flujo de Datos

### Flujo STT
1. Recepción de audio
2. Validación y procesamiento
3. Transcripción con Whisper
4. Event sourcing
5. Respuesta con texto

### Flujo TTS
1. Recepción de texto
2. Validación de proveedor
3. Síntesis de voz
4. Generación de audio
5. Respuesta con archivo

### Flujo Chat
1. Recepción de mensaje
2. Transcripción (si es audio)
3. Procesamiento con LLM
4. Síntesis de respuesta
5. Respuesta con texto/audio
