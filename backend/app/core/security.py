from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import WebSocket, status, HTTPException
from fastapi.security import OAuth2PasswordBearer
from pydantic import ValidationError

from ..models.auth import TokenData, UserInDB
from ..config import settings

# Configuración de seguridad
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

# Constantes
CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="No se pudieron validar las credenciales",
    headers={"WWW-Authenticate": "Bearer"},
)

def create_access_token(
    subject: Union[str, Any], 
    expires_delta: Optional[timedelta] = None,
    scopes: Optional[list] = None
) -> str:
    """
    Crea un token JWT de acceso.
    
    Args:
        subject: El sujeto del token (normalmente el ID de usuario o email)
        expires_delta: Tiempo de expiración del token
        scopes: Lista de permisos/roles del usuario
        
    Returns:
        str: Token JWT codificado
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "scopes": scopes or [],
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica una contraseña contra un hash.
    
    Args:
        plain_password: Contraseña en texto plano
        hashed_password: Hash de la contraseña
        
    Returns:
        bool: True si la contraseña es válida, False en caso contrario
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Genera un hash de la contraseña.
    
    Args:
        password: Contraseña en texto plano
        
    Returns:
        str: Hash de la contraseña
    """
    return pwd_context.hash(password)

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodifica un token JWT.
    
    Args:
        token: Token JWT a decodificar
        
    Returns:
        Optional[Dict]: Payload del token si es válido, None en caso contrario
    """
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        return payload if payload.get("sub") else None
    except JWTError:
        return None

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    """
    Obtiene el usuario actual a partir del token JWT.
    
    Args:
        token: Token JWT
        
    Returns:
        UserInDB: Usuario autenticado
        
    Raises:
        HTTPException: Si el token es inválido o el usuario no existe
    """
    try:
        payload = decode_token(token)
        if payload is None:
            raise CREDENTIALS_EXCEPTION
            
        token_data = TokenData(
            username=payload.get("sub"),
            email=payload.get("email"),
            scopes=payload.get("scopes", []),
        )
        
        # Aquí iría la lógica para obtener el usuario de la base de datos
        # Por ahora, usamos un usuario simulado
        user = get_user(username=token_data.username)
        if user is None:
            raise CREDENTIALS_EXCEPTION
            
        return user
        
    except (JWTError, ValidationError):
        raise CREDENTIALS_EXCEPTION

async def get_current_active_user(
    current_user: UserInDB = Depends(get_current_user),
) -> UserInDB:
    """
    Verifica que el usuario esté activo.
    
    Args:
        current_user: Usuario actual
        
    Returns:
        UserInDB: Usuario si está activo
        
    Raises:
        HTTPException: Si el usuario está inactivo
    """
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    return current_user

async def get_current_active_superuser(
    current_user: UserInDB = Depends(get_current_user),
) -> UserInDB:
    """
    Verifica que el usuario sea un superusuario.
    
    Args:
        current_user: Usuario actual
        
    Returns:
        UserInDB: Usuario si es superusuario
        
    Raises:
        HTTPException: Si el usuario no es superusuario
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario no tiene suficientes privilegios",
        )
    return current_user

async def get_websocket_user(
    websocket: WebSocket,
    token: Optional[str] = None,
) -> Optional[UserInDB]:
    """
    Obtiene el usuario actual para conexiones WebSocket.
    
    Args:
        websocket: Conexión WebSocket
        token: Token JWT (opcional, se puede extraer de la URL)
        
    Returns:
        Optional[UserInDB]: Usuario autenticado o None si no está autenticado
    """
    if token is None:
        # Intentar obtener el token de los parámetros de consulta
        query_params = dict(websocket.query_params)
        token = query_params.get("token")
    
    if not token:
        return None
    
    try:
        payload = decode_token(token)
        if payload is None:
            return None
            
        token_data = TokenData(
            username=payload.get("sub"),
            email=payload.get("email"),
            scopes=payload.get("scopes", []),
        )
        
        # Aquí iría la lógica para obtener el usuario de la base de datos
        # Por ahora, usamos un usuario simulado
        user = get_user(username=token_data.username)
        return user
        
    except (JWTError, ValidationError):
        return None

def get_user(username: str) -> Optional[UserInDB]:
    """
    Obtiene un usuario por su nombre de usuario.
    
    NOTA: Esta es una implementación de ejemplo. En producción, 
    esto debería consultar una base de datos.
    
    Args:
        username: Nombre de usuario
        
    Returns:
        Optional[UserInDB]: Usuario si existe, None en caso contrario
    """
    # Usuario de ejemplo para pruebas
    if username == "admin":
        return UserInDB(
            username="admin",
            email="admin@example.com",
            hashed_password=get_password_hash("admin"),
            is_superuser=True,
        )
    return None

