"""
Authentication Routes
Handles user registration, login, and token management
"""
import os
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import jwt
import bcrypt

# Setup logging
logger = logging.getLogger(__name__)

# Router
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Security
security = HTTPBearer()

# Database connection (will be set on import)
db = None

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'retail-management-secret-key-2025')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


def set_database(database):
    """Set the database connection for this router"""
    global db
    db = database


# ============== MODELS ==============

class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[dict] = None


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    business_id: Optional[str] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class UserRegister(BaseModel):
    """Simple user registration model"""
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = "sales_staff"
    referral_code: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_token(user_id: str, email: str, role: str, business_id: str = None) -> str:
    """Create a JWT token"""
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "business_id": business_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get the current authenticated user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "business_id": user.get("business_id"),
            "is_active": user.get("is_active", True)
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_superadmin_user(current_user: dict = Depends(get_current_user)):
    """Verify current user is a superadmin"""
    if current_user["role"] != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return current_user


# ============== ENDPOINTS ==============

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """
    Login with email and password
    Returns JWT token on success
    """
    logger.info(f"Login attempt for email: {credentials.email}")
    
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        logger.warning(f"Login failed - user not found: {credentials.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    logger.info(f"User found: {credentials.email}, role: {user.get('role')}")
    logger.info(f"Verifying password for user: {credentials.email}")
    
    if not verify_password(credentials.password, user["password_hash"]):
        logger.warning(f"Login failed - invalid password: {credentials.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        logger.warning(f"Login failed - inactive account: {credentials.email}")
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    # Update last login
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    user_id = str(user["_id"])
    business_id = user.get("business_id")
    
    # Create token
    token = create_token(user_id, credentials.email, user["role"], business_id)
    
    logger.info(f"Login successful for: {credentials.email}")
    
    return TokenResponse(
        access_token=token,
        user={
            "id": user_id,
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "business_id": business_id
        }
    )


@router.post("/register", response_model=TokenResponse)
async def register_user(user_data: UserRegister):
    """
    Register a new user account.
    Handles both referral codes (user-to-user) and promo codes (affiliate).
    """
    logger.info(f"Registration attempt for email: {user_data.email}")
    
    # Check if email already exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        logger.warning(f"Registration failed - email exists: {user_data.email}")
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate a unique referral code for this new user
    import secrets
    import string
    chars = string.ascii_uppercase + string.digits
    user_referral_code = ''.join(secrets.choice(chars) for _ in range(8))
    
    # Ensure referral code is unique
    while await db.users.find_one({"referral_code": user_referral_code}):
        user_referral_code = ''.join(secrets.choice(chars) for _ in range(8))
    
    # Initialize variables for referral/promo handling
    referrer = None
    promo_code_doc = None
    referee_reward = 0
    code_type = None
    
    # Check if a referral/promo code was provided
    if user_data.referral_code:
        code_upper = user_data.referral_code.upper().strip()
        
        # First check if it's a user referral code
        referrer = await db.users.find_one({"referral_code": code_upper})
        if referrer:
            code_type = "referral"
            # Get referral config for rewards
            config = await db.referral_config.find_one({"is_active": True})
            if config:
                referee_reward = config.get("referee_reward", 10)
                referrer_reward = config.get("referrer_reward", 10)
            else:
                referee_reward = 10
                referrer_reward = 10
            logger.info(f"Valid referral code found: {code_upper}")
        else:
            # Check if it's an affiliate promo code
            promo_code_doc = await db.promo_codes.find_one({
                "code": code_upper,
                "status": "active"
            })
            if promo_code_doc:
                code_type = "promo"
                logger.info(f"Valid promo code found: {code_upper}")
    
    # Create user document
    user_doc = {
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role if user_data.role in ["admin", "manager", "sales_staff"] else "sales_staff",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "credit_balance": referee_reward,
        "referral_code": user_referral_code,
        "referred_by": str(referrer["_id"]) if referrer else None,
        "signup_promo_code": promo_code_doc.get("code") if promo_code_doc else None,
        "affiliate_id": promo_code_doc.get("affiliate_id") if promo_code_doc else None
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Process referral rewards
    if referrer and code_type == "referral":
        # Credit the referrer
        await db.users.update_one(
            {"_id": referrer["_id"]},
            {"$inc": {"credit_balance": referrer_reward}}
        )
        
        # Create referral record
        referral_doc = {
            "referrer_id": str(referrer["_id"]),
            "referrer_email": referrer.get("email"),
            "referrer_name": referrer.get("name"),
            "referee_id": user_id,
            "referee_email": user_data.email,
            "referee_name": user_data.name,
            "referral_code": user_data.referral_code.upper(),
            "status": "completed",
            "referrer_reward_amount": referrer_reward,
            "referee_reward_amount": referee_reward,
            "created_at": datetime.utcnow(),
            "completed_at": datetime.utcnow()
        }
        await db.referrals.insert_one(referral_doc)
        
        # Create credit transactions
        await db.credit_transactions.insert_many([
            {
                "user_id": str(referrer["_id"]),
                "amount": referrer_reward,
                "type": "referral_bonus",
                "description": f"Referral bonus for inviting {user_data.name}",
                "created_at": datetime.utcnow()
            },
            {
                "user_id": user_id,
                "amount": referee_reward,
                "type": "signup_bonus",
                "description": f"Welcome bonus from referral by {referrer.get('name', referrer.get('email'))}",
                "created_at": datetime.utcnow()
            }
        ])
        logger.info(f"Referral processed: {referrer.get('email')} -> {user_data.email}")
    
    # Track promo code usage for affiliate
    if promo_code_doc and code_type == "promo":
        await db.promo_codes.update_one(
            {"_id": promo_code_doc["_id"]},
            {"$inc": {"current_uses": 1}}
        )
        # Record the signup for affiliate tracking
        await db.affiliate_signups.insert_one({
            "affiliate_id": promo_code_doc.get("affiliate_id"),
            "promo_code": promo_code_doc.get("code"),
            "user_id": user_id,
            "user_email": user_data.email,
            "created_at": datetime.utcnow()
        })
        logger.info(f"Promo code signup tracked: {promo_code_doc.get('code')} -> {user_data.email}")
    
    # Create token
    token = create_token(user_id, user_data.email, user_doc["role"], None)
    
    logger.info(f"Registration successful for: {user_data.email}")
    
    return TokenResponse(
        access_token=token,
        user={
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "role": user_doc["role"],
            "business_id": None,
            "credit_balance": referee_reward,
            "referral_code": user_referral_code
        }
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        business_id=current_user.get("business_id")
    )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """Change current user's password"""
    user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    
    if not verify_password(request.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_hash = hash_password(request.new_password)
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {
            "password_hash": new_hash,
            "password_changed_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Password changed successfully"}


@router.post("/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """
    Request password reset
    In production, this would send an email with reset link
    """
    user = await db.users.find_one({"email": request.email})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}
    
    # Generate reset token
    import secrets
    reset_token = secrets.token_urlsafe(32)
    
    await db.password_resets.insert_one({
        "user_id": str(user["_id"]),
        "token": reset_token,
        "expires_at": datetime.utcnow() + timedelta(hours=1),
        "used": False,
        "created_at": datetime.utcnow()
    })
    
    # In production, send email with reset link
    # For now, log the token (remove in production)
    logger.info(f"Password reset token for {request.email}: {reset_token}")
    
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(request: PasswordResetConfirm):
    """
    Reset password using token from email
    """
    reset = await db.password_resets.find_one({
        "token": request.token,
        "used": False,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Update password
    new_hash = hash_password(request.new_password)
    
    await db.users.update_one(
        {"_id": ObjectId(reset["user_id"])},
        {"$set": {
            "password_hash": new_hash,
            "password_changed_at": datetime.utcnow()
        }}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"_id": reset["_id"]},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout current user
    In a stateless JWT system, this is mainly for audit logging
    """
    await db.audit_logs.insert_one({
        "user_id": current_user["id"],
        "action": "logout",
        "timestamp": datetime.utcnow()
    })
    
    return {"message": "Logged out successfully"}


@router.post("/refresh-token", response_model=TokenResponse)
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """
    Refresh JWT token
    Returns a new token with extended expiration
    """
    token = create_token(
        current_user["id"],
        current_user["email"],
        current_user["role"],
        current_user.get("business_id")
    )
    
    return TokenResponse(
        access_token=token,
        user={
            "id": current_user["id"],
            "email": current_user["email"],
            "name": current_user["name"],
            "role": current_user["role"],
            "business_id": current_user.get("business_id")
        }
    )
