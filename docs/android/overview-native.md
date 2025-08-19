# Android Nativo - Visión General

La app Android nativa se encuentra en `android-elite/` y está construida con Kotlin, Jetpack Compose, Coroutines y arquitectura MVVM. Se integra directamente con OpenAI (STT/LLM/TTS) sin depender del backend Flask para el pipeline de voz, logrando menor latencia.

## Arquitectura

- `LLMAudioApplication.kt`: Inicialización Hilt
- `di/AppModule.kt`: DI para Retrofit, OkHttp, EncryptedSharedPreferences, AudioPlayer
- `data/api/OpenAiService.kt`: Endpoints STT, LLM streaming (SSE), TTS
- `domain/audio/AudioPlayer.kt`: Reproducción streaming con AudioTrack
- `domain/audio/VoiceActivityDetector.kt`: VAD nativo (RMS/umbral adaptativo)
- `domain/model/Personality.kt`: Personalidades portadas desde `frontend/src/data/personalities.js`
- `presentation/viewmodel/VoicePipelineViewModel.kt`: Orquestración Record → STT → LLM → TTS → Play
- `presentation/components/VoiceAvatar.kt`: Avatar animado (idle/listening/processing/speaking)
- `presentation/screens/MainScreen.kt`: UI minimalista
- `presentation/theme/Theme.kt`: Material3 light/dark
- `presentation/MainActivity.kt`: Entry point, permisos micrófono

## Flujo del Pipeline de Voz

1. Grabación con `AudioRecord` (16kHz mono PCM)
2. VAD detecta silencio/voz y cierra captura
3. STT (Whisper) → texto
4. LLM (GPT-4) con streaming de tokens (SSE)
5. TTS en paralelo por frase → reproducción con `AudioTrack`
6. Interrupción inmediata del TTS/LLM al detectar nueva voz

## Seguridad

- API Key almacenada en `EncryptedSharedPreferences`
- Evitar hardcode de secretos
- Preferir HTTPS/WSS en producción

## Documentos Relacionados

- `android-elite/README.md` — Guía completa, setup, métricas
- `android-elite/TESTING_PLAN.md` — Plan de pruebas nativo
- `docs/android-build-deploy.md` — Build/Deploy Android
- `docs/networking-public.md` — Exponer backend a Internet (para web / Admin)
