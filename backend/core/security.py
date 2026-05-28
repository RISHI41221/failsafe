from __future__ import annotations

from datetime import datetime, timedelta, timezone
import bcrypt
from jose import jwt

# Replace this with a secret loaded from environment configuration in production.
SECRET_KEY = "f4ilsafe-change-this-secret-key-before-production-deployment"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def verify_password(plain: str, hashed: str) -> bool:
    """Validate a plaintext password against its hashed value."""
    return bcrypt.checkpw(
        plain.encode("utf-8"), 
        hashed.encode("utf-8")
    )

def get_password_hash(password: str) -> str:
    """Generate a secure password hash for storage."""
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed_bytes.decode("utf-8")

def create_access_token(data: dict) -> str:
    """Create a signed JWT access token with an expiration timestamp."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)