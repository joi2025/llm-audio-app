import base64
import json
import time
import requests
import io
from flask import current_app
from flask_socketio import emit, disconnect
from ..db import add_message, add_log, get_settings

def init_socketio(socketio):
    @socketio.on('connect')
    def handle_connect():
        session_id = f"ws_{int(time.time() * 1000)}"
        print(f"🔗 New voice session: {session_id}")
        emit('hello', {'message': 'ws connected', 'ts': int(time.time())})
    
    @socketio.on('disconnect')
    def handle_disconnect():
        print("🔌 Client disconnected")
    
    @socketio.on('ping')
    def handle_ping():
        emit('pong', {'ts': int(time.time())})
    
    @socketio.on('audio_chunk')
    def handle_audio_chunk(data):
        # Store audio chunk for processing
        if not hasattr(handle_audio_chunk, 'chunks'):
            handle_audio_chunk.chunks = []
        
        try:
            b64_data = data.get('data', '')
            if b64_data:
                audio_data = base64.b64decode(b64_data)
                handle_audio_chunk.chunks.append(audio_data)
                print(f"📦 Audio chunk received: {len(audio_data)} bytes")
        except Exception as e:
            print(f"❌ Error processing audio chunk: {e}")
    
    @socketio.on('audio_end')
    def handle_audio_end(data):
        """Process complete audio and return STT + LLM + TTS"""
        cfg = current_app.config
        api_key = cfg.get('OPENAI_API_KEY', '')
        base_url = cfg.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        session_id = f"ws_{int(time.time() * 1000)}"

        # Prefer a direct final base64 payload if provided, else fall back to concatenated chunks
        audio_bytes = b''
        try:
            if isinstance(data, dict):
                direct_b64 = data.get('audio') or data.get('audio_b64') or (data.get('data') if isinstance(data.get('data'), str) else None)
                if direct_b64:
                    audio_bytes = base64.b64decode(direct_b64)
        except Exception as e:
            print(f"⚠️ {session_id}: Invalid base64 in audio_end: {e}")
            audio_bytes = b''

        if not audio_bytes:
            # Get accumulated audio chunks (streamed via 'audio_chunk')
            audio_chunks = getattr(handle_audio_chunk, 'chunks', [])
            audio_bytes = b''.join(audio_chunks)
            handle_audio_chunk.chunks = []  # Clear for next recording

        print(f"🎯 Processing audio: {len(audio_bytes)} bytes")
        
        if not audio_bytes:
            emit('error', {'stage': 'audio', 'message': 'No audio data received'})
            return
        
        if not api_key:
            print(f"⚠️ {session_id}: No API key configured")
            emit('result_stt', {'transcription': '[Configurar API key]', 'from': 'user'})
            emit('result_llm', {'transcription': 'Configurar OPENAI_API_KEY en backend/.env para funcionalidad completa.', 'from': 'assistant'})
            emit('tts_end', {})
            return
        
        try:
            # STT Processing
            print(f"🎤 {session_id}: Starting STT...")
            stt_start = time.time()
            
            files = {'file': ('audio.webm', io.BytesIO(audio_bytes), 'audio/webm')}
            data_stt = {'model': 'whisper-1'}
            headers = {'Authorization': f'Bearer {api_key}'}
            
            resp = requests.post(f'{base_url}/audio/transcriptions', 
                               files=files, data=data_stt, headers=headers, timeout=30)
            
            if resp.status_code == 200:
                text = resp.json().get('text', '').strip()
                stt_time = time.time() - stt_start
                
                if text:
                    emit('result_stt', {'transcription': text, 'from': 'user'})
                    add_message('user', text, tokens_in=len(text.split()))
                    print(f"🎤 {session_id}: STT ({stt_time:.2f}s) - '{text[:50]}{'...' if len(text)>50 else ''}'")
                else:
                    emit('error', {'stage': 'stt', 'message': 'No speech detected'})
                    return
            else:
                emit('error', {'stage': 'stt', 'message': 'STT service failed'})
                return
            
            # LLM Processing
            print(f"🧠 {session_id}: Starting LLM...")
            llm_start = time.time()
            
            # Get personality and model from settings
            settings_dict = {setting['key']: setting['value'] for setting in get_settings()} if isinstance(get_settings(), list) else get_settings()
            
            model = settings_dict.get('chat_model', cfg.get('CHAT_MODEL', 'gpt-4o-mini'))
            personality = settings_dict.get('personality', 'friendly')
            system_prompt = settings_dict.get('system_prompt', '')
            
            # Build conversation with system prompt
            messages = []
            if system_prompt:
                messages.append({'role': 'system', 'content': system_prompt})
            
            # Add user message with voice optimization
            pref_short = bool(data.get('prefer_short_answer'))
            user_content = text
            if pref_short and not system_prompt:
                user_content = f"{text}\n\n[Responde de forma concisa y natural para conversación de voz]"
            
            messages.append({'role': 'user', 'content': user_content})
            
            # Get optimized settings for Spanish
            max_tokens = int(settings_dict.get('max_tokens_out', '120'))  # Optimizado para español
            temperature = float(settings_dict.get('temperature', '0.6'))  # Más consistente para español
            
            # Optimización para español: agregar contexto de idioma si no hay system prompt
            if not system_prompt:
                messages.insert(0, {
                    'role': 'system', 
                    'content': 'Responde siempre en español de forma natural y conversacional. Sé conciso pero completo.'
                })
            
            data_llm = {
                'model': model,
                'messages': messages,
                'max_tokens': max_tokens,
                'temperature': temperature,
                'presence_penalty': 0.1,  # Evitar repeticiones
                'frequency_penalty': 0.1   # Más variedad en respuestas
            }
            
            resp = requests.post(f'{base_url}/chat/completions', 
                               json=data_llm, headers=headers, timeout=30)
            
            if resp.status_code == 200:
                reply = resp.json()['choices'][0]['message']['content'].strip()
                llm_time = time.time() - llm_start
                
                if reply:
                    emit('result_llm', {'transcription': reply, 'from': 'assistant'})
                    add_message('assistant', reply, tokens_in=len(text.split()), 
                              tokens_out=len(reply.split()), cost=0.001)
                    print(f"🧠 {session_id}: LLM ({llm_time:.2f}s) {model} - '{reply[:50]}{'...' if len(reply)>50 else ''}'")
                else:
                    emit('error', {'stage': 'chat', 'message': 'Empty AI response'})
                    return
            else:
                emit('error', {'stage': 'chat', 'message': 'LLM service failed'})
                return
            
            # TTS Processing
            print(f"🔊 {session_id}: Starting TTS...")
            tts_start = time.time()
            
            # Get voice optimized for Spanish
            voice_name = settings_dict.get('voice_name', cfg.get('TTS_VOICE', 'nova'))  # Nova es mejor para español
            tts_model = settings_dict.get('tts_model', cfg.get('TTS_MODEL', 'tts-1'))
            
            # Optimizar texto para TTS en español
            optimized_reply = reply.strip()
            # Agregar pausas naturales para mejor pronunciación
            optimized_reply = optimized_reply.replace('. ', '. ')  # Pausas después de puntos
            optimized_reply = optimized_reply.replace(', ', ', ')  # Pausas después de comas
            
            data_tts = {
                'model': tts_model, 
                'input': optimized_reply, 
                'voice': voice_name,
                'speed': 1.0  # Velocidad natural para español
            }
            
            resp = requests.post(f'{base_url}/audio/speech', 
                               json=data_tts, headers=headers, timeout=30)
            
            if resp.status_code == 200:
                audio_mp3 = resp.content
                tts_time = time.time() - tts_start
                
                if audio_mp3:
                    b64_audio = base64.b64encode(audio_mp3).decode('ascii')
                    emit('audio', {'audio': b64_audio})
                    emit('tts_end', {})
                    
                    print(f"🔊 {session_id}: TTS ({tts_time:.2f}s) {tts_model}/{voice_name} - {len(audio_mp3)} bytes")
                else:
                    emit('error', {'stage': 'tts', 'message': 'TTS generation failed'})
            else:
                emit('error', {'stage': 'tts', 'message': 'TTS service failed'})
            
            print(f"✅ {session_id}: Complete pipeline finished")
            
        except Exception as e:
            print(f"❌ {session_id}: Pipeline error - {e}")
            emit('error', {'stage': 'general', 'message': f'Processing failed: {str(e)}'})
