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
    app = Flask(__name__)
    app.config.from_object(Config())

    # CORS (wide-open for dev)
    CORS(app, resources={r"/*": {"origins": app.config.get("CORS_ORIGINS", "*")}})

    # Register REST blueprints
    from .api.stt import stt_bp
    from .api.chat import chat_bp
    from .api.tts import tts_bp
    from .api.admin import admin_bp

    app.register_blueprint(stt_bp, url_prefix="/api")
    app.register_blueprint(chat_bp, url_prefix="/api")
    app.register_blueprint(tts_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api")

    # Register new modular API (v2) under /api/v2
    register_api(app)

    # WebSocket (Flask-SocketIO)
    socketio = SocketIO(app, cors_allowed_origins=app.config.get("CORS_ORIGINS", "*"))
    from .api.websocket_socketio import init_socketio
    init_socketio(socketio)

    @app.get("/health")
    def health():
        return {"status": "ok", "ws": "/ws/assistant"}

    # Alias para health bajo /api para compatibilidad con proxy/scripts
    @app.get("/api/health")
    def health_api():
        return {"status": "ok", "ws": "/ws/assistant"}

    return app
