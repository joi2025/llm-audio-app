"""
WebSocket Unified - Única Fuente de Verdad para Comunicación en Tiempo Real
Implementación consolidada de WebSocket para LLM Audio App con latencia ultra-baja.
Arquitectura unificada que maneja STT, LLM, TTS y VAD en un pipeline optimizado.

Características principales:
- Pipeline de audio con latencia mínima
- Rate limiting por cliente
- Manejo robusto de errores y desconexiones
- Soporte para personalidades dinámicas
- Logging completo de interacciones
"""
import base64
import os
import json
import time
import requests
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List, Generator, Optional, Tuple
from flask import current_app
from flask_socketio import emit
from ...db import add_message, add_log, get_settings


# -----------------------------
# Helpers (ported and unified)
# -----------------------------

def _approx_tokens(text: str) -> int:
    return max(1, int(len(text) / 4))

def process_tts_chunk(text: str, sequence_id: int, api_key: str, voice: str, sid: str) -> dict:
    """
    Procesa un chunk de TTS en paralelo usando ThreadPoolExecutor
    Retorna dict con audio en base64 y metadatos
    """
    try:
        import requests
        
        start_time = time.time()
        
        # Llamada a OpenAI TTS API
        response = requests.post(
            "https://api.openai.com/v1/audio/speech",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "tts-1",
                "input": text,
                "voice": voice,
                "response_format": "mp3"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            audio_data = response.content
            audio_b64 = base64.b64encode(audio_data).decode('utf-8')
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            print(f"[TTS] Chunk #{sequence_id} completed in {latency_ms}ms ({len(text)} chars)")
            
            return {
                'success': True,
                'audio': audio_b64,
                'sequence_id': sequence_id,
                'text': text[:50] + "..." if len(text) > 50 else text,
                'latency_ms': latency_ms,
                'error': None
            }
        else:
            error_msg = f"TTS API error: {response.status_code}"
            print(f"[TTS] Chunk #{sequence_id} failed: {error_msg}")
            
            return {
                'success': False,
                'audio': None,
                'sequence_id': sequence_id,
                'text': text[:50] + "..." if len(text) > 50 else text,
                'latency_ms': None,
                'error': error_msg
            }
            
    except Exception as e:
        error_msg = f"TTS processing error: {str(e)}"
        print(f"[TTS] Chunk #{sequence_id} exception: {error_msg}")
        
        return {
            'success': False,
            'audio': None,
            'sequence_id': sequence_id,
            'text': text[:50] + "..." if len(text) > 50 else text,
            'latency_ms': None,
            'error': error_msg
        }

def is_sentence_complete(buffer: str, token: str) -> bool:
    """
    Detecta si una oración está completa basándose en delimitadores
    Lógica mejorada para evitar falsos positivos
    """
    if not buffer or not token:
        return False
    
    # Delimitadores de fin de oración
    sentence_endings = ['.', '!', '?', '\n']
    
    # Verificar si el token actual es un delimitador
    if token in sentence_endings:
        # Evitar falsos positivos con abreviaciones comunes
        if token == '.':
            # Lista de abreviaciones comunes que no terminan oración
            abbreviations = ['Dr', 'Mr', 'Mrs', 'Ms', 'Prof', 'Sr', 'Jr', 'vs', 'etc', 'i.e', 'e.g']
            words = buffer.strip().split()
            if words and any(words[-1].startswith(abbr) for abbr in abbreviations):
                return False
        
        # Verificar longitud mínima
        clean_buffer = buffer.strip()
        return len(clean_buffer) >= 10  # Mínimo 10 caracteres para considerar oración
    
    return False


def moderate_content(text: str, api_key: str, content_type: str = "input") -> Tuple[bool, Optional[str]]:
    """
    Modera contenido usando OpenAI Moderation API
    
    Args:
        text: Texto a moderar
        api_key: API key de OpenAI
        content_type: "input" o "output" para logging
    
    Returns:
        Tuple[bool, Optional[str]]: (is_safe, reason_if_flagged)
    """
    try:
        response = requests.post(
            "https://api.openai.com/v1/moderations",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={"input": text},
            timeout=10
        )
        
        if response.status_code != 200:
            add_log('ERROR', f'Moderation API error: {response.status_code}')
            return True, None  # Fail open - allow content if moderation fails
        
        result = response.json()
        moderation = result.get('results', [{}])[0]
        
        if moderation.get('flagged', False):
            categories = moderation.get('categories', {})
            flagged_categories = [cat for cat, flagged in categories.items() if flagged]
            reason = f"Flagged categories: {', '.join(flagged_categories)}"
            
            add_log('MODERATION', f'{content_type.upper()} blocked: {reason} - Text length: {len(text)}')
            return False, reason
        
        return True, None
        
    except Exception as e:
        add_log('ERROR', f'Moderation check failed: {e}')
        return True, None  # Fail open


def _estimate_cost(tokens_in: int, tokens_out: int, tts_chars: int = 0) -> float:
    """
    Estima el costo de una interacción basándose en precios públicos de OpenAI (Diciembre 2024)
    
    Args:
        tokens_in: Tokens de entrada (STT + prompt)
        tokens_out: Tokens de salida (LLM response)
        tts_chars: Caracteres para TTS
    
    Returns:
        Costo total estimado en USD
    """
    # Precios OpenAI por 1M tokens (USD)
    GPT4_INPUT_PRICE = 2.50   # $2.50 per 1M input tokens
    GPT4_OUTPUT_PRICE = 10.00 # $10.00 per 1M output tokens
    TTS_PRICE = 15.00         # $15.00 per 1M characters
    
    # Calcular costos
    input_cost = (tokens_in / 1_000_000) * GPT4_INPUT_PRICE
    output_cost = (tokens_out / 1_000_000) * GPT4_OUTPUT_PRICE
    tts_cost = (tts_chars / 1_000_000) * TTS_PRICE
    
    total_cost = input_cost + output_cost + tts_cost
    
    return round(total_cost, 6)  # 6 decimales para precisión en microcents


def _select_chat_model(cfg: Dict[str, Any], settings: Dict[str, Any]) -> str:
    tier = (settings.get('tier') or 'medium').lower()
    mapping = {
        'low': 'gpt-4o-mini',
        'medium_low': 'gpt-4o-mini',
        'medium': settings.get('chat_model', cfg.get('CHAT_MODEL', 'gpt-4o-mini')),
        'medium_high': 'gpt-4o',
        'high': 'gpt-4o',
    }
    return mapping.get(tier, settings.get('chat_model', cfg.get('CHAT_MODEL', 'gpt-4o-mini')))


def _select_tts(cfg: Dict[str, Any], settings: Dict[str, Any]) -> Tuple[str, str]:
    voice = settings.get('voice_name') or cfg.get('TTS_VOICE', 'alloy')
    tts_model = settings.get('tts_model') or cfg.get('TTS_MODEL', 'tts-1')
    return voice, tts_model


def _http_stt(base_url: str, api_key: str, audio_bytes: bytes) -> str:
    headers = {'Authorization': f'Bearer {api_key}'}
    files = {'file': ('audio.webm', io.BytesIO(audio_bytes), 'audio/webm')}
    data = {'model': 'whisper-1'}
    url = f'{base_url}/audio/transcriptions'
    r = requests.post(url, headers=headers, files=files, data=data, timeout=60)
    if r.status_code == 200:
        js = r.json()
        return js.get('text') or ''
    return ''


def _http_chat(base_url: str, api_key: str, model: str, messages: list, max_tokens: int, temperature: float) -> str:
    """Call OpenAI chat completion - NON-STREAMING (legacy)"""
    try:
        resp = requests.post(
            f"{base_url}/chat/completions",
            headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
            json={'model': model, 'messages': messages, 'max_tokens': max_tokens, 'temperature': temperature},
            timeout=30
        )
        resp.raise_for_status()
        return resp.json()['choices'][0]['message']['content']
    except Exception as e:
        print(f"[websocket_unified] Chat API error: {e}")
        return ''


def _http_chat_streaming(base_url: str, api_key: str, model: str, messages: list, max_tokens: int, temperature: float):
    """Call OpenAI chat completion with STREAMING - LATENCIA CERO"""
    try:
        resp = requests.post(
            f"{base_url}/chat/completions",
            headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
            json={
                'model': model, 
                'messages': messages, 
                'max_tokens': max_tokens, 
                'temperature': temperature,
                'stream': True  # CRÍTICO: Habilitar streaming
            },
            timeout=30,
            stream=True  # CRÍTICO: Stream response
        )
        resp.raise_for_status()
        
        # Generator que yielda tokens conforme llegan
        for line in resp.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    data_str = line_str[6:]  # Remove 'data: '
                    if data_str.strip() == '[DONE]':
                        break
                    try:
                        data = json.loads(data_str)
                        if 'choices' in data and len(data['choices']) > 0:
                            delta = data['choices'][0].get('delta', {})
                            if 'content' in delta:
                                yield delta['content']
                    except json.JSONDecodeError:
                        continue
                        
    except Exception as e:
        print(f"[websocket_unified] Streaming Chat API error: {e}")
        yield ''


def _http_tts(base_url: str, api_key: str, tts_model: str, voice: str, text: str) -> bytes:
    headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
    payload = {'model': tts_model, 'input': text, 'voice': voice, 'speed': 1.0}
    url = f'{base_url}/audio/speech'
    r = requests.post(url, headers=headers, json=payload, timeout=60)
    if r.status_code == 200:
        return r.content
    return b''


# -----------------------------
# Unified Socket.IO implementation
# -----------------------------

class TokenBucket:
    def __init__(self, rate_per_sec: float, capacity: int):
        self.rate = rate_per_sec
        self.capacity = capacity
        self.tokens = capacity
        self.last = time.time()
        self.lock = threading.Lock()

    def allow(self) -> bool:
        with self.lock:
            now = time.time()
            elapsed = now - self.last
            self.last = now
            self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
            if self.tokens >= 1:
                self.tokens -= 1
                return True
            return False


# Global state management
client_metrics: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
    'connected_at': time.time(),
    'requests': 0,
    'last_request': 0,
    'stt_ms': 0,
    'llm_ms': 0,
    'tts_ms': 0,
    'first_token_ms': 0,
    'interruptions': 0,
    'last_error': None
})

