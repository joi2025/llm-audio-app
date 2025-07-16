# Guía de Despliegue

## Requisitos Previos

### Sistema Operativo
- Windows 10/11 o Linux
- Docker Desktop instalado
- Python 3.11+

### Herramientas
- Docker Desktop
- Docker Compose
- Git
- Python 3.11+

## Despliegue Local

### 1. Clonar Repositorio
```bash
git clone https://github.com/your/repo.git
```

### 2. Configurar Variables de Entorno
Crear archivo `.env`:
```bash
# STT
WHISPER_MODEL=tiny
WHISPER_DEVICE=cpu

# TTS
TTS_PROVIDER=edge
TTS_VOICE=en-US

# LLM
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
OPENAI_API_KEY=your-key-here
```

### 3. Construir y Ejecutar
```bash
docker compose up --build
```

### 4. Verificar Estado
```bash
docker compose ps
```

## Despliegue en Producción

### 1. Preparar Imagen
```bash
docker build -t llm-audio-app .
```

### 2. Configurar Variables de Entorno
```bash
# En el servidor
export OPENAI_API_KEY=your-key-here
export WHISPER_MODEL=base
export TTS_PROVIDER=edge
```

### 3. Ejecutar en Producción
```bash
docker run -d \
  -p 8000:8000 \
  -p 9090:9090 \
  -v /path/to/audio:/app/audio \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  llm-audio-app
```

## Monitoreo

### Métricas Prometheus
- Puerto: 9090
- Endpoint: `/metrics`
- Métricas:
  - `llm_requests_total`
  - `stt_transcriptions_total`
  - `tts_syntheses_total`
  - `api_response_time_seconds`

### Logs
- Nivel: INFO
- Formato: JSON
- Localización: `/app/logs`

## Escalabilidad

### Balanceo de Carga
```yaml
# docker-compose.yml
services:
  app:
    deploy:
      replicas: 3
      update_config:
        parallelism: 2
        delay: 10s
```

### Volumenes Persistentes
```yaml
volumes:
  audio:
    driver: local
    driver_opts:
      type: none
      device: /path/to/audio
      o: bind
```

## Seguridad

### Red
- Puerto 8000: API
- Puerto 9090: Prometheus
- Restringir acceso con firewall

### API
- Validación de tokens
- Rate limiting
- CORS configurado

### Contenedor
- Usuario no root
- Limites de recursos
- Configuración de seguridad
