"""
Public Checkout Routes
Handles public-facing checkout pages and payment processing (no auth required)
"""
import os
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from bson import ObjectId

# Setup logging
logger = logging.getLogger(__name__)

# Router - Note: No auth prefix, these are public routes
router = APIRouter(prefix="/pay", tags=["Public Checkout"])

# Database connection (will be set on import)
db = None


def set_database(database):
    """Set the database connection for this router"""
    global db
    db = database


# ============== COUNTRY CONFIGURATIONS ==============

COUNTRY_CONFIG = {
    "TZ": {
        "name": "Tanzania",
        "currency": "TZS",
        "currency_symbol": "TSh",
        "phone_prefix": "+255",
        "mnos": [
            {"code": "mpesa", "name": "M-Pesa", "color": "#E31937", "prefixes": ["074", "075", "076"]},
            {"code": "tigopesa", "name": "Tigo Pesa", "color": "#00377B", "prefixes": ["071", "065", "067"]},
            {"code": "airtelmoney", "name": "Airtel Money", "color": "#FF0000", "prefixes": ["078", "068", "069"]},
            {"code": "halopesa", "name": "Halopesa", "color": "#FF6B00", "prefixes": ["062"]},
            {"code": "tpesa", "name": "T-Pesa", "color": "#00A0DF", "prefixes": ["073"]}
        ],
        "banks": [
            {"code": "crdb", "name": "CRDB Bank", "color": "#00A651"},
            {"code": "nmb", "name": "NMB Bank", "color": "#E31937"},
            {"code": "nbc", "name": "NBC Bank", "color": "#003366"},
            {"code": "stanbic", "name": "Stanbic Bank", "color": "#0033A0"},
            {"code": "dtb", "name": "DTB Bank", "color": "#E2231A"},
            {"code": "kcb", "name": "KCB Bank", "color": "#00A859"},
            {"code": "equity", "name": "Equity Bank", "color": "#A32638"},
            {"code": "exim", "name": "Exim Bank", "color": "#003087"},
            {"code": "azania", "name": "Azania Bank", "color": "#1E3A8A"},
            {"code": "absa", "name": "ABSA Bank", "color": "#AF0000"},
            {"code": "ncba", "name": "NCBA Bank", "color": "#00A3E0"},
            {"code": "boa", "name": "Bank of Africa", "color": "#0066B3"}
        ]
    },
    "KE": {
        "name": "Kenya",
        "currency": "KES",
        "currency_symbol": "KSh",
        "phone_prefix": "+254",
        "mnos": [
            {"code": "mpesa", "name": "M-Pesa", "color": "#00A650", "prefixes": ["070", "071", "072"]},
            {"code": "airtelmoney", "name": "Airtel Money", "color": "#FF0000", "prefixes": ["073", "075"]},
            {"code": "tkash", "name": "T-Kash", "color": "#F7931E", "prefixes": ["077"]}
        ],
        "banks": [
            {"code": "kcb", "name": "KCB Bank", "color": "#00A859"},
            {"code": "equity", "name": "Equity Bank", "color": "#A32638"},
            {"code": "coop", "name": "Co-operative Bank", "color": "#00683D"},
            {"code": "absa", "name": "ABSA Bank", "color": "#AF0000"},
            {"code": "stanbic", "name": "Stanbic Bank", "color": "#0033A0"},
            {"code": "dtb", "name": "DTB Bank", "color": "#E2231A"},
            {"code": "ncba", "name": "NCBA Bank", "color": "#00A3E0"},
            {"code": "family", "name": "Family Bank", "color": "#00B4E4"}
        ]
    },
    "UG": {
        "name": "Uganda",
        "currency": "UGX",
        "currency_symbol": "USh",
        "phone_prefix": "+256",
        "mnos": [
            {"code": "mtnmomo", "name": "MTN Mobile Money", "color": "#FFCC00", "prefixes": ["077", "078"]},
            {"code": "airtelmoney", "name": "Airtel Money", "color": "#FF0000", "prefixes": ["075", "070"]}
        ],
        "banks": [
            {"code": "stanbic", "name": "Stanbic Bank", "color": "#0033A0"},
            {"code": "dfcu", "name": "DFCU Bank", "color": "#00A651"},
            {"code": "absa", "name": "ABSA Bank", "color": "#AF0000"},
            {"code": "centenary", "name": "Centenary Bank", "color": "#003366"},
            {"code": "equity", "name": "Equity Bank", "color": "#A32638"}
        ]
    },
    "RW": {
        "name": "Rwanda",
        "currency": "RWF",
        "currency_symbol": "FRw",
        "phone_prefix": "+250",
        "mnos": [
            {"code": "mtnmomo", "name": "MTN Mobile Money", "color": "#FFCC00", "prefixes": ["078", "079"]},
            {"code": "airtelmoney", "name": "Airtel Money", "color": "#FF0000", "prefixes": ["073", "072"]}
        ],
        "banks": [
            {"code": "bk", "name": "Bank of Kigali", "color": "#00447C"},
            {"code": "equity", "name": "Equity Bank", "color": "#A32638"},
            {"code": "bpr", "name": "BPR Bank", "color": "#00A651"}
        ]
    }
}


