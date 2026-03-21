import random
import string
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

VALID_UNIVERSITY_DOMAINS = [
    ".edu",
    ".utoronto.ca",
    ".mail.utoronto.ca",
    ".yorku.ca",
    ".ryerson.ca",
    ".torontomu.ca",
    ".ocadu.ca",
]


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def is_valid_university_email(email: str) -> bool:
    email = email.lower().strip()
    domain = email.split("@")[-1] if "@" in email else ""
    for valid_domain in VALID_UNIVERSITY_DOMAINS:
        suffix = valid_domain.lstrip(".")
        if domain == suffix or domain.endswith("." + suffix):
            return True
    return False