# Rate limiting per client
rate_limits: Dict[str, Deque[float]] = defaultdict(lambda: deque(maxlen=10))
RATE_LIMIT_WINDOW = 60  # seconds
MAX_REQUESTS_PER_WINDOW = 30

# ThreadPoolExecutor for parallel TTS processing
tts_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="TTS-Worker")

# Sentence detection configuration
MIN_SENTENCE_LENGTH = 10
SENTENCE_ENDINGS = {'.', '!', '?', '。', '！', '？'}
SENTENCE_SEPARATORS = {'\n', '\r'}
COMMON_ABBREVIATIONS = {
    'Dr', 'Mr', 'Mrs', 'Ms', 'Prof', 'Inc', 'Ltd', 'Corp', 'Co',
    'etc', 'vs', 'e.g', 'i.e', 'cf', 'St', 'Ave', 'Blvd'
}

def is_sentence_complete(current_text: str, last_token: str) -> bool:
    """Enhanced sentence completion detection with support for multiple languages"""
    # Check if the last token contains sentence endings
    has_ending = any(char in SENTENCE_ENDINGS for char in last_token)
    has_separator = any(char in SENTENCE_SEPARATORS for char in last_token)
    
    if not has_ending and not has_separator:
        return False
    
    # Additional validation to avoid false positives
    trimmed_text = current_text.strip()
    
    # Skip very short fragments
    if len(trimmed_text) < MIN_SENTENCE_LENGTH:
        return False
    
    # Skip if it looks like an abbreviation (e.g., "Dr.", "etc.")
    if has_ending and is_likely_abbreviation(trimmed_text):
        return False
    
    # Skip if it's just a number with decimal point
    if has_ending and re.match(r'.*\d+\.\d*$', trimmed_text):
        return False
    
    return True

