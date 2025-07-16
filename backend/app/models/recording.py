from pydantic import BaseModel

class Recording(BaseModel):
    id: int
    filename: str
    status: str

