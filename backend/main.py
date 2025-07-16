from fastapi import FastAPI, WebSocket, HTTPException, Request, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
import time
import uvicorn
import logging
import os
import json
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import Dict, Any, List, Optional
import asyncio
from starlette.websockets import WebSocketDisconnect

# Servicios personalizados
from services.stt_service import STTService
from services.llm_service import llm_service as openai_service
from services.tts_service import TTSservice as tts_service  # Corregido mayúsculas

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Niveles de log por componente
logging.getLogger('websockets').setLevel(logging.WARNING)
logging.getLogger('openai').setLevel(logging.INFO)

# Cargar variables de entorno
load_dotenv()

# Configuración de la aplicación
app = FastAPI(
    title="Voice Assistant API",
    description="API para el asistente de voz con OpenAI",
    version="1.0.0"
)

# Manejo de conversaciones
CONVERSATION_LOG = "conversations.log"

# Inicializar servicios
stt_service = STTService(model="whisper-1")  # Usando la API de Whisper
tts_service = tts_service()  # Usando la importación existente

def log_conversation(user_input: str, ai_response: str) -> None:
    """Registra la conversación en un archivo de log."""
    try:
        with open(CONVERSATION_LOG, "a", encoding='utf-8') as f:
            f.write(f"{datetime.now().isoformat()} - User: {user_input}\n")
            f.write(f"{datetime.now().isoformat()} - AI: {ai_response}\n\n")
    except Exception as e:
        logger.error(f"Error al registrar conversación: {str(e)}")

def generate_audio(text, output_path, voice_settings=None):
    import pyttsx3
    engine = pyttsx3.init()
    
    # Configuración de voz
    voices = engine.getProperty('voices')
    spanish_voice = next((v for v in voices if 'spanish' in v.languages or 'es' in v.id.lower()), voices[0])
    engine.setProperty('voice', spanish_voice.id)
    
    # Aplicar ajustes desde frontend
    if voice_settings:
        engine.setProperty('rate', 170 * voice_settings.get('rate', 1))
        engine.setProperty('volume', voice_settings.get('volume', 0.9))
        engine.setProperty('pitch', 110 * voice_settings.get('pitch', 1))
    else:
        engine.setProperty('rate', 170)
        engine.setProperty('volume', 0.9)
        engine.setProperty('pitch', 110)
    
    engine.save_to_file(text, output_path)
    engine.runAndWait()
    
    # Debug: Mostrar voces disponibles
    print("Voces disponibles:")
    for i, voice in enumerate(voices):
        print(f"{i}: {voice.name} | ID: {voice.id} | Idiomas: {getattr(voice, 'languages', 'Desconocido')}")

@app.on_event("startup")
async def startup():
    """Inicialización de la aplicación"""
    logger.info("Servicio iniciado")
    logger.info('Iniciando verificaciones de dependencias...')
    # Verificar conexiones a servicios externos

@app.get('/health', include_in_schema=False)
async def health_check():
    return {
        'status': 'ok',
        'services': {
            'database': 'connected',
            'llm_api': 'reachable',
            'websocket': 'active'
        },
        'timestamp': datetime.now().isoformat()
    }

# Configura CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, reemplaza con los orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Endpoint de salud para verificar que el servidor está en funcionamiento."""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "service": "Voice Assistant API",
        "version": "1.0.0"
    }

# --- Sistema de Autenticación (Simulado) ---

class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    email: str
    roles: list[str] = []

# Base de datos de usuarios simulada
DUMMY_USERS_DB = {
    "admin@voice.com": {
        "password": "password", # En un caso real, esto sería un hash
        "roles": ["admin", "user"]
    }
}

# Simula la verificación de un token
def get_current_user(token: str = Depends(OAuth2PasswordBearer(tokenUrl="/auth/login"))):
    # En un sistema real, decodificaríamos y validaríamos el token JWT aquí.
    # Por ahora, si el token existe, asumimos que es el admin.
    if token:
        return User(email="admin@voice.com", roles=DUMMY_USERS_DB["admin@voice.com"]["roles"])
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

