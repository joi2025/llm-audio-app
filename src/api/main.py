from __future__ import annotations
import os, asyncio
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
import structlog
from contextlib import asynccontextmanager

logger = structlog.get_logger(__name__)

app = FastAPI(title="llm-audio-app", version="0.1.0")

@app.post("/transcribe")
async def transcribe_endpoint(file: UploadFile = File(...)):
    """
    Transcribe audio file to text.
    
    Args:
        file: Audio file (wav or mp3)
        
    Returns:
        Dict with transcription result
        
    Raises:
        HTTPException: If file type is invalid
    """
    if file.content_type not in {"audio/wav", "audio/mpeg"}:
        raise HTTPException(422, "Invalid type")
    
    tmp = Path("/tmp") / file.filename
    try:
        tmp.write_bytes(await file.read())
        from src.stt import transcribe
        result = await transcribe(str(tmp))
        return result
    finally:
        tmp.unlink()

@app.post("/chat")
async def chat_endpoint(
    audio: UploadFile | None = None,
    text: str | None = Form(None)
):
    """
    Process chat request with either audio or text input.
    
    Args:
        audio: Audio file (optional)
        text: Text input (optional)
        
    Returns:
        Chat response with text and audio URL
    """
    try:
        if not audio and not text:
            raise HTTPException(400, "Either audio or text must be provided")
        
        # Get LLM client
        llm = LLMClient(
            provider=os.getenv("LLM_PROVIDER", "openai"),
            model=os.getenv("LLM_MODEL", "gpt-3.5-turbo")
        )
        
        # Process input
        if audio:
            # Transcribe audio
            from src.stt import transcribe
            tmp = Path("/tmp") / audio.filename
            try:
                tmp.write_bytes(await audio.read())
                transcript = await transcribe(str(tmp))
                user_input = transcript["text"]
            finally:
                tmp.unlink()
        else:
            user_input = text
        
        # Get chat response
        messages = [
            {"role": "user", "content": user_input}
        ]
        response = await llm.chat(messages)
        
        # Synthesize response
        audio_response = await synthesize(response)
        
        # Save audio response
        tmp_wav = Path("/tmp") / "response.wav"
        await save_wav(audio_response, tmp_wav)
        
        return {
            "text": response,
            "audio_url": f"/tmp/{tmp_wav.name}"
        }
    except Exception as e:
        logger.error("Error in chat endpoint", error=str(e))
        raise HTTPException(500, f"Internal server error: {str(e)}")

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok"}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """App lifespan context manager"""
    # Download Whisper model on startup
    try:
        from src.stt import transcribe
        # Create dummy file for model download
        with open("dummy.wav", "wb") as f:
            f.write(b"\x00" * 1024)  # Empty WAV file
        await transcribe("dummy.wav")
        os.unlink("dummy.wav")
    except Exception as e:
        logger.error("Failed to initialize Whisper model", error=str(e))
        raise
    
    yield

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.api.main:app",
        host="0.0.0.0",
        port=int(os.getenv("API_PORT", 8000)),
        reload=True
    )
