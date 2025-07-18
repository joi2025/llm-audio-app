import pytest
import logging
import structlog
import tempfile
import os
from pathlib import Path

@pytest.fixture
def test_logger():
    """Fixture para configurar logging de prueba"""
    # Configurar logging
    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer()
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # Crear directorio temporal para logs
    temp_dir = tempfile.mkdtemp()
    log_file = Path(temp_dir) / "test.log"
    
    # Configurar archivo de log
    logging.basicConfig(
        filename=str(log_file),
        level=logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    yield log_file
    
    # Limpiar después de la prueba
    os.remove(log_file)
    os.rmdir(temp_dir)

@pytest.fixture
def test_log_file():
    """Fixture para obtener el archivo de log de prueba"""
    return tempfile.NamedTemporaryFile(suffix='.log', delete=False)

@pytest.fixture
def test_log_content(test_log_file):
    """Fixture para obtener el contenido del log"""
    def get_log_content():
        with open(test_log_file.name, 'r') as f:
            return f.read()
    return get_log_content

@pytest.fixture
def test_log_assertions():
    """Fixture para aserciones de logging"""
    def assert_log_contains(log_content, message, level='INFO'):
        assert f"{level}" in log_content
        assert message in log_content
    return assert_log_contains
