from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.security import create_access_token, verify_password, get_password_hash

router = APIRouter()

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Dummy user for demo
fake_user = {
    "username": "admin",
    "hashed_password": get_password_hash("admin123")
}

@router.post("/login", response_model=Token)
def login(data: UserLogin):
    if data.username != fake_user["username"] or not verify_password(data.password, fake_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    token = create_access_token({"sub": data.username})
    return {"access_token": token, "token_type": "bearer"}

