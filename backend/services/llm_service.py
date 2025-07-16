import os
from typing import Optional, Dict, Any
import openai
from openai import AsyncOpenAI
import logging
from dotenv import load_dotenv

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

class OpenAIService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4.1-nano")
        self.temperature = float(os.getenv("OPENAI_TEMPERATURE", 0.7))
        self.max_tokens = int(os.getenv("OPENAI_MAX_TOKENS", 256))
        
        if not self.api_key:
            logger.error("OPENAI_API_KEY no encontrada en las variables de entorno")
            raise ValueError("OPENAI_API_KEY no configurada")
            
        self.client = AsyncOpenAI(api_key=self.api_key)

    async def generate_response(
        self, 
        prompt: str, 
        system_prompt: Optional[str] = None,
        conversation_history: Optional[list] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Genera una respuesta a partir de un prompt usando el modelo de OpenAI.
        
        Args:
            prompt: El texto de entrada del usuario
            system_prompt: Instrucciones del sistema opcionales
            conversation_history: Historial de la conversación (lista de mensajes)
            max_tokens: Máximo número de tokens para la respuesta (controla longitud y costo)
            temperature: Controla la creatividad de la respuesta (0 a 1)
        
        Returns:
            Dict con la respuesta y metadatos
        """
        try:
            messages = await self.build_messages(prompt, system_prompt, conversation_history)
            
            # Usar parámetros personalizados si se proporcionan, de lo contrario usar los valores por defecto
            response_max_tokens = max_tokens if max_tokens is not None else self.max_tokens
            response_temperature = temperature if temperature is not None else self.temperature
            
            logger.debug(f"Usando max_tokens: {response_max_tokens}, temperature: {response_temperature}")
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=response_temperature,
                max_tokens=response_max_tokens,
                top_p=0.9,
                frequency_penalty=0.5,  # Evitar repeticiones
                presence_penalty=0.5,    # Fomentar nuevos temas
            )
            
            # Procesar la respuesta
            response_text = response.choices[0].message.content.strip()
            
            # Limpiar la respuesta
            response_text = self._clean_response(response_text)
            
            logger.debug(f"Respuesta de OpenAI: {response_text}")
            
            return {
                "success": True,
                "response": response_text,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            }
        except Exception as e:
            logger.error(f"Error al generar respuesta: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "response": "Lo siento, tuve un problema al procesar tu solicitud. ¿Puedes intentarlo de nuevo?"
            }
    
    async def build_messages(self, prompt: str, system_prompt: Optional[str] = None, conversation_history: Optional[list] = None) -> list:
        messages = []
        # Añadir mensaje del sistema si se proporciona o usar uno por defecto
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        else:
            messages.append({
                "role": "system",
                "content": "Eres un amigo cercano y conversas de manera natural y casual. Habla como si estuviéramos charlando relajados, sin formalidades."
            })
        # Añadir historial de conversación si existe
        if conversation_history:
            for msg in conversation_history:
                messages.append(msg)
        # Añadir el prompt del usuario
        messages.append({"role": "user", "content": prompt})
        return messages
    
    def _clean_response(self, text: str) -> str:
        """Limpia y formatea la respuesta para que suene más natural"""
        if not text:
            return "No estoy seguro de cómo responder a eso. ¿Podrías reformularlo?"
            
        # Eliminar comillas al principio/final si existen
        text = text.strip('"\'')
        
        # Asegurar que la primera letra sea mayúscula
        if text and len(text) > 1:
            text = text[0].upper() + text[1:]
            
        # Asegurar que termina en signo de puntuación
        if text and text[-1] not in ['.', '!', '?', ',', ':']:
            text += '.'
            
        return text

# Instancia global para ser usada en la aplicación
llm_service = OpenAIService()

