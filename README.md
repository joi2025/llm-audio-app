# LLM Audio App (Voice Advance / Pro Admin)

A full-stack voice assistant with:
- React + Vite frontend (User and Admin modes)
- Flask backend with WebSocket for realtime audio
- OpenAI STT (Whisper), Chat (GPT-4o family), and TTS
- SQLite for conversations/logs/settings

## Structure

- `frontend/`: React app
- `backend/`: Flask app
  - `app/api/`: REST and WS endpoints
  - `app/db.py`: SQLite helpers (conversations, logs, settings)
  - `app/config.py`: env loading and model defaults
  - `run.py`: dev entry point
- `.pids/`: runtime PIDs for start/stop scripts
- `backend/data/app.db`: SQLite database (gitignored)

## Features

- User mode (Voice Advance):
  - Record audio and stream via WS; automatic STT → Chat → TTS
  - Send text; receive LLM reply + TTS
  - Stop button to halt playback and save tokens
  - Conversation history panel and logs panel

- Admin mode (Pro):
  - Server status and API key check
  - Settings editor: quality tiers (low → high), voice name/gender/style/mood, max tokens in/out
  - Conversation history listing with token in/out and cost estimate
  - Logs listing

## Requirements

- Node.js 18+
- Python 3.10+
- OpenAI API key

## Environment

Create `backend/.env` (already set up to be loaded explicitly):

```
PORT=8001
OPENAI_API_KEY=YOUR_KEY_HERE
# Optional overrides
# OPENAI_BASE_URL=https://api.openai.com/v1
# STT_MODEL=whisper-1
# CHAT_MODEL=gpt-4o-mini
# TTS_MODEL=gpt-4o-mini-tts
# TTS_VOICE=alloy
```

Note: `.env` is gitignored.

## Run (Windows)

Use the PowerShell scripts in project root:

```
powershell -ExecutionPolicy Bypass -File .\start_all.ps1
# or
powershell -ExecutionPolicy Bypass -File .\restart_all.ps1
# to stop
powershell -ExecutionPolicy Bypass -File .\stop_all.ps1
```

Frontend: http://localhost:3001
Backend health: http://127.0.0.1:8001/health

## Admin API

- `GET /api/admin/status` → `{ status, ws, key_ok, errors }`
- `GET /api/admin/settings` → key/value dict
- `POST /api/admin/settings` body: `{ key: value, ... }`
- `GET /api/admin/conversations?limit=100`
- `DELETE /api/admin/conversations`
- `GET /api/admin/logs?limit=200`

## Pricing tiers and models

Tiers map to internal model selections:
- low, medium_low → `gpt-4o-mini`
- medium → `CHAT_MODEL` from env (default `gpt-4o-mini`)
- medium_high, high → `gpt-4o`

TTS model defaults to `TTS_MODEL` (`gpt-4o-mini-tts`), with option to prefer higher tier mapping.

Token and cost estimates are rough (1 token ≈ 4 chars) and demo prices; adjust to real prices in `backend/app/api/websocket.py` `_estimate_cost()`.

## Git hygiene

- Secrets: `.env` is ignored (`backend/.env`). Ensure you do not commit keys.
- Data: `backend/data/` ignored.

## Development notes

- Env loading is forced from `backend/.env` in `app/config.py` to avoid CWD issues.
- WebSocket path: `/ws/assistant` (frontend reads from `VITE_WS_URL`)
- Admin UI at frontend: toggle User/Admin in header.

## Scripts

- `start_all.ps1`: creates venv, installs Python deps, installs Node deps, starts backend (8001) and frontend (3001).
- `stop_all.ps1`: stops processes using saved PIDs; best-effort window close.
- `restart_all.ps1`: stop then start.

## Roadmap

- Auth for Admin endpoints
- Better pricing integration with real rates
- Unit tests
- Deploy pipeline
