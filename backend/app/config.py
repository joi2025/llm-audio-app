from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    # Configuración general
    PROJECT_NAME: str = "Voice Assistant API"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Configuración del servidor
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    RELOAD: bool = True
    
    # Seguridad
    SECRET_KEY: str = "your-secret-key-here"  # Cambiar en producción
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: list = ["*"]  # Ajustar en producción
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "app.log"
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4.1-nano"
    OPENAI_TEMPERATURE: float = 0.7
    OPENAI_MAX_TOKENS: int = 256
    
    # Whisper
    WHISPER_MODEL: str = "whisper-1"
    
    # Rutas
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    CONVERSATION_LOG: Path = BASE_DIR / "conversations.log"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        env_file_encoding = 'utf-8'

# Instancia de configuración
settings = Settings()

# Cargar variables de entorno desde .env si existe
from dotenv import load_dotenv
load_dotenv()

# Actualizar configuración con variables de entorno
if os.getenv("OPENAI_API_KEY"):
    settings.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Validar configuración requerida
if not settings.OPENAI_API_KEY:
    import warnings
    warnings.warn("OPENAI_API_KEY no está configurada. Algunas funcionalidades pueden no estar disponibles.")

