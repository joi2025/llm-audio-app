from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()

class Transcript(BaseModel):
    id: int
    recording_id: int
    text: str

# Dummy data
transcripts_db = [
    Transcript(id=1, recording_id=1, text="Hola mundo transcrito")
]

@router.get("/", response_model=List[Transcript])
async def list_transcripts():
    return transcripts_db

