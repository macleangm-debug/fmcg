"""
Settlement & Payout Service
Handles merchant settlements, payouts, and financial reconciliation
"""
import os
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from bson import ObjectId
from enum import Enum

logger = logging.getLogger(__name__)

# Configuration
SETTLEMENT_DELAY_HOURS = 24  # Funds available after 24 hours
MINIMUM_PAYOUT_AMOUNT = {
    "TZS": 10000,
    "KES": 500,
    "UGX": 10000,
    "RWF": 5000,
    "GHS": 50,
    "NGN": 5000
}
PAYOUT_FEE = {
    "TZS": 500,
    "KES": 50,
    "UGX": 1000,
    "RWF": 500,
    "GHS": 5,
    "NGN": 100
}


class PayoutStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class SettlementStatus(str, Enum):
    PENDING = "pending"
    SETTLED = "settled"
    FAILED = "failed"


def generate_payout_reference() -> str:
    """Generate unique payout reference"""
    return f"PO-{datetime.utcnow().strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"


def generate_settlement_reference() -> str:
    """Generate unique settlement reference"""
    return f"STL-{datetime.utcnow().strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"


async def create_transaction_settlement(
    db,
    transaction_id: str,
    business_id: str,
    amount: float,
    fee_amount: float,
    currency: str
) -> Dict[str, Any]:
    """
    Create a settlement record for a completed transaction
    Funds will be available after SETTLEMENT_DELAY_HOURS
    """
    net_amount = amount - fee_amount
    available_at = datetime.utcnow() + timedelta(hours=SETTLEMENT_DELAY_HOURS)
    
    settlement = {
        "settlement_ref": generate_settlement_reference(),
        "transaction_id": transaction_id,
        "business_id": business_id,
        "gross_amount": amount,
        "fee_amount": fee_amount,
        "net_amount": net_amount,
        "currency": currency,
        "status": SettlementStatus.PENDING.value,
        "available_at": available_at,
        "settled_at": None,
        "created_at": datetime.utcnow()
    }
    
    await db.merchant_settlements.insert_one(settlement)
    
    # Update pending balance
    await db.merchant_balances.update_one(
        {"business_id": business_id},
        {
            "$inc": {
                "pending_balance": net_amount,
                "total_volume": amount,
                "total_fees_paid": fee_amount
            },
            "$set": {"updated_at": datetime.utcnow()}
        },
        upsert=True
    )
    
    logger.info(f"Settlement created: {settlement['settlement_ref']} for {net_amount} {currency}")
    
    return {
        "settlement_ref": settlement["settlement_ref"],
        "net_amount": net_amount,
        "available_at": available_at.isoformat()
    }


async def process_pending_settlements(db) -> Dict[str, Any]:
    """
    Process all pending settlements that are now available
    Called by scheduler every hour
    """
    now = datetime.utcnow()
    
    # Find all pending settlements that are now available
    pending_settlements = await db.merchant_settlements.find({
        "status": SettlementStatus.PENDING.value,
        "available_at": {"$lte": now}
    }).to_list(length=1000)
    
    processed = 0
    failed = 0
    
    for settlement in pending_settlements:
        try:
            business_id = settlement["business_id"]
            net_amount = settlement["net_amount"]
            
            # Move from pending to available
            await db.merchant_balances.update_one(
                {"business_id": business_id},
                {
                    "$inc": {
                        "pending_balance": -net_amount,
                        "available_balance": net_amount
                    },
                    "$set": {"updated_at": now}
                }
            )
            
            # Update settlement status
            await db.merchant_settlements.update_one(
                {"_id": settlement["_id"]},
                {"$set": {
                    "status": SettlementStatus.SETTLED.value,
                    "settled_at": now
                }}
            )
            
            processed += 1
            
        except Exception as e:
            logger.error(f"Failed to process settlement {settlement['settlement_ref']}: {str(e)}")
            failed += 1
    
    logger.info(f"Processed {processed} settlements, {failed} failed")
    
    return {
        "processed": processed,
        "failed": failed,
        "timestamp": now.isoformat()
    }


