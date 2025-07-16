import nats
from nats.errors import ConnectionClosedError
import os
from services.llm_orchestrator import LLMOrchestrator
import logging

logger = logging.getLogger(__name__)

class NATSConnection:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.conn = None
        return cls._instance

    async def connect(self):
        """Establece conexión con servidor NATS"""
        if self.conn is None:
            self.conn = await nats.connect(
                servers=[os.getenv("NATS_URL", "nats://localhost:4222")]
            )
        return self.conn

    async def publish(self, subject: str, message: bytes):
        """Publica mensaje en un topic NATS"""
        if self.conn is None:
            await self.connect()
        await self.conn.publish(subject, message)

async def setup_nats_subscriptions():
    """Configura suscripciones NATS para el flujo de mensajes"""
    conn = await nats_conn.connect()
    
    # STT → LLM
    await conn.subscribe(
        "stt.result", 
        cb=lambda msg: handle_stt_result(msg.data.decode())
    )
    
    # LLM → TTS (para implementar)
    await conn.subscribe(
        "llm.response",
        queue="tts_workers"
    )

async def handle_stt_result(text: str):
    """Procesa texto transcrito y lo envía al LLM"""
    try:
        orchestrator = LLMOrchestrator()
        await orchestrator.route_query(text)
    except Exception as e:
        logger.error(f"Error procesando STT result: {e}")

# Singleton global
nats_conn = NATSConnection()

