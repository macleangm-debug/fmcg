"""
Referral Routes
Handles user referral system - generating codes, tracking referrals, and managing rewards
"""
import os
import logging
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from bson import ObjectId
import jwt

# Import email service for sending referral notifications
try:
    from services.email_service import (
        send_referral_invite_email,
        send_referral_signup_notification,
        send_referral_milestone_email
    )
    EMAIL_SERVICE_AVAILABLE = True
except ImportError:
    EMAIL_SERVICE_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Email service not available - emails will be skipped")

# Setup logging
logger = logging.getLogger(__name__)

# Router
router = APIRouter(prefix="/referrals", tags=["Referrals"])

# Security
security = HTTPBearer()

# Database connection (will be set on import)
db = None

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'retail-management-secret-key-2025')
JWT_ALGORITHM = "HS256"


def set_database(database):
    """Set the database connection for this router"""
    global db
    db = database
    logger.info("Referral routes database set")


def generate_referral_code(length=8):
    """Generate a unique referral code"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return {
            "id": str(user["_id"]),
            "email": user.get("email"),
            "name": user.get("name"),
            "role": user.get("role")
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============== MODELS ==============

class ReferralInvite(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class ApplyReferralCode(BaseModel):
    referral_code: str


# ============== USER REFERRAL ENDPOINTS ==============

@router.get("/my-referral")
async def get_my_referral_info(current_user: dict = Depends(get_current_user)):
    """Get current user's referral code and stats"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = current_user.get("id")
    
    # Get or create user's referral code
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    referral_code = user.get("referral_code")
    
    # Generate referral code if user doesn't have one
    if not referral_code:
        # Generate unique code
        while True:
            referral_code = generate_referral_code()
            existing = await db.users.find_one({"referral_code": referral_code})
            if not existing:
                break
        
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"referral_code": referral_code}}
        )
    
    # Get referral config for rewards info
    config = await db.referral_config.find_one({"is_active": True})
    referrer_reward = config.get("referrer_reward", 10) if config else 10
    referee_reward = config.get("referee_reward", 10) if config else 10
    
    # Count successful referrals
    successful_referrals = await db.referrals.count_documents({
        "referrer_id": user_id,
        "status": "completed"
    })
    
    pending_referrals = await db.referrals.count_documents({
        "referrer_id": user_id,
        "status": "pending"
    })
    
    # Calculate total earnings from referrals
    pipeline = [
        {"$match": {"referrer_id": user_id, "status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$referrer_reward_amount"}}}
    ]
    earnings_result = await db.referrals.aggregate(pipeline).to_list(1)
    total_earned = earnings_result[0]["total"] if earnings_result else 0
    
    # Get user's current credit balance
    credit_balance = user.get("credit_balance", 0)
    
    # Get referral history
    referrals = await db.referrals.find({"referrer_id": user_id}).sort("created_at", -1).limit(10).to_list(10)
    
    referral_history = []
    for ref in referrals:
        referee = await db.users.find_one({"_id": ObjectId(ref["referee_id"])}) if ref.get("referee_id") else None
        referral_history.append({
            "id": str(ref["_id"]),
            "referee_name": referee.get("name", "Unknown") if referee else ref.get("referee_name", "Pending"),
            "referee_email": ref.get("referee_email", ""),
            "status": ref.get("status", "pending"),
            "reward_earned": ref.get("referrer_reward_amount", 0) if ref.get("status") == "completed" else 0,
            "created_at": ref.get("created_at").isoformat() if isinstance(ref.get("created_at"), datetime) else str(ref.get("created_at", ""))
        })
    
    # Generate shareable link
    base_url = os.environ.get("FRONTEND_URL", "https://unified-layout-sync.preview.emergentagent.com")
    referral_link = f"{base_url}/signup?ref={referral_code}"
    
    return {
        "referral_code": referral_code,
        "referral_link": referral_link,
        "stats": {
            "successful_referrals": successful_referrals,
            "pending_referrals": pending_referrals,
            "total_earned": total_earned,
            "credit_balance": credit_balance
        },
        "rewards": {
            "referrer_reward": referrer_reward,
            "referee_reward": referee_reward,
            "reward_type": "credit"
        },
        "referral_history": referral_history
    }


