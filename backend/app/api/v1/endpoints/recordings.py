from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from typing import List

router = APIRouter()

class Recording(BaseModel):
    id: int
    filename: str
    status: str

# Dummy in-memory storage
recordings_db = []

@router.post("/upload", response_model=Recording)
async def upload_recording(file: UploadFile = File(...)):
    rec = Recording(id=len(recordings_db)+1, filename=file.filename, status="uploaded")
    recordings_db.append(rec)
    return rec

@router.get("/", response_model=List[Recording])
async def list_recordings():
    return recordings_db

