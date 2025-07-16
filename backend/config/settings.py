from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Servidor
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    
    # API
    API_V1_STR: str = "/api/v1"
    
    # WebSocket
    WS_PORT: int = PORT
    
    # OpenAI
    OPENAI_API_KEY: str
    
    # Redis (opcional)
    REDIS_HOST: Optional[str] = None
    REDIS_PORT: int = 6379
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Rate limiting
    RATE_LIMIT_WINDOW: int = 60  # segundos
    RATE_LIMIT_REQUESTS: int = 100  # peticiones por ventana
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()

