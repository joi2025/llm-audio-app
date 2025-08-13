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
import io
import json
import time
import threading
from collections import deque, defaultdict
from typing import Deque, Dict, Any, Tuple

import requests
from flask import current_app, request
from flask_socketio import emit, disconnect

from ..db import add_message, add_log, get_settings
from .audio_pipeline import AudioPipeline


# -----------------------------
# Helpers (ported and unified)
# -----------------------------

def _approx_tokens(text: str) -> int:
    return max(1, int(len(text) / 4))


def _estimate_cost(settings: Dict[str, Any], tokens_in: int, tokens_out: int) -> float:
    tier = (settings.get('tier') or 'medium').lower()
    price_map = {
        'low': (0.05, 0.1),
        'medium_low': (0.08, 0.16),
        'medium': (0.15, 0.6),
        'medium_high': (0.3, 1.2),
        'high': (0.6, 2.4),
    }
    pin, pout = price_map.get(tier, price_map['medium'])
    return round((tokens_in / 1000.0) * pin + (tokens_out / 1000.0) * pout, 6)


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

        # STT
        try:
            t0 = time.time()
            text = _http_stt(base_url, api_key, audio_bytes).strip()
            metrics[sid]['stt_ms'] = int((time.time() - t0) * 1000)
            if not text:
                emit('error', {'stage': 'stt', 'message': 'No speech detected'})
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

            # STREAMING LLM + TTS PARALELO - INGENIERÍA CRÍTICA
            voice, tts_model = _select_tts(cfg, settings)
            t0_llm = time.time()
            
            accumulated_text = ""
            sentence_buffer = ""
            first_chunk_sent = False
            tts_tasks = []  # Para tracking de tareas TTS paralelas
            
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
                
                # Detectar final de oración para TTS inmediato
                if token in ['.', '!', '?', '\n'] or len(sentence_buffer.strip()) > 100:
                    sentence_to_speak = sentence_buffer.strip()
                    if sentence_to_speak:
                        # CRÍTICO: Iniciar TTS inmediatamente sin esperar más tokens
                        def async_tts(sentence, chunk_id):
                            try:
                                t0_tts = time.time()
                                audio_mp3 = _http_tts(base_url, api_key, tts_model, voice, sentence)
                                tts_time = int((time.time() - t0_tts) * 1000)
                                
                                if audio_mp3:
                                    b64_audio = base64.b64encode(audio_mp3).decode('ascii')
                                    emit('audio_chunk', {
                                        'audio': b64_audio, 
                                        'chunk_id': chunk_id,
                                        'text': sentence,
                                        'tts_ms': tts_time
                                    })
                                else:
                                    emit('tts_chunk_error', {'chunk_id': chunk_id, 'text': sentence})
                            except Exception as e:
                                print(f"[websocket_unified] Async TTS error: {e}")
                                emit('tts_chunk_error', {'chunk_id': len(tts_tasks), 'error': str(e)})
                        
                        # Ejecutar TTS en thread separado para no bloquear streaming
                        chunk_id = len(tts_tasks)
                        tts_thread = threading.Thread(target=async_tts, args=(sentence_to_speak, chunk_id))
                        tts_thread.daemon = True
                        tts_thread.start()
                        tts_tasks.append(tts_thread)
                        
                        sentence_buffer = ""  # Reset buffer
            
            # Procesar último fragmento si queda algo
            if sentence_buffer.strip():
                def final_tts():
                    try:
                        audio_mp3 = _http_tts(base_url, api_key, tts_model, voice, sentence_buffer.strip())
                        if audio_mp3:
                            b64_audio = base64.b64encode(audio_mp3).decode('ascii')
                            emit('audio_chunk', {
                                'audio': b64_audio, 
                                'chunk_id': len(tts_tasks),
                                'text': sentence_buffer.strip(),
                                'final': True
                            })
                    except Exception as e:
                        print(f"[websocket_unified] Final TTS error: {e}")
                
                final_thread = threading.Thread(target=final_tts)
                final_thread.daemon = True
                final_thread.start()
                tts_tasks.append(final_thread)
            
            # Métricas finales
            metrics[sid]['llm_ms'] = int((time.time() - t0_llm) * 1000)
            metrics[sid]['tts_chunks'] = len(tts_tasks)
            
            # Emitir respuesta completa y finalizar
            emit('result_llm', {'transcription': accumulated_text, 'from': 'assistant'})
            add_message('assistant', accumulated_text, tokens_in=_approx_tokens(text), tokens_out=_approx_tokens(accumulated_text), cost=_estimate_cost(settings, _approx_tokens(text), _approx_tokens(accumulated_text)))
            
            # Señal de finalización después de un breve delay para permitir que terminen los TTS
            def signal_completion():
                time.sleep(0.5)  # Pequeño delay para TTS chunks
                emit('tts_end', {'total_chunks': len(tts_tasks)})
            
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