def is_likely_abbreviation(text: str) -> bool:
    """Detects common abbreviations to avoid premature sentence breaks"""
    words = text.strip().split()
    if not words:
        return False
    
    last_word = words[-1].rstrip('.')
    
    return (last_word in COMMON_ABBREVIATIONS or 
            (len(last_word) <= 3 and last_word.isupper()))

def process_tts_chunk(base_url: str, api_key: str, tts_model: str, voice: str, 
                     sentence: str, sequence_id: int, sid: str) -> Dict[str, Any]:
    """Process a single TTS chunk in parallel"""
    try:
        t0_tts = time.time()
        audio_mp3 = _http_tts(base_url, api_key, tts_model, voice, sentence)
        tts_time = int((time.time() - t0_tts) * 1000)
        
        if audio_mp3:
            b64_audio = base64.b64encode(audio_mp3).decode('ascii')
            return {
                'success': True,
                'audio': b64_audio,
                'sequence_id': sequence_id,
                'text': sentence,
                'tts_ms': tts_time,
                'sid': sid
            }
        else:
            return {
                'success': False,
                'sequence_id': sequence_id,
                'text': sentence,
                'error': 'Empty audio response',
                'sid': sid
            }
    except Exception as e:
        return {
            'success': False,
            'sequence_id': sequence_id,
            'text': sentence,
            'error': str(e),
            'sid': sid
        }

