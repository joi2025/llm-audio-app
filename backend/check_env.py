"""
Script para verificar las variables de entorno necesarias.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

# Variables requeridas
REQUIRED_ENV_VARS = [
    "OPENAI_API_KEY",
    "SECRET_KEY",
    "ALGORITHM",
    "ACCESS_TOKEN_EXPIRE_MINUTES"
]

def check_required_vars():
    """Verifica que todas las variables requeridas estén configuradas."""
    missing_vars = []
    
    for var in REQUIRED_ENV_VARS:
        value = os.getenv(var)
        print(f"{var}: {'✓' if value else '✗'}")
        if not value:
            missing_vars.append(var)
    
    if missing_vars:
        print(f"\n\033[91m✗ Faltan variables de entorno requeridas: {', '.join(missing_vars)}\033[0m")
        return False
    
    print("\n\033[92m✓ Todas las variables de entorno requeridas están configuradas\033[0m")
    return True

def check_optional_vars():
    """Verifica las variables opcionales."""
    optional_vars = {
        "DEBUG": "No configurado (por defecto: False)",
        "ENVIRONMENT": "No configurado (por defecto: development)",
        "POSTGRES_SERVER": "No configurado (se usará SQLite en memoria)",
        "REDIS_URL": "No configurado (caché deshabilitada)",
        "WEBSOCKET_PATH": "No configurado (por defecto: /ws/assistant)",
        "TTS_VOICE": "No configurado (por defecto: alloy)",
        "WHISPER_MODEL": "No configurado (por defecto: whisper-1)",
    }
    
    print("\nVariables opcionales:")
    for var, default in optional_vars.items():
        value = os.getenv(var, default)
        print(f"{var}: {value}")

def main():
    print("=== Verificación de Variables de Entorno ===")
    
    if env_path.exists():
        print(f"Archivo .env encontrado en: {env_path}")
    else:
        print(f"\n\033[93mAdvertencia: No se encontró el archivo .env en {env_path}\033[0m")
    
    print("\nVerificando variables requeridas...")
    if check_required_vars():
        check_optional_vars()
    
    print("\nPara configurar las variables faltantes, edita el archivo .env")
    print("o configúralas en las variables de entorno de tu sistema.")

if __name__ == "__main__":
    main()
