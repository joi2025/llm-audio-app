from flask import Flask, request, jsonify, send_file
from flask_socketio import SocketIO, emit
import logging
import os
import sys
import json
import tempfile
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from elevenlabs import generate, play, set_api_key, Voice, VoiceSettings

# Cargar variables de entorno
load_dotenv()

# Configurar clientes de API
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
set_api_key(os.getenv('ELEVENLABS_API_KEY'))

# Configurar voz de ElevenLabs
voice_settings = VoiceSettings(
    stability=0.71,
    similarity_boost=0.5,
    style=0.0,
    use_speaker_boost=True
)

voice = Voice(
    voice_id=os.getenv('ELEVENLABS_VOICE_ID', '21m00Tcm4TlvDq8ikWAM'),
    settings=voice_settings
)

# Directorio temporal para archivos de audio
TEMP_AUDIO_DIR = Path(tempfile.gettempdir()) / 'llm_audio_app'
TEMP_AUDIO_DIR.mkdir(exist_ok=True, parents=True)

# Configurar logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/')
def health_check():
    return {'status': 'ok', 'message': 'Backend running'}

@socketio.on('connect')
def handle_connect():
    logger.info('Cliente conectado')
    emit('connection', {'status': 'connected'})

@socketio.on('message')
def handle_message(data):
    try:
        logger.info(f'Mensaje recibido: {data}')
        text = data.get('text', '')
        
        # Llamar a la API de OpenAI
        response = client.chat.completions.create(
            model=os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo'),
            messages=[
                {"role": "system", "content": "Eres un asistente útil que responde de manera concisa y amable."},
                {"role": "user", "content": text}
            ],
            temperature=float(os.getenv('OPENAI_TEMPERATURE', 0.7)),
            max_tokens=int(os.getenv('OPENAI_MAX_TOKENS', 256)),
            stream=True
        )
        
        # Construir respuesta completa
        full_response = []
        for chunk in response:
            if chunk.choices[0].delta.content is not None:
                content = chunk.choices[0].delta.content
                full_response.append(content)
                emit('response', {'content': content, 'done': False})
        
        full_text = ''.join(full_response)
        
        # Generar audio con ElevenLabs
        audio_response = generate(
            text=full_text,
            voice=voice,
            model=os.getenv('ELEVENLABS_MODEL', 'eleven_monolingual_v2'),
            stream=False
        )
        
        # Guardar audio temporalmente
        audio_path = TEMP_AUDIO_DIR / f'response_{hash(full_text)}.mp3'
        with open(audio_path, 'wb') as f:
            f.write(audio_response)
        
        # Enviar señal de finalización con ruta del audio
        emit('response', {
            'content': '', 
            'done': True,
            'full_response': full_text,
            'audio_path': str(audio_path.relative_to(TEMP_AUDIO_DIR))
        })
        
    except Exception as e:
        logger.error(f'Error procesando mensaje: {e}', exc_info=True)
        emit('error', {'message': str(e)})

@app.route('/audio/<path:filename>')
def serve_audio(filename):
    """Sirve archivos de audio generados"""
    return send_file(TEMP_AUDIO_DIR / filename, mimetype='audio/mpeg')

if __name__ == '__main__':
    try:
        logger.info('=== Iniciando servidor Flask ===')
        logger.info(f'Python version: {sys.version}')
        logger.info(f'Current directory: {os.getcwd()}')
        
        # Iniciar servidor
        logger.info('Iniciando servidor en host 0.0.0.0, puerto 8001')
        socketio.run(app, host='0.0.0.0', port=8001, debug=True)
    except Exception as e:
        logger.error(f'Error al iniciar el servidor: {e}', exc_info=True)
        raise
