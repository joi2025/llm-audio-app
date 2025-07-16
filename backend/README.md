# Voice Assistant API

API backend para un asistente de voz interactivo con capacidades de STT (speech-to-text), LLM (Large Language Model) y TTS (text-to-speech).

## Características

- **STT (Speech-to-Text)**: Transcripción de audio a texto usando Whisper de OpenAI
- **LLM (Large Language Model)**: Generación de respuestas usando modelos avanzados de OpenAI
- **TTS (Text-to-Speech)**: Síntesis de voz para respuestas de audio
- **WebSocket**: Comunicación en tiempo real con el frontend
- **Autenticación JWT**: Seguridad basada en tokens JWT
- **Configuración centralizada**: Fácil configuración mediante variables de entorno
- **Logging estructurado**: Registros detallados en formato JSON
- **Documentación automática**: Documentación de la API generada automáticamente

## Requisitos previos

- Python 3.9+
- PostgreSQL
- Redis (opcional, para caché y colas)
- Cuenta de OpenAI con API key

## Instalación

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/tuusuario/llm-audio-app.git
   cd llm-audio-app/backend
   ```

2. Crear un entorno virtual y activarlo:
   ```bash
   python -m venv venv
   source venv/bin/activate  # En Windows: .\venv\Scripts\activate
   ```

3. Instalar dependencias:
   ```bash
   pip install -r requirements.txt
   ```

4. Copiar el archivo de ejemplo de variables de entorno:
   ```bash
   cp .env.example .env
   ```

5. Configurar las variables de entorno en el archivo `.env`

## Configuración

Copie el archivo `.env.example` a `.env` y configure las siguientes variables según sea necesario:

- `OPENAI_API_KEY`: Su clave de API de OpenAI
- `SECRET_KEY`: Una clave secreta para firmar tokens JWT
- Configuración de base de datos (PostgreSQL)
- Configuración de Redis (opcional)

## Ejecución

### Desarrollo

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### Producción con Gunicorn

```bash
gunicorn -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:8001 app.main:app
```

## Documentación de la API

Una vez que el servidor esté en ejecución, la documentación interactiva de la API estará disponible en:

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## Estructura del proyecto

```
backend/
├── app/
│   ├── api/                  # Endpoints de la API
│   │   └── v1/               # Versión 1 de la API
│   │       ├── endpoints/     # Módulos de endpoints
│   │       └── websockets/    # Manejadores de WebSocket
│   ├── core/                 # Configuración y utilidades centrales
│   ├── models/               # Modelos Pydantic
│   ├── services/             # Lógica de negocio
│   ├── static/               # Archivos estáticos (audio, etc.)
│   └── utils/                # Utilidades varias
├── tests/                   # Pruebas unitarias
├── .env.example             # Plantilla de variables de entorno
├── requirements.txt         # Dependencias del proyecto
└── README.md               # Este archivo
```

## Uso con WebSocket

El endpoint WebSocket está disponible en `ws://localhost:8001/ws/assistant`.

### Autenticación

Envíe un mensaje de autenticación primero:

```json
{
  "type": "auth",
  "token": "su-jwt-token-aquí"
}
```

### Enviar audio

```json
{
  "type": "audio",
  "audio_data": "base64-encoded-audio-data"
}
```

### Enviar texto

```json
{
  "type": "text",
  "text": "Hola, ¿cómo estás?"
}
```

## Variables de entorno importantes

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `OPENAI_API_KEY` | Clave de API de OpenAI | - |
| `SECRET_KEY` | Clave secreta para JWT | `your-secret-key-here` |
| `ALGORITHM` | Algoritmo para JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Tiempo de expiración del token | `10080` (7 días) |
| `POSTGRES_*` | Configuración de PostgreSQL | - |
| `REDIS_URL` | URL de conexión a Redis | `redis://localhost:6379/0` |

## Despliegue

### Docker

```bash
docker-compose up --build
```

### Kubernetes

Ver la documentación en `kubernetes/README.md`.

## Contribución

1. Hacer fork del repositorio
2. Crear una rama para tu característica (`git checkout -b feature/AmazingFeature`)
3. Hacer commit de tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Hacer push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Licencia

Distribuido bajo la licencia MIT. Ver `LICENSE` para más información.

## Contacto

Tu Nombre - [@tuusuario](https://twitter.com/tuusuario)

Enlace del proyecto: [https://github.com/tuusuario/llm-audio-app](https://github.com/tuusuario/llm-audio-app)
