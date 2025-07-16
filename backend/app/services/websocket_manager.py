import asyncio
import json
import logging
from typing import Dict, Any, Optional, Callable, Awaitable
from fastapi import WebSocket, WebSocketDisconnect
from ..models.websocket import (
    WebSocketMessage, AuthMessage, ConfigMessage, AudioMessage, 
    TextMessage, MessageType, ConfigModel, ErrorMessage, ResponseMessage
)
from ..models.auth import TokenData
from ..core.security import get_current_user_ws
from .stt_service import STTService
from .llm_service import OpenAIService
from .tts_service import TTSService
from ..config import settings

logger = logging.getLogger(__name__)

class WebSocketConnectionManager:
    """Maneja las conexiones WebSocket activas"""
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.stt_service = STTService()
        self.llm_service = OpenAIService()
        self.tts_service = TTSService()
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Establece una nueva conexión WebSocket"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Cliente conectado: {client_id}")
    
    def disconnect(self, client_id: str):
        """Cierra una conexión WebSocket"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"Cliente desconectado: {client_id}")
    
    async def send_message(self, client_id: str, message: WebSocketMessage):
        """Envía un mensaje a un cliente específico"""
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            try:
                await websocket.send_json(message.dict(exclude_none=True))
            except Exception as e:
                logger.error(f"Error enviando mensaje a {client_id}: {str(e)}")
                self.disconnect(client_id)

class WebSocketHandler:
    """Maneja la lógica de los mensajes WebSocket"""
    def __init__(self, websocket: WebSocket, client_id: str):
        self.websocket = websocket
        self.client_id = client_id
        self.config = ConfigModel()
        self.user: Optional[TokenData] = None
        self.manager = WebSocketConnectionManager()
    
    async def handle_connection(self):
        """Maneja la conexión WebSocket"""
        await self.manager.connect(self.websocket, self.client_id)
        
        try:
            while True:
                # Esperar un mensaje del cliente
                data = await self.websocket.receive()
                
                # Manejar diferentes tipos de mensajes
                if data["type"] == "websocket.receive":
                    if "text" in data:
                        await self._handle_text_message(data["text"])
                    elif "bytes" in data:
                        await self._handle_binary_message(data["bytes"])
                elif data["type"] == "websocket.disconnect":
                    logger.info(f"Cliente {self.client_id} desconectado")
                    break
                
        except WebSocketDisconnect:
            logger.info(f"Conexión WebSocket cerrada por el cliente {self.client_id}")
        except Exception as e:
            logger.error(f"Error en la conexión WebSocket: {str(e)}", exc_info=True)
            await self._send_error("Error interno del servidor")
        finally:
            self.manager.disconnect(self.client_id)
    
    async def _handle_text_message(self, text: str):
        """Maneja un mensaje de texto del WebSocket"""
        try:
            message_data = json.loads(text)
            message_type = message_data.get("type")
            
            if message_type == MessageType.AUTH:
                await self._handle_auth(AuthMessage(**message_data))
            elif message_type == MessageType.CONFIG:
                await self._handle_config(ConfigMessage(**message_data))
            elif message_type == MessageType.TEXT:
                await self._handle_text(TextMessage(**message_data))
            else:
                await self._send_error(f"Tipo de mensaje no soportado: {message_type}")
                
        except json.JSONDecodeError:
            await self._send_error("Formato JSON inválido")
        except Exception as e:
            logger.error(f"Error procesando mensaje de texto: {str(e)}", exc_info=True)
            await self._send_error(f"Error procesando el mensaje: {str(e)}")
    
    async def _handle_binary_message(self, data: bytes):
        """Maneja un mensaje binario (audio) del WebSocket"""
        if not self.user:
            await self._send_error("No autenticado")
            return
            
        try:
            # Crear mensaje de audio
            audio_message = AudioMessage(audio_data=data)
            await self._handle_audio(audio_message)
        except Exception as e:
            logger.error(f"Error procesando audio: {str(e)}", exc_info=True)
            await self._send_error("Error procesando el audio")
    
    async def _handle_auth(self, message: AuthMessage):
        """Maneja la autenticación del WebSocket"""
        try:
            self.user = await get_current_user_ws(message.token)
            await self._send_success("Autenticación exitosa")
        except Exception as e:
            logger.error(f"Error de autenticación: {str(e)}")
            await self._send_error("Autenticación fallida")
    
    async def _handle_config(self, message: ConfigMessage):
        """Maneja la configuración del asistente"""
        if not self.user:
            await self._send_error("No autenticado")
            return
            
        try:
            self.config.update(message.config)
            await self._send_success("Configuración actualizada")
        except Exception as e:
            logger.error(f"Error actualizando configuración: {str(e)}")
            await self._send_error("Error actualizando la configuración")
    
    async def _handle_text(self, message: TextMessage):
        """Maneja un mensaje de texto del usuario"""
        if not self.user:
            await self._send_error("No autenticado")
            return
            
        try:
            # Procesar el texto con el LLM
            response = await self.llm_service.generate_response(
                prompt=message.text,
                system_prompt=self.config.system_prompt,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens
            )
            
            # Enviar la respuesta
            response_message = ResponseMessage(
                text=response,
                config=self.config.dict()
            )
            
            # Si está habilitado el TTS, generar y enviar audio
            if self.config.use_tts:
                audio_data = await self.tts_service.synthesize(
                    text=response,
                    voice_type=self.config.voice_type,
                    speed=self.config.voice_speed,
                    volume=self.config.voice_volume
                )
                response_message.audio_data = audio_data
            
            await self.manager.send_message(self.client_id, response_message)
            
        except Exception as e:
            logger.error(f"Error generando respuesta: {str(e)}", exc_info=True)
            await self._send_error("Error generando la respuesta")
    
    async def _handle_audio(self, message: AudioMessage):
        """Maneja un mensaje de audio del usuario"""
        if not self.user:
            await self._send_error("No autenticado")
            return
            
        try:
            # Transcribir el audio a texto
            text = await self.stt_service.transcribe_audio(message.audio_data)
            
            if not text:
                await self._send_error("No se pudo transcribir el audio")
                return
            
            # Procesar el texto como si fuera un mensaje de texto
            await self._handle_text(TextMessage(text=text))
            
        except Exception as e:
            logger.error(f"Error procesando audio: {str(e)}", exc_info=True)
            await self._send_error("Error procesando el audio")
    
    async def _send_success(self, message: str):
        """Envía un mensaje de éxito"""
        success_message = ResponseMessage(
            text=message,
            config=self.config.dict()
        )
        await self.manager.send_message(self.client_id, success_message)
    
    async def _send_error(self, error: str, details: Optional[Dict[str, Any]] = None):
        """Envía un mensaje de error"""
        error_message = ErrorMessage(
            error=error,
            details=details or {}
        )
        await self.manager.send_message(self.client_id, error_message)

