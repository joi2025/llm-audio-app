#!/usr/bin/env sh
set -e

# Load Docker secrets into env vars if present
if [ -f "/run/secrets/openai_api_key" ]; then
  export OPENAI_API_KEY="$(cat /run/secrets/openai_api_key)"
fi
if [ -f "/run/secrets/flask_secret_key" ]; then
  export FLASK_SECRET_KEY="$(cat /run/secrets/flask_secret_key)"
fi

# Default port
export PORT="${PORT:-8000}"

exec "$@"
