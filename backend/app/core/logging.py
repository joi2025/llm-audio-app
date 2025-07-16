import os
import sys
import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Dict, Any, Optional

from .config import settings

# Crear directorio de logs si no existe
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

# Configuración por defecto
DEFAULT_LOG_LEVEL = logging.INFO
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
JSON_LOG_FORMAT = "%(message)s"
MAX_BYTES = 10 * 1024 * 1024  # 10 MB
BACKUP_COUNT = 5

class JsonFormatter(logging.Formatter):
    """Formateador de logs en formato JSON para registro estructurado"""
    
    def format(self, record: logging.LogRecord) -> str:
        """Formatea el registro de log como JSON"""
        log_record: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Agregar información de excepción si existe
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        
        # Agregar campos adicionales si están presentes
        if hasattr(record, "extra"):
            log_record.update(record.extra)
        
        return json.dumps(log_record, ensure_ascii=False)

def setup_logging() -> logging.Logger:
    """Configura el sistema de logging de la aplicación.
    
    Returns:
        logging.Logger: Logger raíz configurado
    """
    # Configurar el logger raíz
    logger = logging.getLogger()
    logger.setLevel(DEFAULT_LOG_LEVEL)
    
    # Limpiar manejadores existentes
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Configurar formato
    formatter = logging.Formatter(LOG_FORMAT)
    json_formatter = JsonFormatter(JSON_LOG_FORMAT)
    
    # Configurar consola
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    
    # Configurar archivo de log con rotación
    log_file = LOG_DIR / "app.log"
    file_handler = RotatingFileHandler(
        log_file, 
        maxBytes=MAX_BYTES, 
        backupCount=BACKUP_COUNT,
        encoding='utf-8'
    )
    file_handler.setFormatter(json_formatter)
    
    # Configurar nivel de log según entorno
    if settings.DEBUG:
        console_handler.setLevel(logging.DEBUG)
        file_handler.setLevel(logging.DEBUG)
    else:
        console_handler.setLevel(logging.INFO)
        file_handler.setLevel(logging.INFO)
    
    # Agregar manejadores
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    # Configurar niveles específicos para bibliotecas ruidosas
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    
    return logger

def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Obtiene un logger con el nombre especificado.
    
    Args:
        name: Nombre del logger. Si es None, devuelve el logger raíz.
        
    Returns:
        logging.Logger: Logger configurado
    """
    if name is None:
        return logging.getLogger()
    return logging.getLogger(name)

# Configurar logging al importar el módulo
logger = setup_logging()

