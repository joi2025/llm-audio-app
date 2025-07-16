# Etapa de construcción
FROM python:3.10-slim as builder

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Etapa de ejecución
FROM python:3.10-slim

WORKDIR /app

# Instalar dependencias del sistema necesarias para tiempo de ejecución
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    espeak-ng \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copiar dependencias instaladas
COPY --from=builder /root/.local /root/.local

# Asegurarse de que los scripts estén en el PATH
ENV PATH=/root/.local/bin:$PATH

# Configuración del entorno
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Crear directorios necesarios
RUN mkdir -p /app/logs /app/app/static/audio

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 8001

# Comando de inicio
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--proxy-headers"]
