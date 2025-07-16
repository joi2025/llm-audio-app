from __future__ import annotations
import os, asyncio, io, torch
from typing import Literal
import structlog

# Inicializar logger
logger = structlog.get_logger(__name__)

# Configurar proveedor
_provider = os.getenv("TTS_PROVIDER", "edge")
if _provider == "coqui":
    from TTS.api import TTS as CoquiEngine

# Variables globales
_edge_voice = os.getenv("TTS_VOICE", "en-US-ChristopherNeural")
_rate = os.getenv("TTS_RATE", "0%")
_volume = os.getenv("TTS_VOLUME", "0%")
_provider = os.getenv("TTS_PROVIDER", "edge")

async def synthesize(text: str, voice: str | None = None) -> bytes:
    """
    Sintetiza texto a voz usando el proveedor configurado.
    
    Args:
        text: Texto a sintetizar
        voice: Voz opcional (usará la predeterminada si None)
        
    Returns:
        Bytes del audio sintetizado
        
    Raises:
        ValueError: Si el texto es demasiado largo
    """
    if len(text) > 3000:
        raise ValueError("Texto demasiado largo (máximo 3000 caracteres)")
    
    logger.info(
        "Sintetizando texto",
        provider=_provider,
        voice=voice or _edge_voice,
        length=len(text)
    )
    
    if _provider == "edge":
        communicate = edge_tts.Communicate(
            text,
            voice or _edge_voice,
            rate=_rate,
            volume=_volume
        )
        wav_bytes = await communicate.save(io.BytesIO())
        return wav_bytes.read()
    elif _provider == "coqui":
        engine = CoquiEngine(
            model_name="tts_models/en/ljspeech/tacotron2-DDC",
            gpu=torch.cuda.is_available()
        )
        wav = engine.tts(text)
        return wav.tobytes()
    else:
        raise ValueError(f"Proveedor no soportado: {_provider}")

async def list_voices() -> list[str]:
    """
    Lista las voces disponibles del proveedor configurado.
    
    Returns:
        Lista de nombres de voces disponibles
    """
    if _provider == "edge":
        return [v["Name"] for v in await edge_tts.list_voices()]
    elif _provider == "coqui":
        return ["ljspeech"]
    else:
        raise ValueError(f"Proveedor no soportado: {_provider}")

__all__ = ["synthesize", "list_voices"]
