import os
import base64
import logging
import tempfile
from typing import Optional
import numpy as np
import openai
from openai import OpenAI

logger = logging.getLogger(__name__)

class STTService:
    def __init__(self, model: str = "whisper-1"):
        """
        Inicializa el servicio STT con la API de Whisper de OpenAI
        :param model: Modelo de Whisper a utilizar (por defecto: whisper-1)
        """
        self.model = model
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        logger.info("Servicio STT inicializado con la API de OpenAI")

    async def transcribe_audio(self, audio_data: bytes) -> Optional[str]:
        """
        Transcribe audio a texto usando la API de Whisper
        
        Args:
            audio_data: Bytes de audio en formato WAV/PCM
            
        Returns:
            str: Texto transcrito
            None: Si hay un error o el audio está vacío/silencioso
        """
        if not audio_data or len(audio_data) < 100:  # Archivo demasiado pequeño
            logger.warning("Audio vacío o demasiado corto recibido")
            return None
            
        try:
            logger.info(f"Procesando audio de {len(audio_data)} bytes")
            # Crear un archivo temporal para el audio
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                temp_audio.write(audio_data)
                temp_audio_path = temp_audio.name
            
            try:
                logger.debug("Enviando audio a Whisper para transcripción...")
                
                # Usar la API de Whisper para transcribir
                with open(temp_audio_path, "rb") as audio_file:
                    response = self.client.audio.transcriptions.create(
                        model=self.model,
                        file=audio_file,
                        language="es",  # Forzar idioma español
                        temperature=0.2,  # Más determinista
                        prompt="Transcribe el siguiente audio con puntuación correcta."
                    )
                
                transcription = response.text.strip()
                
                if not transcription or len(transcription) < 2:  # Muy corta para ser válida
                    logger.warning("Transcripción vacía o demasiado corta")
                    return None
                    
                logger.info(f"Transcripción exitosa: {transcription[:100]}...")
                return transcription
                
            except Exception as e:
                logger.error(f"Error en la API de Whisper: {str(e)}", exc_info=True)
                logger.error(f"Detalles del error de Whisper API: {repr(e)}")
                return None
                
            finally:
                # Asegurarse de eliminar el archivo temporal
                try:
                    os.unlink(temp_audio_path)
                except Exception as e:
                    logger.warning(f"No se pudo eliminar el archivo temporal: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Error al procesar el audio: {str(e)}", exc_info=True)
            logger.error(f"Detalles del error de procesamiento de audio: {repr(e)}")
            return None

