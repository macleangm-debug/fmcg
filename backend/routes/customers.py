"""
Customers Routes
Handles customer management, contacts, and customer analytics
"""
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/customers", tags=["Customers"])

db = None
get_current_user = None

def set_dependencies(database, auth_func):
    global db, get_current_user
    db = database
    get_current_user = auth_func


# ============== MODELS ==============

class CustomerCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "TZ"
    tax_id: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []
    custom_fields: Dict[str, Any] = {}


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    tax_id: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None


def serialize_doc(doc):
    if doc is None:
        return None
    result = {k: v for k, v in doc.items() if k != "_id"}
    result["id"] = str(doc.get("_id", ""))
    for key in ["created_at", "updated_at", "last_order_at"]:
        if key in result and hasattr(result[key], "isoformat"):
            result[key] = result[key].isoformat()
    return result


# ============== ENDPOINTS ==============

@router.get("")
async def list_customers(
    search: Optional[str] = None,
    tag: Optional[str] = None,
    has_orders: Optional[bool] = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    limit: int = Query(50, le=500),
    offset: int = 0,
    current_user: dict = Depends(lambda: get_current_user)
):
    """List customers with filtering and search"""
    business_id = current_user.get("business_id")
    
    query = {"business_id": business_id}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}}
        ]
    
    if tag:
        query["tags"] = tag
    
    if has_orders is True:
        query["total_orders"] = {"$gt": 0}
    elif has_orders is False:
        query["$or"] = [{"total_orders": 0}, {"total_orders": {"$exists": False}}]
    
    sort_dir = 1 if sort_order == "asc" else -1
    
    customers = await db.customers.find(query) \
        .sort(sort_by, sort_dir) \
        .skip(offset) \
        .limit(limit) \
        .to_list(length=limit)
    
    total = await db.customers.count_documents(query)
    
    return {
        "customers": [serialize_doc(c) for c in customers],
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.post("")
async def create_customer(
    customer: CustomerCreate,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Create a new customer"""
    business_id = current_user.get("business_id")
    
    # Check for duplicate email
    if customer.email:
        existing = await db.customers.find_one({
            "business_id": business_id,
            "email": customer.email
        })
        if existing:
            raise HTTPException(status_code=400, detail="Customer with this email already exists")
    
    customer_doc = {
        "business_id": business_id,
        **customer.dict(),
        "total_orders": 0,
        "total_spent": 0,
        "last_order_at": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.customers.insert_one(customer_doc)
    customer_doc["id"] = str(result.inserted_id)
    
    return serialize_doc(customer_doc)


@router.get("/{customer_id}")
async def get_customer(
    customer_id: str,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Get customer by ID with order history"""
    business_id = current_user.get("business_id")
    
    customer = await db.customers.find_one({
        "_id": ObjectId(customer_id),
        "business_id": business_id
    })
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get recent orders
    recent_orders = await db.orders.find({
        "business_id": business_id,
        "customer_id": customer_id
    }).sort("created_at", -1).limit(10).to_list(length=10)
    
    result = serialize_doc(customer)
    result["recent_orders"] = [serialize_doc(o) for o in recent_orders]
    
    return result


@router.put("/{customer_id}")
async def update_customer(
    customer_id: str,
    customer: CustomerUpdate,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Update a customer"""
    business_id = current_user.get("business_id")
    
    existing = await db.customers.find_one({
        "_id": ObjectId(customer_id),
        "business_id": business_id
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = {k: v for k, v in customer.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.customers.update_one(
        {"_id": ObjectId(customer_id)},
        {"$set": update_data}
    )
    
    return {"message": "Customer updated successfully"}


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Delete a customer"""
    business_id = current_user.get("business_id")
    
    customer = await db.customers.find_one({
        "_id": ObjectId(customer_id),
        "business_id": business_id
    })
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check for orders
    order_count = await db.orders.count_documents({
        "business_id": business_id,
        "customer_id": customer_id
    })
    
    if order_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete customer with {order_count} orders. Archive instead."
        )
    
    await db.customers.delete_one({"_id": ObjectId(customer_id)})
    
    return {"message": "Customer deleted successfully"}


@router.get("/{customer_id}/orders")
async def get_customer_orders(
    customer_id: str,
    limit: int = Query(20, le=100),
    offset: int = 0,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Get all orders for a customer"""
    business_id = current_user.get("business_id")
    
    orders = await db.orders.find({
        "business_id": business_id,
        "customer_id": customer_id
    }).sort("created_at", -1).skip(offset).limit(limit).to_list(length=limit)
    
    total = await db.orders.count_documents({
        "business_id": business_id,
        "customer_id": customer_id
    })
    
    return {
        "orders": [serialize_doc(o) for o in orders],
        "total": total
    }


@router.get("/stats/top")
async def get_top_customers(
    period: str = "month",
    limit: int = Query(10, le=50),
    current_user: dict = Depends(lambda: get_current_user)
):
    """Get top customers by spend"""
    business_id = current_user.get("business_id")
    
    # Get top customers by total_spent
    customers = await db.customers.find({
        "business_id": business_id,
        "total_spent": {"$gt": 0}
    }).sort("total_spent", -1).limit(limit).to_list(length=limit)
    
    return {
        "top_customers": [serialize_doc(c) for c in customers],
        "period": period
    }


@router.post("/bulk-import")
async def bulk_import_customers(
    customers: List[CustomerCreate],
    current_user: dict = Depends(lambda: get_current_user)
):
    """Bulk import customers"""
    business_id = current_user.get("business_id")
    
    imported = 0
    skipped = 0
    errors = []
    
    for i, customer in enumerate(customers):
        try:
            # Check for duplicate
            if customer.email:
                existing = await db.customers.find_one({
                    "business_id": business_id,
                    "email": customer.email
                })
                if existing:
                    skipped += 1
                    continue
            
            customer_doc = {
                "business_id": business_id,
                **customer.dict(),
                "total_orders": 0,
                "total_spent": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await db.customers.insert_one(customer_doc)
            imported += 1
            
        except Exception as e:
            errors.append({"row": i, "error": str(e)})
    
    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors
    }
