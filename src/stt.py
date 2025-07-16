from __future__ import annotations
import os
import tempfile
import asyncio
import structlog
from pathlib import Path
from typing import Any, AsyncIterator
import whisper
import numpy as np
from pydub import AudioSegment
from pydub.silence import split_on_silence
import io

logger = structlog.get_logger(__name__)

async def transcribe(file_path: str) -> dict[str, Any]:
    """
    Transcribe an audio file using OpenAI's Whisper model.
    
    Args:
        file_path: Path to the audio file (wav, mp3, m4a, ogg, etc.)
    """
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"Audio file not found: {file_path}")
    
    try:
        audio = AudioSegment.from_file(str(file_path))
    except Exception as e:
        raise ValueError(f"Could not load audio file {file_path}: {str(e)}") from e
    
    # Preprocess audio
    if audio.channels > 1:
        audio = audio.set_channels(1)
    if audio.frame_rate != 16000:
        audio = audio.set_frame_rate(16000)
    audio = audio.normalize()
    
    # Split into chunks if needed
    if len(audio) > 25_000_000:
        chunks = split_on_silence(
            audio,
            min_silence_len=500,
            silence_thresh=-40,
            keep_silence=1000
        )
        if not chunks or any(len(chunk) > 25_000_000 for chunk in chunks):
            chunks = []
            chunk_size = 24_000_000
            overlap = 1000  # 1 segundo
            for i in range(0, len(audio), chunk_size - overlap):
                chunk = audio[i:i + chunk_size]
                chunks.append(chunk)
    else:
        chunks = [audio]
    
    # Load model
    model = whisper.load_model(
        os.getenv("WHISPER_MODEL", "base"),
        device=os.getenv("WHISPER_DEVICE", "cpu")
    )
    
    # Transcribe each chunk
    texts = []
    for chunk in chunks:
        start_time = time.time()
        logger.info("Starting inference", chunk_size=len(chunk))
        
        # Convert to numpy array
        samples = np.array(chunk.get_array_of_samples())
        samples = samples.astype(np.float32) / (2**15)
        
        # Transcribe
        result = model.transcribe(samples)
        texts.append(result["text"])
        
        duration = time.time() - start_time
        logger.info("Inference completed", duration_seconds=duration)
    
    # Combine results
    return {
        "text": " ".join(texts),
        "language": result.get("language", "unknown")
    }

async def transcribe_stream(audio_stream: AsyncIterator[bytes]) -> dict[str, Any]:
    """
    Transcribe an audio stream.
    
    Args:
        audio_stream: Async iterator yielding audio chunks as bytes
        
    Returns:
        Dict containing "text" and "language" keys
    """
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
        try:
            # Convert to WAV 44.1kHz mono
            audio = AudioSegment.silent(duration=0, frame_rate=44100)
            async for chunk in audio_stream:
                temp_audio = AudioSegment.from_file(io.BytesIO(chunk), format="wav")
                temp_audio = temp_audio.set_frame_rate(44100).set_channels(1)
                audio += temp_audio
            
            # Save temporarily
            audio.export(temp_file.name, format="wav")
            
            # Transcribe
            return await transcribe(temp_file.name)
            
        finally:
            try:
                os.unlink(temp_file.name)
            except Exception as e:
                logger.warning("Error deleting temporary file", error=str(e))

__all__ = ["transcribe", "transcribe_stream"]
