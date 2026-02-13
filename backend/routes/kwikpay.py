"""
KwikPay Payment Platform Routes
Handles payment processing, mobile money, payouts, and merchant management
"""
import os
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel, Field
from bson import ObjectId

# Setup logging
logger = logging.getLogger(__name__)

# Router
router = APIRouter(prefix="/kwikpay", tags=["KwikPay Payments"])

# Database connection (will be set on import)
db = None
get_current_user = None


def set_dependencies(database, auth_func):
    """Set the database and auth function for this router"""
    global db, get_current_user
    db = database
    get_current_user = auth_func


# ============== ENUMS ==============

class TransactionStatus(str, Enum):
    SUCCEEDED = "succeeded"
    PENDING = "pending"
    PROCESSING = "processing"
    FAILED = "failed"
    REFUNDED = "refunded"
    EXPIRED = "expired"


class PayoutStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class PaymentMethod(str, Enum):
    CARD = "card"
    MPESA = "mpesa"
    TIGO_PESA = "tigo_pesa"
    AIRTEL_MONEY = "airtel_money"
    BANK_TRANSFER = "bank_transfer"
    HALOTEL = "halotel"
    QR_CODE = "qr_code"


# ============== MODELS ==============

class MerchantCreate(BaseModel):
    business_name: str
    country: str = "TZ"
    currency: str = "TZS"
    webhook_url: Optional[str] = None
    callback_url: Optional[str] = None


class TransactionCreate(BaseModel):
    amount: float = Field(..., gt=0)
    currency: str = "TZS"
    method: str
    customer_email: str
    customer_phone: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class PayoutCreate(BaseModel):
    amount: float = Field(..., gt=0)
    currency: str = "TZS"
    recipient_type: str = "individual"
    recipient_name: str
    recipient_account: str
    recipient_bank_code: Optional[str] = None
    method: str = "mobile_money"
    description: Optional[str] = None


class MobileMoneyPayment(BaseModel):
    phone: str
    amount: float = Field(..., gt=0)
    currency: str = "TZS"
    description: str = ""
    provider: Optional[str] = None


class RefundRequest(BaseModel):
    transaction_id: str
    amount: Optional[float] = None
    reason: str = ""


# ============== HELPER FUNCTIONS ==============

def generate_tx_ref() -> str:
    """Generate unique transaction reference"""
    return f"KWK_{secrets.token_hex(8).upper()}"


def serialize_transaction(doc: dict) -> dict:
    """Serialize transaction document for API response"""
    if doc is None:
        return None
    result = {k: v for k, v in doc.items() if k != "_id"}
    result["id"] = str(doc.get("_id", ""))
    if "created_at" in result and hasattr(result["created_at"], "isoformat"):
        result["created_at"] = result["created_at"].isoformat()
    if "updated_at" in result and hasattr(result["updated_at"], "isoformat"):
        result["updated_at"] = result["updated_at"].isoformat()
    return result


# ============== MERCHANT ENDPOINTS ==============

@router.get("/merchant/profile")
async def get_merchant_profile(current_user: dict = Depends(lambda: get_current_user)):
    """Get current merchant profile"""
    business_id = current_user.get("business_id")
    
    merchant = await db.kwikpay_merchants.find_one({"business_id": business_id})
    
    if not merchant:
        # Create default merchant profile
        merchant = {
            "business_id": business_id,
            "api_key": f"kwk_live_{secrets.token_hex(16)}",
            "api_secret": secrets.token_hex(32),
            "sandbox_mode": True,
            "webhook_url": None,
            "callback_url": None,
            "created_at": datetime.utcnow()
        }
        await db.kwikpay_merchants.insert_one(merchant)
    
    return {
        "business_id": merchant["business_id"],
        "api_key": merchant["api_key"],
        "sandbox_mode": merchant.get("sandbox_mode", True),
        "webhook_url": merchant.get("webhook_url"),
        "callback_url": merchant.get("callback_url"),
        "created_at": merchant.get("created_at")
    }


