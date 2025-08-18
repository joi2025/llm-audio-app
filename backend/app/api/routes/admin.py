"""Admin Routes - Única Fuente de Verdad para Administración
Consolidación de todas las rutas de administración con helpers estandarizados.
Arquitectura unificada para el AdminPanel con respuestas ok() y error().
"""
import os
import json
import time
import requests
from flask import Blueprint, request, current_app, jsonify
from ...db import get_settings, set_setting, get_conversations, get_logs, clear_conversations

# Helpers estandarizados para respuestas consistentes
def ok(data=None, message="Success"):
    """Helper para respuestas exitosas estandarizadas"""
    response = {"status": "ok", "message": message}
    if data is not None:
        response["data"] = data
    return jsonify(response), 200

def error(message, code="error", status=400):
    """Helper para respuestas de error estandarizadas"""
    return jsonify({
        "status": "error",
        "message": message,
        "code": code
    }), status

# Blueprint unificado para administración
admin_bp = Blueprint('admin_unified', __name__)

@admin_bp.route('/api/admin/status', methods=['GET'])
def get_status():
    """Estado completo del sistema - Única implementación"""
    try:
        # Verificar configuración OpenAI
        api_key = current_app.config.get('OPENAI_API_KEY', '')
        base_url = current_app.config.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        
        openai_configured = bool(api_key and api_key != 'sk-your-api-key-here' and api_key.startswith('sk-'))
        
        # Test API key validity
        openai_valid = False
        openai_reason = None
        if openai_configured:
            try:
                response = requests.get(
                    f"{base_url}/models",
                    headers={'Authorization': f"Bearer {api_key}"},
                    timeout=10
                )
                openai_valid = response.status_code < 400
                if not openai_valid:
                    openai_reason = f"API Error: {response.status_code}"
            except Exception as e:
                openai_reason = str(e)
        
        # Obtener configuraciones
        settings = get_settings() or {}
        
        data = {
            'status': 'running',
            'timestamp': int(time.time()),
            'version': 'unified',
            'websocket': '/socket.io/',
            'openai': {
                'configured': openai_configured,
                'valid': openai_valid,
                'base_url': base_url,
                'api_key_preview': f"{api_key[:10]}..." if openai_configured else "No configurada",
                'reason': openai_reason
            },
            'settings': settings,
            'features': {
                'personalities': True,
                'auto_voice': True,
                'admin_panel': True,
                'spanish_optimized': True,
                'unified_websocket': True
            }
        }
        
        return ok(data)
    except Exception as e:
        return error(f"Error getting system status: {str(e)}", code='status_error', status=500)

@admin_bp.route('/api/admin/settings', methods=['GET'])
def get_settings_api():
    """Obtener configuraciones del sistema - Única implementación"""
    try:
        settings = get_settings() or {}
        return ok(settings, "Settings retrieved successfully")
    except Exception as e:
        return error(f"Error retrieving settings: {str(e)}", code='settings_get_error', status=500)

@admin_bp.route('/api/admin/settings', methods=['POST'])
def set_settings_api():
    """Actualizar configuraciones del sistema - Única implementación"""
    try:
        data = request.get_json()
        if not data:
            return error("No data provided", code='no_data', status=400)
        
        # Actualizar configuraciones
        for key, value in data.items():
            set_setting(str(key), str(value))
            
            # Reflejar cambios críticos en current_app para uso en vivo
            if key == 'openai_api_key':
                current_app.config['OPENAI_API_KEY'] = value
            elif key == 'openai_base_url':
                current_app.config['OPENAI_BASE_URL'] = value
        
        updated_settings = get_settings()
        return ok(updated_settings, "Settings updated successfully")
    except Exception as e:
        return error(f"Error updating settings: {str(e)}", code='settings_update_error', status=500)

@admin_bp.route('/api/admin/test-api-key', methods=['POST'])
def test_api_key():
    """Probar API Key de OpenAI - Única implementación"""
    try:
        data = request.get_json() or {}
        api_key = data.get('api_key') or current_app.config.get('OPENAI_API_KEY', '')
        base_url = current_app.config.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        
        if not api_key:
            return error("No API key provided", code='no_api_key', status=400)
        
        # Test API key with OpenAI
        try:
            response = requests.get(
                f"{base_url}/models",
                headers={'Authorization': f"Bearer {api_key}"},
                timeout=10
            )
            
            if response.status_code == 200:
                models = response.json().get('data', [])
                return ok({
                    'valid': True,
                    'models_count': len(models),
                    'base_url': base_url
                }, "API key is valid")
            else:
                return error(f"API key test failed: {response.status_code}", code='invalid_api_key', status=200)
                
        except requests.exceptions.RequestException as e:
            return error(f"Connection error: {str(e)}", code='connection_error', status=200)
            
    except Exception as e:
        return error(f"Error testing API key: {str(e)}", code='test_error', status=500)

@admin_bp.route('/api/admin/conversations', methods=['GET'])
def get_conversations_api():
    """Obtener conversaciones - Única implementación"""
    try:
        limit = request.args.get('limit', 100, type=int)
        conversations = get_conversations(limit) or []
        return ok(conversations, f"Retrieved {len(conversations)} conversations")
    except Exception as e:
        return error(f"Error retrieving conversations: {str(e)}", code='conversations_get_error', status=500)

@admin_bp.route('/api/admin/conversations', methods=['DELETE'])
def clear_conversations_api():
    """Limpiar conversaciones - Única implementación"""
    try:
        clear_conversations()
        return ok({'cleared': True}, "Conversations cleared successfully")
    except Exception as e:
        return error(f"Error clearing conversations: {str(e)}", code='conversations_clear_error', status=500)

@admin_bp.route('/api/admin/logs', methods=['GET'])
def get_logs_api():
    """Obtener logs del sistema - Única implementación"""
    try:
        limit = request.args.get('limit', 200, type=int)
        logs = get_logs(limit) or []
        return ok(logs, f"Retrieved {len(logs)} log entries")
    except Exception as e:
        return error(f"Error retrieving logs: {str(e)}", code='logs_get_error', status=500)

@admin_bp.route('/api/admin/restart', methods=['POST'])
def restart_system():
    """Reiniciar configuración del sistema - Única implementación"""
    try:
        # Recargar configuraciones desde variables de entorno
        current_app.config['OPENAI_API_KEY'] = os.getenv('OPENAI_API_KEY', '')
        current_app.config['OPENAI_BASE_URL'] = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        
        return ok({
            'restarted': True,
            'timestamp': int(time.time())
        }, "System configuration restarted successfully")
    except Exception as e:
        return error(f"Error restarting system: {str(e)}", code='restart_error', status=500)

@admin_bp.route('/api/admin/system/restart', methods=['POST'])
def restart_system_compat():
    """Compat alias for legacy path used by frontend AdminAPI.restart()"""
    return restart_system()
