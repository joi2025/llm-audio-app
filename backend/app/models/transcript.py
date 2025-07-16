from pydantic import BaseModel

class Transcript(BaseModel):
    id: int
    recording_id: int
    text: str

