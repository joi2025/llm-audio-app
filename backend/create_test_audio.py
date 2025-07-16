import numpy as np
import wave
import struct

def create_test_audio(filename='test_audio.wav', duration=3, sample_rate=16000, freq=440.0):
    # Generar un tono de 440 Hz
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    tone = np.sin(2 * np.pi * freq * t) * 0.5  # 0.5 es para reducir la amplitud
    
    # Convertir a formato de 16 bits
    audio = (tone * 32767).astype(np.int16)
    
    # Guardar como archivo WAV
    with wave.open(filename, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 2 bytes = 16 bits
        wf.setframerate(sample_rate)
        wf.writeframes(audio.tobytes())
    
    print(f"Archivo de prueba creado: {filename}")

if __name__ == "__main__":
    create_test_audio()
