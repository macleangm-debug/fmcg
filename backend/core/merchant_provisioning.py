"""
Merchant Provisioning Service
Handles auto-provisioning of merchants with EcoBank QR terminals and checkout links
"""
import os
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from bson import ObjectId

logger = logging.getLogger(__name__)

# Fee configuration
KWIKPAY_FEE_PERCENT = 1.0  # KwikPay takes 1%
ECOBANK_FEE_PERCENT = 1.5  # EcoBank takes 1.5%
MINIMUM_PAYOUT_AMOUNT = 10000  # Minimum TSh 10,000 for payout


def generate_checkout_code(business_name: str) -> str:
    """Generate unique checkout code from business name"""
    # Clean business name
    clean_name = ''.join(c for c in business_name if c.isalnum())[:6].upper()
    random_suffix = secrets.token_hex(2).upper()
    return f"{clean_name}{random_suffix}"


def generate_api_credentials() -> Dict[str, str]:
    """Generate API key and secret for merchant"""
    return {
        "api_key": f"kwk_live_{secrets.token_hex(16)}",
        "api_secret": secrets.token_hex(32),
        "webhook_secret": secrets.token_hex(24)
    }


async def provision_merchant(
    db,
    business_id: str,
    business_name: str,
    owner_name: str,
    email: str,
    phone: str,
    country_code: str = "TZ",
    bank_account: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Provision a new merchant with all required resources:
    - Unique checkout code
    - API credentials
    - EcoBank QR terminal (when credentials available)
    - Initial settings
    """
    logger.info(f"Provisioning merchant: {business_name} ({business_id})")
    
    # Generate unique checkout code
    checkout_code = generate_checkout_code(business_name)
    
    # Ensure uniqueness
    existing = await db.merchant_checkouts.find_one({"checkout_code": checkout_code})
    while existing:
        checkout_code = generate_checkout_code(business_name)
        existing = await db.merchant_checkouts.find_one({"checkout_code": checkout_code})
    
    # Generate API credentials
    credentials = generate_api_credentials()
    
    # Currency mapping
    currency_map = {
        "TZ": {"currency": "TZS", "symbol": "TSh"},
        "KE": {"currency": "KES", "symbol": "KSh"},
        "UG": {"currency": "UGX", "symbol": "USh"},
        "RW": {"currency": "RWF", "symbol": "FRw"},
        "GH": {"currency": "GHS", "symbol": "GH₵"},
        "NG": {"currency": "NGN", "symbol": "₦"}
    }
    
    currency_info = currency_map.get(country_code, currency_map["TZ"])
    
    # Create merchant checkout configuration
    checkout_config = {
        "checkout_code": checkout_code,
        "business_id": business_id,
        "checkout_name": f"{business_name} Checkout",
        "country_code": country_code,
        "currency": currency_info["currency"],
        "currency_symbol": currency_info["symbol"],
        "accepted_methods": ["mobile_money", "bank_transfer", "card", "qr"],
        "theme_color": "#7C3AED",
        "logo_url": None,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.merchant_checkouts.insert_one(checkout_config)
    
    # Create merchant profile with credentials
    merchant_profile = {
        "business_id": business_id,
        "business_name": business_name,
        "owner_name": owner_name,
        "email": email,
        "phone": phone,
        "country_code": country_code,
        "checkout_code": checkout_code,
        "api_key": credentials["api_key"],
        "api_secret": credentials["api_secret"],
        "webhook_secret": credentials["webhook_secret"],
        "webhook_url": None,
        "callback_url": None,
        "fee_percent": KWIKPAY_FEE_PERCENT,
        "is_verified": False,
        "is_active": True,
        "sandbox_mode": True,  # Start in sandbox
        "ecobank_terminal": None,  # Will be set when provisioned
        "bank_account": bank_account,
        "onboarding_status": "pending_verification",
        "onboarding_completed_at": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.kwikpay_merchants.update_one(
        {"business_id": business_id},
        {"$set": merchant_profile},
        upsert=True
    )
    
    # Create initial balance record
    balance_record = {
        "business_id": business_id,
        "merchant_id": business_id,
        "available_balance": 0,
        "pending_balance": 0,
        "total_volume": 0,
        "total_fees_paid": 0,
        "total_payouts": 0,
        "currency": currency_info["currency"],
        "last_payout_at": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.merchant_balances.update_one(
        {"business_id": business_id},
        {"$set": balance_record},
        upsert=True
    )
    
    logger.info(f"Merchant provisioned successfully: {checkout_code}")
    
    return {
        "success": True,
        "checkout_code": checkout_code,
        "checkout_url": f"/pay/{checkout_code}",
        "api_key": credentials["api_key"],
        "api_secret": credentials["api_secret"],
        "webhook_secret": credentials["webhook_secret"],
        "currency": currency_info["currency"],
        "message": "Merchant provisioned successfully"
    }


async def provision_ecobank_terminal(
    db,
    business_id: str,
    ecobank_module
) -> Dict[str, Any]:
    """
    Provision EcoBank QR terminal for merchant
    Called after EcoBank credentials are available
    """
    merchant = await db.kwikpay_merchants.find_one({"business_id": business_id})
    if not merchant:
        return {"success": False, "error": "Merchant not found"}
    
    if merchant.get("ecobank_terminal"):
        return {"success": True, "message": "Terminal already provisioned", "terminal": merchant["ecobank_terminal"]}
    
    try:
        # Get affiliate code for country
        affiliate_codes = {
            "TZ": "ETZ", "KE": "EKE", "UG": "EUG",
            "RW": "ERW", "GH": "EGH", "NG": "ENG"
        }
        affiliate_code = affiliate_codes.get(merchant.get("country_code", "TZ"), "ETZ")
        
        # Create QR terminal via EcoBank API
        result = await ecobank_module.create_merchant_qr_terminal(
            merchant_name=merchant["business_name"][:30],
            account_number=merchant.get("bank_account", {}).get("account_number", ""),
            terminal_name=f"KWK-{merchant['checkout_code']}",
            mobile_number=merchant["phone"],
            email=merchant["email"],
            area=merchant.get("address", "Dar es Salaam"),
            city=merchant.get("city", "Dar es Salaam"),
            affiliate_code=affiliate_code,
            callback_url=f"{os.environ.get('API_BASE_URL')}/api/kwikpay/webhooks/ecobank/{business_id}"
        )
        
        if result.get("success"):
            terminal_data = {
                "terminal_id": result.get("terminal_id"),
                "merchant_code": result.get("merchant_code"),
                "secret_key": result.get("secret_key"),
                "qr_code_base64": result.get("qr_code_base64"),
                "provisioned_at": datetime.utcnow()
            }
            
            await db.kwikpay_merchants.update_one(
                {"business_id": business_id},
                {"$set": {
                    "ecobank_terminal": terminal_data,
                    "updated_at": datetime.utcnow()
                }}
            )
            
            return {"success": True, "terminal": terminal_data}
        else:
            return {"success": False, "error": result.get("response", {}).get("response_message", "Unknown error")}
            
    except Exception as e:
        logger.error(f"Failed to provision EcoBank terminal: {str(e)}")
        return {"success": False, "error": str(e)}


async def update_merchant_balance(
    db,
    business_id: str,
    amount: float,
    fee_amount: float,
    transaction_type: str = "credit"  # "credit" or "debit"
) -> Dict[str, Any]:
    """
    Update merchant balance after a transaction
    """
    net_amount = amount - fee_amount
    
    if transaction_type == "credit":
        update = {
            "$inc": {
                "pending_balance": net_amount,
                "total_volume": amount,
                "total_fees_paid": fee_amount
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    else:
        update = {
            "$inc": {
                "available_balance": -net_amount
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    
    await db.merchant_balances.update_one(
        {"business_id": business_id},
        update
    )
    
    return {"success": True, "net_amount": net_amount}


async def process_settlement_to_available(
    db,
    business_id: str
) -> Dict[str, Any]:
    """
    Move pending balance to available balance (after settlement period)
    Typically called after 24-48 hours
    """
    balance = await db.merchant_balances.find_one({"business_id": business_id})
    if not balance:
        return {"success": False, "error": "Balance record not found"}
    
    pending = balance.get("pending_balance", 0)
    
    if pending <= 0:
        return {"success": True, "message": "No pending balance to settle"}
    
    await db.merchant_balances.update_one(
        {"business_id": business_id},
        {
            "$inc": {
                "available_balance": pending,
                "pending_balance": -pending
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {
        "success": True,
        "settled_amount": pending,
        "message": f"Settled {pending} to available balance"
    }
