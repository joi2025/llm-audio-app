# Guía de Migración a v1.1

## 1. Configuración Inicial

1. Copiar `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

2. Editar `.env` con valores específicos:
   - Configurar `OPENAI_API_KEY`
   - Ajustar puertos si necesario
   - Configurar Redis si se usa

## 2. Iniciar el Servidor

### Desarrollo
```bash
# Instalar dependencias
pip install -r requirements.txt
npm install

# Iniciar servicios
python run.py  # Backend
npm run dev    # Frontend
```

### Producción
```bash
# Instalar dependencias
pip install -r requirements-prod.txt
npm ci

# Construir frontend
npm run build

# Iniciar servidor
python run.py --prod
```

## 3. Docker (opcional)

```bash
# Construir y levantar servicios
docker compose up --build

# Ver logs
docker compose logs -f

# Parar servicios
docker compose down
```

## 4. Variables de Entorno

### Backend
- `BACKEND_HOST`: Host del servidor
- `BACKEND_PORT`: Puerto del servidor
- `WS_PORT`: Puerto WebSocket
- `OPENAI_API_KEY`: Clave de API de OpenAI
- `REDIS_*`: Configuración Redis (opcional)
- `LOG_LEVEL`: Nivel de logging

### Frontend
- `VITE_WEBSOCKET_URL`: URL WebSocket
- `VITE_API_URL`: URL API
- `VITE_OPENAI_API_KEY`: Clave de API de OpenAI

## 5. Logging

- Logs rotados diariamente
- Niveles: INFO, DEBUG, ERROR
- Archivos en `logs/`
- Salida también en stdout

## 6. Rate Limiting

- Ventana: 60 segundos
- Límite: 100 peticiones
- Configurable en `.env`

## 7. Redis (opcional)

- TTL: 24 horas
- Puerto: 6379
- Host configurable en `.env`

## 8. Observaciones

- Todos los logs incluyen timestamp
- Variables sensibles no se muestran en logs
- Configuración validada al inicio
- Logs rotados automáticamente

