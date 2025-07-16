from __future__ import annotations
import os, tempfile, sounddevice as sd, soundfile as sf, numpy as np, structlog
from pathlib import Path
from typing import Tuple
import io
from pydub import AudioSegment

logger = structlog.get_logger(__name__)

async def record(duration: float, sample_rate: int = 16000) -> bytes:
    """
    Graba audio durante una duración específica.
    
    Args:
        duration: Duración en segundos
        sample_rate: Tasa de muestreo (default: 16000)
        
    Returns:
        Bytes del audio grabado en formato WAV
    """
    logger.info("Starting audio recording", duration=duration, sample_rate=sample_rate)
    
    loop = asyncio.get_event_loop()
    recording = await loop.run_in_executor(
        None,
        sd.rec,
        int(duration * sample_rate),
        sample_rate,
        1,  # Mono
        'float32'
    )
    
    await loop.run_in_executor(None, sd.wait)
    
    with io.BytesIO() as f:
        await loop.run_in_executor(
            None,
            sf.write,
            f,
            recording,
            sample_rate,
            format='WAV'
        )
        
        logger.info("Recording completed", duration=duration)
        return f.getvalue()

async def save_wav(data: bytes, out_path: Path) -> None:
    """
    Guarda datos de audio en un archivo WAV.
    
    Args:
        data: Bytes del audio
        out_path: Ruta del archivo de salida
    """
    logger.info("Saving WAV file", path=str(out_path))
    
    with out_path.open("wb") as f:
        f.write(data)
    
    logger.info("WAV file saved", path=str(out_path))

async def load_wav(path: Path) -> Tuple[np.ndarray, int]:
    """
    Carga un archivo WAV.
    
    Args:
        path: Ruta del archivo WAV
        
    Returns:
        Tuple con los datos del audio y la tasa de muestreo
    """
    logger.info("Loading WAV file", path=str(path))
    
    data, sr = await asyncio.get_event_loop().run_in_executor(
        None,
        sf.read,
        str(path)
    )
    
    logger.info("WAV file loaded", path=str(path), sample_rate=sr)
    return data, sr

async def resample(data: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
    """
    Remuestra datos de audio.
    
    Args:
        data: Datos del audio
        orig_sr: Tasa de muestreo original
        target_sr: Tasa de muestreo objetivo
        
    Returns:
        Datos de audio remuestreados
    """
    logger.info(
        "Resampling audio",
        original_sample_rate=orig_sr,
        target_sample_rate=target_sr
    )
    
    import librosa
    resampled = librosa.resample(data, orig_sr=orig_sr, target_sr=target_sr)
    
    logger.info(
        "Audio resampled",
        original_sample_rate=orig_sr,
        target_sample_rate=target_sr,
        original_length=len(data),
        new_length=len(resampled)
    )
    
    return resampled

async def validate_audio(file_path: Path) -> None:
    """
    Valida un archivo de audio.
    
    Args:
        file_path: Ruta del archivo de audio
        
    Raises:
        FileNotFoundError: Si el archivo no existe
        ValueError: Si el archivo es demasiado grande o tiene un códec no soportado
    """
    logger.info("Validating audio file", path=str(file_path))
    
    if not file_path.exists():
        logger.error("File not found", path=str(file_path))
        raise FileNotFoundError(file_path)
    
    if file_path.stat().st_size > 100_000_000:
        logger.error("File too large", path=str(file_path))
        raise ValueError("File too large")
    
    try:
        AudioSegment.from_file(file_path)
        logger.info("Audio file validated", path=str(file_path))
    except Exception as e:
        logger.error("Unsupported codec", path=str(file_path), error=str(e))
        raise ValueError("Unsupported codec")

__all__ = ["record", "save_wav", "load_wav", "resample", "validate_audio"]
