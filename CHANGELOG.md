# Changelog

## WIP - puliendo-sin-acabar (VoiceCircle v2 pulido, no finalizado)

- VoiceCircleV2 (`frontend/src/components/VoiceCircleV2.jsx`)
  - Fix TDZ: `useEffect` watchdog reubicado bajo `useAutoVoice`.
  - Auto y manual streaming: envío de `audio_chunk` inmediato; `audio_end` con pequeño delay (50ms) para garantizar orden en transporte polling.
  - TTS robusto: captura de fallo de `audio.play()` (autoplay), rearmado automático del VAD y restauración de estado para evitar bloqueos.
  - Manejo explícito de `tts_end` y rearmado multi‑turn.
  - Timer `autoStopTimerRef` para evitar paradas/estados huérfanos.
  - Mejoras de UX: mensajes transitorios de error, modal de personalidades con cierre por ESC/clic de fondo, health strip (Mic/Red/Servidor).

- SocketIO (`frontend/src/hooks/useSocketIO.js`)
  - `onMessage` entrega `{ type, ... }` también para eventos conocidos (ej. `tts_end`).
  - Callbacks en refs para evitar cierres obsoletos.

- Mic VAD (`frontend/src/hooks/useMicVAD.js`)
  - `audioBitsPerSecond: 32000` (menos payload/CPU) y sin logs por chunk.

- Varias
  - Unificación de URL backend (respetando `VITE_BACKEND_URL` / fallback existente).
  - Documentación de cuellos de botella y rearmes tras TTS/LLM.

Notas: rama en curso, trabajo no finalizado.
