"""
Merchant Onboarding Routes
Handles merchant registration, verification, and management
"""
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId
import jwt
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/merchant-onboarding", tags=["Merchant Onboarding"])

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'retail-management-secret-key-2025')
JWT_ALGORITHM = "HS256"

security = HTTPBearer()

db = None

def set_dependencies(database, auth_func=None):
    global db
    db = database


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


# ============== MODELS ==============

class BusinessRegistration(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=100)
    business_type: str = Field(..., description="retail, restaurant, services, online, other")
    owner_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=9, max_length=15)
    country_code: str = Field("TZ", description="TZ, KE, UG, RW, GH, NG")
    address: Optional[str] = None
    city: Optional[str] = None
    tax_id: Optional[str] = None
    website: Optional[str] = None
    expected_monthly_volume: Optional[str] = None


class BankAccountSetup(BaseModel):
    bank_name: str
    bank_code: str
    account_number: str
    account_name: str
    branch: Optional[str] = None
    swift_code: Optional[str] = None


class OnboardingComplete(BaseModel):
    accept_terms: bool = Field(..., description="Must accept terms and conditions")
    accept_fees: bool = Field(..., description="Must accept fee structure")


# ============== HELPER FUNCTIONS ==============

def serialize_doc(doc):
    if doc is None:
        return None
    result = {k: v for k, v in doc.items() if k != "_id"}
    result["id"] = str(doc.get("_id", ""))
    for key in ["created_at", "updated_at", "onboarding_completed_at"]:
        if key in result and hasattr(result[key], "isoformat"):
            result[key] = result[key].isoformat()
    return result


# ============== PUBLIC ENDPOINTS ==============

@router.get("/countries")
async def get_supported_countries():
    """Get list of supported countries for merchant onboarding"""
    return {
        "countries": [
            {
                "code": "TZ",
                "name": "Tanzania",
                "currency": "TZS",
                "currency_symbol": "TSh",
                "phone_prefix": "+255",
                "banks": [
                    {"code": "crdb", "name": "CRDB Bank"},
                    {"code": "nmb", "name": "NMB Bank"},
                    {"code": "nbc", "name": "NBC Bank"},
                    {"code": "stanbic", "name": "Stanbic Bank"},
                    {"code": "dtb", "name": "DTB Bank"},
                    {"code": "equity", "name": "Equity Bank"}
                ],
                "mobile_money": ["M-Pesa", "Tigo Pesa", "Airtel Money", "Halopesa"]
            },
            {
                "code": "KE",
                "name": "Kenya",
                "currency": "KES",
                "currency_symbol": "KSh",
                "phone_prefix": "+254",
                "banks": [
                    {"code": "kcb", "name": "KCB Bank"},
                    {"code": "equity", "name": "Equity Bank"},
                    {"code": "coop", "name": "Co-operative Bank"},
                    {"code": "absa", "name": "ABSA Bank"}
                ],
                "mobile_money": ["M-Pesa", "Airtel Money"]
            },
            {
                "code": "UG",
                "name": "Uganda",
                "currency": "UGX",
                "currency_symbol": "USh",
                "phone_prefix": "+256",
                "banks": [
                    {"code": "stanbic", "name": "Stanbic Bank"},
                    {"code": "dfcu", "name": "DFCU Bank"},
                    {"code": "centenary", "name": "Centenary Bank"}
                ],
                "mobile_money": ["MTN Mobile Money", "Airtel Money"]
            },
            {
                "code": "RW",
                "name": "Rwanda",
                "currency": "RWF",
                "currency_symbol": "FRw",
                "phone_prefix": "+250",
                "banks": [
                    {"code": "bk", "name": "Bank of Kigali"},
                    {"code": "equity", "name": "Equity Bank"}
                ],
                "mobile_money": ["MTN Mobile Money", "Airtel Money"]
            }
        ]
    }


@router.get("/fee-structure")
async def get_fee_structure():
    """Get KwikPay fee structure"""
    return {
        "transaction_fees": {
            "mobile_money": {
                "percent": 2.5,
                "fixed": 0,
                "description": "Mobile Money (M-Pesa, Tigo, Airtel)"
            },
            "card": {
                "percent": 2.9,
                "fixed": 0,
                "description": "Card Payments (Visa/Mastercard)"
            },
            "bank_transfer": {
                "percent": 1.5,
                "fixed": 0,
                "description": "Bank Transfer"
            },
            "qr": {
                "percent": 2.0,
                "fixed": 0,
                "description": "QR Code Payments"
            }
        },
        "payout_fees": {
            "TZS": {"amount": 500, "description": "Per payout to bank"},
            "KES": {"amount": 50, "description": "Per payout to bank"},
            "UGX": {"amount": 1000, "description": "Per payout to bank"},
            "RWF": {"amount": 500, "description": "Per payout to bank"}
        },
        "settlement_period": "24 hours",
        "minimum_payout": {
            "TZS": 10000,
            "KES": 500,
            "UGX": 10000,
            "RWF": 5000
        }
    }


