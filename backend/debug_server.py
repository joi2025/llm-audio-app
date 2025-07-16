import uvicorn
from main import app
import logging
import os
import sys

# Configurar logging más detallado
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    try:
        logger.info("=== Iniciando servidor ===")
        logger.info(f"Python version: {sys.version}")
        logger.info(f"Current directory: {os.getcwd()}")
        logger.info(f"Available modules: {sys.modules.keys()}")
        
        # Verificar si uvicorn está disponible
        try:
            import uvicorn
            logger.info("Uvicorn importado correctamente")
        except ImportError as e:
            logger.error(f"Error importando uvicorn: {e}")
            raise

        logger.info("Iniciando servidor en host 0.0.0.0, puerto 8001")
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8001,
            reload=True,
            debug=True,
            log_level="debug",
            log_config={
                "version": 1,
                "disable_existing_loggers": False,
                "formatters": {
                    "default": {
                        "()": "uvicorn.logging.DefaultFormatter",
                        "fmt": "%(levelprefix)s %(message)s",
                        "use_colors": True,
                    },
                },
                "handlers": {
                    "default": {
                        "formatter": "default",
                        "class": "logging.StreamHandler",
                        "stream": "ext://sys.stderr",
                    },
                },
                "loggers": {
                    "uvicorn.error": {
                        "handlers": ["default"],
                        "level": "DEBUG",
                    },
                    "uvicorn.access": {
                        "handlers": ["default"],
                        "level": "DEBUG",
                    },
                },
            }
        )
    except Exception as e:
        logger.error(f"Error al iniciar el servidor: {e}", exc_info=True)
        raise
