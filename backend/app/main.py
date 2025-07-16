import os
import uuid
import logging
from fastapi import FastAPI, Request, status, WebSocket, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

# Importar configuración y utilidades
from .core.config import settings
from .core.logging import setup_logging
from .core.security import get_websocket_user
from .services.websocket_manager import WebSocketHandler

# Configurar logging
logger = setup_logging()

# Crear la aplicación FastAPI
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Código que se ejecuta al iniciar la aplicación
    logger.info("Iniciando la aplicación...")
    
    # Verificar variables de entorno requeridas
    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY no está configurada. Algunas funcionalidades pueden no estar disponibles.")
    
    yield
    
    # Código que se ejecuta al apagar la aplicación
    logger.info("Apagando la aplicación...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API para asistente de voz con capacidades de STT, LLM y TTS",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar directorio estático para archivos de audio generados
os.makedirs("static/audio", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Manejador de errores global
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Error no manejado en {request.url}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Error interno del servidor"},
    )

# Endpoint de salud
@app.get("/healthz", tags=["Sistema"])
async def health_check():
    """
    Verifica el estado del servicio.
    """
    return {
        "status": "ok",
        "version": settings.VERSION,
        "environment": "development" if settings.DEBUG else "production"
    }

# Endpoint WebSocket
@app.websocket("/ws/assistant")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = None,
):
    """
    Endpoint WebSocket para la comunicación con el asistente de voz.
    
    Parámetros de consulta:
    - token: Token JWT para autenticación (opcional si se envía en el mensaje AUTH)
    """
    # Generar un ID único para la conexión
    connection_id = str(uuid.uuid4())
    
    # Crear manejador WebSocket
    handler = WebSocketHandler(websocket, connection_id)
    
    try:
        # Manejar la conexión
        await handler.handle_connection()
    except Exception as e:
        logger.error(f"Error en la conexión WebSocket {connection_id}: {str(e)}", exc_info=True)
    finally:
        # Limpiar recursos
        if hasattr(handler, 'manager'):
            handler.manager.disconnect(connection_id)

# Incluir routers de la API
# from .api.v1.endpoints import auth, users, conversations
# app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])
# app.include_router(users.router, prefix="/api/v1/users", tags=["Usuarios"])
# app.include_router(conversations.router, prefix="/api/v1/conversations", tags=["Conversaciones"])

# Solo para desarrollo: Servir documentación en la raíz en modo debug
if settings.DEBUG:
    @app.get("/", include_in_schema=False)
    async def root():
        return {"message": "Bienvenido a la API del Asistente de Voz", "docs": "/docs"}

