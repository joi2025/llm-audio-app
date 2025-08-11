import os
from flask import Flask
from flask_cors import CORS
from flask_sock import Sock
from .config import Config


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

    # WebSocket
    sock = Sock(app)
    from .api.websocket import init_ws
    init_ws(sock)

    @app.get("/health")
    def health():
        return {"status": "ok", "ws": "/ws/assistant"}

    return app
