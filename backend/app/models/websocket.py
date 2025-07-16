from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List, Union
from enum import Enum

class MessageType(str, Enum):
    """Tipos de mensajes WebSocket"""
    AUTH = "auth"
    CONFIG = "config"
    AUDIO = "audio"
    TEXT = "text"
    RESPONSE = "response"
    ERROR = "error"
    PING = "ping"
    PONG = "pong"

class VoiceType(str, Enum):
    """Tipos de voz disponibles para TTS"""
    DEFAULT = "default"
    MALE = "male"
    FEMALE = "female"
    ELEVEN_LABS = "eleven_labs"

class ConfigModel(BaseModel):
    """Modelo de configuración para el asistente"""
    # Identificación
    ai_name: str = Field(default="Asistente", description="Nombre del asistente")
    user_name: str = Field(default="Usuario", description="Nombre del usuario")
    
    # Comportamiento
    response_style: str = Field(default="amigable", description="Estilo de respuesta")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Creatividad de las respuestas (0-2)")
    max_tokens: int = Field(default=150, gt=0, description="Máximo de tokens por respuesta")
    
    # Voz
    use_tts: bool = Field(default=True, description="Usar síntesis de voz")
    voice_type: VoiceType = Field(default=VoiceType.DEFAULT, description="Tipo de voz")
    voice_speed: float = Field(default=1.0, ge=0.5, le=2.0, description="Velocidad de la voz (0.5-2.0)")
    voice_volume: float = Field(default=0.9, ge=0.0, le=1.0, description="Volumen de la voz (0-1)")
    
    # Idioma
    language: str = Field(default="es-ES", description="Idioma para STT/TTS")
    
    # Configuración avanzada
    system_prompt: Optional[str] = Field(
        default=None,
        description="Prompt del sistema para personalizar el comportamiento del asistente"
    )
    
    # Configuración de ElevenLabs (si se usa)
    elevenlabs_voice_id: Optional[str] = Field(
        default=None,
        description="ID de voz de ElevenLabs (solo para voice_type=eleven_labs)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "ai_name": "Asistente",
                "user_name": "Usuario",
                "response_style": "amigable",
                "temperature": 0.7,
                "max_tokens": 150,
                "use_tts": True,
                "voice_type": "default",
                "voice_speed": 1.0,
                "voice_volume": 0.9,
                "language": "es-ES",
                "system_prompt": "Eres un asistente amable y servicial.",
                "elevenlabs_voice_id": None
            }
        }
    
    def update(self, new_config: Dict[str, Any]) -> None:
        """Actualiza la configuración con nuevos valores"""
        for key, value in new_config.items():
            if hasattr(self, key):
                setattr(self, key, value)

class WebSocketMessage(BaseModel):
    """Modelo base para mensajes WebSocket"""
    type: MessageType
    data: Optional[Dict[str, Any]] = None
    
    @validator('type', pre=True)
    def validate_message_type(cls, v):
        if isinstance(v, str):
            return MessageType(v.lower())
        return v

class AuthMessage(WebSocketMessage):
    """Mensaje de autenticación WebSocket"""
    type: MessageType = MessageType.AUTH
    token: str

class ConfigMessage(WebSocketMessage):
    """Mensaje de configuración WebSocket"""
    type: MessageType = MessageType.CONFIG
    config: Dict[str, Any]

class AudioMessage(WebSocketMessage):
    """Mensaje de audio WebSocket"""
    type: MessageType = MessageType.AUDIO
    audio_data: bytes
    sample_rate: Optional[int] = None
    channels: Optional[int] = None

class TextMessage(WebSocketMessage):
    """Mensaje de texto WebSocket"""
    type: MessageType = MessageType.TEXT
    text: str

class ResponseMessage(WebSocketMessage):
    """Mensaje de respuesta WebSocket"""
    type: MessageType = MessageType.RESPONSE
    text: str
    audio_data: Optional[bytes] = None
    config: Optional[Dict[str, Any]] = None

class ErrorMessage(WebSocketMessage):
    """Mensaje de error WebSocket"""
    type: MessageType = MessageType.ERROR
    error: str
    details: Optional[Dict[str, Any]] = None

class PingMessage(WebSocketMessage):
    """Mensaje de ping/pong para mantener la conexión activa"""
    type: MessageType = MessageType.PING
    timestamp: float

class PongMessage(WebSocketMessage):
    """Respuesta a un mensaje de ping"""
    type: MessageType = MessageType.PONG
    timestamp: float

