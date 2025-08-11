import io
import os
import json
import base64
import requests
from flask import Blueprint, request, jsonify, current_app

stt_bp = Blueprint('stt', __name__)


def _openai_headers(api_key: str):
    return {
        'Authorization': f'Bearer {api_key}',
    }


@stt_bp.post('/stt')
def stt_transcribe():
    cfg = current_app.config
    api_key = cfg.get('OPENAI_API_KEY', '')
    base_url = cfg.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
    model = cfg.get('STT_MODEL', 'whisper-1')

    if not api_key:
        return jsonify({'error': 'OPENAI_API_KEY not configured'}), 400

    audio_file = None
    filename = 'audio.webm'
    content_type = 'audio/webm'

    if 'audio' in request.files:
        audio_file = request.files['audio']
        filename = getattr(audio_file, 'filename', filename) or filename
        content_type = getattr(audio_file, 'content_type', content_type) or content_type
        data = audio_file.read()
    else:
        # Optional JSON base64 support: {"audio_b64": "...", "mime": "audio/webm"}
        payload = request.get_json(silent=True) or {}
        b64 = payload.get('audio_b64')
        if not b64:
            return jsonify({'error': 'no audio provided (use multipart field "audio" or JSON {audio_b64})'}), 400
        try:
            data = base64.b64decode(b64)
        except Exception:
            return jsonify({'error': 'invalid base64 audio'}), 400
        content_type = payload.get('mime', content_type)

    files = {
        'file': (filename, io.BytesIO(data), content_type),
    }
    form = {
        'model': model,
        'response_format': 'json',
    }

    url = f'{base_url}/audio/transcriptions'
    resp = requests.post(url, headers=_openai_headers(api_key), files=files, data=form, timeout=90)
    if resp.status_code >= 400:
        return jsonify({'error': 'openai_stt_failed', 'status': resp.status_code, 'body': safe_text(resp)}), 502

    out = resp.json()
    text = out.get('text') or ''
    return jsonify({'text': text})


def safe_text(r):
    try:
        return r.text
    except Exception:
        return '<unreadable>'
