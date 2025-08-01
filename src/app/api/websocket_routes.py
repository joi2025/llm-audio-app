from fastapi import WebSocket, WebSocketDisconnect, Depends
from fastapi.routing import APIRouter
from typing import Dict, Optional
import uuid
import logging
from app.services.websocket_manager import WebSocketConnectionManager, WebSocketHandler

logger = logging.getLogger(__name__)

router = APIRouter()
manager = WebSocketConnectionManager()
handler = WebSocketHandler(manager)

@router.websocket("/ws/assistant")
async def websocket_endpoint(websocket: WebSocket):
    client_id = str(uuid.uuid4())
    
    try:
        await manager.connect(websocket, client_id)
        logger.info(f"Client connected: {client_id}")
        
        while True:
            data = await websocket.receive_json()
            logger.debug(f"Received message from {client_id}: {data}")
            
            # Procesar el mensaje con el manejador
            await handler.handle_message(client_id, data)
            
    except WebSocketDisconnect:
        logger.info(f"Client disconnected: {client_id}")
        manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        manager.disconnect(client_id)
        await websocket.close()