@router.post("/invite")
async def send_referral_invite(
    invite: ReferralInvite, 
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Send a referral invite to a friend (creates pending referral)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = current_user.get("id")
    
    # Check if email already exists as a user
    existing_user = await db.users.find_one({"email": invite.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="This email is already registered")
    
    # Check if already invited
    existing_invite = await db.referrals.find_one({
        "referrer_id": user_id,
        "referee_email": invite.email
    })
    if existing_invite:
        raise HTTPException(status_code=400, detail="You've already invited this email")
    
    # Get user's referral code
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    referral_code = user.get("referral_code")
    
    if not referral_code:
        # Generate one if missing
        while True:
            referral_code = generate_referral_code()
            existing = await db.users.find_one({"referral_code": referral_code})
            if not existing:
                break
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"referral_code": referral_code}})
    
    # Get config for reward amounts
    config = await db.referral_config.find_one({"is_active": True})
    referrer_reward = config.get("referrer_reward", 10) if config else 10
    referee_reward = config.get("referee_reward", 10) if config else 10
    
    # Create pending referral
    referral_doc = {
        "referrer_id": user_id,
        "referrer_email": user.get("email"),
        "referrer_name": user.get("name"),
        "referee_email": invite.email,
        "referee_name": invite.name,
        "referee_id": None,
        "referral_code": referral_code,
        "status": "pending",
        "referrer_reward_amount": referrer_reward,
        "referee_reward_amount": referee_reward,
        "created_at": datetime.utcnow(),
        "completed_at": None
    }
    
    result = await db.referrals.insert_one(referral_doc)
    
    # Send email invitation in background
    if EMAIL_SERVICE_AVAILABLE:
        base_url = os.environ.get("FRONTEND_URL", os.environ.get("API_BASE_URL", "https://unified-layout-sync.preview.emergentagent.com"))
        referral_link = f"{base_url}/signup?ref={referral_code}"
        background_tasks.add_task(
            send_referral_invite_email,
            to_email=invite.email,
            inviter_name=user.get("name", "A friend"),
            referee_name=invite.name,
            referral_code=referral_code,
            referral_link=referral_link,
            reward_amount=referee_reward
        )
    
    return {
        "success": True,
        "message": f"Invitation sent to {invite.email}",
        "referral_id": str(result.inserted_id)
    }


@router.post("/apply-code")
async def apply_referral_code(data: ApplyReferralCode, current_user: dict = Depends(get_current_user)):
    """Apply a referral code to current user (for users who signed up without code)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = current_user.get("id")
    
    # Check if user already has a referrer
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user.get("referred_by"):
        raise HTTPException(status_code=400, detail="You've already used a referral code")
    
    # Find referrer by code
    referrer = await db.users.find_one({"referral_code": data.referral_code.upper()})
    if not referrer:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    
    # Can't refer yourself
    if str(referrer["_id"]) == user_id:
        raise HTTPException(status_code=400, detail="You cannot use your own referral code")
    
    # Get config
    config = await db.referral_config.find_one({"is_active": True})
    referrer_reward = config.get("referrer_reward", 10) if config else 10
    referee_reward = config.get("referee_reward", 10) if config else 10
    
    # Create completed referral
    referral_doc = {
        "referrer_id": str(referrer["_id"]),
        "referrer_email": referrer.get("email"),
        "referrer_name": referrer.get("name"),
        "referee_id": user_id,
        "referee_email": user.get("email"),
        "referee_name": user.get("name"),
        "referral_code": data.referral_code.upper(),
        "status": "completed",
        "referrer_reward_amount": referrer_reward,
        "referee_reward_amount": referee_reward,
        "created_at": datetime.utcnow(),
        "completed_at": datetime.utcnow()
    }
    
    await db.referrals.insert_one(referral_doc)
    
    # Credit both users
    await db.users.update_one(
        {"_id": referrer["_id"]},
        {"$inc": {"credit_balance": referrer_reward}}
    )
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$inc": {"credit_balance": referee_reward},
            "$set": {"referred_by": str(referrer["_id"])}
        }
    )
    
    # Create credit transactions
    await db.credit_transactions.insert_many([
        {
            "user_id": str(referrer["_id"]),
            "amount": referrer_reward,
            "type": "referral_bonus",
            "description": f"Referral bonus for inviting {user.get('name', user.get('email'))}",
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
    
    return {
        "success": True,
        "message": f"Referral code applied! You received ${referee_reward} credit!",
        "credit_received": referee_reward
    }


@router.get("/my-credits")
async def get_my_credits(current_user: dict = Depends(get_current_user)):
    """Get current user's credit balance and transaction history"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = current_user.get("id")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    credit_balance = user.get("credit_balance", 0) if user else 0
    
    # Get transaction history
    transactions = await db.credit_transactions.find({"user_id": user_id}).sort("created_at", -1).limit(20).to_list(20)
    
    transaction_history = []
    for txn in transactions:
        transaction_history.append({
            "id": str(txn["_id"]),
            "amount": txn.get("amount", 0),
            "type": txn.get("type", ""),
            "description": txn.get("description", ""),
            "created_at": txn.get("created_at").isoformat() if isinstance(txn.get("created_at"), datetime) else str(txn.get("created_at", ""))
        })
    
    return {
        "credit_balance": credit_balance,
        "transactions": transaction_history
    }


