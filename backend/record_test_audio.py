import sounddevice as sd
import numpy as np
import wave

def record_audio(duration=5, sample_rate=16000):
    print(f"Grabando audio durante {duration} segundos...")
    
    # Grabar audio
    audio = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=1, dtype='int16')
    sd.wait()  # Esperar hasta que termine la grabación
    
    # Guardar como WAV
    with wave.open('test_audio.wav', 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(audio.tobytes())
    
    print(f"Audio guardado como 'test_audio.wv'")

if __name__ == "__main__":
    record_audio(duration=5)