# ============== AUTHENTICATED ENDPOINTS ==============

@router.post("/register")
async def register_business(
    registration: BusinessRegistration,
    current_user: dict = Depends(get_current_user)
):
    """Step 1: Register business details"""
    import secrets
    user_id = current_user.get("id")
    
    # Check if user already has a merchant profile
    existing = await db.kwikpay_merchants.find_one({"owner_user_id": user_id})
    if existing:
        return {
            "success": True,
            "message": "Business already registered",
            "business_id": existing.get("business_id"),
            "checkout_code": existing.get("checkout_code"),
            "onboarding_step": existing.get("onboarding_step", 2)
        }
    
    # Generate unique checkout code
    clean_name = ''.join(c for c in registration.business_name if c.isalnum())[:6].upper()
    checkout_code = f"{clean_name}{secrets.token_hex(2).upper()}"
    
    # Ensure uniqueness
    existing_code = await db.merchant_checkouts.find_one({"checkout_code": checkout_code})
    while existing_code:
        checkout_code = f"{clean_name}{secrets.token_hex(2).upper()}"
        existing_code = await db.merchant_checkouts.find_one({"checkout_code": checkout_code})
    
    # Create business record
    business_doc = {
        "name": registration.business_name,
        "type": registration.business_type,
        "owner_name": registration.owner_name,
        "email": registration.email,
        "phone": registration.phone,
        "country_code": registration.country_code,
        "address": registration.address,
        "city": registration.city,
        "tax_id": registration.tax_id,
        "website": registration.website,
        "expected_monthly_volume": registration.expected_monthly_volume,
        "owner_user_id": user_id,
        "created_at": datetime.utcnow()
    }
    
    result = await db.businesses.insert_one(business_doc)
    business_id = str(result.inserted_id)
    
    # Currency mapping
    currency_map = {
        "TZ": {"currency": "TZS", "symbol": "TSh"},
        "KE": {"currency": "KES", "symbol": "KSh"},
        "UG": {"currency": "UGX", "symbol": "USh"},
        "RW": {"currency": "RWF", "symbol": "FRw"},
    }
    currency_info = currency_map.get(registration.country_code, currency_map["TZ"])
    
    # Create checkout configuration
    checkout_config = {
        "checkout_code": checkout_code,
        "business_id": business_id,
        "checkout_name": f"{registration.business_name} Checkout",
        "country_code": registration.country_code,
        "currency": currency_info["currency"],
        "currency_symbol": currency_info["symbol"],
        "accepted_methods": ["mobile_money", "bank_transfer", "card", "qr"],
        "theme_color": "#7C3AED",
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    await db.merchant_checkouts.insert_one(checkout_config)
    
    # Create merchant profile
    merchant_profile = {
        "business_id": business_id,
        "business_name": registration.business_name,
        "owner_name": registration.owner_name,
        "owner_user_id": user_id,
        "email": registration.email,
        "phone": registration.phone,
        "country_code": registration.country_code,
        "checkout_code": checkout_code,
        "api_key": f"kwk_live_{secrets.token_hex(16)}",
        "api_secret": secrets.token_hex(32),
        "webhook_secret": secrets.token_hex(24),
        "fee_percent": 1.0,
        "is_verified": False,
        "is_active": True,
        "sandbox_mode": True,
        "onboarding_step": 2,
        "onboarding_status": "in_progress",
        "created_at": datetime.utcnow()
    }
    await db.kwikpay_merchants.insert_one(merchant_profile)
    
    # Create balance record
    await db.merchant_balances.insert_one({
        "business_id": business_id,
        "available_balance": 0,
        "pending_balance": 0,
        "total_volume": 0,
        "currency": currency_info["currency"],
        "created_at": datetime.utcnow()
    })
    
    # Update user with business_id
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"business_id": business_id}}
    )
    
    return {
        "success": True,
        "message": "Business registered successfully",
        "business_id": business_id,
        "checkout_code": checkout_code,
        "checkout_url": f"/pay/{checkout_code}",
        "onboarding_step": 2,
        "next_step": "Add bank account for settlements"
    }


