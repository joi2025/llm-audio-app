import asyncio
import websockets
import json
import base64
import os
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_websocket():
    uri = "ws://localhost:8000/ws"
    
    # Leer un archivo de audio de prueba
    audio_file = "test_audio.wav"
    
    if not os.path.exists(audio_file):
        logger.error(f"El archivo de audio de prueba {audio_file} no existe.")
        logger.info("Creando archivo de audio de prueba...")
        
        # Crear un archivo de audio de prueba si no existe
        import wave
        import numpy as np
        
        sample_rate = 16000
        duration = 3  # segundos
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        tone = np.sin(2 * np.pi * 440 * t) * 0.5
        audio = (tone * 32767).astype(np.int16)
        
        with wave.open(audio_file, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(audio.tobytes())
        
        logger.info(f"Archivo de prueba creado: {audio_file}")
    
    try:
        # Leer el archivo de audio
        with open(audio_file, "rb") as f:
            audio_data = f.read()
        
        logger.info(f"Conectando a {uri}...")
        
        async with websockets.connect(uri) as websocket:
            logger.info("Conexión WebSocket establecida")
            
            # Enviar audio
            logger.info(f"Enviando {len(audio_data)} bytes de audio...")
            await websocket.send(audio_data)
            
            # Recibir respuesta
            logger.info("Esperando respuesta del servidor...")
            response = await websocket.recv()
            logger.info(f"Respuesta recibida: {response}")
            
    except Exception as e:
        logger.error(f"Error en la prueba: {str(e)}")
        raise

if __name__ == "__main__":
    try:
        asyncio.get_event_loop().run_until_complete(test_websocket())
    except KeyboardInterrupt:
        logger.info("Prueba interrumpida por el usuario")
    except Exception as e:
        logger.error(f"Error en la ejecución: {str(e)}")
        raise
