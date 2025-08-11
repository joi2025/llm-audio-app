import base64
import requests
from flask import Blueprint, request, jsonify, current_app, Response

tts_bp = Blueprint('tts', __name__)


def _headers(api_key):
    return {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }


@tts_bp.post('/tts')
def tts_speak():
    cfg = current_app.config
    api_key = cfg.get('OPENAI_API_KEY', '')
    base_url = cfg.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
    model = cfg.get('TTS_MODEL', 'gpt-4o-mini-tts')
    voice = cfg.get('TTS_VOICE', 'alloy')

    if not api_key:
        return jsonify({'error': 'OPENAI_API_KEY not configured'}), 400

    body = request.get_json(silent=True) or {}
    text = body.get('text')
    if not text:
        return jsonify({'error': 'Provide text'}), 400

    url = f"{base_url}/audio/speech"
    payload = {
        'model': model,
        'voice': voice,
        'input': text,
        'format': 'mp3',
    }

    resp = requests.post(url, headers=_headers(api_key), json=payload, timeout=120)
    if resp.status_code >= 400:
        return jsonify({'error': 'openai_tts_failed', 'status': resp.status_code, 'body': _safe_text(resp)}), 502

    # The TTS API returns audio bytes
    audio_bytes = resp.content
    return Response(audio_bytes, mimetype='audio/mpeg')


def _safe_text(r):
    try:
        return r.text
    except Exception:
        return '<unreadable>'
