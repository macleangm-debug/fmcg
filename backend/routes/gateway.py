"""
Payment Gateway Routes
Handles payment processing, gateways, and transaction management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from bson import ObjectId
import uuid

router = APIRouter(prefix="/gateway", tags=["Payment Gateway"])

# Module-level variables
db = None
_get_current_user = None


def set_dependencies(database, current_user_dep):
    """Initialize router dependencies"""
    global db, _get_current_user
    db = database
    _get_current_user = current_user_dep


async def get_current_user():
    if _get_current_user is None:
        raise HTTPException(status_code=500, detail="Auth not initialized")
    return await _get_current_user()


# ============== PYDANTIC MODELS ==============

class GatewayConfigCreate(BaseModel):
    provider: str  # stripe, flutterwave, mpesa, etc.
    credentials: dict = {}
    is_test_mode: bool = True


class PaymentRequest(BaseModel):
    amount: float
    currency: str = "TZS"
    description: Optional[str] = None
    customer_email: Optional[str] = None
    metadata: dict = {}


class RefundRequest(BaseModel):
    transaction_id: str
    amount: Optional[float] = None
    reason: Optional[str] = None


# ============== GATEWAYS ==============

@router.get("/providers")
async def get_available_providers():
    """Get list of available payment providers"""
    return {
        "providers": [
            {
                "id": "stripe",
                "name": "Stripe",
                "supported_currencies": ["USD", "EUR", "GBP", "TZS"],
                "supported_methods": ["card", "bank_transfer"],
                "regions": ["global"]
            },
            {
                "id": "flutterwave",
                "name": "Flutterwave",
                "supported_currencies": ["NGN", "KES", "TZS", "USD"],
                "supported_methods": ["card", "mobile_money", "bank_transfer"],
                "regions": ["africa"]
            },
            {
                "id": "mpesa",
                "name": "M-Pesa",
                "supported_currencies": ["TZS", "KES"],
                "supported_methods": ["mobile_money"],
                "regions": ["east_africa"]
            },
            {
                "id": "tigopesa",
                "name": "Tigo Pesa",
                "supported_currencies": ["TZS"],
                "supported_methods": ["mobile_money"],
                "regions": ["tanzania"]
            },
            {
                "id": "airtel_money",
                "name": "Airtel Money",
                "supported_currencies": ["TZS", "KES", "UGX"],
                "supported_methods": ["mobile_money"],
                "regions": ["east_africa"]
            }
        ]
    }


@router.get("/configured")
async def get_configured_gateways(current_user: dict = Depends(get_current_user)):
    """Get configured payment gateways"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        return {"gateways": []}
    
    gateways = await db.payment_gateways.find({"business_id": str(business_id)}).to_list(20)
    
    return {
        "gateways": [{
            "id": str(g["_id"]),
            "provider": g.get("provider", ""),
            "is_active": g.get("is_active", False),
            "is_test_mode": g.get("is_test_mode", True),
            "is_primary": g.get("is_primary", False),
            "created_at": g.get("created_at", datetime.utcnow()).isoformat() if isinstance(g.get("created_at"), datetime) else str(g.get("created_at", ""))
        } for g in gateways]
    }


@router.post("/configure")
async def configure_gateway(
    config: GatewayConfigCreate,
    current_user: dict = Depends(get_current_user)
):
    """Configure a payment gateway"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="No business associated")
    
    # Check if gateway already configured
    existing = await db.payment_gateways.find_one({
        "business_id": str(business_id),
        "provider": config.provider
    })
    
    if existing:
        # Update existing
        await db.payment_gateways.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "credentials": config.credentials,
                "is_test_mode": config.is_test_mode,
                "updated_at": datetime.utcnow()
            }}
        )
        return {"message": "Gateway configuration updated", "id": str(existing["_id"])}
    
    # Create new
    gateway = {
        "business_id": str(business_id),
        "provider": config.provider,
        "credentials": config.credentials,
        "is_test_mode": config.is_test_mode,
        "is_active": True,
        "is_primary": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.payment_gateways.insert_one(gateway)
    
    return {"message": "Gateway configured", "id": str(result.inserted_id)}


@router.put("/{gateway_id}/activate")
async def activate_gateway(
    gateway_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Activate a gateway"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    result = await db.payment_gateways.update_one(
        {"_id": ObjectId(gateway_id), "business_id": str(business_id)},
        {"$set": {"is_active": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Gateway not found")
    
    return {"message": "Gateway activated"}


@router.put("/{gateway_id}/deactivate")
async def deactivate_gateway(
    gateway_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Deactivate a gateway"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    result = await db.payment_gateways.update_one(
        {"_id": ObjectId(gateway_id), "business_id": str(business_id)},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Gateway not found")
    
    return {"message": "Gateway deactivated"}


@router.put("/{gateway_id}/set-primary")
async def set_primary_gateway(
    gateway_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Set a gateway as primary"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    # Remove primary from all gateways
    await db.payment_gateways.update_many(
        {"business_id": str(business_id)},
        {"$set": {"is_primary": False}}
    )
    
    # Set this one as primary
    result = await db.payment_gateways.update_one(
        {"_id": ObjectId(gateway_id), "business_id": str(business_id)},
        {"$set": {"is_primary": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Gateway not found")
    
    return {"message": "Gateway set as primary"}


@router.delete("/{gateway_id}")
async def delete_gateway(
    gateway_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a gateway configuration"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    result = await db.payment_gateways.delete_one({
        "_id": ObjectId(gateway_id),
        "business_id": str(business_id)
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gateway not found")
    
    return {"message": "Gateway deleted"}


# ============== TRANSACTIONS ==============

@router.get("/transactions")
async def get_transactions(
    status: Optional[str] = None,
    provider: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user)
):
    """Get payment transactions"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        return {"transactions": []}
    
    query = {"business_id": str(business_id)}
    if status:
        query["status"] = status
    if provider:
        query["provider"] = provider
    
    transactions = await db.transactions.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "transactions": [{
            "id": str(t["_id"]),
            "reference": t.get("reference", ""),
            "amount": t.get("amount", 0),
            "currency": t.get("currency", "TZS"),
            "status": t.get("status", ""),
            "provider": t.get("provider", ""),
            "type": t.get("type", "payment"),
            "customer_email": t.get("customer_email", ""),
            "created_at": t.get("created_at", datetime.utcnow()).isoformat() if isinstance(t.get("created_at"), datetime) else str(t.get("created_at", ""))
        } for t in transactions]
    }


