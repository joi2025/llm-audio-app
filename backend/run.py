import os
import sys
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from app.api.websocket_unified import init_unified
from app.api.admin_routes import admin_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object('app.config')
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    app.config['OPENAI_API_KEY'] = os.getenv('OPENAI_API_KEY', '')
    app.config['OPENAI_BASE_URL'] = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')
    
    CORS(app, origins="*")
    
    # Register API routes
    app.register_blueprint(admin_bp)
    
    return app

if __name__ == '__main__':
    app = create_app()
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
    
    # Initialize WebSocket handlers
    init_unified(socketio)
    
    port = int(os.getenv('PORT', 8001))
    
    print(f" Starting voice assistant backend on port {port}...")
    print(f" WebSocket endpoint: ws://localhost:{port}/socket.io/")
    print(f" Backend ready on http://localhost:{port}")
    
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
