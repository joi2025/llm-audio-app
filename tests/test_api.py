import pytest
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_transcribe_invalid_type():
    response = client.post(
        "/transcribe",
        files={"file": ("test.mp4", b"test", "video/mp4")}
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "Invalid type"

def test_transcribe_success(tmp_audio_wav):
    with open(tmp_audio_wav, "rb") as f:
        response = client.post(
            "/transcribe",
            files={"file": ("test.wav", f, "audio/wav")}
        )
    assert response.status_code == 200
    assert "text" in response.json()
    assert "language" in response.json()

def test_chat_audio(tmp_audio_wav):
    with open(tmp_audio_wav, "rb") as f:
        response = client.post(
            "/chat",
            files={"audio": ("test.wav", f, "audio/wav")}
        )
    assert response.status_code == 200
    assert "text" in response.json()
    assert "audio_url" in response.json()

def test_chat_text():
    response = client.post(
        "/chat",
        data={"text": "Hello"}
    )
    assert response.status_code == 200
    assert "text" in response.json()
    assert "audio_url" in response.json()

def test_chat_no_input():
    response = client.post("/chat")
    assert response.status_code == 400
    assert response.json()["detail"] == "Either audio or text must be provided"
