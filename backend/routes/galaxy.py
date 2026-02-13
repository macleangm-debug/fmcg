"""
Galaxy Routes
Handles Galaxy app ecosystem, SSO, subscriptions, and waitlist
"""
import os
import logging
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import jwt
from enum import Enum

# Setup logging
logger = logging.getLogger(__name__)

# Router
router = APIRouter(prefix="/galaxy", tags=["Galaxy Ecosystem"])

# Security
security = HTTPBearer()

# Database connection (will be set on import)
db = None

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'retail-management-secret-key-2025')
JWT_ALGORITHM = "HS256"


def set_dependencies(database):
    """Set the database connection for this router"""
    global db
    db = database
    logger.info("Galaxy routes dependencies set")


# ============== ENUMS ==============

class GalaxyApp(str, Enum):
    RETAIL_PRO = "retail-pro"
    INVENTORY = "inventory"
    INVOICING = "invoicing"
    BULK_SMS = "bulk-sms"
    LOYALTY = "loyalty"
    KWIKPAY = "kwikpay"
    ACCOUNTING = "accounting"
    CRM = "crm"
    EXPENSES = "expenses"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    TRIAL = "trial"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


# ============== MODELS ==============

class GalaxyAppInfo(BaseModel):
    id: str
    name: str
    description: str
    color: str
    icon: str
    features: List[str]
    pricing: dict
    is_available: bool = True
    coming_soon: bool = False


class SSOTokenResponse(BaseModel):
    sso_token: str
    app_id: str
    redirect_url: str
    expires_in: int = 300


