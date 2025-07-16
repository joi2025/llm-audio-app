FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    curl \
    ffmpeg \
    sox \
    alsa-utils \
    libasound2-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN pip install poetry && poetry install

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONPATH=/app

# Run the application
CMD ["poetry", "run", "python", "-m", "src.api.main"]
