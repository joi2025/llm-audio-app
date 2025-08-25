"""
Sistema de Moderación de Contenido para LLM Audio App
Implementa filtros de contenido para entrada y salida del usuario.
"""

import re
import requests
import json
from typing import Dict, List, Tuple, Optional
from enum import Enum

class ModerationResult(Enum):
    APPROVED = "approved"
    BLOCKED = "blocked"
    FLAGGED = "flagged"

class ContentModerator:
    """
    Moderador de contenido que combina filtros locales y servicios externos
    """
    
    def __init__(self, openai_api_key: Optional[str] = None):
        self.openai_api_key = openai_api_key
        
        # Palabras clave prohibidas (ejemplo básico)
        self.blocked_keywords = {
            # Violencia explícita
            'violencia', 'matar', 'asesinar', 'torturar', 'herir',
            # Contenido sexual explícito
            'sexo explícito', 'pornografía', 'desnudo',
            # Drogas ilegales
            'cocaína', 'heroína', 'metanfetamina', 'fentanilo',
            # Discurso de odio
            'nazi', 'terrorismo', 'supremacía',
            # Autolesión
            'suicidio', 'autolesión', 'cortarse',
            # Información personal sensible
            'número de tarjeta', 'ssn', 'contraseña'
        }
        
        # Patrones regex para detectar información sensible
        self.sensitive_patterns = [
            r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',  # Tarjetas de crédito
            r'\b\d{3}-\d{2}-\d{4}\b',  # SSN formato
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Emails
            r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',  # Números de teléfono
        ]
        
        # Respuestas seguras para diferentes tipos de contenido bloqueado
        self.safe_responses = {
            'violence': "No puedo ayudar con contenido relacionado con violencia. ¿Hay algo más en lo que pueda asistirte?",
            'sexual': "No puedo discutir contenido sexual explícito. ¿Puedo ayudarte con otra cosa?",
            'drugs': "No puedo proporcionar información sobre drogas ilegales. ¿Hay otro tema del que quieras hablar?",
            'hate': "No puedo participar en discursos de odio. ¿Hay algo constructivo en lo que pueda ayudarte?",
            'self_harm': "Si estás pasando por un momento difícil, te recomiendo hablar con un profesional. ¿Puedo ayudarte con algo más?",
            'personal_info': "He detectado información personal sensible. Por tu seguridad, no puedo procesar este tipo de datos.",
            'general': "No puedo ayudar con este tipo de contenido. ¿Hay algo más en lo que pueda asistirte?"
        }
    
    def moderate_input(self, text: str) -> Tuple[ModerationResult, str, Optional[str]]:
        """
        Modera el texto de entrada del usuario
        
        Returns:
            Tuple[ModerationResult, str, Optional[str]]: 
            (resultado, texto_limpio, razón_bloqueo)
        """
        if not text or not text.strip():
            return ModerationResult.APPROVED, text, None
        
        text_lower = text.lower()
        
        # 1. Verificar palabras clave prohibidas
        for keyword in self.blocked_keywords:
            if keyword in text_lower:
                category = self._categorize_violation(keyword)
                return ModerationResult.BLOCKED, text, f"blocked_keyword_{category}"
        
        # 2. Verificar patrones de información sensible
        for pattern in self.sensitive_patterns:
            if re.search(pattern, text):
                return ModerationResult.BLOCKED, text, "personal_info"
        
        # 3. Verificar con OpenAI Moderation API si está disponible
        if self.openai_api_key:
            try:
                openai_result = self._check_openai_moderation(text)
                if openai_result['flagged']:
                    categories = [cat for cat, flagged in openai_result['categories'].items() if flagged]
                    return ModerationResult.BLOCKED, text, f"openai_{categories[0] if categories else 'general'}"
            except Exception as e:
                print(f"[ContentModerator] OpenAI moderation failed: {e}")
                # Continuar con filtros locales si OpenAI falla
        
        return ModerationResult.APPROVED, text, None
    
    def moderate_output(self, text: str) -> Tuple[ModerationResult, str, Optional[str]]:
        """
        Modera el texto de salida del LLM
        
        Returns:
            Tuple[ModerationResult, str, Optional[str]]: 
            (resultado, texto_seguro, razón_bloqueo)
        """
        if not text or not text.strip():
            return ModerationResult.APPROVED, text, None
        
        # Aplicar las mismas reglas que para entrada
        result, _, reason = self.moderate_input(text)
        
        if result == ModerationResult.BLOCKED:
            # Reemplazar con respuesta segura
            safe_response = self._get_safe_response(reason)
            return ModerationResult.BLOCKED, safe_response, reason
        
        return ModerationResult.APPROVED, text, None
    
    def _categorize_violation(self, keyword: str) -> str:
        """Categoriza el tipo de violación basado en la palabra clave"""
        violence_keywords = {'violencia', 'matar', 'asesinar', 'torturar', 'herir'}
        sexual_keywords = {'sexo explícito', 'pornografía', 'desnudo'}
        drugs_keywords = {'cocaína', 'heroína', 'metanfetamina', 'fentanilo'}
        hate_keywords = {'nazi', 'terrorismo', 'supremacía'}
        self_harm_keywords = {'suicidio', 'autolesión', 'cortarse'}
        
        if keyword in violence_keywords:
            return 'violence'
        elif keyword in sexual_keywords:
            return 'sexual'
        elif keyword in drugs_keywords:
            return 'drugs'
        elif keyword in hate_keywords:
            return 'hate'
        elif keyword in self_harm_keywords:
            return 'self_harm'
        else:
            return 'general'
    
    def _get_safe_response(self, reason: Optional[str]) -> str:
        """Obtiene una respuesta segura basada en la razón del bloqueo"""
        if not reason:
            return self.safe_responses['general']
        
        # Extraer categoría de la razón
        if 'violence' in reason:
            return self.safe_responses['violence']
        elif 'sexual' in reason:
            return self.safe_responses['sexual']
        elif 'drugs' in reason:
            return self.safe_responses['drugs']
        elif 'hate' in reason:
            return self.safe_responses['hate']
        elif 'self_harm' in reason:
            return self.safe_responses['self_harm']
        elif 'personal_info' in reason:
            return self.safe_responses['personal_info']
        else:
            return self.safe_responses['general']
    
    def _check_openai_moderation(self, text: str) -> Dict:
        """
        Verifica el contenido usando la API de Moderación de OpenAI
        """
        if not self.openai_api_key:
            raise ValueError("OpenAI API key not provided")
        
        headers = {
            'Authorization': f'Bearer {self.openai_api_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'input': text
        }
        
        response = requests.post(
            'https://api.openai.com/v1/moderations',
            headers=headers,
            json=data,
            timeout=10
        )
        
        response.raise_for_status()
        result = response.json()
        
        if 'results' in result and len(result['results']) > 0:
            return result['results'][0]
        else:
            return {'flagged': False, 'categories': {}}

