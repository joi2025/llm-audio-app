"""
Módulo para manejar eventos del ciclo de vida de la aplicación.

Este módulo proporciona funciones para manejar los eventos de inicio y apagado
de la aplicación, como la inicialización de conexiones a bases de datos, 
servicios externos, etc.
"""

import logging
from typing import Callable, List, Optional

from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.orm import sessionmaker

from .config import settings

logger = logging.getLogger(__name__)

# Almacenamiento de conexiones y sesiones
db_engine: Optional[AsyncEngine] = None
SessionLocal = None


def register_startup_event(app: FastAPI) -> Callable:
    """
    Crea una función de evento de inicio para la aplicación FastAPI.
    
    Args:
        app: Instancia de FastAPI
        
    Returns:
        Función de evento de inicio
    """
    async def _startup() -> None:
        logger.info("Iniciando la aplicación...")
        
        # Inicializar conexión a la base de datos
        await connect_to_db()
        
        # Inicializar otros servicios aquí
        await initialize_services()
        
        logger.info("Aplicación iniciada correctamente")
    
    return _startup


def register_shutdown_event(app: FastAPI) -> Callable:
    """
    Crea una función de evento de apagado para la aplicación FastAPI.
    
    Args:
        app: Instancia de FastAPI
        
    Returns:
        Función de evento de apagado
    """
    async def _shutdown() -> None:
        logger.info("Apagando la aplicación...")
        
        # Cerrar conexión a la base de datos
        await close_db_connection()
        
        # Cerrar otros servicios aquí
        await shutdown_services()
        
        logger.info("Aplicación apagada correctamente")
    
    return _shutdown


async def connect_to_db() -> None:
    """Establece la conexión a la base de datos."""
    global db_engine, SessionLocal
    
    if settings.DATABASE_URI:
        logger.info("Conectando a la base de datos...")
        
        db_engine = create_async_engine(
            settings.DATABASE_URI,
            echo=settings.DEBUG,
            future=True,
            pool_pre_ping=True,
            pool_size=20,
            max_overflow=10,
        )
        
        # Crear sesión asíncrona
        SessionLocal = sessionmaker(
            bind=db_engine,
            class_=None,  # Usar la clase por defecto para sesiones asíncronas
            expire_on_commit=False,
            autoflush=False,
        )
        
        logger.info("Conexión a la base de datos establecida")


async def close_db_connection() -> None:
    """Cierra la conexión a la base de datos."""
    global db_engine
    
    if db_engine:
        logger.info("Cerrando conexión a la base de datos...")
        await db_engine.dispose()
        logger.info("Conexión a la base de datos cerrada")


async def initialize_services() -> None:
    """Inicializa servicios externos."""
    logger.info("Inicializando servicios...")
    
    # Aquí se pueden inicializar otros servicios como Redis, colas, etc.
    
    logger.info("Servicios inicializados")


async def shutdown_services() -> None:
    """Cierra conexiones a servicios externos."""
    logger.info("Cerrando conexiones a servicios...")
    
    # Aquí se pueden cerrar conexiones a otros servicios
    
    logger.info("Conexiones a servicios cerradas")

