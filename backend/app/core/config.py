import os
from functools import lru_cache
from pathlib import Path
from typing import List, Optional, Union, Dict, Any
from pydantic import AnyHttpUrl, validator, PostgresDsn, Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Configuración general
    PROJECT_NAME: str = "Voice Assistant API"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # Configuración del servidor
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    RELOAD: bool = True
    WORKERS: int = 1
    
    # Configuración de la API
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "your-secret-key-here"  # Cambiar en producción
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 días
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]  # Ajustar en producción
    
    # Base de datos
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "voice_assistant"
    POSTGRES_PORT: str = "5432"
    DATABASE_URI: Optional[PostgresDsn] = None
    
    @validator("DATABASE_URI", pre=True)
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        return PostgresDsn.build(
            scheme="postgresql",
            username=values.get("POSTGRES_USER"),
            password=values.get("POSTGRES_PASSWORD"),
            host=values.get("POSTGRES_SERVER"),
            path=f"/{values.get('POSTGRES_DB') or ''}",
        )
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4"
    OPENAI_TEMPERATURE: float = 0.7
    OPENAI_MAX_TOKENS: int = 1000
    
    # Whisper (STT)
    WHISPER_MODEL: str = "whisper-1"
    
    # TTS
    TTS_VOICE: str = "alloy"  # Voz por defecto para TTS
    
    # Configuración de archivos
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    AUDIO_CACHE_DIR: Path = BASE_DIR / "static" / "audio"
    LOG_DIR: Path = BASE_DIR / "logs"
    
    # Crear directorios necesarios
    @validator("UPLOAD_DIR", "AUDIO_CACHE_DIR", "LOG_DIR", pre=True)
    def create_dirs(cls, v: Path) -> Path:
        v.mkdir(parents=True, exist_ok=True)
        return v
    
    # Configuración de logs
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Configuración de seguridad
    SECURE_COOKIES: bool = True
    SESSION_COOKIE_NAME: str = "session"
    SESSION_SECRET_KEY: str = "session-secret-key"  # Cambiar en producción
    
    # Configuración de CORS
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Configuración de WebSocket
    WEBSOCKET_PATH: str = "/ws/assistant"
    WEBSOCKET_PING_INTERVAL: float = 25.0  # segundos
    WEBSOCKET_PING_TIMEOUT: float = 20.0   # segundos
    
    # Configuración de rate limiting
    RATE_LIMIT: str = "100/minute"
    
    # Configuración de caché
    CACHE_TTL: int = 300  # 5 minutos
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = 'utf-8'


@lru_cache()
def get_settings() -> Settings:
    """
    Obtiene la configuración de la aplicación.
    
    Esta función está decorada con @lru_cache para evitar múltiples lecturas del archivo .env.
    """
    return Settings()


# Instancia de configuración
settings = get_settings()

# Configuración de logging
if not settings.LOG_DIR.exists():
    settings.LOG_DIR.mkdir(parents=True, exist_ok=True)

# Configuración de directorios de medios
if not settings.UPLOAD_DIR.exists():
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

if not settings.AUDIO_CACHE_DIR.exists():
    settings.AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)

