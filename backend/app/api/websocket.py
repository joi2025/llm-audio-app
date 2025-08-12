import base64
import json
import time
import requests
import io
from typing import List
from flask import current_app
from ..db import add_message, add_log, get_settings

def init_ws(sock):
    @sock.route('/ws/assistant')
    def ws_handler(ws):
        """Simplified WebSocket handler for voice AI"""
        cfg = current_app.config
        api_key = cfg.get('OPENAI_API_KEY', '')
        base_url = cfg.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        
        audio_chunks: List[bytes] = []
        last_ping = time.time()
        settings = get_settings()
        last_meta = {}
        chunk_count = 0
        session_id = f"ws_{int(time.time() * 1000)}"
        
        print(f"🔗 New voice session: {session_id}")
        
        # Helper functions for OpenAI API
        def _stt_openai(base_url, api_key, audio_bytes):
            try:
                files = {'file': ('audio.webm', io.BytesIO(audio_bytes), 'audio/webm')}
                data = {'model': 'whisper-1'}
                headers = {'Authorization': f'Bearer {api_key}'}
                resp = requests.post(f'{base_url}/audio/transcriptions', files=files, data=data, headers=headers, timeout=30)
                return resp.json().get('text', '') if resp.status_code == 200 else ''
            except Exception as e:
                print(f"STT Error: {e}")
                return ''
        
        def _chat_openai(base_url, api_key, model, prompt):
            try:
                headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
                data = {
                    'model': model,
                    'messages': [{'role': 'user', 'content': prompt}],
                    'max_tokens': 150,
                    'temperature': 0.7
                }
                resp = requests.post(f'{base_url}/chat/completions', json=data, headers=headers, timeout=30)
                return resp.json()['choices'][0]['message']['content'] if resp.status_code == 200 else ''
            except Exception as e:
                print(f"Chat Error: {e}")
                return ''
        
        def _tts_openai(base_url, api_key, model, voice, text):
            try:
                headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
                data = {'model': model, 'input': text, 'voice': voice}
                resp = requests.post(f'{base_url}/audio/speech', json=data, headers=headers, timeout=30)
                return resp.content if resp.status_code == 200 else b''
            except Exception as e:
                print(f"TTS Error: {e}")
                return b''

        def send(obj: dict) -> bool:
            """Send message with error handling"""
            try:
                message = json.dumps(obj, ensure_ascii=False)
                ws.send(message)
                if obj.get('type') not in ['pong', 'ping']:
                    print(f"📤 {session_id}: {obj.get('type', 'unknown')}")
                return True
            except Exception as e:
                print(f"❌ {session_id}: Send failed - {e}")
                return False

        send({ 'type': 'hello', 'message': 'ws connected', 'ts': int(time.time()) })

        while True:
            try:
                raw = ws.receive()
                if raw is None:
                    break
                try:
                    msg = json.loads(raw)
                except Exception:
                    # forward plain text
                    send({ 'type': 'echo', 'text': str(raw) })
                    continue

                mtype = msg.get('type')
                if isinstance(msg.get('meta'), dict):
                    last_meta = msg.get('meta') or last_meta

                if mtype == 'ping':
                    last_ping = time.time()
                    send({ 'type': 'pong', 't': last_ping })
                    continue

                if mtype == 'audio_chunk':
                    # Expect base64 of raw bytes
                    b64 = msg.get('data')
                    if b64:
                        try:
                            decoded = base64.b64decode(b64)
                            audio_chunks.append(decoded)
                            chunk_count += 1
                            try:
                                add_log('info', f'audio_chunk: {len(decoded)} bytes (total_chunks={chunk_count})')
                            except Exception:
                                pass
                        except Exception:
                            send({ 'type': 'error', 'message': 'invalid audio chunk: bad base64' })
                    continue

                if mtype == 'audio_end':
                    # Build a single WebM/Opus file by concatenation
                    audio_bytes = b''.join(audio_chunks)
                    total_bytes = len(audio_bytes)
                    audio_chunks.clear()
                    try:
                        add_log('info', f'audio_end: chunks={chunk_count}, bytes={total_bytes}, meta={last_meta}')
                    except Exception:
                        pass
                    chunk_count = 0

                    if not audio_bytes:
                        send({ 'type': 'result', 'transcription': '', 'message': 'no audio received' })
                        continue

                    # Processing pipeline
                    if not api_key:
                        print(f" {session_id}: No API key - {total_bytes} bytes received")
                        add_message('assistant', 'Audio recibido - configurar OPENAI_API_KEY')
                        send({'type': 'result_stt', 'transcription': '[Configurar API key]', 'from': 'user'})
                        send({'type': 'result_llm', 'transcription': 'Configurar OPENAI_API_KEY en backend/.env para funcionalidad completa.', 'from': 'assistant'})
                        send({'type': 'tts_end'})
                        continue

                    # STT Processing
                    text = ''
                    stt_start = time.time()
                    try:
                        stt_resp = _stt_openai(base_url, api_key, audio_bytes)
                        text = stt_resp.strip() if stt_resp else ''
                        stt_time = time.time() - stt_start
                        
                        if text:
                            send({'type': 'result_stt', 'transcription': text, 'from': 'user'})
                            add_message('user', text, tokens_in=len(text.split()))
                            print(f" {session_id}: STT ({stt_time:.2f}s) - '{text[:50]}{'...' if len(text)>50 else ''}'")
                        else:
                            send({'type': 'error', 'stage': 'stt', 'message': 'No speech detected'})
                            continue
                            
                    except Exception as e:
                        print(f" {session_id}: STT failed - {e}")
                        send({'type': 'error', 'stage': 'stt', 'message': f'Speech recognition failed: {str(e)}'})
                        continue

                    # LLM Processing
                    reply = ''
                    if text:
                        llm_start = time.time()
                        try:
                            model = cfg.get('CHAT_MODEL', 'gpt-4o-mini')
                            
                            # Smart prompt for voice
                            pref_short = bool(last_meta.get('prefer_short_answer'))
                            if pref_short:
                                prompt = f"{text}\n\n[Responde de forma concisa y natural para conversación de voz]"
                            else:
                                prompt = text
                                
                            reply = _chat_openai(base_url, api_key, model, prompt)
                            llm_time = time.time() - llm_start
                            
                            if reply:
                                reply = reply.strip()
                                send({'type': 'result_llm', 'transcription': reply, 'from': 'assistant'})
                                
                                # Simple token estimation
                                t_in = len(text.split())
                                t_out = len(reply.split())
                                add_message('assistant', reply, tokens_in=t_in, tokens_out=t_out, cost=0.001)
                                
                                print(f" {session_id}: LLM ({llm_time:.2f}s) {model} - '{reply[:50]}{'...' if len(reply)>50 else ''}'")
                            else:
                                send({'type': 'error', 'stage': 'chat', 'message': 'Empty response from AI'})
                                continue
                                
                        except Exception as e:
                            print(f" {session_id}: LLM failed - {e}")
                            send({'type': 'error', 'stage': 'chat', 'message': f'AI processing failed: {str(e)}'})
                            continue

                    # TTS Processing
                    if reply:
                        tts_start = time.time()
                        try:
                            voice_name = cfg.get('TTS_VOICE', 'alloy')
                            tts_model = cfg.get('TTS_MODEL', 'tts-1')
                            audio_mp3 = _tts_openai(base_url, api_key, tts_model, voice_name, reply)
                            tts_time = time.time() - tts_start
                            
                            if audio_mp3:
                                b64 = base64.b64encode(audio_mp3).decode('ascii')
                                send({'type': 'audio', 'audio': b64})
                                send({'type': 'tts_end'})
                                
                                print(f" {session_id}: TTS ({tts_time:.2f}s) {tts_model}/{voice_name} - {len(audio_mp3)} bytes")
                            else:
                                send({'type': 'error', 'stage': 'tts', 'message': 'TTS generation failed'})
                                
                        except Exception as e:
                            print(f" {session_id}: TTS failed - {e}")
                            send({'type': 'error', 'stage': 'tts', 'message': f'Voice synthesis failed: {str(e)}'})
                    
                    print(f" {session_id}: Complete pipeline finished")
                    continue

                if mtype == 'user_text':
                    text = (msg.get('text') or '').strip()
                    if not text:
                        continue

                    if not api_key:
                        add_message('user', text)
                        add_message('assistant', f'Echo: {text}')
                        send({ 'type': 'result', 'transcription': f'Echo: {text}', 'from': 'assistant' })
                        continue

                    # Chat + TTS
                    try:
                        add_message('user', text, tokens_in=len(text.split()))
                        model = cfg.get('CHAT_MODEL', 'gpt-4o-mini')
                        reply = _chat_openai(base_url, api_key, model, text)
                        send({ 'type': 'result_llm', 'transcription': reply, 'from': 'assistant' })
                        t_in = len(text.split())
                        t_out = len(reply.split())
                        add_message('assistant', reply, tokens_in=t_in, tokens_out=t_out, cost=0.001)

                        voice_name = cfg.get('TTS_VOICE', 'alloy')
                        tts_model = cfg.get('TTS_MODEL', 'tts-1')
                        audio_mp3 = _tts_openai(base_url, api_key, tts_model, voice_name, reply)
                        b64 = base64.b64encode(audio_mp3).decode('ascii')
                        send({ 'type': 'audio', 'audio': b64 })
                        send({ 'type': 'tts_end' })
                    except Exception as e:
                        send({ 'type': 'error', 'stage': 'chat_tts', 'message': str(e) })
                    continue

                # Unknown type
                send({ 'type': 'notice', 'message': f'unknown type: {mtype}' })
            except Exception:
                break


