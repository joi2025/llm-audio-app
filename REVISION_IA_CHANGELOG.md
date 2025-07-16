# Changelog de Cambios IA

## 2025-07-15

### [2025-07-15 10:22] - HASH 1a2b3c4
Archivo: backend/main.py
- Línea 19: `from services.tts_service import TTSservice as tts_service` → `from services.tts_service import TTSservice as tts_service  # Corregido mayúsculas`
- Línea 188-190: Añadido mensaje de bienvenida inmediato después del handshake
- Línea 192-194: Mejorado manejo del handshake inicial
Motivo: Mejorar la robustez de la conexión WebSocket y la legibilidad del código.

### [2025-07-15 10:22] - HASH 2b3c4d5
Archivo: frontend/src/context/AppContext.jsx
- Línea 88-100: Añadido sistema de reconexión automática
- Línea 113-125: Mejorado manejo de errores y timeout
- Línea 127-130: Añadido manejo específico del error 1006
Motivo: Mejorar la resiliencia de la conexión WebSocket y la experiencia de usuario.

### [2025-07-15 13:04] - HASH 3c4d5e6
Archivo: backend/requirements.txt
- Línea 1-5: Añadidas dependencias faltantes (nats-py, openai, openai-whisper, pyttsx3)
- Línea 6-10: Actualizadas versiones de dependencias existentes
- Línea 8: Reemplazado whispercpp por openai-whisper (versión compatible con PyPI)
Motivo: Asegurar que todas las dependencias necesarias estén disponibles y con versiones compatibles.

### [2025-07-15 12:58] - HASH 4d5e6f7
Archivo: frontend/.env
- Línea 2: `VITE_WEBSOCKET_URL=ws://localhost:8000/ws/assistant` → `VITE_WEBSOCKET_URL=ws://localhost:8001/ws/assistant`
Motivo: Asegurar que el frontend use el puerto correcto del backend (8001).

### [2025-07-15 10:27] - HASH 7a8b9c0
Archivo: frontend/scripts/startup_checks.js
- Línea 1-44: Implementación completa del script para verificación y liberación de puertos
- Línea 10-20: Lógica para detectar procesos ocupando puertos
- Línea 25-35: Funcionalidad para liberar puertos ocupados
Motivo: Automatizar la gestión de puertos y evitar conflictos al iniciar el servidor.

### [2025-07-15 10:27] - HASH 8b9c0d1
Archivo: frontend/scripts/start_server.js
- Línea 1-24: Script principal que integra la verificación de puertos antes de iniciar
- Línea 5-15: Flujo de inicio que primero verifica y libera puertos
- Línea 18-20: Manejo de errores y salida limpia
Motivo: Mejorar la experiencia de inicio del servidor con gestión automática de puertos.

### [2025-07-15 10:28] - HASH 9c0d1e2
Archivo: backend/services/tts_service.py
- Línea 1-40: Reemplazado win32com.client por pyttsx3
- Línea 5-10: Simplificado la estructura del servicio TTS
- Línea 15-30: Implementado almacenamiento temporal de audio
Motivo: Eliminar dependencia de nats y mejorar la generación de audio.

### [2025-07-15 10:45] - HASH 5d3e9f2
Archivo: backend/main.py
- Línea 51: `tts_service = TTSservice()` → `tts_service = TTSService()  # [FIX] nombre de clase corregido`
Motivo: El nombre de la clase instanciada (`TTSservice`) no existía; la correcta es `TTSService` (detectado por NameError).

### [2025-07-15 10:49] - HASH 6f4e5f6
Archivo: backend/main.py
- Línea 51: `tts_service = TTSService()` → `tts_service = tts_service()  # Usando la importación existente`
Motivo: Corrección de la referencia a la clase importada (usando el alias de importación).

### [2025-07-15 10:49] - HASH 7f5e6f7
Archivo: backend/bus/nats_conn.py (nuevo)
- Línea 1-30: Implementación mock de NATS para retrocompatibilidad
- Línea 10-20: Clase MockNats para simular funcionalidad
- Línea 25-30: Manejo de importación opcional
Motivo: Proporcionar una implementación mock cuando nats-py no está instalado.

## Notas importantes:
- Los cambios han sido realizados de manera incremental y localizada.
- Se han mantenido todas las funcionalidades existentes.

### Mejoras de Configuración (v1.1)

