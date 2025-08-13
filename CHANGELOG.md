## [Unreleased] - 2025-08-13

### Added
- Frontend Socket.IO heartbeat ping/pong every 10s with minimal logs (`frontend/src/hooks/useSocketIO.js`).

### Changed
- VAD tuned for Spanish prosody with lower thresholds and faster timings (`frontend/src/hooks/useAutoVoice.js`):
  - silenceThreshold 0.008, speechThreshold 0.012, minSpeechDuration 240ms, maxSilenceDuration 900ms, interruptionDelay 600ms.
- Ensure silence detection triggers even if recorder flips `isListening` (`useAutoVoice.js`).
- Added processing watchdog to auto-reset `isProcessing` if backend stalls (10s) (`useAutoVoice.js`).
- TTS is reliably interruptible: pauses any playing `<audio>` when user speech is detected (`useAutoVoice.js`, `VoiceCircleV2.jsx`).
- Manual reconnect with exponential backoff (capped 5s) and online/offline awareness (`useSocketIO.js`).
- Emit retries (3 attempts, 300ms) for robust delivery during transient disconnects (`useSocketIO.js`).
- Align recorder for lower latency: 24 kbps and 200ms chunks in `VoiceCircleV2.jsx`.
- On disconnect, clear `isProcessing` and `assistantSpeaking` to avoid stuck UI (`VoiceCircleV2.jsx`).
- AdminPanel: remove unused `TabButton`, add concise debug logs on save and API key test (`AdminPanel.jsx`).

### Fixed
- ReferenceError “cleanupAudio is not defined” by removing undefined cleanup in `useAutoVoice.js`.
- Minor TDZ/race protections by using refs and effect ordering in `VoiceCircleV2.jsx`.

### Notes
- No backend API changes required. `db.py` reviewed; WAL and indices OK.
- Security: API key validation ensures `sk-` prefix; no sensitive keys logged.
- Performance: VAD uses 16 kHz mono and 200ms chunks; CPU kept low; no new deps added.

# Changelog

## 2025-08-13 - Frontend: TDZ fix VoiceCircle v2 (rama: correciones-gpt51.0)

- Solución quirúrgica al error de ejecución “Cannot access 'B' before initialization” en `frontend/src/components/VoiceCircleV2.jsx`.
  - Reordenado: definición de utilidades (`debouncedSetTranscript` y refs) ANTES de `useSocketIO()` para evitar Zona de Muerte Temporal (TDZ) en `onMessage`.
  - Uso de `autoVoiceRef` para invocar `resetProcessing()` dentro de callbacks tempranos del socket sin depender del orden de inicialización del hook `useAutoVoice`.
  - Sin cambios funcionales de negocio; sólo orden y referencias seguras.
- Verificaciones adicionales:
  - Revisión de `useSocketIO.js`, `useAutoVoice.js`, `useMicVAD.js`, `usePersonality.js` y `VoiceAvatar.jsx` sin detectar ciclos de import.
  - `App.jsx` mantiene `VITE_BACKEND_URL` como base única y desconecta el socket global al entrar a v2/v2-auto para evitar sockets duplicados.
- Recomendaciones de QA:
  - Refresco duro del navegador tras el cambio (evitar HMR con closures obsoletos).
  - Probar flujos v2 y v2-auto con STT → LLM → TTS, y rearmado automático.

## 2025-08-13 - Refactor: limpieza quirúrgica de duplicados y backups (correciones-gpt51.0)

- Creación de carpetas `archive/` para preservar artefactos sin romper historial ni imports activos.
- Movimientos realizados con `git mv` (sólo si existían):
  - Frontend/components → archive/
    - `VoiceCircleV2Auto.jsx`
  - Frontend/pages → archive/
    - `VoiceCircleV2.jsx`
  - Frontend/hooks → archive/
    - `useAgentVoice.js`
    - `useWebSocket.js`
- Notas:
  - Se mantiene como fuente única `components/AdminPanel.jsx` y `components/VoiceCircleV2.jsx` (v2 y v2-auto via `autoMode`).
  - Backend mantiene `websocket_socketio.py` como implementación activa; `websocket.py` legacy no estaba presente en esta copia.
  - No se alteran puntos de entrada ni rutas. Cambios mínimos para claridad del repositorio.

## 2025-08-13 - Backend: WebSocket unificado (Socket.IO)

- Añadido `backend/app/api/websocket_unified.py` con:
  - Buffer circular por conexión (chunks ~250ms, latencia objetivo <100ms).
  - Heartbeat servidor cada 30s (`server_heartbeat`).
  - Rate limiting con token-bucket (4 req/s, burst 8) para `audio_chunk`.
  - Métricas por sesión (`get_metrics` -> `metrics`).
  - Pipeline STT → LLM → TTS con tolerancia de errores y compatibilidad de eventos: `result_stt`, `result_llm`, `audio`, `tts_end`, `error`.
  - Compatibilidad completa con cliente React (Socket.IO, mensajes y campos existentes).
- Migración recomendada:
  - En el boot del servidor, reemplazar `init_socketio` por `init_unified` desde `websocket_unified.py`.
  - Deprecar `backend/app/api/websocket_socketio.py` y removerlo tras validación.
  - Mantener una única implementación WebSocket (Socket.IO) en producción.

## 2025-08-13 - Refactor: Consolidación de AdminPanel y VoiceCircle v2

- Backup creado: `backups/refactor_20250813_091434/`
- Eliminados (con backup):
  - `frontend/src/components/AdminPanelClean.jsx`
  - `frontend/src/components/AdminPanelFixed.jsx`
  - `frontend/src/components/AdminPanelNew.jsx`
  - `frontend/src/components/VoiceCircleV2_Simple.jsx`
  - `frontend/src/components/VoiceCircleV2Auto_backup.jsx`
  - `frontend/src/components/VoiceCircleV2Auto_old.jsx`
  - `backend/app/api/websocket.py`
- Mantenidos y a optimizar:
  - `frontend/src/components/AdminPanel.jsx` (principal, UI de API Key y configuración unificadas)
  - `frontend/src/components/VoiceCircleV2.jsx` (unificada, selector de personalidades)
  - `frontend/src/components/VoiceCircleV2Auto.jsx` (modo automático con `useAutoVoice`)
  - `backend/app/api/websocket_socketio.py` (único socket backend)
- Notas:
  - Unificación de estado y configuración; `VITE_BACKEND_URL` como base URL única.
  - VoiceCircle v2 mantiene health strip, beep y parsing tolerante (`transcript/transcription/text`, `audio/audio_b64/data`).
  - V2 Auto usa `useAutoVoice` (streaming=false) y reproduce audio mp3 base64; eventos: `result_stt`, `result_llm`, `tts_end`, `error`.

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
