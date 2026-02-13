"""
Subscription Routes
Handles subscription plans, billing, and feature management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from bson import ObjectId

router = APIRouter(prefix="/subscription", tags=["Subscriptions"])

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

class PlanCreate(BaseModel):
    name: str
    price: float
    interval: str = "monthly"  # monthly, yearly
    features: List[str] = []
    limits: dict = {}


class SubscribeRequest(BaseModel):
    plan_id: str
    payment_method: str = "card"


# ============== PLANS ==============

@router.get("/plans")
async def get_plans():
    """Get all subscription plans"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    plans = await db.subscription_plans.find({"is_active": True}).to_list(20)
    
    return {
        "plans": [{
            "id": str(p["_id"]),
            "name": p.get("name", ""),
            "price": p.get("price", 0),
            "interval": p.get("interval", "monthly"),
            "features": p.get("features", []),
            "limits": p.get("limits", {}),
            "popular": p.get("popular", False)
        } for p in plans]
    }


@router.get("/plans/{plan_id}")
async def get_plan(plan_id: str):
    """Get plan details"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    plan = await db.subscription_plans.find_one({"_id": ObjectId(plan_id)})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {
        "id": str(plan["_id"]),
        "name": plan.get("name", ""),
        "price": plan.get("price", 0),
        "interval": plan.get("interval", "monthly"),
        "features": plan.get("features", []),
        "limits": plan.get("limits", {}),
        "description": plan.get("description", "")
    }


# ============== SUBSCRIPTIONS ==============

@router.get("/current")
async def get_current_subscription(current_user: dict = Depends(get_current_user)):
    """Get current subscription"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        return {"subscription": None}
    
    subscription = await db.subscriptions.find_one({
        "business_id": str(business_id),
        "status": {"$in": ["active", "trialing"]}
    })
    
    if not subscription:
        return {"subscription": None}
    
    plan = await db.subscription_plans.find_one({"_id": ObjectId(str(subscription.get("plan_id")))})
    
    return {
        "subscription": {
            "id": str(subscription["_id"]),
            "plan": plan.get("name", "Unknown") if plan else "Unknown",
            "status": subscription.get("status", ""),
            "current_period_start": subscription.get("current_period_start"),
            "current_period_end": subscription.get("current_period_end"),
            "cancel_at_period_end": subscription.get("cancel_at_period_end", False)
        }
    }


@router.post("/subscribe")
async def subscribe(
    request: SubscribeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Subscribe to a plan"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="No business associated")
    
    plan = await db.subscription_plans.find_one({"_id": ObjectId(request.plan_id)})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Check existing subscription
    existing = await db.subscriptions.find_one({
        "business_id": str(business_id),
        "status": "active"
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Already have an active subscription")
    
    now = datetime.utcnow()
    period_end = now + timedelta(days=30 if plan.get("interval") == "monthly" else 365)
    
    subscription = {
        "business_id": str(business_id),
        "plan_id": str(plan["_id"]),
        "status": "active",
        "current_period_start": now,
        "current_period_end": period_end,
        "created_at": now
    }
    
    result = await db.subscriptions.insert_one(subscription)
    
    return {
        "id": str(result.inserted_id),
        "message": "Subscription created",
        "plan": plan.get("name"),
        "period_end": period_end.isoformat()
    }


@router.post("/cancel")
async def cancel_subscription(current_user: dict = Depends(get_current_user)):
    """Cancel subscription"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    result = await db.subscriptions.update_one(
        {"business_id": str(business_id), "status": "active"},
        {"$set": {"cancel_at_period_end": True, "cancelled_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    return {"message": "Subscription will be cancelled at period end"}


@router.post("/reactivate")
async def reactivate_subscription(current_user: dict = Depends(get_current_user)):
    """Reactivate cancelled subscription"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    result = await db.subscriptions.update_one(
        {"business_id": str(business_id), "cancel_at_period_end": True},
        {"$set": {"cancel_at_period_end": False}, "$unset": {"cancelled_at": ""}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="No cancelled subscription found")
    
    return {"message": "Subscription reactivated"}


# ============== USAGE ==============

@router.get("/usage")
async def get_usage(current_user: dict = Depends(get_current_user)):
    """Get subscription usage"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        return {"usage": {}}
    
    # Get current subscription limits
    subscription = await db.subscriptions.find_one({
        "business_id": str(business_id),
        "status": "active"
    })
    
    limits = {}
    if subscription:
        plan = await db.subscription_plans.find_one({"_id": ObjectId(str(subscription.get("plan_id")))})
        limits = plan.get("limits", {}) if plan else {}
    
    # Calculate current usage
    users_count = await db.users.count_documents({"business_id": str(business_id)})
    products_count = await db.products.count_documents({"business_id": str(business_id)})
    orders_count = await db.orders.count_documents({"business_id": str(business_id)})
    
    return {
        "usage": {
            "users": {"current": users_count, "limit": limits.get("users", -1)},
            "products": {"current": products_count, "limit": limits.get("products", -1)},
            "orders": {"current": orders_count, "limit": limits.get("orders", -1)}
        }
    }


# ============== BILLING ==============

@router.get("/billing/invoices")
async def get_billing_invoices(
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get billing invoices"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        return {"invoices": []}
    
    invoices = await db.billing_invoices.find(
        {"business_id": str(business_id)}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "invoices": [{
            "id": str(inv["_id"]),
            "amount": inv.get("amount", 0),
            "status": inv.get("status", ""),
            "period_start": inv.get("period_start"),
            "period_end": inv.get("period_end"),
            "created_at": inv.get("created_at", datetime.utcnow()).isoformat() if isinstance(inv.get("created_at"), datetime) else str(inv.get("created_at", ""))
        } for inv in invoices]
    }


@router.get("/billing/payment-methods")
async def get_payment_methods(current_user: dict = Depends(get_current_user)):
    """Get saved payment methods"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        return {"payment_methods": []}
    
    methods = await db.payment_methods.find(
        {"business_id": str(business_id)}
    ).to_list(10)
    
    return {
        "payment_methods": [{
            "id": str(m["_id"]),
            "type": m.get("type", "card"),
            "last4": m.get("last4", "****"),
            "brand": m.get("brand", ""),
            "is_default": m.get("is_default", False)
        } for m in methods]
    }


# ============== FEATURES ==============

@router.get("/features")
async def get_features(current_user: dict = Depends(get_current_user)):
    """Get available features based on subscription"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        return {"features": []}
    
    subscription = await db.subscriptions.find_one({
        "business_id": str(business_id),
        "status": "active"
    })
    
    if not subscription:
        # Return free tier features
        return {
            "features": [
                {"name": "Basic POS", "enabled": True},
                {"name": "Inventory Management", "enabled": True},
                {"name": "Reports", "enabled": False},
                {"name": "Multi-location", "enabled": False},
                {"name": "API Access", "enabled": False}
            ]
        }
    
    plan = await db.subscription_plans.find_one({"_id": ObjectId(str(subscription.get("plan_id")))})
    features = plan.get("features", []) if plan else []
    
    all_features = [
        "Basic POS", "Inventory Management", "Reports", 
        "Multi-location", "API Access", "Advanced Analytics",
        "Priority Support", "Custom Integrations"
    ]
    
    return {
        "features": [
            {"name": f, "enabled": f in features}
            for f in all_features
        ]
    }
