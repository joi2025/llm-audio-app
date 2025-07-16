# Checklist de Verificación

## 1. Instalación de Dependencias
```bash
# Instalar las dependencias necesarias
pip install -r requirements.txt

# Verificar que nats-py esté instalado (opcional)
pip install nats-py
```

## 2. Verificación de Imports
```python
# Test de import en consola
>>> from services.tts_service import TTSservice
>>> import nats
```

## 3. Inicio del Servidor
```bash
# Iniciar el servidor backend
python run.py

# Verificar logs para confirmar:
# - Servicio STT inicializado correctamente
# - No errores de importación
# - Servidor escuchando en el puerto 8001
```

## 4. Verificación de Funcionalidad
1. El servidor debe iniciar sin errores
2. Los servicios STT y TTS deben estar disponibles
3. La conexión NATS debe funcionar (o usar implementación mock)
4. El frontend debe poder conectarse al WebSocket en ws://localhost:8001/ws/assistant

## Notas
- Si nats-py no está instalado, el sistema usará una implementación mock
- Los logs mostrarán advertencias pero no errores críticos
- La funcionalidad principal (STT y TTS) debe seguir funcionando