def _stt_openai(base_url: str, api_key: str, audio_bytes: bytes) -> str:
    import requests
    headers = { 'Authorization': f'Bearer {api_key}' }
    files = {
        'file': ('audio.webm', io.BytesIO(audio_bytes), 'audio/webm'),
    }
    data = {
        'model': 'whisper-1',
        'response_format': 'json',
    }
    url = f'{base_url}/audio/transcriptions'
    r = requests.post(url, headers=headers, files=files, data=data, timeout=120)
    r.raise_for_status()
    js = r.json()
    return js.get('text') or ''


def _chat_openai(base_url: str, api_key: str, model: str, text: str) -> str:
    import requests
    headers = { 'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json' }
    payload = {
        'model': model,
        'messages': [
            { 'role': 'system', 'content': 'You are a helpful voice assistant.' },
            { 'role': 'user', 'content': text },
        ]
    }
    url = f'{base_url}/chat/completions'
    r = requests.post(url, headers=headers, json=payload, timeout=120)
    r.raise_for_status()
    js = r.json()
    return js.get('choices', [{}])[0].get('message', {}).get('content', '')


def _tts_openai(base_url: str, api_key: str, model: str, voice: str, text: str) -> bytes:
    import requests
    headers = { 'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json' }
    payload = {
        'model': model,
        'voice': voice,
        'input': text,
        'format': 'mp3',
    }
    url = f'{base_url}/audio/speech'
    r = requests.post(url, headers=headers, json=payload, timeout=120)
    r.raise_for_status()
    return r.content


