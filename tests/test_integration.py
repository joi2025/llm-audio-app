import pytest
import structlog
import requests
from pathlib import Path
import time

logger = structlog.get_logger()

def test_end_to_end(test_log_file, test_log_content, test_log_assertions):
    """Test de flujo completo: audio -> texto -> respuesta -> audio"""
    # Configurar API
    api_url = "http://localhost:8000"
    
    # 1. Transcripción
    audio_file = Path("tests/fixtures/test.wav")
    
    with open(audio_file, 'rb') as f:
        response = requests.post(
            f"{api_url}/transcribe",
            files={"file": f}
        )
    
    assert response.status_code == 200
    transcription = response.json()
    assert "text" in transcription
    
    # Verificar logs
    log_content = test_log_content()
    test_log_assertions(log_content, "Transcripción exitosa", "INFO")
    
    # 2. Chat
    response = requests.post(
        f"{api_url}/chat",
        json={"text": transcription["text"]}
    )
    
    assert response.status_code == 200
    chat_response = response.json()
    assert "text" in chat_response
    assert "audio_url" in chat_response
    
    # Verificar logs
    log_content = test_log_content()
    test_log_assertions(log_content, "Chat exitoso", "INFO")
    
    # 3. Descargar audio
    audio_url = chat_response["audio_url"]
    response = requests.get(f"{api_url}{audio_url}")
    assert response.status_code == 200
    
    # Verificar logs
    log_content = test_log_content()
    test_log_assertions(log_content, "Síntesis exitosa", "INFO")

def test_error_handling(test_log_file, test_log_content, test_log_assertions):
    """Test de manejo de errores"""
    api_url = "http://localhost:8000"
    
    # 1. Archivo inválido
    response = requests.post(
        f"{api_url}/transcribe",
        files={"file": ("invalid.txt", b"invalid")}
    )
    
    assert response.status_code == 422
    
    # Verificar logs
    log_content = test_log_content()
    test_log_assertions(log_content, "Error en transcripción", "ERROR")
    
    # 2. Texto vacío
    response = requests.post(
        f"{api_url}/chat",
        json={"text": ""}
    )
    
    assert response.status_code == 400
    
    # Verificar logs
    log_content = test_log_content()
    test_log_assertions(log_content, "Error en chat", "ERROR")

def test_performance(test_log_file, test_log_content, test_log_assertions):
    """Test de rendimiento"""
    api_url = "http://localhost:8000"
    
    # Ejecutar múltiples pruebas
    for i in range(10):
        # Transcripción
        audio_file = Path("tests/fixtures/test.wav")
        with open(audio_file, 'rb') as f:
            response = requests.post(
                f"{api_url}/transcribe",
                files={"file": f}
            )
            assert response.status_code == 200
        
        # Chat
        response = requests.post(
            f"{api_url}/chat",
            json={"text": "Test"}
        )
        assert response.status_code == 200
    
    # Verificar logs
    log_content = test_log_content()
    test_log_assertions(log_content, "Transcripción exitosa", "INFO")
