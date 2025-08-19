"""
Backend Application Factory - Única Fuente de Verdad
Arquitectura unificada para LLM Audio App con WebSocket consolidado
"""
import os
try:
    from gevent import monkey  # type: ignore
    monkey.patch_all()
except Exception:
    # If gevent is not present in some environments, continue gracefully
    pass
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from .config import Config
from .api import register_api


def create_app():
    """
    Factory para crear la aplicación Flask unificada.
    Única implementación WebSocket: websocket_unified.py
    """
    app = Flask(__name__)
    app.config.from_object(Config())

    # CORS (wide-open for dev)
    CORS(app, resources={r"/*": {"origins": app.config.get("CORS_ORIGINS", "*")}})

    # Register REST blueprints (legacy)
    from .api.stt import stt_bp
    from .api.chat import chat_bp
    from .api.tts import tts_bp

    app.register_blueprint(stt_bp, url_prefix="/api")
    app.register_blueprint(chat_bp, url_prefix="/api")
    app.register_blueprint(tts_bp, url_prefix="/api")

    # Register unified admin routes (consolidated, canonical)
    from .api.routes.admin import admin_bp
    app.register_blueprint(admin_bp)

    # Register new modular API (v2) under /api/v2
    register_api(app)

    # WebSocket (Flask-SocketIO) - UNIFIED IMPLEMENTATION ONLY
    socketio = SocketIO(app, cors_allowed_origins=app.config.get("CORS_ORIGINS", "*"))
    from .api.websocket_unified import init_unified
    init_unified(socketio)

    @app.get("/health")
    def health():
        return {"status": "ok", "ws": "/socket.io/", "version": "unified"}

    # Alias para health bajo /api para compatibilidad con proxy/scripts
    @app.get("/api/health")
    def health_api():
        return {"status": "ok", "ws": "/socket.io/", "version": "unified"}

    return app