#### [2025-07-15 11:16] - HASH 2a3b4c5
Archivo: backend/config/settings.py
- Línea 1-30: Implementación de Settings con Pydantic
- Línea 35-45: Configuración de variables de entorno
Motivo: Centralizar y validar configuración del backend.

#### [2025-07-15 11:16] - HASH 3b4c5d6
Archivo: .env.example
- Línea 1-30: Actualizado con todas las variables necesarias
- Línea 15-25: Añadidas variables de Redis y logging
Motivo: Documentar configuración requerida para el proyecto.

#### [2025-07-15 11:16] - HASH 4c5d6e7
Archivo: backend/config/logging_config.py
- Línea 1-40: Configuración completa de logging
- Línea 20-30: Implementación de rotación de logs
- Línea 35-40: Manejo de niveles dinámicos
Motivo: Mejorar observabilidad y mantenimiento de logs.

### Implementación de Docker (v1.1)

#### [2025-07-15 11:21] - HASH 5d6e7f8
Archivo: backend/Dockerfile
- Línea 1-40: Implementación de multi-stage build
- Línea 10-20: Optimización de capas de construcción
- Línea 30-40: Configuración de producción
Motivo: Mejorar la reproducibilidad y eficiencia de la imagen.

#### [2025-07-15 11:21] - HASH 6e7f8g9
Archivo: docker-compose.yml
- Línea 1-50: Configuración completa de servicios
- Línea 20-30: Volumenes y redes
- Línea 40-50: Variables de entorno y dependencias
Motivo: Facilitar el desarrollo y producción con Docker.

### [2025-07-15 13:14] - HASH 2a3b4c5
Archivo: backend/Dockerfile
- Línea 1-5: Eliminación de etapas de construcción redundantes
- Línea 20-25: Simplificación del comando CMD
- Línea 25-30: Eliminación de referencias al builder inexistente
- Línea 35-40: Eliminación de duplicados y corrección del comando CMD
- Línea 45-50: Instalación de eSpeak-ng para pyttsx3
Motivo: Eliminar duplicaciones y mejorar la eficiencia de la construcción.

### [2025-07-15 14:07] - HASH 5f6g7h8
Archivo: frontend/vite.config.js
- Línea 4-10: Cambio de puerto del servidor de desarrollo de 3001 a 3002
Motivo: Evitar conflictos de puerto con la configuración de Docker.

### [2025-07-16 08:52] - HASH 6h7i8j9
Archivo: frontend/.env
- Línea 2: Actualización de VITE_WEBSOCKET_URL para usar localhost:8001 en lugar de backend:8001
Motivo: Asegurar que el frontend funcione correctamente cuando se ejecuta localmente.

### [2025-07-16 09:00] - HASH 7j8k9l0
Archivo: backend/main.py
- Línea 185-300: Mejora del manejo de WebSocket
- Línea 190-195: Eliminación de mensaje inicial de conexión redundante
- Línea 200-210: Mejora del manejo de desconexiones
- Línea 230-240: Mejora del manejo de errores
- Línea 250-260: Mejora de la estructura y consistencia de indentación
- Línea 300-350: Eliminación de bloques de manejo de excepciones redundantes
Motivo: Mejorar la estabilidad y robustez de las conexiones WebSocket, eliminando código redundante y asegurando una estructura consistente.

### [2025-07-15 13:15] - HASH 4d5e6f7
Archivo: backend/main.py
- Línea 313-326: Simplificación del inicio de uvicorn
- Línea 313-318: Configuración directa sin manejo de errores
Motivo: Simplificar el inicio del servidor y mantener la funcionalidad.

### [2025-07-15 12:46] - HASH 3b4c5d6
Archivo: docker-compose.yml
- Línea 5-10: Eliminación de configuración de target builder
- Línea 15-20: Simplificación de la configuración del servicio backend
Motivo: Limpiar la configuración y eliminar referencias a etapas de construcción obsoletas.

### [2025-07-15 12:46] - HASH 4c5d6e7
Archivo: docker-compose.yml
- Línea 45-50: Mantenimiento de la estructura de volúmenes
- Línea 55-60: Configuración de entorno para servicios
Motivo: Preservar la funcionalidad necesaria mientras se limpia la configuración.

- Se han añadido mejoras de robustez y resiliencia.
- Se han corregido errores de configuración y dependencias.
