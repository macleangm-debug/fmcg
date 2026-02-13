"""
Core Configuration Module
Centralizes all database connections, settings, and shared utilities
"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from dotenv import load_dotenv
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()

# Environment Configuration
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "retail_db")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
JWT_SECRET = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database Connections
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

sync_client = MongoClient(MONGO_URL)
sync_db = sync_client[DB_NAME]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    """Create a JWT access token"""
    from datetime import timedelta
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current authenticated user"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        business_id = payload.get("business_id")
        role = payload.get("role", "user")
        
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        
        return {
            "user_id": user_id,
            "business_id": business_id,
            "role": role,
            "email": payload.get("email"),
            "name": payload.get("name")
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")


async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Optional authentication - returns None if no valid token"""
    try:
        if credentials is None:
            return None
        return await get_current_user(credentials)
    except HTTPException:
        return None


def serialize_doc(doc: dict) -> dict:
    """Serialize MongoDB document by converting ObjectId to string"""
    if doc is None:
        return None
    
    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["id"] = str(value)
        elif hasattr(value, "__str__") and type(value).__name__ == "ObjectId":
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        elif isinstance(value, list):
            result[key] = [serialize_doc(v) if isinstance(v, dict) else v for v in value]
        else:
            result[key] = value
    return result
