"""
Affiliate & PromoCode System Routes
Handles business partner affiliates, promo codes, commissions, and payouts
"""
import os
import logging
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from bson import ObjectId
import jwt

# Setup logging
logger = logging.getLogger(__name__)

# Router
router = APIRouter(prefix="/affiliates", tags=["Affiliates"])

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
    logger.info("Affiliate routes database set")


def generate_promo_code(prefix: str = "PROMO", length: int = 6):
    """Generate a unique promo code"""
    chars = string.ascii_uppercase + string.digits
    suffix = ''.join(secrets.choice(chars) for _ in range(length))
    return f"{prefix}-{suffix}"


def generate_affiliate_code(company_name: str):
    """Generate affiliate code from company name"""
    # Take first 3-4 chars of company name + random suffix
    clean_name = ''.join(c for c in company_name if c.isalnum()).upper()[:4]
    suffix = ''.join(secrets.choice(string.digits) for _ in range(4))
    return f"AFF-{clean_name}{suffix}"


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


async def get_admin_user(current_user: dict = Depends(get_current_user)):
    """Verify user is admin or superadmin"""
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ============== MODELS ==============

class AffiliateApplication(BaseModel):
    company_name: str
    contact_name: str
    contact_email: EmailStr
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    expected_monthly_referrals: Optional[int] = None
    payout_method: str = "bank_transfer"  # bank_transfer, mobile_money, paypal
    payout_details: Optional[dict] = None


class PromoCodeCreate(BaseModel):
    code: Optional[str] = None  # Auto-generate if not provided
    discount_type: str = "percentage"  # percentage, fixed_amount
    discount_value: float
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    max_uses: Optional[int] = None
    min_purchase_amount: Optional[float] = None
    applicable_products: List[str] = []  # Empty = all products
    description: Optional[str] = None


class PayoutRequest(BaseModel):
    amount: Optional[float] = None  # None = request all available


class AffiliateUpdate(BaseModel):
    status: Optional[str] = None
    commission_rate: Optional[float] = None
    notes: Optional[str] = None


# ============== PUBLIC ENDPOINTS ==============

@router.post("/apply")
async def apply_as_affiliate(
    application: AffiliateApplication,
    current_user: dict = Depends(get_current_user)
):
    """Apply to become a business affiliate"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = current_user.get("id")
    
    # Check if already an affiliate
    existing = await db.affiliates.find_one({"user_id": user_id})
    if existing:
        if existing.get("status") == "rejected":
            raise HTTPException(status_code=400, detail="Your previous application was rejected. Please contact support.")
        elif existing.get("status") == "pending":
            raise HTTPException(status_code=400, detail="You already have a pending application")
        else:
            raise HTTPException(status_code=400, detail="You are already registered as an affiliate")
    
    # Check if email already used
    email_exists = await db.affiliates.find_one({"contact_email": application.contact_email})
    if email_exists:
        raise HTTPException(status_code=400, detail="This email is already associated with another affiliate account")
    
    # Generate affiliate code
    affiliate_code = generate_affiliate_code(application.company_name)
    while await db.affiliates.find_one({"affiliate_code": affiliate_code}):
        affiliate_code = generate_affiliate_code(application.company_name)
    
    # Create affiliate record
    affiliate_doc = {
        "user_id": user_id,
        "affiliate_code": affiliate_code,
        "company_name": application.company_name,
        "contact_name": application.contact_name,
        "contact_email": application.contact_email,
        "contact_phone": application.contact_phone,
        "website": application.website,
        "description": application.description,
        "expected_monthly_referrals": application.expected_monthly_referrals,
        "payout_method": application.payout_method,
        "payout_details": application.payout_details or {},
        "commission_rate": 10.0,  # Default 10% commission
        "status": "pending",
        "total_earnings": 0,
        "pending_earnings": 0,
        "paid_earnings": 0,
        "total_conversions": 0,
        "created_at": datetime.utcnow(),
        "approved_at": None,
        "notes": ""
    }
    
    result = await db.affiliates.insert_one(affiliate_doc)
    
    return {
        "success": True,
        "message": "Application submitted successfully! We'll review and get back to you within 2-3 business days.",
        "affiliate_id": str(result.inserted_id),
        "status": "pending"
    }


@router.get("/my-profile")
async def get_my_affiliate_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's affiliate profile"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = current_user.get("id")
    
    affiliate = await db.affiliates.find_one({"user_id": user_id})
    if not affiliate:
        return {"is_affiliate": False, "message": "You are not registered as an affiliate"}
    
    return {
        "is_affiliate": True,
        "id": str(affiliate["_id"]),
        "affiliate_code": affiliate.get("affiliate_code"),
        "company_name": affiliate.get("company_name"),
        "contact_name": affiliate.get("contact_name"),
        "contact_email": affiliate.get("contact_email"),
        "status": affiliate.get("status"),
        "commission_rate": affiliate.get("commission_rate", 10),
        "total_earnings": affiliate.get("total_earnings", 0),
        "pending_earnings": affiliate.get("pending_earnings", 0),
        "paid_earnings": affiliate.get("paid_earnings", 0),
        "total_conversions": affiliate.get("total_conversions", 0),
        "payout_method": affiliate.get("payout_method"),
        "created_at": affiliate.get("created_at"),
        "approved_at": affiliate.get("approved_at")
    }


@router.get("/my-codes")
async def get_my_promo_codes(current_user: dict = Depends(get_current_user)):
    """Get affiliate's promo codes"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = current_user.get("id")
    
    affiliate = await db.affiliates.find_one({"user_id": user_id, "status": "active"})
    if not affiliate:
        raise HTTPException(status_code=403, detail="You are not an active affiliate")
    
    affiliate_id = str(affiliate["_id"])
    
    codes = await db.promo_codes.find({"affiliate_id": affiliate_id}).sort("created_at", -1).to_list(100)
    
    result = []
    for code in codes:
        result.append({
            "id": str(code["_id"]),
            "code": code.get("code"),
            "discount_type": code.get("discount_type"),
            "discount_value": code.get("discount_value"),
            "description": code.get("description"),
            "valid_from": code.get("valid_from"),
            "valid_until": code.get("valid_until"),
            "max_uses": code.get("max_uses"),
            "current_uses": code.get("current_uses", 0),
            "status": code.get("status"),
            "created_at": code.get("created_at")
        })
    
    return {
        "affiliate_code": affiliate.get("affiliate_code"),
        "promo_codes": result
    }