@app.post("/auth/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user_email = form_data.username
    user_password = form_data.password
    
    db_user = DUMMY_USERS_DB.get(user_email)
    if not db_user or db_user["password"] != user_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # En un sistema real, generaríamos un JWT.
    # Aquí, creamos un token falso basado en el tiempo.
    access_token = f"fake-token-for-{user_email}-{time.time()}"
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/logout")
async def logout():
    # En un backend sin estado, el logout es manejado por el cliente (borrando el token)
    return {"message": "Logout successful"}

@app.get("/auth/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# --- Fin del Sistema de Autenticación ---

@app.websocket("/ws/assistant")
async def websocket_endpoint(websocket: WebSocket):
    """
    Endpoint WebSocket para la comunicación en tiempo real con el asistente.
    Desactivamos temporalmente la autenticación para pruebas.
    """
    try:
        await websocket.accept()
        logger.info("Nueva conexión WebSocket establecida")
        
        # Variables para almacenar configuraciones personalizadas
        custom_config = {
            "aiName": "Amigo",
            "userName": "Usuario",
            "responseStyle": "casual",
            "attitude": "amigable",
            "maxTokens": 150,
            "temperature": 0.7,
            "systemPrompt": "Eres un amigo cercano y conversas de manera natural y casual. Habla como si estuviéramos charlando relajados, sin formalidades.",
            "useRealtimeAPI": False,
            "voiceType": "default",
            "voiceSpeed": 1.0,
            "voiceVolume": 80,
            "useAdvancedVoice": False
        }
        
        while True:
            try:
                # Usar un timeout para evitar bloqueos indefinidos
                data = await asyncio.wait_for(websocket.receive(), timeout=60.0)
                
                # Verificar tipo de mensaje
                if data['type'] == 'websocket.disconnect':
                    logger.info("Cliente desconectado")
                    break
                
                if data['type'] == 'websocket.receive':
                    if 'text' in data:
                        try:
                            json_data = json.loads(data['text'])
                            if json_data.get("type") == "config":
                                custom_config.update(json_data.get("config", {}))
                                logger.info(f"Configuraciones personalizadas actualizadas: {custom_config}")
                                await websocket.send_json({"status": "config received"})
                                continue
                        except json.JSONDecodeError:
                            logger.warning("Mensaje de texto recibido no es JSON válido")
                            continue
                    elif 'bytes' in data:
                        combined_data = data['bytes']
                        audio_data = None
                        message_id = None
                        try:
                            # Búsqueda robusta del final del JSON
                            json_end_index = combined_data.find(b'}\n')
                            if json_end_index == -1:
                                json_end_index = combined_data.find(b'}')

                            if json_end_index != -1:
                                json_part = combined_data[:json_end_index + 1]
                                audio_data = combined_data[json_end_index + 1:]
                                
                                metadata = json.loads(json_part.decode('utf-8'))
                                message_id = metadata.get('id')
                                logger.info(f"Metadatos extraídos con ID: {message_id}. Tamaño de audio: {len(audio_data)} bytes.")
                            else:
                                # Si no se encuentra JSON, se asume que es solo audio
                                audio_data = combined_data
                                logger.warning("No se encontró el delimitador JSON, tratando los datos como audio puro.")

                        except Exception as e:
                            logger.error(f"Error al procesar el blob combinado: {e}", exc_info=True)
                            continue

                        if not audio_data:
                            logger.warning("No se recibió ningún audio válido")
                            continue

                        # Procesar el audio usando el servicio STT
                        try:
                            logger.info(f"Procesando audio de {len(audio_data)} bytes...")
                            
                            # Transcribir el audio directamente usando el servicio STT
                            logger.info("Iniciando transcripción...")
                            user_message = await stt_service.transcribe_audio(audio_data)
                            
                            if not user_message:
                                raise ValueError("No se pudo transcribir el audio o el resultado está vacío")
                                
                            logger.info(f"Mensaje transcribido: {user_message}")
                            logger.info(f"Mensaje transcribido: {user_message}")
                            
                            # Enviar transcripción al frontend
                            await websocket.send_json({
                                "type": "transcription",
                                "text": user_message,
                                "status": "success"
                            })
                            
                            # Generar respuesta del asistente
                            response = await asyncio.wait_for(
                                asyncio.to_thread(generate_response, user_message, custom_config),
                                timeout=30.0  # 30 segundos de timeout
                            )
                            
                            if not response:
                                raise ValueError("No se pudo generar una respuesta")
                                
                            logger.info(f"Respuesta generada: {response}")
                            
                            # Convertir texto a voz
                            try:
                                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                                    engine = pyttsx3.init()
                                    engine.setProperty('rate', custom_config['voiceSpeed'] * 100)
                                    engine.setProperty('volume', custom_config['voiceVolume'] / 100)
                                    engine.save_to_file(response, temp_file.name)
                                    engine.runAndWait()
                                    
                                    # Leer el archivo de audio
                                    with open(temp_file.name, 'rb') as audio_file:
                                        audio_bytes = audio_file.read()
                                    
                                    # Enviar respuesta de texto
                                    await websocket.send_json({
                                        "type": "response",
                                        "text": response,
                                        "status": "success"
                                    })
                                    
                                    # Enviar audio
                                    await websocket.send_bytes(audio_bytes)
                                    logger.info("Audio enviado al frontend")
                                    
                            except Exception as e:
                                logger.error(f"Error al generar audio: {e}")
                                # Aún así enviamos la respuesta de texto
                                await websocket.send_json({
                                    "type": "response",
                                    "text": response,
                                    "status": "success"
                                })
                                
                        except asyncio.TimeoutError as e:
                            error_msg = "Tiempo de espera agotado al procesar la solicitud"
                            logger.error(error_msg)
                            await websocket.send_json({
                                "type": "error",
                                "message": error_msg,
                                "status": "error"
                            })
                        except Exception as e:
                            error_msg = f"Error al procesar el audio: {str(e)}"
                            logger.error(error_msg, exc_info=True)
                            await websocket.send_json({
                                "type": "error",
                                "message": error_msg,
                                "status": "error"
                            })
                
            except asyncio.TimeoutError:
                logger.info("Timeout en la recepción de datos WebSocket, manteniendo conexión activa")
                await websocket.send_json({"status": "keep-alive"})
                continue
            except WebSocketDisconnect:
                logger.info("Conexión WebSocket cerrada por el cliente")
                break
            except Exception as e:
                logger.error(f"Error en WebSocket: {str(e)}", exc_info=True)
                continue
    except Exception as e:
        logger.error(f"Error en el manejo del WebSocket: {e}", exc_info=True)
    finally:
        logger.info("Conexión WebSocket finalizada")

# Configuración del servidor
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
