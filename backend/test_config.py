"""
Script para verificar la configuración de la aplicación.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# Importar configuración después de cargar las variables de entorno
from app.core.config import settings

def check_config():
    """Verifica la configuración cargada."""
    print("=== Verificación de Configuración ===")
    print(f"Entorno: {settings.ENVIRONMENT}")
    print(f"Debug: {settings.DEBUG}")
    print(f"API Key configurada: {'Sí' if settings.OPENAI_API_KEY else 'No'}")
    print(f"Modelo: {settings.OPENAI_MODEL}")
    print(f"URL de Base de Datos: {settings.DATABASE_URI}")
    print(f"Orígenes CORS permitidos: {settings.CORS_ORIGINS}")
    print("==================================")

if __name__ == "__main__":
    try:
        check_config()
    except Exception as e:
        print(f"Error al verificar la configuración: {e}", file=sys.stderr)
        sys.exit(1)
