"""
Módulo principal del paquete core.

Este paquete contiene la configuración y utilidades centrales de la aplicación.
"""

# Importar configuración
from .config import settings, get_settings

# Importar utilidades de seguridad
from .security import (
    create_access_token,
    verify_password,
    get_password_hash,
    get_current_user,
    get_current_active_user,
    get_current_active_superuser,
    get_websocket_user,
    CREDENTIALS_EXCEPTION,
)

# Importar utilidades de CORS
from .cors import setup_cors, add_cors_headers

# Importar manejadores de eventos
from .events import (
    register_startup_event,
    register_shutdown_event,
    connect_to_db,
    close_db_connection,
    initialize_services,
    shutdown_services,
)

# Configurar logging
from .logging import setup_logging, get_logger

# Configurar logging al importar el módulo
logger = setup_logging()

# Versión de la API
__version__ = "1.0.0"

# Exportar componentes principales
__all__ = [
    # Configuración
    'settings',
    'get_settings',
    
    # Seguridad
    'create_access_token',
    'verify_password',
    'get_password_hash',
    'get_current_user',
    'get_current_active_user',
    'get_current_active_superuser',
    'get_websocket_user',
    'CREDENTIALS_EXCEPTION',
    
    # CORS
    'setup_cors',
    'add_cors_headers',
    
    # Eventos
    'register_startup_event',
    'register_shutdown_event',
    'connect_to_db',
    'close_db_connection',
    'initialize_services',
    'shutdown_services',
    
    # Logging
    'setup_logging',
    'get_logger',
    'logger',
    
    # Versión
    '__version__',
]

