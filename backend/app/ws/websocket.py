from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from typing import Dict
import logging

logger = logging.getLogger("websocket")

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"WebSocket connected: {user_id}")

    def disconnect(self, user_id: str):
        ws = self.active_connections.pop(user_id, None)
        if ws and ws.application_state != WebSocketState.DISCONNECTED:
            logger.info(f"WebSocket disconnected: {user_id}")

    async def send_personal_message(self, message: str, user_id: str):
        ws = self.active_connections.get(user_id)
        if ws:
            await ws.send_text(message)

    async def broadcast(self, message: str):
        for ws in self.active_connections.values():
            await ws.send_text(message)

manager = ConnectionManager()

