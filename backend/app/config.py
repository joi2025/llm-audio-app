import os
from dotenv import load_dotenv, find_dotenv
from pathlib import Path

# Ensure we load the .env located at backend/.env regardless of CWD
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_ENV_PATH = _BACKEND_ROOT / '.env'
load_dotenv(dotenv_path=str(_ENV_PATH), override=True)

class Config:
    def __init__(self):
        self.SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
        self.CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
        self.OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.PORT = int(os.getenv("PORT", "8001"))
        # Models
        self.STT_MODEL = os.getenv("STT_MODEL", "whisper-1")
        self.CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o-mini")
        self.TTS_MODEL = os.getenv("TTS_MODEL", "gpt-4o-mini-tts")
        self.TTS_VOICE = os.getenv("TTS_VOICE", "alloy")

    def to_dict(self):
        return self.__dict__.copy()
