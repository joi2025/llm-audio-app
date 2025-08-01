from setuptools import setup, find_packages

setup(
    name="llm-audio-app",
    version="0.1.0",
    packages=find_packages(where="."),
    package_dir={"": "."},
    install_requires=[
        "fastapi>=0.104.1",
        "uvicorn>=0.24.0",
        "pydub>=0.25.1",
        "whisper>=1.0.0",
        "edge-tts>=7.0.2",
        "openai>=1.3.0",
        "librosa>=0.10.0",
        "sounddevice>=0.4.6",
        "soundfile>=0.12.1",
        "structlog>=24.1.0",
        "prometheus-client>=0.19.0"
    ],
    extras_require={
        "test": [
            "pytest>=7.4.3",
            "pytest-asyncio>=0.23.3"
        ],
        "dev": [
            "black>=23.10.1",
            "isort>=5.13.2",
            "flake8>=6.1.0"
        ]
    },
    python_requires=">=3.11"
)
