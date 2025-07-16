import uvicorn
from main import app
import logging
import os

# Configurar logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    try:
        logger.info("Iniciando servidor en host 0.0.0.0, puerto 8001")
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8001,
            reload=True,
            debug=True,
            log_level="debug"
        )
    except Exception as e:
        logger.error(f"Error al iniciar el servidor: {e}", exc_info=True)
        raise
