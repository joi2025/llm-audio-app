#!/bin/bash

# Configuración
source config.env

# Construir imagen
docker build \
  --build-arg BUILD_DATE=${BUILD_DATE} \
  --build-arg VCS_REF=${VCS_REF} \
  -t llm-audio-app:${VCS_REF} \
  .

# Crear red
docker network create ${DOCKER_NETWORK} || true

# Crear volúmenes
docker volume create audio-volume || true
docker volume create logs-volume || true

# Ejecutar contenedor
docker run -d \
  --name llm-audio-app \
  --network ${DOCKER_NETWORK} \
  -p 8000:8000 \
  -p ${PROMETHEUS_PORT}:${PROMETHEUS_PORT} \
  -v audio-volume:${AUDIO_VOLUME} \
  -v logs-volume:${LOGS_VOLUME} \
  -e LOG_LEVEL=${LOG_LEVEL} \
  -e LOG_FORMAT=${LOG_FORMAT} \
  -e AUDIO_DEVICE=${AUDIO_DEVICE} \
  -e AUDIO_RATE=${AUDIO_RATE} \
  -e AUDIO_CHANNELS=${AUDIO_CHANNELS} \
  llm-audio-app:${VCS_REF}
