"""
Admin API Routes - Gestión completa del sistema
Arquitectura senior: APIs REST robustas para AdminPanel
"""
import os
import json
import requests
from flask import Blueprint, request, jsonify, current_app
from ..db import get_settings, set_setting, get_conversations, get_logs, clear_conversations

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/api/admin/status', methods=['GET'])
def get_status():
    """Estado completo del sistema"""
    try:
        # Verificar configuración OpenAI
        api_key = current_app.config.get('OPENAI_API_KEY', '')
        base_url = current_app.config.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        
        openai_configured = bool(api_key and api_key != 'sk-your-api-key-here' and api_key.startswith('sk-'))
        
        # Obtener configuraciones
        settings = get_settings()
        
        status = {
            'status': 'running',
            'timestamp': int(time.time()),
            'openai_configured': openai_configured,
            'openai_base_url': base_url,
            'api_key_preview': f"{api_key[:10]}..." if openai_configured else "No configurada",
            'settings': settings,
            'features': {
                'personalities': True,
                'auto_voice': True,
                'admin_panel': True,
                'spanish_optimized': True
            }
        }
        
        return jsonify(status)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/settings', methods=['GET'])
def get_settings_api():
    """Obtener configuraciones del sistema"""
    try:
        settings = get_settings()
        
        # Agregar configuraciones por defecto si no existen
        defaults = {
            'openai_api_key': current_app.config.get('OPENAI_API_KEY', ''),
            'openai_base_url': current_app.config.get('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
            'default_voice': 'nova',
            'default_model': 'gpt-4o-mini',
            'default_language': 'es',
            'temperature': 0.6,
            'max_tokens': 120,
            'presence_penalty': 0.1,
            'frequency_penalty': 0.1,
            'personalities_enabled': True,
            'auto_voice_enabled': True
        }
        
        # Combinar configuraciones existentes con defaults
        for key, default_value in defaults.items():
            if key not in settings:
                settings[key] = default_value
        
        return jsonify(settings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/settings', methods=['POST'])
def set_settings_api():
    """Actualizar configuraciones del sistema"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Actualizar configuraciones en la base de datos
        for key, value in data.items():
            set_setting(key, value)
        
        # Actualizar configuración de Flask para OpenAI
        if 'openai_api_key' in data:
            current_app.config['OPENAI_API_KEY'] = data['openai_api_key']
            # También actualizar variable de entorno para persistencia
            os.environ['OPENAI_API_KEY'] = data['openai_api_key']
        
        if 'openai_base_url' in data:
            current_app.config['OPENAI_BASE_URL'] = data['openai_base_url']
            os.environ['OPENAI_BASE_URL'] = data['openai_base_url']
        
        return jsonify({'success': True, 'message': 'Configuración actualizada correctamente'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/test-api-key', methods=['POST'])
def test_api_key():
    """Probar API Key de OpenAI"""
    try:
        data = request.get_json()
        api_key = data.get('api_key') if data else current_app.config.get('OPENAI_API_KEY', '')
        base_url = current_app.config.get('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        
        if not api_key or api_key == 'sk-your-api-key-here':
            return jsonify({'valid': False, 'error': 'API Key no configurada'})
        
        # Probar API Key con una llamada simple
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        # Usar endpoint de modelos para probar la key
        response = requests.get(f'{base_url}/models', headers=headers, timeout=10)
        
        if response.status_code == 200:
            models = response.json()
            return jsonify({
                'valid': True, 
                'message': 'API Key válida',
                'models_count': len(models.get('data', []))
            })
        else:
            return jsonify({
                'valid': False, 
                'error': f'Error HTTP {response.status_code}: {response.text}'
            })
            
    except requests.exceptions.Timeout:
        return jsonify({'valid': False, 'error': 'Timeout al conectar con OpenAI'})
    except requests.exceptions.RequestException as e:
        return jsonify({'valid': False, 'error': f'Error de conexión: {str(e)}'})
    except Exception as e:
        return jsonify({'valid': False, 'error': str(e)})

@admin_bp.route('/api/admin/conversations', methods=['GET'])
def get_conversations_api():
    """Obtener conversaciones"""
    try:
        limit = request.args.get('limit', 100, type=int)
        conversations = get_conversations(limit)
        return jsonify(conversations)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/conversations', methods=['DELETE'])
def clear_conversations_api():
    """Limpiar conversaciones"""
    try:
        clear_conversations()
        return jsonify({'success': True, 'message': 'Conversaciones eliminadas'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/logs', methods=['GET'])
def get_logs_api():
    """Obtener logs del sistema"""
    try:
        limit = request.args.get('limit', 200, type=int)
        logs = get_logs(limit)
        return jsonify(logs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/system/restart', methods=['POST'])
def restart_system():
    """Reiniciar configuración del sistema"""
    try:
        # Recargar configuración desde .env
        from dotenv import load_dotenv
        load_dotenv(override=True)
        
        current_app.config['OPENAI_API_KEY'] = os.getenv('OPENAI_API_KEY', '')
        current_app.config['OPENAI_BASE_URL'] = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        
        return jsonify({'success': True, 'message': 'Sistema reiniciado'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Importar time al inicio del archivo
import time
