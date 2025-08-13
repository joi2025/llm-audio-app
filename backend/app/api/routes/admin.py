from flask import Blueprint, request, current_app, jsonify
from ...db import get_settings, set_setting, get_conversations, get_logs, clear_conversations
from ..models.responses import ok, error
from ..middleware.validation import require_json, expect_fields
from ..middleware.auth import optional_api_key
from ..services.openai_service import test_openai_key

admin_v2_bp = Blueprint('admin_v2', __name__)

@admin_v2_bp.get('/admin/status')
@optional_api_key
def status_v2():
    try:
        settings = get_settings() or {}
        api_key = current_app.config.get('OPENAI_API_KEY', '')
        base_url = current_app.config.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        valid, info = test_openai_key(api_key, base_url)
        data = {
            'status': 'running',
            'openai': { 'configured': bool(api_key), 'valid': valid, 'base_url': base_url },
            'settings': settings,
        }
        if not valid and info:
            data['openai']['reason'] = info
        return ok(data)[0]
    except Exception as e:
        return error(str(e), code='status_error', status=500)

@admin_v2_bp.get('/admin/settings')
def get_settings_v2():
    try:
        return ok(get_settings() or {})[0]
    except Exception as e:
        return error(str(e), code='settings_get_error', status=500)

@admin_v2_bp.post('/admin/settings')
@require_json
@expect_fields({})
def set_settings_v2():
    try:
        data = request.get_json() or {}
        for k, v in data.items():
            set_setting(str(k), str(v))
            # reflect in current_app for live usage where relevant
            if k == 'openai_api_key':
                current_app.config['OPENAI_API_KEY'] = v
            if k == 'openai_base_url':
                current_app.config['OPENAI_BASE_URL'] = v
        return ok({'settings': get_settings()})[0]
    except Exception as e:
        return error(str(e), code='settings_set_error', status=500)

@admin_v2_bp.post('/admin/test-api-key')
@require_json
def test_api_key_v2():
    payload = request.get_json() or {}
    provided = payload.get('api_key')
    base_url = current_app.config.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
    key = provided or current_app.config.get('OPENAI_API_KEY', '')
    valid, info = test_openai_key(key, base_url)
    if valid:
        return ok({'valid': True, 'info': info})[0]
    return error(info or 'invalid key', code='invalid_api_key', status=200)[0]

@admin_v2_bp.get('/admin/conversations')
def get_conversations_v2():
    try:
        limit = request.args.get('limit', 100, type=int)
        return ok(get_conversations(limit))[0]
    except Exception as e:
        return error(str(e), code='conversations_get_error', status=500)

@admin_v2_bp.delete('/admin/conversations')
def clear_conversations_v2():
    try:
        clear_conversations()
        return ok({'cleared': True})[0]
    except Exception as e:
        return error(str(e), code='conversations_clear_error', status=500)

@admin_v2_bp.get('/admin/logs')
def get_logs_v2():
    try:
        limit = request.args.get('limit', 200, type=int)
        return ok(get_logs(limit))[0]
    except Exception as e:
        return error(str(e), code='logs_get_error', status=500)
