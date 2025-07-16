# Guía de Pruebas

## Estructura de Pruebas

```
tests/
├── conftest.py          # Fixtures globales
├── test_stt.py          # Pruebas STT
├── test_tts.py          # Pruebas TTS
├── test_llm.py          # Pruebas LLM
├── test_api.py          # Pruebas API
└── test_utils.py        # Pruebas utilidades
```

## Pruebas Unitarias

### STT
```python
# test_stt.py
def test_transcribe(mock_audio_file):
    result = await transcribe(mock_audio_file)
    assert "text" in result
    assert "confidence" in result

# Mock de archivo de audio
def test_transcribe_large_file(mock_large_audio_file):
    result = await transcribe(mock_large_audio_file)
    assert len(result["text"]) > 0
```

### TTS
```python
# test_tts.py
def test_synthesize():
    audio = await synthesize("Hello")
    assert len(audio) > 0

# Pruebas de proveedores
def test_tts_providers():
    for provider in ["edge", "coqui"]:
        os.environ["TTS_PROVIDER"] = provider
        audio = await synthesize("Test")
        assert len(audio) > 0
```

## Pruebas de Integración

### API
```python
# test_api.py
async def test_chat_endpoint(client):
    response = await client.post(
        "/chat",
        files={"audio": open("test.wav", "rb")}
    )
    assert response.status_code == 200
    assert "text" in response.json()

# Pruebas de errores
async def test_invalid_file(client):
    response = await client.post(
        "/transcribe",
        files={"file": ("test.txt", b"invalid")}
    )
    assert response.status_code == 422
```

## Pruebas de Carga

### Benchmark
```bash
# Instalar locust
pip install locust

# Ejecutar pruebas
locust -f tests/load_test.py
```

### Escenarios
1. 100 usuarios concurrentes
2. 1000 transcripciones por minuto
3. 500 síntesis por minuto

## Pruebas de Seguridad

### OWASP Top 10
1. Inyección
2. XSS
3. CSRF
4. Exposición de datos
5. Configuración insegura

### Pruebas
```python
# test_security.py
def test_cors_headers(client):
    response = client.get("/")
    assert "Access-Control-Allow-Origin" in response.headers

# Pruebas de inyección
def test_sql_injection(client):
    response = client.post(
        "/chat",
        json={"text": "' OR '1'='1"}
    )
    assert response.status_code != 200
```

## Pruebas de Aceptación

### Casos de Uso
1. Transcripción de audio
2. Síntesis de texto
3. Chat completo
4. Manejo de errores

### Ejecución
```bash
# Ejecutar todos los tests
pytest tests/

# Ejecutar tests específicos
pytest tests/test_stt.py

# Ejecutar con cobertura
pytest --cov=src tests/
```

## Consideraciones

### Mocking
- Mock de servicios externos
- Mock de llamadas API
- Mock de archivos de audio

### Variables de Entorno
- Configuración de tests
- Proveedores de servicios
- Modelos de prueba

### Logs
- Logging de tests
- Métricas de rendimiento
- Errores detectados
