import base64
import io
import json
import time
from typing import List

import requests
from flask import current_app
from ..db import add_message, add_log, get_settings


def init_ws(sock):
    @sock.route('/ws/assistant')
    def ws_handler(ws):
        cfg = current_app.config
        api_key = cfg.get('OPENAI_API_KEY', '')
        base_url = cfg.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        port = cfg.get('PORT', 8001)

        audio_chunks: List[bytes] = []
        last_ping = time.time()
        settings = _load_settings()

        def send(obj):
            try:
                ws.send(json.dumps(obj))
            except Exception:
                pass

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

                if mtype == 'ping':
                    last_ping = time.time()
                    send({ 'type': 'pong', 't': last_ping })
                    continue

                if mtype == 'audio_chunk':
                    # Expect base64 of raw bytes
                    b64 = msg.get('data')
                    if b64:
                        try:
                            audio_chunks.append(base64.b64decode(b64))
                        except Exception:
                            send({ 'type': 'error', 'message': 'invalid audio chunk' })
                    continue

                if mtype == 'audio_end':
                    # Build a single WebM/Opus file by concatenation
                    audio_bytes = b''.join(audio_chunks)
                    audio_chunks.clear()

                    if not audio_bytes:
                        send({ 'type': 'result', 'transcription': '', 'message': 'no audio received' })
                        continue

                    # Try STT + Chat + TTS if API key present, otherwise fallback
                    if not api_key:
                        add_message('assistant', 'Audio recibido')
                        send({ 'type': 'result', 'transcription': 'Audio recibido', 'from': 'assistant' })
                        continue

                    # STT
                    text = ''
                    try:
                        stt_resp = _stt_openai(base_url, api_key, audio_bytes)
                        text = stt_resp or ''
                        send({ 'type': 'result_stt', 'transcription': text, 'from': 'user' })
                        if text:
                            add_message('user', text, tokens_in=_approx_tokens(text))
                    except Exception as e:
                        send({ 'type': 'error', 'stage': 'stt', 'message': str(e) })

                    # CHAT
                    reply = ''
                    if text:
                        try:
                            model = _select_chat_model(cfg, settings)
                            reply = _chat_openai(base_url, api_key, model, text)
                            send({ 'type': 'result_llm', 'transcription': reply, 'from': 'assistant' })
                            if reply:
                                t_in = _approx_tokens(text)
                                t_out = _approx_tokens(reply)
                                cost = _estimate_cost(settings, t_in, t_out)
                                add_message('assistant', reply, tokens_in=t_in, tokens_out=t_out, cost=cost)
                        except Exception as e:
                            send({ 'type': 'error', 'stage': 'chat', 'message': str(e) })

                    # TTS
                    if reply:
                        try:
                            voice_name, tts_model = _select_tts(cfg, settings)
                            audio_mp3 = _tts_openai(base_url, api_key, tts_model, voice_name, reply)
                            b64 = base64.b64encode(audio_mp3).decode('ascii')
                            send({ 'type': 'audio', 'audio': b64 })
                        except Exception as e:
                            send({ 'type': 'error', 'stage': 'tts', 'message': str(e) })
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
                        add_message('user', text, tokens_in=_approx_tokens(text))
                        model = _select_chat_model(cfg, settings)
                        reply = _chat_openai(base_url, api_key, model, text)
                        send({ 'type': 'result_llm', 'transcription': reply, 'from': 'assistant' })
                        t_in = _approx_tokens(text)
                        t_out = _approx_tokens(reply)
                        cost = _estimate_cost(settings, t_in, t_out)
                        add_message('assistant', reply, tokens_in=t_in, tokens_out=t_out, cost=cost)

                        voice_name, tts_model = _select_tts(cfg, settings)
                        audio_mp3 = _tts_openai(base_url, api_key, tts_model, voice_name, reply)
                        b64 = base64.b64encode(audio_mp3).decode('ascii')
                        send({ 'type': 'audio', 'audio': b64 })
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
