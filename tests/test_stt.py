import pytest
import structlog
from src.stt import transcribe
from pathlib import Path

logger = structlog.get_logger()

def test_transcribe_success(test_log_file, test_log_content, test_log_assertions):
    """Test de transcripción exitosa"""
    # Preparar archivo de audio de prueba
    test_audio = Path("tests/fixtures/test.wav")
    
    # Ejecutar transcripción
    result = transcribe(str(test_audio))
    
    # Verificar resultado
    assert "text" in result
    assert "confidence" in result
    
    # Verificar logs
    log_content = test_log_content()
    test_log_assertions(log_content, "Transcripción exitosa", "INFO")

def test_transcribe_invalid_file(test_log_file, test_log_content, test_log_assertions):
    """Test de transcripción con archivo inválido"""
    # Preparar archivo inválido
    invalid_file = Path("tests/fixtures/invalid.txt")
    
    # Ejecutar transcripción
    with pytest.raises(Exception) as exc_info:
        transcribe(str(invalid_file))
    
    # Verificar error
    assert "Invalid audio file" in str(exc_info.value)
    
    # Verificar logs
    log_content = test_log_content()
    test_log_assertions(log_content, "Error en transcripción", "ERROR")

def test_transcribe_large_file(test_log_file, test_log_content, test_log_assertions):
    """Test de transcripción con archivo grande"""
    # Preparar archivo grande
    large_file = Path("tests/fixtures/large.wav")
    
    # Ejecutar transcripción
    result = transcribe(str(large_file))
    
    # Verificar resultado
    assert len(result["text"]) > 0
    
    # Verificar logs
    log_content = test_log_content()
    test_log_assertions(log_content, "Transcripción de archivo grande", "INFO")

def test_transcribe_model_loading(test_log_file, test_log_content, test_log_assertions):
    """Test de carga de modelo"""
    # Preparar archivo de prueba
    test_audio = Path("tests/fixtures/test.wav")
    
    # Ejecutar transcripción (forzando carga de modelo)
    os.environ["WHISPER_MODEL"] = "base"
    result = transcribe(str(test_audio))
    
    # Verificar resultado
    assert "text" in result
    
    # Verificar logs
    log_content = test_log_content()
    test_log_assertions(log_content, "Cargando modelo Whisper", "INFO")