@router.post("/bank-account")
async def setup_bank_account(
    bank_account: BankAccountSetup,
    current_user: dict = Depends(get_current_user)
):
    """Step 2: Setup bank account for settlements"""
    business_id = current_user.get("business_id")
    
    if not business_id:
        raise HTTPException(status_code=400, detail="Please complete business registration first")
    
    bank_data = {
        "bank_name": bank_account.bank_name,
        "bank_code": bank_account.bank_code,
        "account_number": bank_account.account_number,
        "account_name": bank_account.account_name,
        "branch": bank_account.branch,
        "swift_code": bank_account.swift_code,
        "verified": False,
        "added_at": datetime.utcnow()
    }
    
    await db.kwikpay_merchants.update_one(
        {"business_id": business_id},
        {"$set": {
            "bank_account": bank_data,
            "onboarding_step": 3,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {
        "success": True,
        "message": "Bank account added successfully",
        "onboarding_step": 3,
        "next_step": "Review and accept terms to complete onboarding"
    }


@router.post("/complete")
async def complete_onboarding(
    completion: OnboardingComplete,
    current_user: dict = Depends(get_current_user)
):
    """Step 3: Accept terms and complete onboarding"""
    business_id = current_user.get("business_id")
    
    if not business_id:
        raise HTTPException(status_code=400, detail="Please complete business registration first")
    
    if not completion.accept_terms or not completion.accept_fees:
        raise HTTPException(status_code=400, detail="You must accept terms and fee structure")
    
    merchant = await db.kwikpay_merchants.find_one({"business_id": business_id})
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")
    
    if not merchant.get("bank_account"):
        raise HTTPException(status_code=400, detail="Please add a bank account first")
    
    await db.kwikpay_merchants.update_one(
        {"business_id": business_id},
        {"$set": {
            "onboarding_step": 4,
            "onboarding_status": "completed",
            "onboarding_completed_at": datetime.utcnow(),
            "terms_accepted_at": datetime.utcnow(),
            "is_active": True,
            "sandbox_mode": True
        }}
    )
    
    return {
        "success": True,
        "message": "Onboarding completed successfully!",
        "checkout_code": merchant.get("checkout_code"),
        "checkout_url": f"/pay/{merchant.get('checkout_code')}",
        "api_key": merchant.get("api_key"),
        "mode": "sandbox",
        "next_steps": [
            "Test your checkout page in sandbox mode",
            "Integrate webhooks for payment notifications",
            "Contact support to go live when ready"
        ]
    }


@router.get("/status")
async def get_onboarding_status(current_user: dict = Depends(get_current_user)):
    """Get current onboarding status"""
    business_id = current_user.get("business_id")
    
    if not business_id:
        return {
            "onboarding_step": 1,
            "status": "not_started",
            "next_step": "Register your business"
        }
    
    merchant = await db.kwikpay_merchants.find_one({"business_id": business_id})
    
    if not merchant:
        return {
            "onboarding_step": 1,
            "status": "not_started",
            "next_step": "Register your business"
        }
    
    step = merchant.get("onboarding_step", 1)
    status = merchant.get("onboarding_status", "in_progress")
    
    steps = {
        1: {"name": "Business Registration", "status": "completed" if step > 1 else "current"},
        2: {"name": "Bank Account Setup", "status": "completed" if step > 2 else ("current" if step == 2 else "pending")},
        3: {"name": "Review & Accept Terms", "status": "completed" if step > 3 else ("current" if step == 3 else "pending")},
        4: {"name": "Ready to Accept Payments", "status": "completed" if step >= 4 else "pending"}
    }
    
    return {
        "onboarding_step": step,
        "status": status,
        "steps": steps,
        "business_name": merchant.get("business_name"),
        "checkout_code": merchant.get("checkout_code"),
        "checkout_url": f"/pay/{merchant.get('checkout_code')}" if merchant.get("checkout_code") else None,
        "is_active": merchant.get("is_active", False),
        "mode": "sandbox" if merchant.get("sandbox_mode", True) else "live"
    }


@router.get("/profile")
async def get_merchant_profile(current_user: dict = Depends(get_current_user)):
    """Get full merchant profile"""
    business_id = current_user.get("business_id")
    
    if not business_id:
        raise HTTPException(status_code=404, detail="No merchant profile found")
    
    merchant = await db.kwikpay_merchants.find_one({"business_id": business_id})
    
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")
    
    balance = await db.merchant_balances.find_one({"business_id": business_id})
    
    profile = serialize_doc(merchant)
    profile.pop("api_secret", None)
    profile.pop("webhook_secret", None)
    
    if balance:
        profile["balance"] = {
            "available": balance.get("available_balance", 0),
            "pending": balance.get("pending_balance", 0),
            "total_volume": balance.get("total_volume", 0),
            "currency": balance.get("currency", "TZS")
        }
    
    return profile


@router.post("/go-live-request")
async def request_go_live(current_user: dict = Depends(get_current_user)):
    """Request to switch from sandbox to live mode"""
    business_id = current_user.get("business_id")
    
    if not business_id:
        raise HTTPException(status_code=400, detail="No merchant profile found")
    
    merchant = await db.kwikpay_merchants.find_one({"business_id": business_id})
    
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant profile not found")
    
    if merchant.get("onboarding_status") != "completed":
        raise HTTPException(status_code=400, detail="Please complete onboarding first")
    
    if not merchant.get("sandbox_mode", True):
        return {"success": True, "message": "Already in live mode"}
    
    request_doc = {
        "business_id": business_id,
        "merchant_name": merchant.get("business_name"),
        "requested_by": current_user.get("id"),
        "requested_at": datetime.utcnow(),
        "status": "pending"
    }
    
    await db.go_live_requests.insert_one(request_doc)
    
    return {
        "success": True,
        "message": "Go-live request submitted. Our team will review and contact you within 48 hours.",
        "status": "pending"
    }
