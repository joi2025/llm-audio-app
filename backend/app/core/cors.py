"""
Configuración de CORS (Cross-Origin Resource Sharing) para la aplicación.

Este módulo proporciona una configuración flexible de CORS que puede ser personalizada
mediante variables de entorno.
"""

from typing import List, Union
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from .config import settings


def setup_cors(app: FastAPI) -> None:
    """
    Configura el middleware CORS para la aplicación FastAPI.
    
    Args:
        app: Instancia de FastAPI
    """
    # Lista de orígenes permitidos
    origins = settings.CORS_ORIGINS
    
    # Si se permite cualquier origen, configurar como lista con "*"
    if "*" in origins:
        allow_origins = ["*"]
    else:
        allow_origins = origins
    
    # Configurar el middleware CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    
    # Si estamos en modo desarrollo, agregar logging de CORS
    if settings.DEBUG:
        import logging
        logger = logging.getLogger(__name__)
        logger.info("CORS configurado con los siguientes orígenes permitidos: %s", 
                   ", ".join(allow_origins) if isinstance(allow_origins, list) else allow_origins)


def add_cors_headers(response):
    """
    Agrega encabezados CORS a una respuesta HTTP.
    
    Útil para respuestas personalizadas que no pasan por el middleware CORS estándar.
    """
    response.headers["Access-Control-Allow-Origin"] = ",".join(settings.CORS_ORIGINS) if isinstance(settings.CORS_ORIGINS, list) else "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    return response

