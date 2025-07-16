import pytest
from unittest.mock import patch, MagicMock
from app.stt import transcribe_audio

@pytest.mark.asyncio
async def test_transcribe_audio():
    """Test básico de transcripción"""
    mock_audio = b"fake_audio_data"
    with patch('whisper.load_model') as mock_model:
        mock_model.return_value.transcribe.return_value = {"text": "hola mundo"}
        result = await transcribe_audio(mock_audio)
        assert result == "hola mundo"

@pytest.mark.asyncio
async def test_transcribe_with_noise():
    """Test con audio ruidoso"""
    mock_audio = b"noisy_audio"
    with patch('whisper.load_model') as mock_model:
        mock_model.return_value.transcribe.return_value = {"text": "hola [inaudible] mundo"}
        result = await transcribe_audio(mock_audio)
        assert "hola" in result
        assert "mundo" in result