def init_unified(socketio):
    # Per-connection state maps by sid
    audio_buffers: Dict[str, Deque[bytes]] = defaultdict(lambda: deque(maxlen=160))  # ~40s at 4 chunks/sec
    buckets: Dict[str, TokenBucket] = {}
    pipelines: Dict[str, AudioPipeline] = {}
    metrics: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        'bytes_received': 0,
        'chunks_received': 0,
        'sessions_total': 0,
        'stt_ms': 0.0,
        'llm_ms': 0.0,
        'tts_ms': 0.0,
        'last_error': '',
        'last_activity_ts': 0,
    })
    alive: Dict[str, bool] = {}

    def _heartbeat_task(sid: str):
        while alive.get(sid, False):
            try:
                # Use socketio.emit because we're outside an event context
                socketio.emit('server_heartbeat', {'ts': int(time.time())}, to=sid, namespace='/')
            except Exception:
                pass
            time.sleep(30)

    @socketio.on('connect')
    def on_connect():
        sid = request.sid
        alive[sid] = True
        buckets[sid] = TokenBucket(rate_per_sec=4.0, capacity=8)  # 4 tokens/sec -> 250ms chunks
        metrics[sid]['sessions_total'] += 1
        metrics[sid]['last_activity_ts'] = int(time.time())
        emit('hello', {'message': 'ws connected', 'ts': int(time.time())})
        # Start partial STT pipeline if API key exists
        cfg = current_app.config
        api_key = cfg.get('OPENAI_API_KEY', '')
        base_url = cfg.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        if api_key:
            try:
                def _emit(event: str, payload: dict):
                    try:
                        socketio.emit(event, payload, to=sid, namespace='/')
                    except Exception:
                        pass
                pipelines[sid] = AudioPipeline(_emit, base_url, api_key, min_interval_s=0.5, window_chunks=6, preroll_chunks=5)
                pipelines[sid].start()
            except Exception:
                pipelines.pop(sid, None)
        threading.Thread(target=_heartbeat_task, args=(sid,), daemon=True).start()

    @socketio.on('disconnect')
    def on_disconnect():
        sid = request.sid
        if sid and sid in alive:
            alive[sid] = False
            audio_buffers.pop(sid, None)
            buckets.pop(sid, None)
            try:
                pipelines.get(sid) and pipelines[sid].stop()
            finally:
                pipelines.pop(sid, None)
        print('🔌 Client disconnected')

    @socketio.on('ping')
    def on_ping():
        emit('pong', {'ts': int(time.time())})

    @socketio.on('get_metrics')
    def on_get_metrics():
        sid = request.sid
        m = metrics.get(sid, {}) if sid else {}
        emit('metrics', m)

    @socketio.on('audio_chunk')
    def on_audio_chunk(data):
        # Rate limit per 250ms
        sid = request.sid
        bucket = buckets.get(sid)
        if bucket and not bucket.allow():
            emit('error', {'stage': 'rate_limit', 'message': 'Too many chunks'}, to=sid)
            return
        b64_data = (data or {}).get('data') or (data or {}).get('audio') or ''
        if not b64_data:
            return
        try:
            audio = base64.b64decode(b64_data)
            audio_buffers[sid].append(audio)
            metrics[sid]['bytes_received'] += len(audio)
            metrics[sid]['chunks_received'] += 1
            metrics[sid]['last_activity_ts'] = int(time.time())
            # Feed streaming STT pipeline as speaking audio
            p = pipelines.get(sid)
            if p:
                p.push_chunk(audio, speaking=True)
        except Exception as e:
            metrics[sid]['last_error'] = str(e)
            emit('error', {'stage': 'audio', 'message': 'invalid audio chunk'})

    @socketio.on('audio_end')
    def on_audio_end(data):
        sid = request.sid
        cfg = current_app.config
        api_key = cfg.get('OPENAI_API_KEY', '')
        base_url = cfg.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        settings_obj = get_settings()
        settings = {s['key']: s['value'] for s in settings_obj} if isinstance(settings_obj, list) else (settings_obj or {})

        # Join buffered audio
        chunks = list(audio_buffers.get(sid, deque()))
        audio_buffers[sid].clear()
        audio_bytes = b''.join(chunks)
        if not audio_bytes:
            emit('error', {'stage': 'audio', 'message': 'No audio data received'})
            return
        # Reset pipeline buffers for next utterance
        try:
            pipelines.get(sid) and pipelines[sid].reset()
        except Exception:
            pass

        # No API key: graceful path
        if not api_key:
            add_message('assistant', 'Audio recibido - configurar OPENAI_API_KEY')
            emit('result_stt', {'transcription': '[Configurar API key]', 'from': 'user'})
            emit('result_llm', {'transcription': 'Configurar OPENAI_API_KEY en backend/.env para funcionalidad completa.', 'from': 'assistant'})
            emit('tts_end', {})
            return

        # STT - Speech to Text
        try:
            t0 = time.time()
            text = _http_stt(base_url, api_key, audio_bytes).strip()
            metrics[sid]['stt_ms'] = int((time.time() - t0) * 1000)
            if not text:
                emit('error', {'stage': 'stt', 'message': 'No speech detected'})
                return
            
            # Moderación de entrada antes de LLM
            is_safe, reason = moderate_content(text, api_key, "input")
            if not is_safe:
                safe_response = "Lo siento, no puedo ayudarte con esa solicitud. Por favor, reformula tu pregunta de manera apropiada."
                emit('result_stt', {'transcription': text, 'from': 'user'})
                emit('result_llm', {'transcription': safe_response, 'from': 'assistant'})
                
                # Generar TTS para la respuesta segura
                try:
                    voice, tts_model = _select_tts(cfg, settings)
                    audio_mp3 = _http_tts(base_url, api_key, tts_model, voice, safe_response)
                    if audio_mp3:
                        b64_audio = base64.b64encode(audio_mp3).decode('ascii')
                        emit('audio_chunk', {
                            'audio': b64_audio,
                            'sequence_id': 1,
                            'is_final': True
                        })
                except Exception as e:
                    add_log('ERROR', f'TTS for moderated content failed: {e}')
                
                add_message('user', text, tokens_in=_approx_tokens(text))
                add_message('assistant', safe_response, tokens_out=_approx_tokens(safe_response))
                return
            
            emit('result_stt', {'transcription': text, 'from': 'user'})
            add_message('user', text, tokens_in=_approx_tokens(text))
        except Exception as e:
            metrics[sid]['last_error'] = f'STT: {e}'
            emit('error', {'stage': 'stt', 'message': 'Speech recognition failed'})
            return

        # LLM + TTS STREAMING PIPELINE - LATENCIA CERO
        try:
            model = _select_chat_model(cfg, settings)
            max_tokens = int(settings.get('max_tokens_out', '150'))
            temperature = float(settings.get('temperature', '0.7'))
            system_prompt = settings.get('system_prompt', '')
            messages = []
            if not system_prompt:
                messages.append({'role': 'system', 'content': 'Responde siempre en español de forma natural y conversacional. Sé conciso.'})
            else:
                messages.append({'role': 'system', 'content': system_prompt})

            pref_short = bool((data or {}).get('prefer_short_answer'))
            user_text = text if system_prompt or not pref_short else f"{text}\n\n[Responde de forma concisa y natural para conversación de voz]"
            messages.append({'role': 'user', 'content': user_text})

            # STREAMING LLM + TTS PARALELO CON ThreadPoolExecutor
            voice, tts_model = _select_tts(cfg, settings)
            t0_llm = time.time()
            
            accumulated_text = ""
            sentence_buffer = ""
            first_chunk_sent = False
            sequence_id = 0
            tts_futures = []  # Para tracking de futures TTS paralelos
            
            print(f"[websocket_unified] Starting parallel TTS pipeline for {sid}")
            
            # Stream LLM tokens y procesar TTS inmediatamente
            for token in _http_chat_streaming(base_url, api_key, model, messages, max_tokens, temperature):
                if not token:
                    continue
                    
                accumulated_text += token
                sentence_buffer += token
                
                # Emitir primer token inmediatamente (LATENCIA MÍNIMA)
                if not first_chunk_sent:
                    emit('llm_first_token', {'token': token, 'timestamp': time.time()})
                    first_chunk_sent = True
                    metrics[sid]['first_token_ms'] = int((time.time() - t0_llm) * 1000)
                
                # Emitir tokens en streaming
                emit('llm_token', {'token': token, 'accumulated': accumulated_text})
                
                # Moderación de salida antes de TTS
                sentence = sentence_buffer.strip()
                is_output_safe, output_reason = moderate_content(sentence, api_key, "output")
                if not is_output_safe:
                    print(f"[websocket_unified] Output blocked for {sid}: {output_reason}")
                    add_log('WARN', f'Content moderation blocked output: {output_reason} - Text: "{sentence[:50]}..."')
                    
                    # Reemplazar con respuesta segura
                    sentence = "Disculpa, no puedo completar esa respuesta. ¿Hay algo más en lo que pueda ayudarte?"
                
                # Detectar final de oración con lógica mejorada
                if is_sentence_complete(sentence_buffer, token):
                    sentence_to_speak = sentence_buffer.strip()
                    if len(sentence_to_speak) >= MIN_SENTENCE_LENGTH:
                        # Moderación final de la oración completa
                        is_safe, block_reason = moderate_content(sentence_to_speak, api_key, "output")
                        if not is_safe:
                            print(f"[websocket_unified] Sentence blocked for {sid}: {block_reason}")
                            add_log('WARN', f'Content moderation blocked sentence: {block_reason}')
                            sentence_to_speak = "Disculpa, no puedo completar esa respuesta."
                            
                        
                        # **STREAMING PARALELO CRÍTICO** - Lanzar TTS inmediatamente
                        sequence_id = len(tts_futures) + 1
                        print(f"[websocket_unified] Launching TTS for sentence #{sequence_id}: '{sentence_to_speak[:50]}...'")
                        
                        # Enviar TTS task al ThreadPoolExecutor
                        future = tts_executor.submit(
                            process_tts_chunk,
                            sentence_to_speak,
                            sequence_id,
                            api_key,
                            voice,
                            sid
                        )
                        tts_futures.append(future)
                        
                        # Resetear buffer para próxima oración
                        sentence_buffer = ""
            
            # Procesar último fragmento si queda algo
            remaining_text = sentence_buffer.strip()
            if len(remaining_text) >= MIN_SENTENCE_LENGTH:
                # Moderación final del fragmento restante
                is_safe, safe_remaining, block_reason = moderate_llm_output(remaining_text, api_key)
                if not is_safe:
                    print(f"[websocket_unified] Final fragment blocked for {sid}: {block_reason}")
                    add_log('WARN', f'Content moderation blocked final fragment: {block_reason}')
                    
                    # Registrar evento de moderación
                    log_moderation_event('blocked', 'output', block_reason, remaining_text, safe_remaining, user_id=sid)
                    remaining_text = safe_remaining
                
                # Lanzar TTS para fragmento final
                final_sequence_id = len(tts_futures) + 1
                print(f"[websocket_unified] Launching final TTS chunk #{final_sequence_id}")
                
                future = tts_executor.submit(
                    process_tts_chunk,
                    remaining_text,
                    final_sequence_id,
                    api_key,
                    voice,
                    sid
                )
                tts_futures.append(future)
                
                # Procesar resultados TTS conforme van completándose
                def handle_tts_results():
                    try:
                        for future in as_completed(tts_futures, timeout=30):
                            result = future.result()
                            
                            if result['success']:
                                emit('audio_chunk', {
                                    'audio': result['audio'],
                                    'sequence_id': result['sequence_id'],
                                    'text': result['text'],
                                    'tts_ms': result['tts_ms']
                                })
                                print(f"[websocket_unified] TTS chunk #{result['sequence_id']} completed in {result['tts_ms']}ms")
                            else:
                                emit('tts_chunk_error', {
                                    'sequence_id': result['sequence_id'],
                                    'text': result['text'],
                                    'error': result['error']
                                })
                                print(f"[websocket_unified] TTS chunk #{result['sequence_id']} failed: {result['error']}")
                        
                        # Señalar fin de TTS
                        emit('tts_end', {'total_chunks': len(tts_futures)})
                        
                    except Exception as e:
                        print(f"[websocket_unified] Error handling TTS results: {e}")
                        emit('tts_error', {'error': str(e)})
                
                # Ejecutar manejo de resultados en thread separado
                results_thread = threading.Thread(target=handle_tts_results)
                results_thread.daemon = True
                results_thread.start()
                
                # Métricas finales
                metrics[sid]['llm_ms'] = int((time.time() - t0_llm) * 1000)
                metrics[sid]['tts_chunks'] = len(tts_futures)
                
                # Calcular y registrar costos completos del pipeline
                tokens_in = _approx_tokens(text)
                tokens_out = _approx_tokens(accumulated_text)
                tts_chars = len(accumulated_text)
                total_cost = _estimate_cost(tokens_in, tokens_out, tts_chars)
                
                print(f"[websocket_unified] Pipeline cost: ${total_cost:.6f} (in:{tokens_in}t, out:{tokens_out}t, tts:{tts_chars}c)")
                
                # Emitir respuesta completa y finalizar
                emit('result_llm', {'transcription': accumulated_text, 'from': 'assistant'})
                add_message('assistant', accumulated_text, tokens_in=tokens_in, tokens_out=tokens_out, cost=total_cost)
                
                # Señal de finalización después de un breve delay para permitir que terminen los TTS
                def signal_completion():
                    time.sleep(0.5)  # Pequeño delay para TTS chunks
                    emit('pipeline_complete', {'total_chunks': len(tts_futures)})
                
                completion_thread = threading.Thread(target=signal_completion)
                completion_thread.daemon = True
                completion_thread.start()
                
        except Exception as e:
            metrics[sid]['last_error'] = f'Streaming Pipeline: {e}'
            emit('error', {'stage': 'streaming', 'message': 'Streaming pipeline failed'})
            return

    @socketio.on('stop_tts')
    def on_stop_tts(data):
        """
        Manejador CRÍTICO para interrupción inmediata de TTS
        Cancela todas las tareas TTS en curso para latencia cero
        """
        sid = request.sid
        try:
            print(f"🚫 [websocket_unified] STOP_TTS recibido de {sid} - cancelando TTS inmediatamente")
            
            # Emitir señal de cancelación inmediata al cliente
            emit('tts_cancelled', {
                'timestamp': time.time(),
                'reason': data.get('reason', 'user_request')
            })
            
            # Log para métricas de interrupción
            if sid in metrics:
                metrics[sid]['interruptions'] = metrics[sid].get('interruptions', 0) + 1
                metrics[sid]['last_interruption'] = time.time()
            
            print(f"✅ [websocket_unified] TTS cancelado exitosamente para {sid}")
            
        except Exception as e:
            print(f"❌ [websocket_unified] Error en stop_tts: {e}")
            emit('error', {'stage': 'stop_tts', 'message': 'Failed to stop TTS'})

    @socketio.on('user_text')
    def on_user_text(data):
        sid = request.sid
        cfg = current_app.config
        api_key = cfg.get('OPENAI_API_KEY', '')
        base_url = cfg.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        settings_obj = get_settings()
        settings = {s['key']: s['value'] for s in settings_obj} if isinstance(settings_obj, list) else (settings_obj or {})

        text = ((data or {}).get('text') or '').strip()
        if not text:
            return
        if not api_key:
            add_message('user', text)
            add_message('assistant', f'Echo: {text}')
            emit('result_llm', {'transcription': f'Echo: {text}', 'from': 'assistant'})
            return
        try:
            add_message('user', text, tokens_in=_approx_tokens(text))
            model = _select_chat_model(cfg, settings)
            system_prompt = settings.get('system_prompt', '')
            messages = ([{'role': 'system', 'content': system_prompt}] if system_prompt else []) + [
                {'role': 'user', 'content': text}
            ]
            reply = _http_chat(base_url, api_key, model, messages, int(settings.get('max_tokens_out', '150')), float(settings.get('temperature', '0.7')))
            emit('result_llm', {'transcription': reply, 'from': 'assistant'})
            add_message('assistant', reply, tokens_in=_approx_tokens(text), tokens_out=_approx_tokens(reply), cost=_estimate_cost(settings, _approx_tokens(text), _approx_tokens(reply)))

            voice, tts_model = _select_tts(cfg, settings)
            audio_mp3 = _http_tts(base_url, api_key, tts_model, voice, reply)
            if audio_mp3:
                b64_audio = base64.b64encode(audio_mp3).decode('ascii')
                emit('audio', {'audio': b64_audio})
                emit('tts_end', {})
        except Exception as e:
            metrics[sid]['last_error'] = f'user_text: {e}'
            emit('error', {'stage': 'chat_tts', 'message': 'Processing failed'})
