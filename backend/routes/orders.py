"""
Orders Routes
Handles order management, order items, and order processing
"""
import logging
import secrets
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from pydantic import BaseModel, Field
from bson import ObjectId

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["Orders"])

db = None
get_current_user = None

def set_dependencies(database, auth_func):
    global db, get_current_user
    db = database
    get_current_user = auth_func


# ============== MODELS ==============

class OrderItemCreate(BaseModel):
    product_id: str
    product_name: str
    quantity: int = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    discount: float = Field(0, ge=0)
    tax_rate: float = Field(0, ge=0, le=100)


class OrderCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    items: List[OrderItemCreate]
    notes: Optional[str] = None
    discount_amount: float = Field(0, ge=0)
    payment_method: str = "cash"
    status: str = "pending"


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    notes: Optional[str] = None


def serialize_doc(doc):
    if doc is None:
        return None
    result = {k: v for k, v in doc.items() if k != "_id"}
    result["id"] = str(doc.get("_id", ""))
    for key in ["created_at", "updated_at", "completed_at"]:
        if key in result and hasattr(result[key], "isoformat"):
            result[key] = result[key].isoformat()
    return result


def generate_order_number():
    return f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"


# ============== ENDPOINTS ==============

@router.get("")
async def list_orders(
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    customer_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    limit: int = Query(50, le=500),
    offset: int = 0,
    current_user: dict = Depends(lambda: get_current_user)
):
    """List orders with filtering"""
    business_id = current_user.get("business_id")
    
    query = {"business_id": business_id}
    
    if status:
        query["status"] = status
    if payment_status:
        query["payment_status"] = payment_status
    if customer_id:
        query["customer_id"] = customer_id
    if date_from:
        query["created_at"] = {"$gte": datetime.fromisoformat(date_from)}
    if date_to:
        query.setdefault("created_at", {})["$lte"] = datetime.fromisoformat(date_to)
    
    sort_dir = -1 if sort_order == "desc" else 1
    
    orders = await db.orders.find(query) \
        .sort(sort_by, sort_dir) \
        .skip(offset) \
        .limit(limit) \
        .to_list(length=limit)
    
    total = await db.orders.count_documents(query)
    
    return {
        "orders": [serialize_doc(o) for o in orders],
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.post("")
async def create_order(
    order: OrderCreate,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Create a new order"""
    business_id = current_user.get("business_id")
    
    # Calculate totals
    subtotal = 0
    total_tax = 0
    items_with_totals = []
    
    for item in order.items:
        item_subtotal = item.quantity * item.unit_price
        item_discount = item.discount
        item_tax = (item_subtotal - item_discount) * (item.tax_rate / 100)
        item_total = item_subtotal - item_discount + item_tax
        
        items_with_totals.append({
            **item.dict(),
            "subtotal": item_subtotal,
            "tax_amount": item_tax,
            "total": item_total
        })
        
        subtotal += item_subtotal
        total_tax += item_tax
    
    total = subtotal - order.discount_amount + total_tax
    
    order_doc = {
        "business_id": business_id,
        "order_number": generate_order_number(),
        "customer_id": order.customer_id,
        "customer_name": order.customer_name,
        "customer_phone": order.customer_phone,
        "customer_email": order.customer_email,
        "items": items_with_totals,
        "item_count": len(items_with_totals),
        "subtotal": subtotal,
        "discount_amount": order.discount_amount,
        "tax_amount": total_tax,
        "total": total,
        "notes": order.notes,
        "payment_method": order.payment_method,
        "status": order.status,
        "payment_status": "unpaid",
        "created_by": current_user.get("id"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.orders.insert_one(order_doc)
    order_doc["id"] = str(result.inserted_id)
    
    # Update stock if order is confirmed
    if order.status in ["confirmed", "completed"]:
        for item in order.items:
            await db.products.update_one(
                {"_id": ObjectId(item.product_id), "business_id": business_id},
                {"$inc": {"quantity": -item.quantity}}
            )
    
    return serialize_doc(order_doc)


@router.get("/{order_id}")
async def get_order(
    order_id: str,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Get order by ID"""
    business_id = current_user.get("business_id")
    
    order = await db.orders.find_one({
        "_id": ObjectId(order_id),
        "business_id": business_id
    })
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return serialize_doc(order)


@router.put("/{order_id}")
async def update_order(
    order_id: str,
    update: OrderUpdate,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Update order status"""
    business_id = current_user.get("business_id")
    
    order = await db.orders.find_one({
        "_id": ObjectId(order_id),
        "business_id": business_id
    })
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Handle status changes
    old_status = order.get("status")
    new_status = update_data.get("status")
    
    if new_status == "completed" and old_status != "completed":
        update_data["completed_at"] = datetime.utcnow()
        # Deduct stock if not already done
        if old_status not in ["confirmed", "completed"]:
            for item in order.get("items", []):
                await db.products.update_one(
                    {"_id": ObjectId(item["product_id"]), "business_id": business_id},
                    {"$inc": {"quantity": -item["quantity"]}}
                )
    
    elif new_status == "cancelled" and old_status in ["confirmed", "completed"]:
        # Restore stock
        for item in order.get("items", []):
            await db.products.update_one(
                {"_id": ObjectId(item["product_id"]), "business_id": business_id},
                {"$inc": {"quantity": item["quantity"]}}
            )
    
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": update_data}
    )
    
    return {"message": "Order updated successfully"}


@router.delete("/{order_id}")
async def delete_order(
    order_id: str,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Delete an order (only pending orders)"""
    business_id = current_user.get("business_id")
    
    order = await db.orders.find_one({
        "_id": ObjectId(order_id),
        "business_id": business_id
    })
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get("status") not in ["pending", "draft"]:
        raise HTTPException(status_code=400, detail="Can only delete pending orders")
    
    await db.orders.delete_one({"_id": ObjectId(order_id)})
    
    return {"message": "Order deleted successfully"}


@router.post("/{order_id}/payment")
async def record_payment(
    order_id: str,
    amount: float = Body(...),
    payment_method: str = Body("cash"),
    reference: Optional[str] = Body(None),
    current_user: dict = Depends(lambda: get_current_user)
):
    """Record payment for an order"""
    business_id = current_user.get("business_id")
    
    order = await db.orders.find_one({
        "_id": ObjectId(order_id),
        "business_id": business_id
    })
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Calculate paid amount
    payments = order.get("payments", [])
    total_paid = sum(p.get("amount", 0) for p in payments) + amount
    
    # Add payment record
    payment = {
        "amount": amount,
        "payment_method": payment_method,
        "reference": reference,
        "recorded_by": current_user.get("id"),
        "recorded_at": datetime.utcnow()
    }
    
    # Determine payment status
    order_total = order.get("total", 0)
    if total_paid >= order_total:
        payment_status = "paid"
    elif total_paid > 0:
        payment_status = "partial"
    else:
        payment_status = "unpaid"
    
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {
            "$push": {"payments": payment},
            "$set": {
                "payment_status": payment_status,
                "amount_paid": total_paid,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "message": "Payment recorded",
        "total_paid": total_paid,
        "payment_status": payment_status,
        "balance_due": max(0, order_total - total_paid)
    }


@router.get("/stats/summary")
async def get_order_stats(
    period: str = "today",
    current_user: dict = Depends(lambda: get_current_user)
):
    """Get order statistics"""
    business_id = current_user.get("business_id")
    
    # Calculate date range
    now = datetime.utcnow()
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        from datetime import timedelta
        start_date = now - timedelta(days=7)
    elif period == "month":
        from datetime import timedelta
        start_date = now - timedelta(days=30)
    else:
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    pipeline = [
        {"$match": {
            "business_id": business_id,
            "created_at": {"$gte": start_date}
        }},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1},
            "total_value": {"$sum": "$total"}
        }}
    ]
    
    results = await db.orders.aggregate(pipeline).to_list(length=100)
    
    stats = {
        "period": period,
        "total_orders": 0,
        "total_value": 0,
        "by_status": {}
    }
    
    for r in results:
        stats["total_orders"] += r["count"]
        stats["total_value"] += r["total_value"]
        stats["by_status"][r["_id"]] = {
            "count": r["count"],
            "value": r["total_value"]
        }
    
    return stats
