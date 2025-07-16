import pytest
import tempfile
import numpy as np
import soundfile as sf
from pathlib import Path

@pytest.fixture(scope="session")
def tmp_audio_wav():
    """
    Crea un archivo WAV temporal con datos aleatorios.
    
    Returns:
        Path: Ruta al archivo WAV temporal
    """
    data = np.random.randn(16000).astype("float32")
    path = Path(tempfile.gettempdir()) / "dummy.wav"
    sf.write(path, data, 16000)
    yield path
    path.unlink(missing_ok=True)

@pytest.fixture(autouse=True)
def mock_env(monkeypatch):
    """
    Mockea las variables de entorno necesarias para los tests.
    """
    monkeypatch.setenv("OPENAI_API_KEY", "test")
    monkeypatch.setenv("WHISPER_MODEL", "tiny")
    monkeypatch.setenv("TTS_PROVIDER", "edge")
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_MODEL", "gpt-3.5-turbo")
