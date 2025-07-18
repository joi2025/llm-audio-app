import pytest
import tempfile
import numpy as np
import soundfile as sf
from pathlib import Path
import structlog
import logging
import json
import os

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
    monkeypatch.setenv("API_PORT", "8000")
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")

@pytest.fixture
def test_log_file(tmp_path):
    """
    Crea un archivo de log temporal para las pruebas.
    """
    log_file = tmp_path / "test.log"
    return log_file

@pytest.fixture
def test_log_content(test_log_file):
    """
    Función para obtener el contenido del archivo de log.
    """
    def _get_log_content():
        if test_log_file.exists():
            with open(test_log_file, "r") as f:
                return f.read()
        return ""
    return _get_log_content

@pytest.fixture
def test_log_assertions():
    """
    Función para verificar la presencia de logs específicos.
    """
    def _assert_log_content(log_content, message, level):
        log_entries = [json.loads(line) for line in log_content.splitlines() if line.strip()]
        found = any(
            entry.get("message") == message and entry.get("level") == level
            for entry in log_entries
        )
        assert found, f"No se encontró log con mensaje '{message}' y nivel '{level}'"
    return _assert_log_content