@router.put("/merchant/settings")
async def update_merchant_settings(
    webhook_url: Optional[str] = Body(None),
    callback_url: Optional[str] = Body(None),
    sandbox_mode: Optional[bool] = Body(None),
    current_user: dict = Depends(lambda: get_current_user)
):
    """Update merchant settings"""
    business_id = current_user.get("business_id")
    
    update_data = {"updated_at": datetime.utcnow()}
    if webhook_url is not None:
        update_data["webhook_url"] = webhook_url
    if callback_url is not None:
        update_data["callback_url"] = callback_url
    if sandbox_mode is not None:
        update_data["sandbox_mode"] = sandbox_mode
    
    await db.kwikpay_merchants.update_one(
        {"business_id": business_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Settings updated successfully"}


# ============== TRANSACTION ENDPOINTS ==============

@router.get("/transactions")
async def list_transactions(
    status: Optional[str] = None,
    method: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(lambda: get_current_user)
):
    """List all transactions for the merchant"""
    business_id = current_user.get("business_id")
    
    query = {"business_id": business_id}
    if status:
        query["status"] = status
    if method:
        query["method"] = method
    
    transactions = await db.kwikpay_transactions.find(query) \
        .sort("created_at", -1) \
        .skip(offset) \
        .limit(limit) \
        .to_list(length=limit)
    
    total = await db.kwikpay_transactions.count_documents(query)
    
    return {
        "transactions": [serialize_transaction(t) for t in transactions],
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/transactions/{tx_ref}")
async def get_transaction(
    tx_ref: str,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Get transaction by reference"""
    business_id = current_user.get("business_id")
    
    transaction = await db.kwikpay_transactions.find_one({
        "business_id": business_id,
        "$or": [
            {"tx_ref": tx_ref},
            {"transaction_id": tx_ref},
            {"reference": tx_ref}
        ]
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return serialize_transaction(transaction)


@router.post("/transactions/create")
async def create_transaction(
    transaction: TransactionCreate,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Create a new payment transaction"""
    business_id = current_user.get("business_id")
    tx_ref = generate_tx_ref()
    
    tx_doc = {
        "tx_ref": tx_ref,
        "business_id": business_id,
        "amount": transaction.amount,
        "currency": transaction.currency,
        "method": transaction.method,
        "customer_email": transaction.customer_email,
        "customer_phone": transaction.customer_phone,
        "description": transaction.description,
        "metadata": transaction.metadata or {},
        "status": TransactionStatus.PENDING.value,
        "created_at": datetime.utcnow()
    }
    
    await db.kwikpay_transactions.insert_one(tx_doc)
    
    return {
        "tx_ref": tx_ref,
        "status": "pending",
        "message": "Transaction created successfully"
    }


# ============== MOBILE MONEY ENDPOINTS ==============

@router.get("/mobile-money/providers")
async def get_mobile_money_providers(current_user: dict = Depends(lambda: get_current_user)):
    """Get supported mobile money providers"""
    return {
        "providers": [
            {"code": "mpesa", "name": "M-Pesa", "country": "TZ", "color": "#E31937"},
            {"code": "tigopesa", "name": "Tigo Pesa", "country": "TZ", "color": "#00377B"},
            {"code": "airtelmoney", "name": "Airtel Money", "country": "TZ", "color": "#FF0000"},
            {"code": "halopesa", "name": "Halopesa", "country": "TZ", "color": "#FF6B00"},
            {"code": "tpesa", "name": "T-Pesa", "country": "TZ", "color": "#00A0DF"}
        ]
    }


@router.post("/mobile-money/initiate")
async def initiate_mobile_money(
    payment: MobileMoneyPayment,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Initiate a mobile money payment"""
    business_id = current_user.get("business_id")
    tx_ref = generate_tx_ref()
    
    # Detect provider from phone prefix if not specified
    provider = payment.provider
    if not provider:
        phone_digits = ''.join(filter(str.isdigit, payment.phone))
        prefix = phone_digits[3:6] if len(phone_digits) > 5 else ""
        
        prefix_map = {
            "074": "mpesa", "075": "mpesa", "076": "mpesa",
            "071": "tigopesa", "065": "tigopesa", "067": "tigopesa",
            "078": "airtelmoney", "068": "airtelmoney", "069": "airtelmoney",
            "062": "halopesa",
            "073": "tpesa"
        }
        provider = prefix_map.get(prefix, "mpesa")
    
    # Create transaction record
    tx_doc = {
        "tx_ref": tx_ref,
        "business_id": business_id,
        "type": "mobile_money",
        "provider": provider,
        "amount": payment.amount,
        "currency": payment.currency,
        "customer_phone": payment.phone,
        "description": payment.description,
        "status": TransactionStatus.PENDING.value,
        "created_at": datetime.utcnow()
    }
    
    await db.kwikpay_transactions.insert_one(tx_doc)
    
    # Generate USSD code (simulated)
    ussd_codes = {
        "mpesa": f"*150*00*{int(payment.amount)}#",
        "tigopesa": f"*150*01*{int(payment.amount)}#",
        "airtelmoney": f"*150*60*{int(payment.amount)}#",
        "halopesa": f"*150*88*{int(payment.amount)}#",
        "tpesa": f"*150*03*{int(payment.amount)}#"
    }
    
    return {
        "success": True,
        "tx_ref": tx_ref,
        "provider": provider,
        "ussd_code": ussd_codes.get(provider, f"*150*00*{int(payment.amount)}#"),
        "message": f"Dial the USSD code to complete payment",
        "status": "pending"
    }


@router.post("/mobile-money/callback/{tx_ref}")
async def mobile_money_callback(tx_ref: str, payload: Dict[str, Any] = Body(...)):
    """Receive callback from mobile money provider (webhook)"""
    transaction = await db.kwikpay_transactions.find_one({"tx_ref": tx_ref})
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    status = "succeeded" if payload.get("success") else "failed"
    
    await db.kwikpay_transactions.update_one(
        {"tx_ref": tx_ref},
        {"$set": {
            "status": status,
            "provider_response": payload,
            "completed_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Callback processed"}


# ============== PAYOUT ENDPOINTS ==============

@router.get("/payouts")
async def list_payouts(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(lambda: get_current_user)
):
    """List all payouts"""
    business_id = current_user.get("business_id")
    
    query = {"business_id": business_id}
    if status:
        query["status"] = status
    
    payouts = await db.kwikpay_payouts.find(query) \
        .sort("created_at", -1) \
        .skip(offset) \
        .limit(limit) \
        .to_list(length=limit)
    
    return {
        "payouts": [serialize_transaction(p) for p in payouts],
        "total": await db.kwikpay_payouts.count_documents(query)
    }


@router.post("/payouts/create")
async def create_payout(
    payout: PayoutCreate,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Create a new payout"""
    business_id = current_user.get("business_id")
    payout_id = f"PO_{secrets.token_hex(8).upper()}"
    
    payout_doc = {
        "payout_id": payout_id,
        "business_id": business_id,
        "amount": payout.amount,
        "currency": payout.currency,
        "recipient_type": payout.recipient_type,
        "recipient_name": payout.recipient_name,
        "recipient_account": payout.recipient_account,
        "recipient_bank_code": payout.recipient_bank_code,
        "method": payout.method,
        "description": payout.description,
        "status": PayoutStatus.PENDING.value,
        "created_at": datetime.utcnow()
    }
    
    await db.kwikpay_payouts.insert_one(payout_doc)
    
    return {
        "payout_id": payout_id,
        "status": "pending",
        "message": "Payout queued for processing"
    }


# ============== REFUND ENDPOINTS ==============

@router.post("/refunds/create")
async def create_refund(
    refund: RefundRequest,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Create a refund for a transaction"""
    business_id = current_user.get("business_id")
    
    # Find original transaction
    transaction = await db.kwikpay_transactions.find_one({
        "business_id": business_id,
        "$or": [
            {"tx_ref": refund.transaction_id},
            {"transaction_id": refund.transaction_id}
        ]
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction["status"] != "succeeded":
        raise HTTPException(status_code=400, detail="Can only refund successful transactions")
    
    refund_amount = refund.amount or transaction["amount"]
    refund_id = f"RF_{secrets.token_hex(8).upper()}"
    
    refund_doc = {
        "refund_id": refund_id,
        "business_id": business_id,
        "original_tx_ref": transaction.get("tx_ref"),
        "amount": refund_amount,
        "currency": transaction.get("currency", "TZS"),
        "reason": refund.reason,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    await db.kwikpay_refunds.insert_one(refund_doc)
    
    # Update original transaction
    await db.kwikpay_transactions.update_one(
        {"_id": transaction["_id"]},
        {"$set": {"refund_status": "pending", "refund_id": refund_id}}
    )
    
    return {
        "refund_id": refund_id,
        "amount": refund_amount,
        "status": "pending",
        "message": "Refund initiated"
    }


# ============== ANALYTICS ENDPOINTS ==============

@router.get("/analytics/summary")
async def get_analytics_summary(
    period: str = "today",
    current_user: dict = Depends(lambda: get_current_user)
):
    """Get payment analytics summary"""
    business_id = current_user.get("business_id")
    
    # Calculate date range
    now = datetime.utcnow()
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Aggregate statistics
    pipeline = [
        {"$match": {
            "business_id": business_id,
            "created_at": {"$gte": start_date}
        }},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_amount": {"$sum": "$amount"}
        }}
    ]
    
    results = await db.kwikpay_transactions.aggregate(pipeline).to_list(length=100)
    
    # Format response
    summary = {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": now.isoformat(),
        "total_transactions": 0,
        "successful_transactions": 0,
        "failed_transactions": 0,
        "pending_transactions": 0,
        "total_volume": 0,
        "successful_volume": 0,
        "success_rate": 0
    }
    
    for r in results:
        summary["total_transactions"] += r["count"]
        if r["_id"] == "succeeded":
            summary["successful_transactions"] = r["count"]
            summary["successful_volume"] = r["total_amount"]
        elif r["_id"] == "failed":
            summary["failed_transactions"] = r["count"]
        elif r["_id"] == "pending":
            summary["pending_transactions"] = r["count"]
        summary["total_volume"] += r["total_amount"]
    
    if summary["total_transactions"] > 0:
        summary["success_rate"] = round(
            (summary["successful_transactions"] / summary["total_transactions"]) * 100, 2
        )
    
    return summary


@router.get("/analytics/by-method")
async def get_analytics_by_method(
    period: str = "month",
    current_user: dict = Depends(lambda: get_current_user)
):
    """Get payment analytics grouped by payment method"""
    business_id = current_user.get("business_id")
    
    now = datetime.utcnow()
    start_date = now - timedelta(days=30 if period == "month" else 7)
    
    pipeline = [
        {"$match": {
            "business_id": business_id,
            "created_at": {"$gte": start_date}
        }},
        {"$group": {
            "_id": {"method": "$method", "status": "$status"},
            "count": {"$sum": 1},
            "total_amount": {"$sum": "$amount"}
        }}
    ]
    
    results = await db.kwikpay_transactions.aggregate(pipeline).to_list(length=100)
    
    # Organize by method
    methods = {}
    for r in results:
        method = r["_id"].get("method", "unknown")
        if method not in methods:
            methods[method] = {
                "method": method,
                "total": 0,
                "successful": 0,
                "volume": 0
            }
        methods[method]["total"] += r["count"]
        if r["_id"]["status"] == "succeeded":
            methods[method]["successful"] += r["count"]
            methods[method]["volume"] += r["total_amount"]
    
    return {"period": period, "by_method": list(methods.values())}
