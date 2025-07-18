import pytest
import structlog
from src.tts import synthesize
from pathlib import Path

logger = structlog.get_logger()

def test_synthesize_success(test_log_file, test_log_content, test_log_assertions):
    """Test de síntesis exitosa"""
    # Ejecutar síntesis
    audio = synthesize("Hello")
    
    # Verificar resultado
    assert len(audio) > 0
    
    # Verificar logs
    log_content = test_log_content()
    test_log_assertions(log_content, "Síntesis exitosa", "INFO")

def test_synthesize_different_providers(test_log_file, test_log_content, test_log_assertions):
    """Test de síntesis con diferentes proveedores"""
    providers = ["edge", "coqui"]
    
    for provider in providers:
        # Configurar proveedor
        os.environ["TTS_PROVIDER"] = provider
        
        # Ejecutar síntesis
        audio = synthesize("Test")
        
        # Verificar resultado
        assert len(audio) > 0
        
        # Verificar logs
        log_content = test_log_content()
        test_log_assertions(log_content, f"Síntesis con {provider}", "INFO")

def test_synthesize_invalid_text(test_log_file, test_log_content, test_log_assertions):
    """Test de síntesis con texto inválido"""
    # Ejecutar síntesis
    with pytest.raises(Exception) as exc_info:
        synthesize(123)  # Tipo inválido
    
    # Verificar error
    assert "Invalid text" in str(exc_info.value)
    
    # Verificar logs
    log_content = test_log_content()
    test_log_assertions(log_content, "Error en síntesis", "ERROR")

def test_synthesize_performance(test_log_file, test_log_content, test_log_assertions):
    """Test de rendimiento de síntesis"""
    # Ejecutar múltiples síntesis
    for i in range(10):
        audio = synthesize(f"Test {i}")
        assert len(audio) > 0
    
    # Verificar logs
    log_content = test_log_content()
    test_log_assertions(log_content, "Síntesis exitosa", "INFO")
