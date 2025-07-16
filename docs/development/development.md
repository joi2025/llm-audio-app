# Desarrollo del Proyecto

## Estructura del Código

```
src/
├── api/           # Endpoints FastAPI
├── stt/           # Servicio STT
├── tts/           # Servicio TTS
├── llm/           # Cliente LLM
├── audio_utils/   # Utilidades de audio
├── events/        # Eventos de sistema
└── aggregates/    # Agregados de dominio
```

## Convenciones de Código

### 1. Logging
- Uso de `structlog` para logging estructurado
- Niveles: DEBUG, INFO, WARNING, ERROR
- Contexto en logs

### 2. Manejo de Errores
- Excepciones específicas
- Validación de tipos
- Manejo de recursos

### 3. Testing
- Tests unitarios
- Tests de integración
- Mocking de servicios

## Desarrollo Local

### 1. Configuración
```bash
# Variables de entorno
export PYTHONPATH=$PYTHONPATH:.
export OPENAI_API_KEY=your_key

# Ejecutar servidor
uvicorn src.api.main:app --reload
```

### 2. Testing
```bash
# Ejecutar tests
pytest tests/

# Ejecutar tests con cobertura
pytest --cov=src tests/
```

## Mejores Prácticas

### 1. Manejo de Audio
- Validación de formatos
- Límites de tamaño
- Conversión de formatos
- Manejo de streaming

### 2. Integración con LLM
- Manejo de tokens
- Límites de contexto
- Manejo de streaming
- Cache de respuestas

### 3. Despliegue
- Docker containerization
- Configuración de puertos
- Manejo de volumenes
- Escalabilidad

## Herramientas de Desarrollo

### 1. Linting
```bash
# Formateo
black src/ tests/

# Orden de imports
isort src/ tests/

# Estilo de código
flake8 src/ tests/
```

### 2. Documentación
```bash
# Generar documentación
mkdocs serve
```

### 3. Depuración
```bash
# Debug con VS Code
python -m debugpy --listen 0.0.0.0:5678 src.api.main
```

## Contribución

### 1. Flujo de Trabajo
1. Crear rama de feature
2. Implementar cambios
3. Ejecutar tests
4. Documentar cambios
5. Hacer pull request

### 2. Commit Messages
- Usar convención conventional commits
- Incluir referencia a issues
- Describir cambios claramente

### 3. Code Review
- Verificar tests
- Verificar documentación
- Verificar manejo de errores
- Verificar performance
