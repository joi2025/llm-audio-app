FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    ffmpeg \
    alsa-utils \
    libasound2-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar código fuente
COPY pyproject.toml ./
COPY src/ ./src/

# Instalar dependencias
RUN pip install --no-cache-dir -e .

# Set environment variables
ENV PYTHONPATH=/app

# Run the application
CMD ["poetry", "run", "python", "-m", "src.api.main"]
