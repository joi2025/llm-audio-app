import logging
import sys
from typing import Optional
from pathlib import Path
from datetime import datetime

from config.settings import settings

def setup_logging():
    """Configura el logging con rotación y niveles dinámicos."""
    # Directorio de logs
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Formateador
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Handler para archivo con rotación diaria
    file_handler = logging.handlers.TimedRotatingFileHandler(
        log_dir / f"app_{datetime.now().strftime('%Y%m%d')}.log",
        when='midnight',
        backupCount=7  # Mantener 7 días de logs
    )
    file_handler.setFormatter(formatter)
    
    # Handler para stdout
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    
    # Configurar logger raíz
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.LOG_LEVEL)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(stream_handler)
    
    # Configurar loggers específicos
    logging.getLogger("uvicorn").setLevel(settings.LOG_LEVEL)
    logging.getLogger("fastapi").setLevel(settings.LOG_LEVEL)
    
    return root_logger

# Inicializar logging
logger = setup_logging()

