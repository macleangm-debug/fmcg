"""
Business Routes
Handles business profile management and multi-business operations
"""
import os
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import jwt
import uuid

# Setup logging
logger = logging.getLogger(__name__)

# Router
router = APIRouter(prefix="/business", tags=["Business"])

# Security
security = HTTPBearer()

# Database connection
db = None

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'retail-management-secret-key-2025')
JWT_ALGORITHM = "HS256"


def set_dependencies(database):
    """Set the database connection for this router"""
    global db
    db = database
    logger.info("Business routes dependencies set")


# ============== MODELS ==============

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
    logo_url: Optional[str] = None
    tax_id: Optional[str] = None
    industry: Optional[str] = None


class BusinessCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    currency: str = "TZS"
    timezone: str = "Africa/Dar_es_Salaam"
    industry: Optional[str] = None


class BusinessDetailsResponse(BaseModel):
    id: str
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    currency: str = "TZS"
    timezone: str = "Africa/Dar_es_Salaam"
    logo_url: Optional[str] = None
    tax_id: Optional[str] = None
    industry: Optional[str] = None
    created_at: Optional[str] = None


class UserBusinessListResponse(BaseModel):
    businesses: List[dict]
    current_business_id: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

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


# ============== ENDPOINTS ==============

@router.get("", response_model=BusinessDetailsResponse)
async def get_business_details(current_user: dict = Depends(get_current_user)):
    """Get current business details"""
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=404, detail="No business associated with user")
    
    business = await db.businesses.find_one({"_id": ObjectId(business_id)})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    return BusinessDetailsResponse(
        id=str(business["_id"]),
        name=business.get("name", ""),
        address=business.get("address"),
        phone=business.get("phone"),
        email=business.get("email"),
        currency=business.get("currency", "TZS"),
        timezone=business.get("timezone", "Africa/Dar_es_Salaam"),
        logo_url=business.get("logo_url"),
        tax_id=business.get("tax_id"),
        industry=business.get("industry"),
        created_at=business.get("created_at", datetime.utcnow()).isoformat() if business.get("created_at") else None
    )


@router.put("")
async def update_business(
    update: BusinessUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update business details"""
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=404, detail="No business associated with user")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.businesses.update_one(
        {"_id": ObjectId(business_id)},
        {"$set": update_data}
    )
    
    business = await db.businesses.find_one({"_id": ObjectId(business_id)})
    
    return {
        "message": "Business updated successfully",
        "business": {
            "id": str(business["_id"]),
            "name": business.get("name"),
            "address": business.get("address"),
            "phone": business.get("phone"),
            "email": business.get("email"),
            "currency": business.get("currency"),
            "timezone": business.get("timezone"),
            "logo_url": business.get("logo_url"),
            "industry": business.get("industry")
        }
    }


# User multi-business management routes
user_router = APIRouter(prefix="/user/businesses", tags=["User Businesses"])


@user_router.get("", response_model=UserBusinessListResponse)
async def get_user_businesses(current_user: dict = Depends(get_current_user)):
    """Get all businesses associated with user"""
    user_id = current_user["id"]
    current_business_id = current_user.get("business_id")
    
    # Get businesses where user is owner or member
    user_businesses = await db.business_members.find({
        "user_id": user_id
    }).to_list(None)
    
    business_ids = [bm.get("business_id") for bm in user_businesses if bm.get("business_id")]
    
    # Also include current business if not in list
    if current_business_id and current_business_id not in business_ids:
        business_ids.append(current_business_id)
    
    businesses = []
    for bid in business_ids:
        try:
            business = await db.businesses.find_one({"_id": ObjectId(bid)})
            if business:
                # Get user's role in this business
                member = next((bm for bm in user_businesses if bm.get("business_id") == bid), None)
                role = member.get("role", "member") if member else "owner"
                
                businesses.append({
                    "id": str(business["_id"]),
                    "name": business.get("name", ""),
                    "industry": business.get("industry"),
                    "role": role,
                    "is_current": bid == current_business_id
                })
        except Exception:
            continue
    
    return UserBusinessListResponse(
        businesses=businesses,
        current_business_id=current_business_id
    )


@user_router.post("/switch")
async def switch_business(
    business_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Switch to a different business"""
    user_id = current_user["id"]
    
    # Verify user has access to this business
    has_access = await db.business_members.find_one({
        "user_id": user_id,
        "business_id": business_id
    })
    
    # Also check if it's their primary business
    if not has_access:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user and user.get("business_id") != business_id:
            raise HTTPException(status_code=403, detail="No access to this business")
    
    # Update user's current business
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"business_id": business_id, "updated_at": datetime.utcnow()}}
    )
    
    # Get business details
    business = await db.businesses.find_one({"_id": ObjectId(business_id)})
    
    return {
        "message": "Switched to business successfully",
        "business_id": business_id,
        "business_name": business.get("name") if business else None
    }


@user_router.post("/add")
async def add_business(
    business: BusinessCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new business for the user"""
    user_id = current_user["id"]
    
    # Create new business
    new_business = {
        "name": business.name,
        "address": business.address or "",
        "phone": business.phone or "",
        "email": business.email or current_user.get("email"),
        "currency": business.currency,
        "timezone": business.timezone,
        "industry": business.industry,
        "owner_id": user_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.businesses.insert_one(new_business)
    business_id = str(result.inserted_id)
    
    # Add user as business member (owner)
    await db.business_members.insert_one({
        "user_id": user_id,
        "business_id": business_id,
        "role": "owner",
        "added_at": datetime.utcnow()
    })
    
    # If user has no current business, set this as default
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user.get("business_id"):
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"business_id": business_id}}
        )
    
    return {
        "message": "Business created successfully",
        "business_id": business_id,
        "business_name": business.name
    }


# Add user router to main router
router.include_router(user_router)
