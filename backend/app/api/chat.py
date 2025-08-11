import requests
from flask import Blueprint, request, jsonify, current_app

chat_bp = Blueprint('chat', __name__)


def _headers(api_key):
    return {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }


@chat_bp.post('/chat')
def chat_completion():
    cfg = current_app.config
    api_key = cfg.get('OPENAI_API_KEY', '')
    base_url = cfg.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
    model = cfg.get('CHAT_MODEL', 'gpt-4o-mini')

    if not api_key:
        return jsonify({'error': 'OPENAI_API_KEY not configured'}), 400

    body = request.get_json(silent=True) or {}
    text = body.get('text')
    messages = body.get('messages')

    if not messages and text:
        messages = [
            { 'role': 'system', 'content': 'You are a helpful voice assistant.' },
            { 'role': 'user', 'content': text }
        ]

    if not isinstance(messages, list) or not messages:
        return jsonify({'error': 'Provide text or messages[]'}), 400

    url = f"{base_url}/chat/completions"
    payload = {
        'model': model,
        'messages': messages,
        'temperature': 0.6,
    }

    resp = requests.post(url, headers=_headers(api_key), json=payload, timeout=90)
    if resp.status_code >= 400:
        return jsonify({ 'error': 'openai_chat_failed', 'status': resp.status_code, 'body': _safe_text(resp) }), 502

    data = resp.json()
    text_out = data.get('choices', [{}])[0].get('message', {}).get('content', '')
    return jsonify({ 'text': text_out })


def _safe_text(r):
    try:
        return r.text
    except Exception:
        return '<unreadable>'