# ============== MODELS ==============

class PublicPaymentRequest(BaseModel):
    amount: float = Field(..., gt=0)
    payment_method: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    bank_code: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# ============== PUBLIC ENDPOINTS (NO AUTH) ==============

@router.get("/{checkout_code}")
async def get_checkout_config(checkout_code: str):
    """
    Get public checkout configuration for a merchant
    This endpoint is PUBLIC - no authentication required
    """
    # Find merchant checkout configuration
    checkout = await db.merchant_checkouts.find_one({
        "checkout_code": checkout_code,
        "is_active": True
    })
    
    if not checkout:
        raise HTTPException(status_code=404, detail="Checkout not found or inactive")
    
    # Get business info
    business = await db.businesses.find_one({"_id": ObjectId(checkout["business_id"])})
    if not business:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    # Get country configuration
    country_code = checkout.get("country_code", "TZ")
    country_config = COUNTRY_CONFIG.get(country_code, COUNTRY_CONFIG["TZ"])
    
    # Get accepted payment methods
    accepted_methods = checkout.get("accepted_methods", ["mobile_money", "bank_transfer", "card", "qr"])
    
    # Build response
    payment_methods = {
        "mobile_money": {
            "enabled": "mobile_money" in accepted_methods,
            "providers": country_config["mnos"]
        },
        "bank_transfer": {
            "enabled": "bank_transfer" in accepted_methods,
            "banks": country_config["banks"]
        },
        "card": {
            "enabled": "card" in accepted_methods,
            "provider": "flutterwave"
        },
        "qr": {
            "enabled": "qr" in accepted_methods,
            "providers": ["TigoPesa", "M-Pesa"]
        }
    }
    
    return {
        "checkout_code": checkout_code,
        "merchant": {
            "name": business.get("name", "Merchant"),
            "logo_url": checkout.get("logo_url")
        },
        "country": {
            "code": country_code,
            "name": country_config["name"],
            "currency": country_config["currency"],
            "currency_symbol": country_config["currency_symbol"]
        },
        "theme": {
            "color": checkout.get("theme_color", "#7C3AED")
        },
        "payment_methods": payment_methods,
        "branding": {
            "powered_by": "KwikPay",
            "tagline": "Fast & Secure Payments"
        }
    }


