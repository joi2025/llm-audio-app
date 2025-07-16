from enum import Enum, auto
from bus import nats_conn
import openai, logging
from typing import Optional

logger = logging.getLogger(__name__)

class LLMType(Enum):
    FAST_LOCAL = auto()  # Llama.cpp
    CLOUD = auto()       # Gemini/OpenAI
    FALLBACK = auto()    # Respuestas predefinidas

class LLMOrchestrator:
    def __init__(self):
        self.strategies = {
            LLMType.FAST_LOCAL: self._local_llm,
            LLMType.CLOUD: self._cloud_llm,
            LLMType.FALLBACK: self._fallback_llm
        }
        self.fallback_responses = {
            "hola": "¡Hola! ¿En qué puedo ayudarte?",
            "gracias": "De nada, ¡estoy aquí para ayudar!"
        }
    
    async def route_query(self, text: str) -> str:
        """
        Procesa la consulta con el modelo más adecuado
        :param text: Texto de entrada del usuario
        :return: Respuesta generada
        """
        try:
            llm_type = self._select_llm(text)
            response = await self.strategies[llm_type](text)
            await nats_conn.publish("llm.response", response.encode())
            return response
        except Exception as e:
            logger.error(f"Error en LLM: {e}")
            return "Lo siento, ocurrió un error. Por favor intenta nuevamente."
    
    def _select_llm(self, text: str) -> LLMType:
        """Heurística para selección de modelo"""
        text_lower = text.lower().strip()
        
        # 1. Check fallback
        if text_lower in self.fallback_responses:
            return LLMType.FALLBACK
            
        # 2. Check complexity
        word_count = len(text_lower.split())
        if word_count < 5 or len(text_lower) < 20:
            return LLMType.FAST_LOCAL
            
        return LLMType.CLOUD
    
    async def _local_llm(self, text: str) -> str:
        """Llama.cpp local (mock por ahora)"""
        # TODO: Integrar con Llama.cpp
        return f"[LOCAL] Respuesta para: {text}"
    
    async def _cloud_llm(self, text: str) -> str:
        """Cloud LLM con retry logic"""
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": text}]
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.warning(f"Fallando a local LLM: {e}")
            return await self._local_llm(text)
    
    async def _fallback_llm(self, text: str) -> str:
        """Respuestas predefinidas sin costo"""
        return self.fallback_responses[text.lower().strip()]

