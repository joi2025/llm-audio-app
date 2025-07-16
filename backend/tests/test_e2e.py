import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    return TestClient(app)

@pytest.mark.asyncio
async def test_full_voice_flow():
    """Prueba E2E del flujo voz → texto → respuesta"""
    with client.websocket_connect("/ws/audio") as websocket:
        # Simular audio
        websocket.send_bytes(b"fake_audio_data")
        
        # Verificar respuesta
        response = websocket.receive_text()
        assert len(response) > 0
        assert not "ERROR" in response