@router.get("/my-earnings")
async def get_my_earnings(
    period: str = "all",
    current_user: dict = Depends(get_current_user)
):
    """Get affiliate's earnings and commission history"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = current_user.get("id")
    
    affiliate = await db.affiliates.find_one({"user_id": user_id, "status": "active"})
    if not affiliate:
        raise HTTPException(status_code=403, detail="You are not an active affiliate")
    
    affiliate_id = str(affiliate["_id"])
    
    # Build date filter
    query = {"affiliate_id": affiliate_id}
    now = datetime.utcnow()
    if period == "today":
        query["created_at"] = {"$gte": now.replace(hour=0, minute=0, second=0, microsecond=0)}
    elif period == "week":
        query["created_at"] = {"$gte": now - timedelta(days=7)}
    elif period == "month":
        query["created_at"] = {"$gte": now - timedelta(days=30)}
    elif period == "year":
        query["created_at"] = {"$gte": now - timedelta(days=365)}
    
    # Get commission transactions
    commissions = await db.affiliate_commissions.find(query).sort("created_at", -1).limit(100).to_list(100)
    
    # Calculate totals for period
    total_in_period = sum(c.get("commission_amount", 0) for c in commissions)
    pending_in_period = sum(c.get("commission_amount", 0) for c in commissions if c.get("status") == "pending")
    
    transactions = []
    for c in commissions:
        transactions.append({
            "id": str(c["_id"]),
            "order_id": c.get("order_id"),
            "promo_code": c.get("promo_code"),
            "order_amount": c.get("order_amount"),
            "commission_rate": c.get("commission_rate"),
            "commission_amount": c.get("commission_amount"),
            "status": c.get("status"),
            "created_at": c.get("created_at"),
            "customer_name": c.get("customer_name", "Anonymous")
        })
    
    return {
        "summary": {
            "total_earnings": affiliate.get("total_earnings", 0),
            "pending_earnings": affiliate.get("pending_earnings", 0),
            "paid_earnings": affiliate.get("paid_earnings", 0),
            "available_for_payout": affiliate.get("pending_earnings", 0),
            "commission_rate": affiliate.get("commission_rate", 10),
            "period_earnings": total_in_period,
            "period_pending": pending_in_period
        },
        "transactions": transactions
    }


@router.get("/my-payouts")
async def get_my_payouts(current_user: dict = Depends(get_current_user)):
    """Get affiliate's payout history"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = current_user.get("id")
    
    affiliate = await db.affiliates.find_one({"user_id": user_id})
    if not affiliate:
        raise HTTPException(status_code=403, detail="You are not an affiliate")
    
    affiliate_id = str(affiliate["_id"])
    
    payouts = await db.affiliate_payouts.find({"affiliate_id": affiliate_id}).sort("created_at", -1).limit(50).to_list(50)
    
    result = []
    for p in payouts:
        result.append({
            "id": str(p["_id"]),
            "amount": p.get("amount"),
            "payout_method": p.get("payout_method"),
            "status": p.get("status"),
            "reference": p.get("reference"),
            "created_at": p.get("created_at"),
            "processed_at": p.get("processed_at"),
            "notes": p.get("notes")
        })
    
    return {
        "pending_balance": affiliate.get("pending_earnings", 0),
        "payouts": result
    }


