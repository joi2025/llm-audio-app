"""
Implementación opcional de conexión NATS.
Si nats-py no está instalado, se usa una implementación mock.
"""

try:
    import nats
except ImportError:
    class MockNats:
        """Mock para NATS cuando no está instalado"""
        def __init__(self):
            self.connected = False
            print("[WARNING] nats-py no está instalado. Usando implementación mock.")
            
        async def connect(self, *args, **kwargs):
            self.connected = True
            return self
            
        async def publish(self, subject, message):
            print(f"[MOCK] Publicando en {subject}: {message}")
            
        async def close(self):
            self.connected = False
            
    nats = MockNats()

# Instancia global de NATS
nats_conn = None
try:
    import nats
    nats_conn = nats
except ImportError:
    print("[WARNING] nats-py no está instalado. Usando implementación mock.")
    nats_conn = MockNats()

