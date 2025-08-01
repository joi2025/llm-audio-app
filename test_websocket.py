import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws/assistant"
    try:
        async with websockets.connect(uri) as websocket:
            print("Conectado al WebSocket")
            
            # Enviar un mensaje de prueba
            test_message = {
                "type": "ping"
            }
            await websocket.send(json.dumps(test_message))
            print(f"Mensaje enviado: {test_message}")
            
            # Recibir respuesta
            response = await websocket.recv()
            print(f"Respuesta recibida: {response}")
            
    except Exception as e:
        print(f"Error: {str(e)}")

# Ejecutar la prueba
if __name__ == "__main__":
    asyncio.get_event_loop().run_until_complete(test_websocket())
