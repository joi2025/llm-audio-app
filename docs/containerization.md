# Containerización del Proyecto

## Motivación
La aplicación se ha containerizado para mejorar la consistencia y portabilidad del entorno de desarrollo y producción. Los principales beneficios incluyen:

- Entorno consistente entre desarrollo y producción
- Eliminación de dependencias locales
- Simplificación del despliegue
- Mejor manejo de recursos del sistema

## Estructura del Contenedor

### Dockerfile
- Base: `python:3.11-slim`
- Dependencias del sistema:
  - `ffmpeg`: Para procesamiento de audio
  - `alsa-utils`: Para soporte de audio
  - `libasound2-dev`: Para desarrollo de audio
  - `build-essential`: Para compilación de dependencias

### docker-compose.yml
- Puertos:
  - `8000`: API FastAPI
  - `9090`: Prometheus metrics
- Volumen:
  - `./audio:/app/audio`: Para persistencia de archivos de audio
- Dispositivos:
  - `/dev/snd`: Soporte opcional para micrófono

## Mejoras de Despliegue

### Simplificación del Despliegue
```bash
docker compose up --build
```

### Monitoreo
- Prometheus metrics disponibles en puerto 9090
- Health checks integrados
- Métricas de uso de recursos

### Persistencia
- Directorio de audio persistente
- Configuración persistente
- Logs persistentes

## Consideraciones

### Seguridad
- Uso de puertos específicos
- Configuración de dispositivos restringida
- Variables de entorno para credenciales

### Rendimiento
- Optimización de caché de Docker
- Uso eficiente de recursos
- Manejo de memoria optimizado

### Escalabilidad
- Configuración para múltiples instancias
- Soporte para balanceo de carga
- Métricas para monitoreo de rendimiento