@router.post("/redeem")
async def redeem_credits(amount: float, current_user: dict = Depends(get_current_user)):
    """Redeem credits for discount on next purchase"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = current_user.get("id")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    credit_balance = user.get("credit_balance", 0) if user else 0
    
    if amount > credit_balance:
        raise HTTPException(status_code=400, detail="Insufficient credit balance")
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    
    # Deduct credits
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"credit_balance": -amount}}
    )
    
    # Create redemption transaction
    await db.credit_transactions.insert_one({
        "user_id": user_id,
        "amount": -amount,
        "type": "redemption",
        "description": f"Redeemed ${amount} credit for discount",
        "created_at": datetime.utcnow()
    })
    
    return {
        "success": True,
        "message": f"Successfully redeemed ${amount} credit",
        "new_balance": credit_balance - amount
    }


# ============== PUBLIC ENDPOINTS (No Auth Required) ==============

@router.get("/validate/{code}")
async def validate_referral_code(code: str):
    """Validate a referral code (public - used during signup)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    referrer = await db.users.find_one({"referral_code": code.upper()})
    
    if not referrer:
        return {"valid": False, "message": "Invalid referral code"}
    
    # Get config for reward amount
    config = await db.referral_config.find_one({"is_active": True})
    referee_reward = config.get("referee_reward", 10) if config else 10
    
    return {
        "valid": True,
        "referrer_name": referrer.get("name", "A friend"),
        "reward_amount": referee_reward,
        "message": f"You'll receive ${referee_reward} credit when you sign up!"
    }


@router.get("/validate-code/{code}")
async def validate_any_code(code: str):
    """
    Unified code validation - checks both user referral codes and affiliate promo codes.
    Returns code type and associated benefits.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    code_upper = code.upper().strip()
    
    # First, check if it's a user referral code
    referrer = await db.users.find_one({"referral_code": code_upper})
    if referrer:
        config = await db.referral_config.find_one({"is_active": True})
        referee_reward = config.get("referee_reward", 10) if config else 10
        
        return {
            "valid": True,
            "code_type": "referral",
            "code": code_upper,
            "referrer_name": referrer.get("name", "A friend"),
            "benefit": {
                "type": "credit",
                "amount": referee_reward,
                "description": f"${referee_reward} credit on signup"
            },
            "message": f"Referral code valid! You'll receive ${referee_reward} credit when you sign up!"
        }
    
    # Check if it's an affiliate promo code
    promo_code = await db.promo_codes.find_one({
        "code": code_upper,
        "status": "active"
    })
    
    if promo_code:
        # Check validity dates if present
        now = datetime.utcnow()
        if promo_code.get("valid_from") and promo_code["valid_from"] > now:
            return {"valid": False, "message": "This promo code is not yet active"}
        if promo_code.get("valid_until") and promo_code["valid_until"] < now:
            return {"valid": False, "message": "This promo code has expired"}
        
        # Check max uses
        if promo_code.get("max_uses") and promo_code.get("current_uses", 0) >= promo_code["max_uses"]:
            return {"valid": False, "message": "This promo code has reached its usage limit"}
        
        discount_type = promo_code.get("discount_type", "percentage")
        discount_value = promo_code.get("discount_value", 0)
        
        benefit_desc = f"{discount_value}% off" if discount_type == "percentage" else f"${discount_value} off"
        
        return {
            "valid": True,
            "code_type": "promo",
            "code": code_upper,
            "affiliate_id": promo_code.get("affiliate_id"),
            "benefit": {
                "type": "discount",
                "discount_type": discount_type,
                "discount_value": discount_value,
                "description": benefit_desc
            },
            "message": f"Promo code valid! You'll get {benefit_desc} on your purchase!"
        }
    
    # Code not found
    return {
        "valid": False,
        "code_type": None,
        "message": "Invalid code. Please check and try again."
    }