async def get_merchant_balance(db, business_id: str) -> Dict[str, Any]:
    """Get merchant's current balance"""
    balance = await db.merchant_balances.find_one({"business_id": business_id})
    
    if not balance:
        return {
            "available_balance": 0,
            "pending_balance": 0,
            "total_volume": 0,
            "total_fees_paid": 0,
            "total_payouts": 0,
            "currency": "TZS"
        }
    
    return {
        "available_balance": balance.get("available_balance", 0),
        "pending_balance": balance.get("pending_balance", 0),
        "total_volume": balance.get("total_volume", 0),
        "total_fees_paid": balance.get("total_fees_paid", 0),
        "total_payouts": balance.get("total_payouts", 0),
        "currency": balance.get("currency", "TZS"),
        "last_payout_at": balance.get("last_payout_at")
    }


async def request_payout(
    db,
    business_id: str,
    amount: float,
    bank_account: Dict[str, str],
    requested_by: str
) -> Dict[str, Any]:
    """
    Request a payout to merchant's bank account
    """
    # Get merchant balance
    balance = await db.merchant_balances.find_one({"business_id": business_id})
    
    if not balance:
        return {"success": False, "error": "Merchant balance not found"}
    
    available = balance.get("available_balance", 0)
    currency = balance.get("currency", "TZS")
    
    # Check minimum amount
    min_amount = MINIMUM_PAYOUT_AMOUNT.get(currency, 10000)
    if amount < min_amount:
        return {"success": False, "error": f"Minimum payout amount is {min_amount} {currency}"}
    
    # Check available balance
    payout_fee = PAYOUT_FEE.get(currency, 500)
    total_deduction = amount + payout_fee
    
    if available < total_deduction:
        return {
            "success": False,
            "error": f"Insufficient balance. Available: {available} {currency}, Required: {total_deduction} {currency}"
        }
    
    # Create payout record
    payout = {
        "payout_ref": generate_payout_reference(),
        "business_id": business_id,
        "amount": amount,
        "fee": payout_fee,
        "net_amount": amount,
        "currency": currency,
        "bank_account": bank_account,
        "status": PayoutStatus.PENDING.value,
        "requested_by": requested_by,
        "requested_at": datetime.utcnow(),
        "processed_at": None,
        "completed_at": None,
        "failure_reason": None
    }
    
    await db.merchant_payouts.insert_one(payout)
    
    # Deduct from available balance
    await db.merchant_balances.update_one(
        {"business_id": business_id},
        {
            "$inc": {
                "available_balance": -total_deduction,
                "total_payouts": amount
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    logger.info(f"Payout requested: {payout['payout_ref']} for {amount} {currency}")
    
    return {
        "success": True,
        "payout_ref": payout["payout_ref"],
        "amount": amount,
        "fee": payout_fee,
        "net_amount": amount,
        "currency": currency,
        "status": "pending",
        "message": "Payout request submitted successfully"
    }


async def process_payout(
    db,
    payout_ref: str,
    ecobank_module=None
) -> Dict[str, Any]:
    """
    Process a pending payout via EcoBank
    In production, this would initiate a bank transfer
    """
    payout = await db.merchant_payouts.find_one({"payout_ref": payout_ref})
    
    if not payout:
        return {"success": False, "error": "Payout not found"}
    
    if payout["status"] != PayoutStatus.PENDING.value:
        return {"success": False, "error": f"Payout already {payout['status']}"}
    
    # Update to processing
    await db.merchant_payouts.update_one(
        {"_id": payout["_id"]},
        {"$set": {
            "status": PayoutStatus.PROCESSING.value,
            "processed_at": datetime.utcnow()
        }}
    )
    
    try:
        # In production, initiate bank transfer via EcoBank
        # For now, simulate success
        if ecobank_module:
            # Real EcoBank transfer would go here
            pass
        
        # Mark as completed
        await db.merchant_payouts.update_one(
            {"_id": payout["_id"]},
            {"$set": {
                "status": PayoutStatus.COMPLETED.value,
                "completed_at": datetime.utcnow()
            }}
        )
        
        # Update last payout timestamp
        await db.merchant_balances.update_one(
            {"business_id": payout["business_id"]},
            {"$set": {"last_payout_at": datetime.utcnow()}}
        )
        
        logger.info(f"Payout completed: {payout_ref}")
        
        return {
            "success": True,
            "payout_ref": payout_ref,
            "status": "completed",
            "message": "Payout processed successfully"
        }
        
    except Exception as e:
        # Mark as failed and refund
        await db.merchant_payouts.update_one(
            {"_id": payout["_id"]},
            {"$set": {
                "status": PayoutStatus.FAILED.value,
                "failure_reason": str(e)
            }}
        )
        
        # Refund to available balance
        total = payout["amount"] + payout["fee"]
        await db.merchant_balances.update_one(
            {"business_id": payout["business_id"]},
            {
                "$inc": {
                    "available_balance": total,
                    "total_payouts": -payout["amount"]
                }
            }
        )
        
        logger.error(f"Payout failed: {payout_ref} - {str(e)}")
        
        return {
            "success": False,
            "payout_ref": payout_ref,
            "status": "failed",
            "error": str(e)
        }


async def get_payout_history(
    db,
    business_id: str,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> Dict[str, Any]:
    """Get merchant's payout history"""
    query = {"business_id": business_id}
    if status:
        query["status"] = status
    
    payouts = await db.merchant_payouts.find(query) \
        .sort("requested_at", -1) \
        .skip(offset) \
        .limit(limit) \
        .to_list(length=limit)
    
    total = await db.merchant_payouts.count_documents(query)
    
    # Serialize
    for p in payouts:
        p["id"] = str(p.pop("_id"))
        for key in ["requested_at", "processed_at", "completed_at"]:
            if key in p and p[key]:
                p[key] = p[key].isoformat()
    
    return {
        "payouts": payouts,
        "total": total,
        "limit": limit,
        "offset": offset
    }


async def get_settlement_history(
    db,
    business_id: str,
    status: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = 50,
    offset: int = 0
) -> Dict[str, Any]:
    """Get merchant's settlement history"""
    query = {"business_id": business_id}
    
    if status:
        query["status"] = status
    if date_from:
        query["created_at"] = {"$gte": date_from}
    if date_to:
        query.setdefault("created_at", {})["$lte"] = date_to
    
    settlements = await db.merchant_settlements.find(query) \
        .sort("created_at", -1) \
        .skip(offset) \
        .limit(limit) \
        .to_list(length=limit)
    
    total = await db.merchant_settlements.count_documents(query)
    
    # Serialize
    for s in settlements:
        s["id"] = str(s.pop("_id"))
        for key in ["created_at", "available_at", "settled_at"]:
            if key in s and s[key]:
                s[key] = s[key].isoformat()
    
    return {
        "settlements": settlements,
        "total": total,
        "limit": limit,
        "offset": offset
    }


async def get_daily_summary(db, business_id: str, date: Optional[datetime] = None) -> Dict[str, Any]:
    """Get daily transaction and settlement summary"""
    if not date:
        date = datetime.utcnow()
    
    start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    # Aggregate transactions
    pipeline = [
        {"$match": {
            "business_id": business_id,
            "created_at": {"$gte": start_of_day, "$lt": end_of_day}
        }},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total": {"$sum": "$gross_amount"},
            "fees": {"$sum": "$fee_amount"},
            "net": {"$sum": "$net_amount"}
        }}
    ]
    
    results = await db.merchant_settlements.aggregate(pipeline).to_list(length=100)
    
    summary = {
        "date": start_of_day.strftime("%Y-%m-%d"),
        "transactions": 0,
        "gross_volume": 0,
        "total_fees": 0,
        "net_volume": 0,
        "by_status": {}
    }
    
    for r in results:
        summary["transactions"] += r["count"]
        summary["gross_volume"] += r["total"]
        summary["total_fees"] += r["fees"]
        summary["net_volume"] += r["net"]
        summary["by_status"][r["_id"]] = {
            "count": r["count"],
            "total": r["total"]
        }
    
    return summary