def _load_settings():
    # Defaults
    s = {
        'tier': 'medium',  # low, medium_low, medium, medium_high, high
        'voice_name': 'alloy',
        'voice_gender': 'female',
        'voice_style': 'friendly',
        'voice_mood': 'warm',
        'max_tokens_in': '2048',
        'max_tokens_out': '512',
    }
    try:
        dbs = get_settings()
        s.update(dbs)
    except Exception:
        pass
    return s


def _select_chat_model(cfg, settings):
    tier = (settings.get('tier') or 'medium').lower()
    # Map tiers to models (adjust as desired)
    mapping = {
        'low': 'gpt-4o-mini',
        'medium_low': 'gpt-4o-mini',
        'medium': cfg.get('CHAT_MODEL', 'gpt-4o-mini'),
        'medium_high': 'gpt-4o',
        'high': 'gpt-4o',
    }
    return mapping.get(tier, cfg.get('CHAT_MODEL', 'gpt-4o-mini'))


def _select_tts(cfg, settings):
    # Choose voice and model by tier/params
    tier = (settings.get('tier') or 'medium').lower()
    voice = settings.get('voice_name') or cfg.get('TTS_VOICE', 'alloy')
    tts_model = cfg.get('TTS_MODEL', 'gpt-4o-mini-tts')
    if tier in ('medium_high', 'high'):
        tts_model = 'gpt-4o-realtime-preview-tts' if 'realtime' in cfg.get('TTS_MODEL','') else cfg.get('TTS_MODEL', 'gpt-4o-mini-tts')
    return voice, tts_model


def _approx_tokens(text: str) -> int:
    # rough approximation 1 token ~ 4 chars
    return max(1, int(len(text) / 4))


def _estimate_cost(settings, tokens_in: int, tokens_out: int) -> float:
    tier = (settings.get('tier') or 'medium').lower()
    # fictitious prices per 1K tokens for demo; adjust to real pricing as needed
    price_map = {
        'low': (0.05, 0.1),
        'medium_low': (0.08, 0.16),
        'medium': (0.15, 0.6),
        'medium_high': (0.3, 1.2),
        'high': (0.6, 2.4),
    }
    pin, pout = price_map.get(tier, price_map['medium'])
    return round((tokens_in/1000.0)*pin + (tokens_out/1000.0)*pout, 6)
