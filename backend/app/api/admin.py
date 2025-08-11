from flask import Blueprint, request, jsonify, current_app
from ..db import add_log, list_logs, get_settings, set_setting, list_messages, clear_messages
import requests

admin_bp = Blueprint('admin', __name__)

@admin_bp.get('/admin/status')
def status():
    cfg = current_app.config
    ok = True
    errs = []
    # quick key test: try list models (lightweight)
    key_ok = False
    try:
        if cfg.get('OPENAI_API_KEY'):
            r = requests.get(
                f"{cfg.get('OPENAI_BASE_URL','https://api.openai.com/v1')}/models",
                headers={'Authorization': f"Bearer {cfg.get('OPENAI_API_KEY')}"}, timeout=10
            )
            key_ok = (r.status_code < 400)
        else:
            errs.append('OPENAI_API_KEY missing')
    except Exception as e:
        errs.append(str(e))
    return jsonify({
        'status': 'ok' if ok else 'error',
        'ws': '/ws/assistant',
        'key_ok': key_ok,
        'errors': errs,
    })

@admin_bp.get('/admin/settings')
def get_all_settings():
    return jsonify(get_settings())

@admin_bp.post('/admin/settings')
def set_settings():
    body = request.get_json(silent=True) or {}
    for k, v in body.items():
        set_setting(str(k), str(v))
    return jsonify({'ok': True, 'settings': get_settings()})

@admin_bp.get('/admin/conversations')
def conversations():
    limit = int(request.args.get('limit', '100'))
    return jsonify(list_messages(limit))

@admin_bp.delete('/admin/conversations')
def conversations_clear():
    clear_messages()
    return jsonify({'ok': True})

@admin_bp.get('/admin/logs')
def logs():
    limit = int(request.args.get('limit', '200'))
    return jsonify(list_logs(limit))