@router.post("/{checkout_code}")
async def process_public_payment(checkout_code: str, payment: PublicPaymentRequest):
    """
    Process a payment on the public checkout page
    This endpoint is PUBLIC - no authentication required
    """
    # Find checkout config
    checkout = await db.merchant_checkouts.find_one({
        "checkout_code": checkout_code,
        "is_active": True
    })
    
    if not checkout:
        raise HTTPException(status_code=404, detail="Checkout not found")
    
    business_id = checkout["business_id"]
    country_code = checkout.get("country_code", "TZ")
    country_config = COUNTRY_CONFIG.get(country_code, COUNTRY_CONFIG["TZ"])
    
    # Generate transaction reference
    tx_ref = f"KWK_{secrets.token_hex(8).upper()}"
    
    # Create transaction record
    tx_doc = {
        "tx_ref": tx_ref,
        "checkout_code": checkout_code,
        "business_id": business_id,
        "merchant_id": business_id,
        "amount": payment.amount,
        "currency": country_config["currency"],
        "payment_method": payment.payment_method,
        "customer_phone": payment.customer_phone,
        "customer_email": payment.customer_email,
        "bank_code": payment.bank_code,
        "metadata": payment.metadata or {},
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    await db.kwikpay_transactions.insert_one(tx_doc)
    
    # Generate payment instructions based on method
    instructions = None
    
    if payment.payment_method == "mobile_money":
        # Detect MNO from phone
        phone = payment.customer_phone or ""
        phone_digits = ''.join(filter(str.isdigit, phone))
        prefix = phone_digits[3:6] if len(phone_digits) > 5 else "074"
        
        mno = None
        for provider in country_config["mnos"]:
            if any(prefix.startswith(p) for p in provider.get("prefixes", [])):
                mno = provider
                break
        
        if not mno:
            mno = country_config["mnos"][0]
        
        # Generate USSD code
        ussd_codes = {
            "mpesa": f"*150*00*{int(payment.amount)}#",
            "tigopesa": f"*150*01*{int(payment.amount)}#",
            "airtelmoney": f"*150*60*{int(payment.amount)}#",
            "halopesa": f"*150*88*{int(payment.amount)}#",
            "tpesa": f"*150*03*{int(payment.amount)}#",
            "mtnmomo": f"*165*3*{int(payment.amount)}#"
        }
        
        instructions = {
            "type": "ussd",
            "mno": mno["name"],
            "code": ussd_codes.get(mno["code"], f"*150*00*{int(payment.amount)}#"),
            "message": f"Dial {ussd_codes.get(mno['code'], '*150#')} to complete payment"
        }
        
    elif payment.payment_method == "bank_transfer":
        bank = next((b for b in country_config["banks"] if b["code"] == payment.bank_code), country_config["banks"][0])
        
        instructions = {
            "type": "bank_transfer",
            "bank": bank["name"],
            "account_number": "1234567890",
            "account_name": "KwikPay Collections",
            "reference": tx_ref,
            "message": f"Transfer to {bank['name']} account. Use reference: {tx_ref}"
        }
        
    elif payment.payment_method == "card":
        instructions = {
            "type": "redirect",
            "provider": "flutterwave",
            "message": "You will be redirected to complete card payment"
        }
        
    elif payment.payment_method == "qr":
        instructions = {
            "type": "qr",
            "qr_data": f"kwikpay://{tx_ref}/{payment.amount}",
            "message": "Scan QR code with your banking or mobile money app"
        }
    
    return {
        "success": True,
        "tx_ref": tx_ref,
        "amount": payment.amount,
        "currency": country_config["currency"],
        "status": "pending",
        "instructions": instructions
    }


@router.get("/{checkout_code}/status/{tx_ref}")
async def get_payment_status(checkout_code: str, tx_ref: str):
    """
    Check payment status (public endpoint)
    """
    transaction = await db.kwikpay_transactions.find_one({
        "checkout_code": checkout_code,
        "tx_ref": tx_ref
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {
        "tx_ref": tx_ref,
        "status": transaction.get("status", "unknown"),
        "amount": transaction.get("amount"),
        "currency": transaction.get("currency"),
        "created_at": transaction.get("created_at").isoformat() if transaction.get("created_at") else None,
        "completed_at": transaction.get("completed_at").isoformat() if transaction.get("completed_at") else None
    }


# ============== MNO DETECTION ENDPOINT ==============

@router.post("/kwikcheckout/detect-mno")
async def detect_mno(
    phone: str = Body(...),
    country_code: str = Body("TZ")
):
    """
    Detect mobile network operator from phone number
    Public endpoint for frontend auto-detection
    """
    country_config = COUNTRY_CONFIG.get(country_code, COUNTRY_CONFIG["TZ"])
    
    # Extract digits
    phone_digits = ''.join(filter(str.isdigit, phone))
    
    # Get prefix (first 3 digits after country code)
    if phone_digits.startswith("255"):
        prefix = phone_digits[3:6]
    elif phone_digits.startswith("0"):
        prefix = phone_digits[1:4]
    else:
        prefix = phone_digits[:3]
    
    # Find matching MNO
    for mno in country_config["mnos"]:
        for mno_prefix in mno.get("prefixes", []):
            if prefix.startswith(mno_prefix) or mno_prefix.startswith(prefix):
                return {
                    "detected": True,
                    "mno_code": mno["code"],
                    "name": mno["name"],
                    "color": mno["color"]
                }
    
    return {
        "detected": False,
        "mno_code": None,
        "name": None,
        "color": None
    }
