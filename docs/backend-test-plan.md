# Backend Unit & Integration Test Plan

## Overview
Comprehensive testing strategy for the LLM Audio App backend, focusing on WebSocket pipeline, admin routes, and real-time audio processing.

## Test Structure

### 1. Unit Tests

#### WebSocket Handler Tests (`test_websocket_unified.py`)
```python
# Tests for websocket_unified.py functions
- test_connect_handler()
  - Verify session creation
  - Check rate limiter initialization
  - Validate socket join to session room
  
- test_disconnect_handler()
  - Verify cleanup of session data
  - Check socket leave from room
  
- test_audio_chunk_handler()
  - Test base64 decoding
  - Verify audio buffer accumulation
  - Check rate limiting enforcement
  
- test_audio_end_handler()
  - Test STT processing trigger
  - Verify LLM chain invocation
  - Check TTS generation initiation
  
- test_stop_tts_handler()
  - Verify TTS cancellation
  - Check cleanup of audio streams
  
- test_user_text_handler()
  - Test direct text processing
  - Verify LLM response generation
```

#### Admin Routes Tests (`test_admin_routes.py`)
```python
# Tests for routes/admin.py endpoints
- test_status_endpoint()
  - Check system metrics collection
  - Verify response format
  
- test_settings_get()
  - Verify current settings retrieval
  - Check sensitive data masking
  
- test_settings_update()
  - Test settings validation
  - Verify persistence
  
- test_api_key_test()
  - Mock OpenAI API call
  - Verify error handling
  
- test_conversations_endpoint()
  - Test pagination
  - Verify data format
  
- test_logs_endpoint()
  - Test log retrieval
  - Check filtering options
  
- test_restart_endpoint()
  - Verify restart trigger
  - Check graceful shutdown
```

### 2. Integration Tests

#### WebSocket Pipeline Tests (`test_integration_websocket.py`)
```python
import pytest
import asyncio
from socketio import AsyncClient

@pytest.mark.asyncio
async def test_full_audio_pipeline():
    """Test complete audio flow: connect -> audio chunks -> STT -> LLM -> TTS"""
    client = AsyncClient()
    await client.connect('http://localhost:8080')
    
    # Send audio chunks
    audio_data = load_test_audio('hello.wav')
    chunks = split_audio_to_chunks(audio_data)
    
    responses = []
    
    @client.on('result_stt')
    def on_stt(data):
        responses.append(('stt', data))
    
    @client.on('llm_token')
    def on_llm_token(data):
        responses.append(('llm', data))
    
    @client.on('audio_chunk')
    def on_audio_chunk(data):
        responses.append(('tts', data))
    
    # Send chunks
    for chunk in chunks:
        await client.emit('audio_chunk', {'audio': chunk})
        await asyncio.sleep(0.1)
    
    await client.emit('audio_end')
    
    # Wait for pipeline completion
    await asyncio.sleep(5)
    
    # Assertions
    assert any(r[0] == 'stt' for r in responses)
    assert any(r[0] == 'llm' for r in responses)
    assert any(r[0] == 'tts' for r in responses)
    
    await client.disconnect()

@pytest.mark.asyncio
async def test_interruption_handling():
    """Test TTS interruption when user speaks"""
    # Implementation here
    pass

@pytest.mark.asyncio
async def test_rate_limiting():
    """Test rate limiter behavior under load"""
    # Implementation here
    pass
```

#### Admin API Integration Tests (`test_integration_admin.py`)
```python
import requests
import pytest

class TestAdminIntegration:
    base_url = "http://localhost:8080/api/admin"
    
    def test_full_settings_cycle(self):
        """Test get -> update -> verify settings flow"""
        # Get current settings
        resp = requests.get(f"{self.base_url}/settings")
        assert resp.status_code == 200
        original = resp.json()['data']
        
        # Update settings
        new_settings = {
            'temperature': 0.8,
            'max_tokens': 500
        }
        resp = requests.post(f"{self.base_url}/settings", json=new_settings)
        assert resp.status_code == 200
        
        # Verify update
        resp = requests.get(f"{self.base_url}/settings")
        updated = resp.json()['data']
        assert updated['temperature'] == 0.8
        assert updated['max_tokens'] == 500
        
    def test_api_key_validation(self):
        """Test OpenAI API key testing endpoint"""
        resp = requests.post(f"{self.base_url}/test-api-key")
        assert resp.status_code in [200, 401]
        assert 'status' in resp.json()
```

## Test Configuration

### `pytest.ini`
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow tests
    websocket: WebSocket tests
```

### `conftest.py`
```python
import pytest
import asyncio
from app import create_app
from unittest.mock import MagicMock

@pytest.fixture
def app():
    """Create test app instance"""
    app = create_app(testing=True)
    return app

@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture
def mock_openai():
    """Mock OpenAI API"""
    mock = MagicMock()
    mock.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content="Test response"))]
    )
    return mock
```

## Coverage Requirements
- Minimum 80% code coverage for critical paths
- 100% coverage for error handling
- All edge cases documented and tested

## CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Backend Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r backend/requirements.txt
          pip install pytest pytest-asyncio pytest-cov
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Performance Benchmarks
- WebSocket connection: < 100ms
- STT processing: < 2s for 5s audio
- LLM first token: < 500ms
- TTS first chunk: < 300ms
- Total pipeline latency: < 3s

## Remote Connectivity Tests

- __Public exposure__: follow `docs/networking-public.md` (ngrok for immediate tunnel, or Apache reverse proxy with HTTPS).
- __Android LAN dev__: if using HTTP on LAN (e.g., `192.168.29.31:8001`), configure `network_security_config.xml` and manifest for cleartext in debug only.
- __WS/HTTP sanity__: from an Android device on mobile data:
  - `curl -I https://<public-host>/health` should return 200.
  - WebSocket endpoint should upgrade with `wss://` successfully.
- __Frontend env__: set `VITE_BACKEND_URL` to the public HTTPS URL.
- __Firewall__: ensure port 443 is open; verify DNS propagation and valid TLS cert.

### Diagnostics checklist

- [ ] Backend reachable from internet (HTTPS 200 on /health)
- [ ] WebSocket connects with `wss://` from Android
- [ ] Logs show client IP and forwarded proto headers
- [ ] Rate limits not triggered under normal use