# Instancia global del moderador
_content_moderator = None

def get_content_moderator(openai_api_key: Optional[str] = None) -> ContentModerator:
    """Obtiene la instancia global del moderador de contenido"""
    global _content_moderator
    if _content_moderator is None:
        _content_moderator = ContentModerator(openai_api_key)
    return _content_moderator

def moderate_user_input(text: str, openai_api_key: Optional[str] = None) -> Tuple[bool, str, Optional[str]]:
    """
    Función de conveniencia para moderar entrada del usuario
    
    Returns:
        Tuple[bool, str, Optional[str]]: (es_seguro, texto_limpio, razón_bloqueo)
    """
    moderator = get_content_moderator(openai_api_key)
    result, clean_text, reason = moderator.moderate_input(text)
    return result == ModerationResult.APPROVED, clean_text, reason

def moderate_llm_output(text: str, openai_api_key: Optional[str] = None) -> Tuple[bool, str, Optional[str]]:
    """
    Función de conveniencia para moderar salida del LLM
    
    Returns:
        Tuple[bool, str, Optional[str]]: (es_seguro, texto_seguro, razón_bloqueo)
    """
    moderator = get_content_moderator(openai_api_key)
    result, safe_text, reason = moderator.moderate_output(text)
    return result == ModerationResult.APPROVED, safe_text, reason
