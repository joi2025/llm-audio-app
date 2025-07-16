import pyttsx3
import json
import asyncio

class TTSservice:
    def __init__(self):
        self.engine = pyttsx3.init()
        
    async def generate_audio(self, text: str) -> bytes:
        """
        Genera audio a partir de texto usando pyttsx3.
        """
        try:
            # Crear un archivo temporal para el audio
            temp_file = "temp_audio.wav"
            self.engine.save_to_file(text, temp_file)
            self.engine.runAndWait()
            
            # Leer el archivo como bytes
            with open(temp_file, 'rb') as f:
                audio_data = f.read()
            
            # Eliminar el archivo temporal
            import os
            os.remove(temp_file)
            
            return audio_data
            
        except Exception as e:
            print(f"Error generando audio: {str(e)}")
            raise

# Instancia única del servicio TTS
tts_service = TTSservice()