@router.get("/transactions/{transaction_id}")
async def get_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get transaction details"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    transaction = await db.transactions.find_one({
        "_id": ObjectId(transaction_id),
        "business_id": str(business_id)
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {
        "id": str(transaction["_id"]),
        "reference": transaction.get("reference", ""),
        "amount": transaction.get("amount", 0),
        "currency": transaction.get("currency", "TZS"),
        "status": transaction.get("status", ""),
        "provider": transaction.get("provider", ""),
        "type": transaction.get("type", "payment"),
        "customer_email": transaction.get("customer_email", ""),
        "metadata": transaction.get("metadata", {}),
        "provider_response": transaction.get("provider_response", {}),
        "created_at": transaction.get("created_at", datetime.utcnow()).isoformat() if isinstance(transaction.get("created_at"), datetime) else str(transaction.get("created_at", ""))
    }


@router.post("/refund")
async def process_refund(
    request: RefundRequest,
    current_user: dict = Depends(get_current_user)
):
    """Process a refund"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    transaction = await db.transactions.find_one({
        "_id": ObjectId(request.transaction_id),
        "business_id": str(business_id),
        "status": "completed"
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found or not refundable")
    
    refund_amount = request.amount or transaction.get("amount", 0)
    
    refund = {
        "business_id": str(business_id),
        "original_transaction_id": request.transaction_id,
        "amount": refund_amount,
        "currency": transaction.get("currency", "TZS"),
        "reason": request.reason,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    result = await db.refunds.insert_one(refund)
    
    # Update transaction status
    await db.transactions.update_one(
        {"_id": ObjectId(request.transaction_id)},
        {"$set": {"status": "refunded", "refund_id": str(result.inserted_id)}}
    )
    
    return {
        "refund_id": str(result.inserted_id),
        "message": "Refund initiated",
        "amount": refund_amount
    }


# ============== ANALYTICS ==============

@router.get("/analytics")
async def get_payment_analytics(
    period: str = Query("30d", description="Period: 7d, 30d, 90d"),
    current_user: dict = Depends(get_current_user)
):
    """Get payment analytics"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        return {"total": 0, "count": 0}
    
    days = int(period.replace("d", ""))
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = {
        "business_id": str(business_id),
        "created_at": {"$gte": start_date},
        "status": "completed"
    }
    
    # Get totals
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": None,
            "total_amount": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]
    
    result = await db.transactions.aggregate(pipeline).to_list(1)
    totals = result[0] if result else {"total_amount": 0, "count": 0}
    
    # Get by provider
    provider_pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$provider",
            "amount": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]
    
    by_provider = await db.transactions.aggregate(provider_pipeline).to_list(10)
    
    return {
        "period": period,
        "total_amount": totals.get("total_amount", 0),
        "transaction_count": totals.get("count", 0),
        "by_provider": [{
            "provider": p["_id"],
            "amount": p["amount"],
            "count": p["count"]
        } for p in by_provider]
    }


@router.get("/balance")
async def get_gateway_balance(current_user: dict = Depends(get_current_user)):
    """Get available balance across gateways"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        return {"balances": []}
    
    # In production, this would query actual gateway APIs
    # For now, return calculated balances from transactions
    pipeline = [
        {"$match": {"business_id": str(business_id), "status": "completed"}},
        {"$group": {
            "_id": "$provider",
            "balance": {"$sum": "$amount"}
        }}
    ]
    
    balances = await db.transactions.aggregate(pipeline).to_list(10)
    
    return {
        "balances": [{
            "provider": b["_id"],
            "available": b["balance"] * 0.97,  # 3% fees
            "pending": b["balance"] * 0.03
        } for b in balances]
    }
