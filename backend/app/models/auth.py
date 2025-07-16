from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    """Modelo para la respuesta de autenticación"""
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    """Datos contenidos en el token JWT"""
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    scopes: List[str] = []

class UserBase(BaseModel):
    """Modelo base para usuarios"""
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    disabled: bool = False

class UserCreate(UserBase):
    """Modelo para crear un usuario (incluye contraseña)"""
    password: str = Field(..., min_length=8)

class UserInDB(UserBase):
    """Modelo para usuario en base de datos"""
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    roles: List[str] = ["user"]

    class Config:
        from_attributes = True  # Para compatibilidad con SQLAlchemy

class UserResponse(UserBase):
    """Modelo para respuesta de usuario (sin contraseña)"""
    id: int
    created_at: datetime
    roles: List[str] = []

    class Config:
        from_attributes = True

class LoginCredentials(BaseModel):
    """Modelo para credenciales de inicio de sesión"""
    username: str
    password: str
    remember_me: bool = False