@router.post("/request-payout")
async def request_payout(
    request: PayoutRequest,
    current_user: dict = Depends(get_current_user)
):
    """Request a payout of earned commissions"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = current_user.get("id")
    
    affiliate = await db.affiliates.find_one({"user_id": user_id, "status": "active"})
    if not affiliate:
        raise HTTPException(status_code=403, detail="You are not an active affiliate")
    
    affiliate_id = str(affiliate["_id"])
    pending_balance = affiliate.get("pending_earnings", 0)
    
    # Determine payout amount
    payout_amount = request.amount if request.amount else pending_balance
    
    if payout_amount <= 0:
        raise HTTPException(status_code=400, detail="No earnings available for payout")
    
    if payout_amount > pending_balance:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: ${pending_balance}")
    
    # Minimum payout threshold
    min_payout = 50.0
    if payout_amount < min_payout:
        raise HTTPException(status_code=400, detail=f"Minimum payout amount is ${min_payout}")
    
    # Check for pending payout requests
    pending_payout = await db.affiliate_payouts.find_one({
        "affiliate_id": affiliate_id,
        "status": "pending"
    })
    if pending_payout:
        raise HTTPException(status_code=400, detail="You already have a pending payout request")
    
    # Create payout request
    payout_doc = {
        "affiliate_id": affiliate_id,
        "user_id": user_id,
        "company_name": affiliate.get("company_name"),
        "amount": payout_amount,
        "payout_method": affiliate.get("payout_method"),
        "payout_details": affiliate.get("payout_details"),
        "status": "pending",
        "reference": None,
        "created_at": datetime.utcnow(),
        "processed_at": None,
        "notes": ""
    }
    
    result = await db.affiliate_payouts.insert_one(payout_doc)
    
    return {
        "success": True,
        "message": f"Payout request of ${payout_amount} submitted. Processing time: 3-5 business days.",
        "payout_id": str(result.inserted_id),
        "amount": payout_amount
    }


# ============== PROMO CODE VALIDATION (Public) ==============

@router.get("/validate-code/{code}")
async def validate_promo_code(code: str):
    """Validate a promo code (public endpoint for checkout)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    promo = await db.promo_codes.find_one({"code": code.upper(), "status": "active"})
    
    if not promo:
        return {"valid": False, "message": "Invalid or expired promo code"}
    
    # Check validity dates
    now = datetime.utcnow()
    if promo.get("valid_from") and now < promo["valid_from"]:
        return {"valid": False, "message": "This promo code is not yet active"}
    
    if promo.get("valid_until") and now > promo["valid_until"]:
        return {"valid": False, "message": "This promo code has expired"}
    
    # Check usage limit
    if promo.get("max_uses") and promo.get("current_uses", 0) >= promo["max_uses"]:
        return {"valid": False, "message": "This promo code has reached its usage limit"}
    
    return {
        "valid": True,
        "code": promo.get("code"),
        "discount_type": promo.get("discount_type"),
        "discount_value": promo.get("discount_value"),
        "min_purchase_amount": promo.get("min_purchase_amount"),
        "applicable_products": promo.get("applicable_products", []),
        "description": promo.get("description")
    }


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/list")
async def list_all_affiliates(
    status: Optional[str] = None,
    current_user: dict = Depends(get_admin_user)
):
    """List all affiliates (admin only)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    query = {}
    if status:
        query["status"] = status
    
    affiliates = await db.affiliates.find(query).sort("created_at", -1).to_list(200)
    
    result = []
    for a in affiliates:
        result.append({
            "id": str(a["_id"]),
            "affiliate_code": a.get("affiliate_code"),
            "company_name": a.get("company_name"),
            "contact_name": a.get("contact_name"),
            "contact_email": a.get("contact_email"),
            "status": a.get("status"),
            "commission_rate": a.get("commission_rate", 10),
            "total_earnings": a.get("total_earnings", 0),
            "pending_earnings": a.get("pending_earnings", 0),
            "total_conversions": a.get("total_conversions", 0),
            "created_at": a.get("created_at"),
            "approved_at": a.get("approved_at")
        })
    
    # Get counts
    total = await db.affiliates.count_documents({})
    pending = await db.affiliates.count_documents({"status": "pending"})
    active = await db.affiliates.count_documents({"status": "active"})
    
    return {
        "counts": {
            "total": total,
            "pending": pending,
            "active": active
        },
        "affiliates": result
    }


@router.get("/admin/{affiliate_id}")
async def get_affiliate_details(
    affiliate_id: str,
    current_user: dict = Depends(get_admin_user)
):
    """Get detailed affiliate information"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    affiliate = await db.affiliates.find_one({"_id": ObjectId(affiliate_id)})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    
    # Get promo codes
    codes = await db.promo_codes.find({"affiliate_id": affiliate_id}).to_list(50)
    
    # Get recent commissions
    commissions = await db.affiliate_commissions.find(
        {"affiliate_id": affiliate_id}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {
        "id": str(affiliate["_id"]),
        "affiliate_code": affiliate.get("affiliate_code"),
        "company_name": affiliate.get("company_name"),
        "contact_name": affiliate.get("contact_name"),
        "contact_email": affiliate.get("contact_email"),
        "contact_phone": affiliate.get("contact_phone"),
        "website": affiliate.get("website"),
        "description": affiliate.get("description"),
        "status": affiliate.get("status"),
        "commission_rate": affiliate.get("commission_rate", 10),
        "payout_method": affiliate.get("payout_method"),
        "payout_details": affiliate.get("payout_details"),
        "total_earnings": affiliate.get("total_earnings", 0),
        "pending_earnings": affiliate.get("pending_earnings", 0),
        "paid_earnings": affiliate.get("paid_earnings", 0),
        "total_conversions": affiliate.get("total_conversions", 0),
        "created_at": affiliate.get("created_at"),
        "approved_at": affiliate.get("approved_at"),
        "notes": affiliate.get("notes"),
        "promo_codes": [{
            "id": str(c["_id"]),
            "code": c.get("code"),
            "discount_type": c.get("discount_type"),
            "discount_value": c.get("discount_value"),
            "current_uses": c.get("current_uses", 0),
            "status": c.get("status")
        } for c in codes],
        "recent_commissions": [{
            "id": str(c["_id"]),
            "order_amount": c.get("order_amount"),
            "commission_amount": c.get("commission_amount"),
            "status": c.get("status"),
            "created_at": c.get("created_at")
        } for c in commissions]
    }


@router.put("/admin/{affiliate_id}/approve")
async def approve_affiliate(
    affiliate_id: str,
    commission_rate: Optional[float] = 10.0,
    current_user: dict = Depends(get_admin_user)
):
    """Approve an affiliate application"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    affiliate = await db.affiliates.find_one({"_id": ObjectId(affiliate_id)})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    
    if affiliate.get("status") == "active":
        raise HTTPException(status_code=400, detail="Affiliate is already active")
    
    await db.affiliates.update_one(
        {"_id": ObjectId(affiliate_id)},
        {
            "$set": {
                "status": "active",
                "commission_rate": commission_rate,
                "approved_at": datetime.utcnow(),
                "approved_by": current_user.get("id")
            }
        }
    )
    
    # Create a default promo code for the affiliate
    default_code = generate_promo_code(affiliate.get("affiliate_code", "PROMO")[:4])
    while await db.promo_codes.find_one({"code": default_code}):
        default_code = generate_promo_code(affiliate.get("affiliate_code", "PROMO")[:4])
    
    promo_doc = {
        "affiliate_id": affiliate_id,
        "code": default_code,
        "discount_type": "percentage",
        "discount_value": 10,  # 10% off for customers
        "description": f"Welcome discount from {affiliate.get('company_name')}",
        "valid_from": datetime.utcnow(),
        "valid_until": None,  # No expiry
        "max_uses": None,  # Unlimited
        "current_uses": 0,
        "min_purchase_amount": None,
        "applicable_products": [],
        "status": "active",
        "created_at": datetime.utcnow(),
        "created_by": current_user.get("id")
    }
    
    await db.promo_codes.insert_one(promo_doc)
    
    return {
        "success": True,
        "message": f"Affiliate approved with {commission_rate}% commission rate",
        "default_promo_code": default_code
    }


@router.put("/admin/{affiliate_id}/reject")
async def reject_affiliate(
    affiliate_id: str,
    reason: str = "Does not meet our requirements",
    current_user: dict = Depends(get_admin_user)
):
    """Reject an affiliate application"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    result = await db.affiliates.update_one(
        {"_id": ObjectId(affiliate_id)},
        {
            "$set": {
                "status": "rejected",
                "notes": reason,
                "rejected_at": datetime.utcnow(),
                "rejected_by": current_user.get("id")
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    
    return {"success": True, "message": "Affiliate application rejected"}


@router.put("/admin/{affiliate_id}/suspend")
async def suspend_affiliate(
    affiliate_id: str,
    reason: str = "Policy violation",
    current_user: dict = Depends(get_admin_user)
):
    """Suspend an active affiliate"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Suspend affiliate
    result = await db.affiliates.update_one(
        {"_id": ObjectId(affiliate_id), "status": "active"},
        {
            "$set": {
                "status": "suspended",
                "notes": reason,
                "suspended_at": datetime.utcnow(),
                "suspended_by": current_user.get("id")
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Active affiliate not found")
    
    # Deactivate all promo codes
    await db.promo_codes.update_many(
        {"affiliate_id": affiliate_id},
        {"$set": {"status": "suspended"}}
    )
    
    return {"success": True, "message": "Affiliate suspended and promo codes deactivated"}


@router.put("/admin/{affiliate_id}")
async def update_affiliate(
    affiliate_id: str,
    update: AffiliateUpdate,
    current_user: dict = Depends(get_admin_user)
):
    """Update affiliate settings"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    update_data = {}
    if update.status:
        update_data["status"] = update.status
    if update.commission_rate is not None:
        update_data["commission_rate"] = update.commission_rate
    if update.notes:
        update_data["notes"] = update.notes
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.utcnow()
    update_data["updated_by"] = current_user.get("id")
    
    result = await db.affiliates.update_one(
        {"_id": ObjectId(affiliate_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    
    return {"success": True, "message": "Affiliate updated"}


@router.post("/admin/{affiliate_id}/promo-codes")
async def create_promo_code(
    affiliate_id: str,
    code_data: PromoCodeCreate,
    current_user: dict = Depends(get_admin_user)
):
    """Create a promo code for an affiliate"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    affiliate = await db.affiliates.find_one({"_id": ObjectId(affiliate_id), "status": "active"})
    if not affiliate:
        raise HTTPException(status_code=404, detail="Active affiliate not found")
    
    # Generate or validate code
    code = code_data.code.upper() if code_data.code else generate_promo_code()
    
    # Check uniqueness
    existing = await db.promo_codes.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail="This promo code already exists")
    
    promo_doc = {
        "affiliate_id": affiliate_id,
        "code": code,
        "discount_type": code_data.discount_type,
        "discount_value": code_data.discount_value,
        "description": code_data.description,
        "valid_from": code_data.valid_from or datetime.utcnow(),
        "valid_until": code_data.valid_until,
        "max_uses": code_data.max_uses,
        "current_uses": 0,
        "min_purchase_amount": code_data.min_purchase_amount,
        "applicable_products": code_data.applicable_products,
        "status": "active",
        "created_at": datetime.utcnow(),
        "created_by": current_user.get("id")
    }
    
    result = await db.promo_codes.insert_one(promo_doc)
    
    return {
        "success": True,
        "message": f"Promo code {code} created",
        "promo_code_id": str(result.inserted_id),
        "code": code
    }


@router.get("/admin/payouts/pending")
async def get_pending_payouts(current_user: dict = Depends(get_admin_user)):
    """Get all pending payout requests"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    payouts = await db.affiliate_payouts.find({"status": "pending"}).sort("created_at", 1).to_list(100)
    
    result = []
    for p in payouts:
        result.append({
            "id": str(p["_id"]),
            "affiliate_id": p.get("affiliate_id"),
            "company_name": p.get("company_name"),
            "amount": p.get("amount"),
            "payout_method": p.get("payout_method"),
            "payout_details": p.get("payout_details"),
            "created_at": p.get("created_at")
        })
    
    total_pending = sum(p.get("amount", 0) for p in payouts)
    
    return {
        "total_pending_amount": total_pending,
        "pending_count": len(result),
        "payouts": result
    }


@router.put("/admin/payouts/{payout_id}/process")
async def process_payout(
    payout_id: str,
    reference: str,
    notes: Optional[str] = None,
    current_user: dict = Depends(get_admin_user)
):
    """Process a payout request"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    payout = await db.affiliate_payouts.find_one({"_id": ObjectId(payout_id), "status": "pending"})
    if not payout:
        raise HTTPException(status_code=404, detail="Pending payout not found")
    
    affiliate_id = payout.get("affiliate_id")
    amount = payout.get("amount", 0)
    
    # Update payout status
    await db.affiliate_payouts.update_one(
        {"_id": ObjectId(payout_id)},
        {
            "$set": {
                "status": "completed",
                "reference": reference,
                "notes": notes,
                "processed_at": datetime.utcnow(),
                "processed_by": current_user.get("id")
            }
        }
    )
    
    # Update affiliate balances
    await db.affiliates.update_one(
        {"_id": ObjectId(affiliate_id)},
        {
            "$inc": {
                "pending_earnings": -amount,
                "paid_earnings": amount
            }
        }
    )
    
    # Mark related commissions as paid
    await db.affiliate_commissions.update_many(
        {"affiliate_id": affiliate_id, "status": "pending"},
        {"$set": {"status": "paid", "paid_at": datetime.utcnow()}}
    )
    
    return {
        "success": True,
        "message": f"Payout of ${amount} processed successfully",
        "reference": reference
    }


@router.put("/admin/payouts/{payout_id}/reject")
async def reject_payout(
    payout_id: str,
    reason: str = "Unable to process",
    current_user: dict = Depends(get_admin_user)
):
    """Reject a payout request"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    result = await db.affiliate_payouts.update_one(
        {"_id": ObjectId(payout_id), "status": "pending"},
        {
            "$set": {
                "status": "rejected",
                "notes": reason,
                "processed_at": datetime.utcnow(),
                "processed_by": current_user.get("id")
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Pending payout not found")
    
    return {"success": True, "message": "Payout request rejected"}


# ============== COMMISSION TRACKING (Called from order processing) ==============

async def record_affiliate_commission(
    order_id: str,
    promo_code: str,
    order_amount: float,
    customer_name: Optional[str] = None
):
    """Record a commission when a promo code is used (called from order processing)"""
    if db is None:
        return None
    
    # Find the promo code
    promo = await db.promo_codes.find_one({"code": promo_code.upper(), "status": "active"})
    if not promo:
        return None
    
    affiliate_id = promo.get("affiliate_id")
    
    # Get affiliate
    affiliate = await db.affiliates.find_one({"_id": ObjectId(affiliate_id), "status": "active"})
    if not affiliate:
        return None
    
    commission_rate = affiliate.get("commission_rate", 10)
    commission_amount = round(order_amount * (commission_rate / 100), 2)
    
    # Record commission
    commission_doc = {
        "affiliate_id": affiliate_id,
        "order_id": order_id,
        "promo_code": promo_code.upper(),
        "order_amount": order_amount,
        "commission_rate": commission_rate,
        "commission_amount": commission_amount,
        "customer_name": customer_name,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "paid_at": None
    }
    
    await db.affiliate_commissions.insert_one(commission_doc)
    
    # Update affiliate stats
    await db.affiliates.update_one(
        {"_id": ObjectId(affiliate_id)},
        {
            "$inc": {
                "total_earnings": commission_amount,
                "pending_earnings": commission_amount,
                "total_conversions": 1
            }
        }
    )
    
    # Increment promo code usage
    await db.promo_codes.update_one(
        {"_id": promo["_id"]},
        {"$inc": {"current_uses": 1}}
    )
    
    return commission_amount