class WaitlistEntry(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    company: Optional[str] = None
    app_id: str


# ============== GALAXY APPS DATA ==============

GALAXY_APPS = {
    GalaxyApp.RETAIL_PRO: GalaxyAppInfo(
        id="retail-pro",
        name="RetailPro",
        description="Complete point of sale and retail management",
        color="#3B82F6",
        icon="storefront",
        features=["POS System", "Inventory", "Customers", "Reports", "Multi-location"],
        pricing={"free_trial": 30, "starter": 29, "professional": 79, "enterprise": 199},
        is_available=True
    ),
    GalaxyApp.INVENTORY: GalaxyAppInfo(
        id="inventory",
        name="Inventory",
        description="Advanced stock and warehouse management",
        color="#10B981",
        icon="cube",
        features=["Stock Tracking", "Alerts", "Transfers", "Reports", "Barcode Scanning"],
        pricing={"free_trial": 30, "starter": 19, "professional": 49},
        is_available=True
    ),
    GalaxyApp.INVOICING: GalaxyAppInfo(
        id="invoicing",
        name="Invoicing",
        description="Professional invoicing and billing",
        color="#8B5CF6",
        icon="document-text",
        features=["Invoice Creation", "Online Payments", "Recurring", "Quotes", "Reports"],
        pricing={"free_trial": 30, "starter": 15, "professional": 39},
        is_available=True
    ),
    GalaxyApp.BULK_SMS: GalaxyAppInfo(
        id="bulk-sms",
        name="UniTxt",
        description="Bulk SMS and messaging platform",
        color="#F59E0B",
        icon="chatbubbles",
        features=["Bulk Messaging", "Templates", "Scheduling", "Analytics", "API Access"],
        pricing={"free_trial": 30, "starter": 25, "professional": 59},
        is_available=True
    ),
    GalaxyApp.LOYALTY: GalaxyAppInfo(
        id="loyalty",
        name="Loyalty",
        description="Customer loyalty and rewards program",
        color="#EC4899",
        icon="heart",
        features=["Points System", "Rewards", "Tiers", "Referrals", "Analytics"],
        pricing={"free_trial": 30, "starter": 19, "professional": 49},
        is_available=True,
        coming_soon=True
    ),
    GalaxyApp.KWIKPAY: GalaxyAppInfo(
        id="kwikpay",
        name="KwikPay",
        description="Payment processing and collections",
        color="#00D4FF",
        icon="card",
        features=["Payment Links", "Subscriptions", "Payouts", "Multi-currency", "Reports"],
        pricing={"free_trial": 30, "starter": 0, "professional": 0},
        is_available=True
    ),
    GalaxyApp.ACCOUNTING: GalaxyAppInfo(
        id="accounting",
        name="Accounting",
        description="Business accounting and bookkeeping",
        color="#06B6D4",
        icon="calculator",
        features=["Bookkeeping", "Reports", "Tax", "Bank Reconciliation", "Multi-currency"],
        pricing={"free_trial": 30, "starter": 29, "professional": 69},
        is_available=True,
        coming_soon=True
    ),
    GalaxyApp.CRM: GalaxyAppInfo(
        id="crm",
        name="CRM",
        description="Customer relationship management",
        color="#6366F1",
        icon="people",
        features=["Contacts", "Deals", "Pipeline", "Tasks", "Reports"],
        pricing={"free_trial": 30, "starter": 25, "professional": 59},
        is_available=True,
        coming_soon=True
    ),
    GalaxyApp.EXPENSES: GalaxyAppInfo(
        id="expenses",
        name="Expenses",
        description="Expense tracking and management",
        color="#EF4444",
        icon="receipt",
        features=["Receipt Capture", "Categories", "Approvals", "Reports", "Mileage"],
        pricing={"free_trial": 30, "starter": 15, "professional": 35},
        is_available=True,
        coming_soon=True
    ),
}


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

@router.get("/apps", response_model=List[GalaxyAppInfo])
async def get_galaxy_apps():
    """Get all available Galaxy apps"""
    return list(GALAXY_APPS.values())


@router.get("/apps/{app_id}", response_model=GalaxyAppInfo)
async def get_galaxy_app(app_id: str):
    """Get details for a specific Galaxy app"""
    try:
        app_enum = GalaxyApp(app_id)
        if app_enum not in GALAXY_APPS:
            raise HTTPException(status_code=404, detail="App not found")
        return GALAXY_APPS[app_enum]
    except ValueError:
        raise HTTPException(status_code=404, detail="App not found")


@router.get("/user/access")
async def get_user_app_access(current_user: dict = Depends(get_current_user)):
    """Get user's app subscriptions and access"""
    user_id = current_user["id"]
    business_id = current_user.get("business_id")
    
    # Get user's app subscriptions from database
    user_subscriptions = await db.app_subscriptions.find_one({"user_id": user_id})
    
    subscriptions = []
    if user_subscriptions:
        subscriptions = user_subscriptions.get("apps", [])
    else:
        # New user - grant free trial to Retail Pro by default
        default_subscription = {
            "user_id": user_id,
            "business_id": business_id,
            "apps": [
                {
                    "app_id": GalaxyApp.RETAIL_PRO.value,
                    "status": SubscriptionStatus.ACTIVE.value,
                    "subscribed_at": datetime.utcnow(),
                    "expires_at": datetime.utcnow() + timedelta(days=30),
                    "plan": "free_trial"
                }
            ],
            "created_at": datetime.utcnow()
        }
        await db.app_subscriptions.insert_one(default_subscription)
        subscriptions = default_subscription["apps"]
    
    # Get business name
    business_name = None
    if business_id:
        business = await db.businesses.find_one({"_id": ObjectId(business_id)})
        if business:
            business_name = business.get("name")
    
    # Build response with app details
    app_access = []
    for sub in subscriptions:
        app_id = sub.get("app_id")
        try:
            app_enum = GalaxyApp(app_id)
            app_info = GALAXY_APPS.get(app_enum)
            if app_info:
                app_access.append({
                    "app": app_info.dict(),
                    "subscription": {
                        "status": sub.get("status"),
                        "subscribed_at": sub.get("subscribed_at"),
                        "expires_at": sub.get("expires_at"),
                        "plan": sub.get("plan", "free_trial")
                    }
                })
        except ValueError:
            continue
    
    return {
        "user_id": user_id,
        "email": current_user["email"],
        "name": current_user["name"],
        "business_id": business_id,
        "business_name": business_name,
        "app_access": app_access,
        "available_apps": [app.dict() for app in GALAXY_APPS.values()]
    }


@router.post("/sso/token", response_model=SSOTokenResponse)
async def create_sso_token(
    app_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Create SSO token for cross-app navigation"""
    try:
        app_enum = GalaxyApp(app_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid app ID")
    
    # Verify user has access to the app
    user_subscriptions = await db.app_subscriptions.find_one({"user_id": current_user["id"]})
    
    has_access = False
    if user_subscriptions:
        for sub in user_subscriptions.get("apps", []):
            if sub.get("app_id") == app_id and sub.get("status") in ["active", "trial"]:
                has_access = True
                break
    
    if not has_access:
        raise HTTPException(status_code=403, detail="No active subscription for this app")
    
    # Create short-lived SSO token
    sso_payload = {
        "sub": current_user["id"],
        "email": current_user["email"],
        "role": current_user["role"],
        "business_id": current_user.get("business_id"),
        "app_id": app_id,
        "exp": datetime.utcnow() + timedelta(minutes=5),
        "iat": datetime.utcnow(),
        "type": "sso"
    }
    
    sso_token = jwt.encode(sso_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    # Get app route
    app_routes = {
        "retail-pro": "/retailpro/dashboard",
        "inventory": "/inventory",
        "invoicing": "/invoicing",
        "bulk-sms": "/unitxt",
        "loyalty": "/loyalty",
        "kwikpay": "/kwikpay",
        "accounting": "/accounting",
        "crm": "/crm",
        "expenses": "/expenses"
    }
    
    redirect_url = app_routes.get(app_id, f"/{app_id}")
    
    return SSOTokenResponse(
        sso_token=sso_token,
        app_id=app_id,
        redirect_url=redirect_url,
        expires_in=300
    )


@router.post("/subscribe/{app_id}")
async def subscribe_to_app(
    app_id: str,
    plan: str = "free_trial",
    current_user: dict = Depends(get_current_user)
):
    """Subscribe to a Galaxy app"""
    try:
        app_enum = GalaxyApp(app_id)
        app_info = GALAXY_APPS.get(app_enum)
        if not app_info:
            raise HTTPException(status_code=404, detail="App not found")
    except ValueError:
        raise HTTPException(status_code=404, detail="App not found")
    
    user_id = current_user["id"]
    business_id = current_user.get("business_id")
    
    # Calculate trial/subscription period
    if plan == "free_trial":
        expires_at = datetime.utcnow() + timedelta(days=app_info.pricing.get("free_trial", 30))
    else:
        expires_at = datetime.utcnow() + timedelta(days=30)  # Monthly subscription
    
    new_subscription = {
        "app_id": app_id,
        "status": SubscriptionStatus.ACTIVE.value if plan != "free_trial" else SubscriptionStatus.TRIAL.value,
        "subscribed_at": datetime.utcnow(),
        "expires_at": expires_at,
        "plan": plan
    }
    
    # Update or create subscription
    existing = await db.app_subscriptions.find_one({"user_id": user_id})
    
    if existing:
        # Check if already subscribed
        current_apps = existing.get("apps", [])
        for app in current_apps:
            if app.get("app_id") == app_id:
                raise HTTPException(status_code=400, detail="Already subscribed to this app")
        
        # Add new subscription
        await db.app_subscriptions.update_one(
            {"user_id": user_id},
            {"$push": {"apps": new_subscription}}
        )
    else:
        # Create new subscription document
        await db.app_subscriptions.insert_one({
            "user_id": user_id,
            "business_id": business_id,
            "apps": [new_subscription],
            "created_at": datetime.utcnow()
        })
    
    return {
        "message": f"Successfully subscribed to {app_info.name}",
        "app_id": app_id,
        "plan": plan,
        "expires_at": expires_at.isoformat()
    }


@router.post("/waitlist")
async def join_waitlist(entry: WaitlistEntry):
    """Join waitlist for coming soon apps"""
    # Check if app exists and is coming soon
    try:
        app_enum = GalaxyApp(entry.app_id)
        app_info = GALAXY_APPS.get(app_enum)
        if not app_info:
            raise HTTPException(status_code=404, detail="App not found")
    except ValueError:
        raise HTTPException(status_code=404, detail="App not found")
    
    # Check for existing entry
    existing = await db.waitlist.find_one({
        "email": entry.email,
        "app_id": entry.app_id
    })
    
    if existing:
        return {"message": "You're already on the waitlist!", "position": existing.get("position", 0)}
    
    # Get current waitlist count for position
    count = await db.waitlist.count_documents({"app_id": entry.app_id})
    position = count + 1
    
    waitlist_entry = {
        "email": entry.email,
        "name": entry.name,
        "company": entry.company,
        "app_id": entry.app_id,
        "position": position,
        "created_at": datetime.utcnow(),
        "notified": False
    }
    
    await db.waitlist.insert_one(waitlist_entry)
    
    return {
        "message": f"Successfully joined waitlist for {app_info.name}!",
        "position": position,
        "app_id": entry.app_id
    }


@router.get("/waitlist/{app_id}/count")
async def get_waitlist_count(app_id: str):
    """Get waitlist count for an app"""
    count = await db.waitlist.count_documents({"app_id": app_id})
    return {"app_id": app_id, "count": count}


@router.post("/verify-token")
async def verify_sso_token(token: str):
    """Verify SSO token and return user info"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        if payload.get("type") != "sso":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = payload.get("sub")
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return {
            "valid": True,
            "user_id": user_id,
            "email": payload.get("email"),
            "role": payload.get("role"),
            "business_id": payload.get("business_id"),
            "app_id": payload.get("app_id")
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")
