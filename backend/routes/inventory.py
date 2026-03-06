"""
Inventory Routes
Handles inventory items, categories, adjustments, movements, and suppliers
"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import jwt
import uuid
import io
import csv
import pandas as pd

# Setup logging
logger = logging.getLogger(__name__)

# Router
router = APIRouter(prefix="/inventory", tags=["Inventory"])

# Security
security = HTTPBearer()

# Database connection (will be set on import)
db = None

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'retail-management-secret-key-2025')
JWT_ALGORITHM = "HS256"


def set_dependencies(database):
    """Set the database connection for this router"""
    global db
    db = database
    logger.info("Inventory routes dependencies set")


# ============== MODELS ==============

class InventoryItemCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    unit: str = "pcs"
    quantity: int = 0
    min_quantity: int = 10
    max_quantity: Optional[int] = None
    cost_price: float = 0
    selling_price: float = 0
    is_taxable: bool = True
    tax_rate: float = 0
    location: Optional[str] = None
    supplier: Optional[str] = None
    supplier_id: Optional[str] = None
    notes: Optional[str] = None
    item_type: str = "product"  # product, raw_material


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    unit: Optional[str] = None
    min_quantity: Optional[int] = None
    max_quantity: Optional[int] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    is_taxable: Optional[bool] = None
    tax_rate: Optional[float] = None
    location: Optional[str] = None
    supplier: Optional[str] = None
    supplier_id: Optional[str] = None
    notes: Optional[str] = None
    item_type: Optional[str] = None


class InventoryCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#10B981"


class InventoryAdjustment(BaseModel):
    item_id: str
    adjustment_type: str  # in, out, adjustment, transfer
    quantity: int
    reason: Optional[str] = None
    reference: Optional[str] = None
    location_from: Optional[str] = None
    location_to: Optional[str] = None


# ============== SUPPLIER MODELS ==============

class SupplierCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    contact_person: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None  # e.g., "Net 30", "COD"
    tax_id: Optional[str] = None


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    contact_person: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    tax_id: Optional[str] = None
    status: Optional[str] = None  # active, inactive


# ============== HELPER FUNCTIONS ==============

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


async def require_inventory_module(current_user: dict = Depends(get_current_user)):
    """
    Module gating: Require inventory module to be enabled for the business.
    Checks linked_apps in business preferences or subscriptions.
    Raises 403 if inventory is not enabled.
    """
    business_id = current_user.get("business_id")
    user_id = current_user.get("id")
    
    if not business_id:
        raise HTTPException(status_code=403, detail="No business associated with user")
    
    # Default linked apps (inventory is included by default for all businesses)
    default_linked = ["inventory", "invoicing", "kwikpay"]
    
    # Check BUSINESS-level linked apps preference first
    preference = await db.business_preferences.find_one({
        "business_id": business_id,
        "preference_type": "retailpro_linked_apps"
    })
    
    # Fallback to user-level for backwards compatibility
    if not preference:
        preference = await db.user_preferences.find_one({
            "user_id": user_id,
            "preference_type": "retailpro_linked_apps"
        })
    
    # Get linked apps from preference or use defaults
    linked_apps = preference.get("linked_apps", default_linked) if preference else default_linked
    
    # Check if inventory is enabled
    if "inventory" in linked_apps:
        return current_user
    
    # Also check subscription linked_apps as fallback
    subscription = await db.subscriptions.find_one({"business_id": business_id})
    if subscription:
        sub_linked_apps = subscription.get("linked_apps", [])
        if any(la.get("app_id") == "inventory" for la in sub_linked_apps):
            return current_user
    
    # Inventory is not enabled - block access
    raise HTTPException(
        status_code=403, 
        detail="Inventory product is not enabled for this business. Please subscribe to Inventory to access this feature."
    )


# ============== ENDPOINTS ==============

@router.get("/items")
async def get_inventory_items(
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(require_inventory_module)
):
    """Get all inventory items"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}},
            {"location": {"$regex": search, "$options": "i"}}
        ]
    
    if category_id:
        query["category_id"] = category_id
    
    items = await db.inventory_items.find(query).sort("name", 1).to_list(None)
    
    result = []
    for item in items:
        qty = item.get("quantity", 0)
        min_qty = item.get("min_quantity", 10)
        
        if qty == 0:
            item_status = "out_of_stock"
        elif qty <= min_qty:
            item_status = "low_stock"
        else:
            item_status = "in_stock"
        
        if status and status != "all":
            if status == "low_stock" and item_status != "low_stock":
                continue
            if status == "out_of_stock" and item_status != "out_of_stock":
                continue
        
        result.append({
            "id": str(item["_id"]),
            "name": item.get("name", ""),
            "sku": item.get("sku", ""),
            "description": item.get("description", ""),
            "category_id": item.get("category_id"),
            "category_name": item.get("category_name", "Uncategorized"),
            "unit": item.get("unit", "pcs"),
            "quantity": qty,
            "min_quantity": min_qty,
            "max_quantity": item.get("max_quantity"),
            "cost_price": item.get("cost_price", 0),
            "selling_price": item.get("selling_price", 0),
            "is_taxable": item.get("is_taxable", True),
            "tax_rate": item.get("tax_rate", 0),
            "stock_value": qty * item.get("cost_price", 0),
            "location": item.get("location", ""),
            "supplier": item.get("supplier", ""),
            "notes": item.get("notes", ""),
            "status": item_status,
            "created_at": item.get("created_at", datetime.utcnow()).isoformat(),
            "updated_at": item.get("updated_at", datetime.utcnow()).isoformat()
        })
    
    return result


@router.get("/summary")
async def get_inventory_summary(current_user: dict = Depends(require_inventory_module)):
    """Get inventory summary stats"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    items = await db.inventory_items.find(query).to_list(None)
    
    total_items = len(items)
    total_quantity = 0
    total_value = 0
    low_stock_count = 0
    out_of_stock_count = 0
    
    for item in items:
        qty = item.get("quantity", 0)
        min_qty = item.get("min_quantity", 10)
        cost = item.get("cost_price", 0)
        
        total_quantity += qty
        total_value += qty * cost
        
        if qty == 0:
            out_of_stock_count += 1
        elif qty <= min_qty:
            low_stock_count += 1
    
    return {
        "total_items": total_items,
        "total_quantity": total_quantity,
        "total_value": total_value,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "in_stock_count": total_items - low_stock_count - out_of_stock_count
    }


@router.post("/items")
async def create_inventory_item(
    item: InventoryItemCreate,
    current_user: dict = Depends(require_inventory_module)
):
    """Create a new inventory item"""
    business_id = current_user.get("business_id")
    
    # Generate SKU if not provided
    sku = item.sku
    if not sku:
        sku = f"SKU-{str(uuid.uuid4())[:8].upper()}"
    
    # Check if SKU already exists
    existing = await db.inventory_items.find_one({
        "business_id": business_id,
        "sku": sku
    })
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")
    
    # Get category name if category_id provided
    category_name = "Uncategorized"
    if item.category_id:
        category = await db.inventory_categories.find_one({"_id": ObjectId(item.category_id)})
        if category:
            category_name = category.get("name", "Uncategorized")
    
    new_item = {
        "business_id": business_id,
        "name": item.name,
        "sku": sku,
        "description": item.description or "",
        "category_id": item.category_id,
        "category_name": category_name,
        "unit": item.unit,
        "quantity": item.quantity,
        "min_quantity": item.min_quantity,
        "max_quantity": item.max_quantity,
        "cost_price": item.cost_price,
        "selling_price": item.selling_price,
        "is_taxable": item.is_taxable,
        "tax_rate": item.tax_rate,
        "location": item.location or "",
        "supplier": item.supplier or "",
        "notes": item.notes or "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.inventory_items.insert_one(new_item)
    new_item["id"] = str(result.inserted_id)
    if "_id" in new_item:
        del new_item["_id"]
    
    # Record movement if initial quantity > 0
    if item.quantity > 0:
        movement = {
            "business_id": business_id,
            "item_id": str(result.inserted_id),
            "item_name": item.name,
            "movement_type": "in",
            "quantity": item.quantity,
            "quantity_before": 0,
            "quantity_after": item.quantity,
            "reason": "Initial stock",
            "reference": f"INIT-{str(result.inserted_id)[:8]}",
            "created_by": current_user["id"],
            "created_at": datetime.utcnow()
        }
        await db.inventory_movements.insert_one(movement)
    
    return new_item


@router.put("/items/{item_id}")
async def update_inventory_item(
    item_id: str,
    item: InventoryItemUpdate,
    current_user: dict = Depends(require_inventory_module)
):
    """Update an inventory item"""
    business_id = current_user.get("business_id")
    
    existing = await db.inventory_items.find_one({
        "_id": ObjectId(item_id),
        "business_id": business_id
    })
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = {k: v for k, v in item.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Update category name if category_id changed
    if "category_id" in update_data and update_data["category_id"]:
        category = await db.inventory_categories.find_one({"_id": ObjectId(update_data["category_id"])})
        if category:
            update_data["category_name"] = category.get("name", "Uncategorized")
    
    await db.inventory_items.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": update_data}
    )
    
    updated = await db.inventory_items.find_one({"_id": ObjectId(item_id)})
    updated["id"] = str(updated["_id"])
    del updated["_id"]
    
    return updated


@router.delete("/items/{item_id}")
async def delete_inventory_item(
    item_id: str,
    current_user: dict = Depends(require_inventory_module)
):
    """Delete an inventory item"""
    business_id = current_user.get("business_id")
    
    result = await db.inventory_items.delete_one({
        "_id": ObjectId(item_id),
        "business_id": business_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item deleted successfully"}


@router.get("/categories")
async def get_inventory_categories(current_user: dict = Depends(require_inventory_module)):
    """Get all inventory categories"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    categories = await db.inventory_categories.find(query).sort("name", 1).to_list(None)
    
    return [{
        "id": str(cat["_id"]),
        "name": cat.get("name", ""),
        "description": cat.get("description", ""),
        "color": cat.get("color", "#10B981"),
        "item_count": await db.inventory_items.count_documents({"category_id": str(cat["_id"])})
    } for cat in categories]


@router.post("/categories")
async def create_inventory_category(
    category: InventoryCategoryCreate,
    current_user: dict = Depends(require_inventory_module)
):
    """Create a new inventory category"""
    business_id = current_user.get("business_id")
    
    new_category = {
        "business_id": business_id,
        "name": category.name,
        "description": category.description or "",
        "color": category.color or "#10B981",
        "created_at": datetime.utcnow()
    }
    
    result = await db.inventory_categories.insert_one(new_category)
    new_category["id"] = str(result.inserted_id)
    
    return new_category


@router.delete("/categories/{category_id}")
async def delete_inventory_category(
    category_id: str,
    current_user: dict = Depends(require_inventory_module)
):
    """Delete an inventory category"""
    business_id = current_user.get("business_id")
    
    # Check if category has items
    item_count = await db.inventory_items.count_documents({"category_id": category_id})
    if item_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category with {item_count} items. Move or delete items first."
        )
    
    result = await db.inventory_categories.delete_one({
        "_id": ObjectId(category_id),
        "business_id": business_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted successfully"}


@router.post("/adjust")
async def adjust_inventory(
    adjustment: InventoryAdjustment,
    current_user: dict = Depends(require_inventory_module)
):
    """Adjust inventory quantity"""
    business_id = current_user.get("business_id")
    
    item = await db.inventory_items.find_one({
        "_id": ObjectId(adjustment.item_id),
        "business_id": business_id
    })
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    current_qty = item.get("quantity", 0)
    
    # Calculate new quantity based on adjustment type
    if adjustment.adjustment_type == "in":
        new_qty = current_qty + adjustment.quantity
    elif adjustment.adjustment_type == "out":
        if adjustment.quantity > current_qty:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        new_qty = current_qty - adjustment.quantity
    elif adjustment.adjustment_type == "adjustment":
        new_qty = adjustment.quantity  # Direct set
    elif adjustment.adjustment_type == "transfer":
        if adjustment.quantity > current_qty:
            raise HTTPException(status_code=400, detail="Insufficient stock for transfer")
        new_qty = current_qty - adjustment.quantity
    else:
        raise HTTPException(status_code=400, detail="Invalid adjustment type")
    
    # Update item quantity
    await db.inventory_items.update_one(
        {"_id": ObjectId(adjustment.item_id)},
        {"$set": {"quantity": new_qty, "updated_at": datetime.utcnow()}}
    )
    
    # Record movement
    movement = {
        "business_id": business_id,
        "item_id": adjustment.item_id,
        "item_name": item.get("name"),
        "movement_type": adjustment.adjustment_type,
        "quantity": adjustment.quantity,
        "quantity_before": current_qty,
        "quantity_after": new_qty,
        "reason": adjustment.reason or "",
        "reference": adjustment.reference or f"ADJ-{str(uuid.uuid4())[:8]}",
        "location_from": adjustment.location_from,
        "location_to": adjustment.location_to,
        "created_by": current_user["id"],
        "created_at": datetime.utcnow()
    }
    await db.inventory_movements.insert_one(movement)
    
    return {
        "message": "Inventory adjusted successfully",
        "item_id": adjustment.item_id,
        "previous_quantity": current_qty,
        "new_quantity": new_qty,
        "adjustment": adjustment.quantity,
        "type": adjustment.adjustment_type
    }


@router.get("/chart-data")
async def get_inventory_chart_data(
    period: str = "30d",
    current_user: dict = Depends(require_inventory_module)
):
    """Get inventory chart data for dashboard"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    # Determine date range
    from datetime import timedelta
    if period == "7d":
        start_date = datetime.utcnow() - timedelta(days=7)
    elif period == "30d":
        start_date = datetime.utcnow() - timedelta(days=30)
    elif period == "90d":
        start_date = datetime.utcnow() - timedelta(days=90)
    else:
        start_date = datetime.utcnow() - timedelta(days=30)
    
    # Get movements for the period
    movements_query = {**query, "created_at": {"$gte": start_date}}
    movements = await db.inventory_movements.find(movements_query).sort("created_at", 1).to_list(None)
    
    # Group by date
    from collections import defaultdict
    daily_data = defaultdict(lambda: {"in": 0, "out": 0})
    
    for mov in movements:
        date_key = mov["created_at"].strftime("%Y-%m-%d")
        if mov["movement_type"] in ["in", "purchase", "return"]:
            daily_data[date_key]["in"] += mov.get("quantity", 0)
        elif mov["movement_type"] in ["out", "sale", "transfer"]:
            daily_data[date_key]["out"] += mov.get("quantity", 0)
    
    # Convert to list
    chart_data = []
    current = start_date
    while current <= datetime.utcnow():
        date_key = current.strftime("%Y-%m-%d")
        chart_data.append({
            "date": date_key,
            "stock_in": daily_data[date_key]["in"],
            "stock_out": daily_data[date_key]["out"]
        })
        current += timedelta(days=1)
    
    # Get category distribution
    items = await db.inventory_items.find(query).to_list(None)
    category_dist = defaultdict(lambda: {"count": 0, "value": 0})
    
    for item in items:
        cat = item.get("category_name", "Uncategorized")
        category_dist[cat]["count"] += 1
        category_dist[cat]["value"] += item.get("quantity", 0) * item.get("cost_price", 0)
    
    categories = [{"name": k, **v} for k, v in category_dist.items()]
    
    return {
        "movements": chart_data,
        "categories": categories
    }


@router.get("/movements")
async def get_inventory_movements(
    item_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(require_inventory_module)
):
    """Get inventory movements history"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    if item_id:
        query["item_id"] = item_id
    
    if movement_type:
        query["movement_type"] = movement_type
    
    if start_date:
        query["created_at"] = {"$gte": datetime.fromisoformat(start_date)}
    
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = datetime.fromisoformat(end_date)
        else:
            query["created_at"] = {"$lte": datetime.fromisoformat(end_date)}
    
    movements = await db.inventory_movements.find(query).sort("created_at", -1).limit(limit).to_list(None)
    
    return [{
        "id": str(mov["_id"]),
        "item_id": mov.get("item_id"),
        "item_name": mov.get("item_name"),
        "movement_type": mov.get("movement_type"),
        "quantity": mov.get("quantity"),
        "quantity_before": mov.get("quantity_before"),
        "quantity_after": mov.get("quantity_after"),
        "reason": mov.get("reason", ""),
        "reference": mov.get("reference", ""),
        "location_from": mov.get("location_from"),
        "location_to": mov.get("location_to"),
        "created_by": mov.get("created_by"),
        "created_at": mov.get("created_at", datetime.utcnow()).isoformat()
    } for mov in movements]


@router.get("/export")
async def export_inventory(
    format: str = "csv",
    current_user: dict = Depends(require_inventory_module)
):
    """Export inventory data"""
    from fastapi.responses import StreamingResponse
    
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    items = await db.inventory_items.find(query).sort("name", 1).to_list(None)
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            "SKU", "Name", "Description", "Category", "Unit",
            "Quantity", "Min Quantity", "Cost Price", "Selling Price",
            "Location", "Supplier", "Status"
        ])
        
        # Data
        for item in items:
            qty = item.get("quantity", 0)
            min_qty = item.get("min_quantity", 10)
            status = "Out of Stock" if qty == 0 else "Low Stock" if qty <= min_qty else "In Stock"
            
            writer.writerow([
                item.get("sku", ""),
                item.get("name", ""),
                item.get("description", ""),
                item.get("category_name", ""),
                item.get("unit", "pcs"),
                qty,
                min_qty,
                item.get("cost_price", 0),
                item.get("selling_price", 0),
                item.get("location", ""),
                item.get("supplier", ""),
                status
            ])
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=inventory_export.csv"}
        )
    
    # JSON format
    return [{
        "sku": item.get("sku", ""),
        "name": item.get("name", ""),
        "description": item.get("description", ""),
        "category": item.get("category_name", ""),
        "unit": item.get("unit", "pcs"),
        "quantity": item.get("quantity", 0),
        "min_quantity": item.get("min_quantity", 10),
        "cost_price": item.get("cost_price", 0),
        "selling_price": item.get("selling_price", 0),
        "location": item.get("location", ""),
        "supplier": item.get("supplier", "")
    } for item in items]



# ============== SUPPLIER ENDPOINTS ==============

@router.get("/suppliers")
async def get_suppliers(
    search: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(require_inventory_module)
):
    """Get all suppliers for the business"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"contact_person": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    if status:
        query["status"] = status
    
    suppliers = await db.inventory_suppliers.find(query).sort("name", 1).to_list(None)
    
    return [{
        "id": str(s["_id"]),
        "name": s.get("name", ""),
        "phone": s.get("phone", ""),
        "email": s.get("email", ""),
        "contact_person": s.get("contact_person", ""),
        "address": s.get("address", ""),
        "city": s.get("city", ""),
        "country": s.get("country", ""),
        "notes": s.get("notes", ""),
        "payment_terms": s.get("payment_terms", ""),
        "tax_id": s.get("tax_id", ""),
        "status": s.get("status", "active"),
        "items_count": s.get("items_count", 0),
        "created_at": s.get("created_at", ""),
        "updated_at": s.get("updated_at", "")
    } for s in suppliers]


@router.post("/suppliers")
async def create_supplier(
    supplier: SupplierCreate,
    current_user: dict = Depends(require_inventory_module)
):
    """Create a new supplier"""
    business_id = current_user.get("business_id")
    
    # Check if supplier with same name exists
    existing = await db.inventory_suppliers.find_one({
        "business_id": business_id,
        "name": {"$regex": f"^{supplier.name}$", "$options": "i"}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Supplier with this name already exists")
    
    now = datetime.now(timezone.utc).isoformat()
    
    supplier_doc = {
        "business_id": business_id,
        "name": supplier.name,
        "phone": supplier.phone,
        "email": supplier.email,
        "contact_person": supplier.contact_person,
        "address": supplier.address,
        "city": supplier.city,
        "country": supplier.country,
        "notes": supplier.notes,
        "payment_terms": supplier.payment_terms,
        "tax_id": supplier.tax_id,
        "status": "active",
        "items_count": 0,
        "created_at": now,
        "updated_at": now,
        "created_by": current_user.get("id")
    }
    
    result = await db.inventory_suppliers.insert_one(supplier_doc)
    
    return {
        "id": str(result.inserted_id),
        "name": supplier.name,
        "phone": supplier.phone,
        "email": supplier.email,
        "contact_person": supplier.contact_person,
        "address": supplier.address,
        "city": supplier.city,
        "country": supplier.country,
        "notes": supplier.notes,
        "payment_terms": supplier.payment_terms,
        "tax_id": supplier.tax_id,
        "status": "active",
        "items_count": 0,
        "created_at": now
    }


@router.get("/suppliers/{supplier_id}")
async def get_supplier(
    supplier_id: str,
    current_user: dict = Depends(require_inventory_module)
):
    """Get a specific supplier by ID"""
    business_id = current_user.get("business_id")
    
    try:
        supplier = await db.inventory_suppliers.find_one({
            "_id": ObjectId(supplier_id),
            "business_id": business_id
        })
    except:
        raise HTTPException(status_code=400, detail="Invalid supplier ID")
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Get items associated with this supplier
    items_count = await db.inventory_items.count_documents({
        "business_id": business_id,
        "supplier_id": supplier_id
    })
    
    return {
        "id": str(supplier["_id"]),
        "name": supplier.get("name", ""),
        "phone": supplier.get("phone", ""),
        "email": supplier.get("email", ""),
        "contact_person": supplier.get("contact_person", ""),
        "address": supplier.get("address", ""),
        "city": supplier.get("city", ""),
        "country": supplier.get("country", ""),
        "notes": supplier.get("notes", ""),
        "payment_terms": supplier.get("payment_terms", ""),
        "tax_id": supplier.get("tax_id", ""),
        "status": supplier.get("status", "active"),
        "items_count": items_count,
        "created_at": supplier.get("created_at", ""),
        "updated_at": supplier.get("updated_at", "")
    }


@router.put("/suppliers/{supplier_id}")
async def update_supplier(
    supplier_id: str,
    supplier: SupplierUpdate,
    current_user: dict = Depends(require_inventory_module)
):
    """Update a supplier"""
    business_id = current_user.get("business_id")
    
    try:
        existing = await db.inventory_suppliers.find_one({
            "_id": ObjectId(supplier_id),
            "business_id": business_id
        })
    except:
        raise HTTPException(status_code=400, detail="Invalid supplier ID")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Check for duplicate name if name is being changed
    if supplier.name and supplier.name != existing.get("name"):
        duplicate = await db.inventory_suppliers.find_one({
            "business_id": business_id,
            "name": {"$regex": f"^{supplier.name}$", "$options": "i"},
            "_id": {"$ne": ObjectId(supplier_id)}
        })
        if duplicate:
            raise HTTPException(status_code=400, detail="Supplier with this name already exists")
    
    update_data = {k: v for k, v in supplier.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.inventory_suppliers.update_one(
        {"_id": ObjectId(supplier_id)},
        {"$set": update_data}
    )
    
    updated = await db.inventory_suppliers.find_one({"_id": ObjectId(supplier_id)})
    
    return {
        "id": str(updated["_id"]),
        "name": updated.get("name", ""),
        "phone": updated.get("phone", ""),
        "email": updated.get("email", ""),
        "contact_person": updated.get("contact_person", ""),
        "address": updated.get("address", ""),
        "city": updated.get("city", ""),
        "country": updated.get("country", ""),
        "notes": updated.get("notes", ""),
        "payment_terms": updated.get("payment_terms", ""),
        "tax_id": updated.get("tax_id", ""),
        "status": updated.get("status", "active"),
        "updated_at": updated.get("updated_at", "")
    }


@router.delete("/suppliers/{supplier_id}")
async def delete_supplier(
    supplier_id: str,
    current_user: dict = Depends(require_inventory_module)
):
    """Delete a supplier"""
    business_id = current_user.get("business_id")
    
    try:
        supplier = await db.inventory_suppliers.find_one({
            "_id": ObjectId(supplier_id),
            "business_id": business_id
        })
    except:
        raise HTTPException(status_code=400, detail="Invalid supplier ID")
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Check if supplier has linked items
    items_count = await db.inventory_items.count_documents({
        "business_id": business_id,
        "supplier_id": supplier_id
    })
    
    if items_count > 0:
        # Option 1: Prevent deletion
        # raise HTTPException(status_code=400, detail=f"Cannot delete supplier with {items_count} linked items")
        
        # Option 2: Unlink items first (preferred for flexibility)
        await db.inventory_items.update_many(
            {"business_id": business_id, "supplier_id": supplier_id},
            {"$set": {"supplier_id": None, "supplier": None}}
        )
    
    await db.inventory_suppliers.delete_one({"_id": ObjectId(supplier_id)})
    
    return {"message": "Supplier deleted successfully", "unlinked_items": items_count}


@router.get("/suppliers/{supplier_id}/items")
async def get_supplier_items(
    supplier_id: str,
    current_user: dict = Depends(require_inventory_module)
):
    """Get all inventory items for a specific supplier"""
    business_id = current_user.get("business_id")
    
    items = await db.inventory_items.find({
        "business_id": business_id,
        "supplier_id": supplier_id
    }).sort("name", 1).to_list(None)
    
    return [{
        "id": str(item["_id"]),
        "name": item.get("name", ""),
        "sku": item.get("sku", ""),
        "quantity": item.get("quantity", 0),
        "cost_price": item.get("cost_price", 0),
        "selling_price": item.get("selling_price", 0)
    } for item in items]


# ============== PURCHASE ORDER MODELS ==============

class PurchaseOrderItem(BaseModel):
    item_id: str
    item_name: str
    sku: Optional[str] = None
    ordered_qty: int
    unit_cost: float
    received_qty: int = 0


class PurchaseOrderCreate(BaseModel):
    supplier_id: str
    expected_date: Optional[str] = None
    notes: Optional[str] = None
    items: List[PurchaseOrderItem] = []


class PurchaseOrderUpdate(BaseModel):
    supplier_id: Optional[str] = None
    expected_date: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None  # draft, submitted, partial, received, cancelled
    items: Optional[List[PurchaseOrderItem]] = None


class ReceiveItem(BaseModel):
    item_id: str
    quantity: int
    notes: Optional[str] = None


class ReceiveStock(BaseModel):
    items: List[ReceiveItem]
    notes: Optional[str] = None


# ============== PURCHASE ORDER ENDPOINTS ==============

@router.get("/purchase-orders")
async def get_purchase_orders(
    status: Optional[str] = None,
    supplier_id: Optional[str] = None,
    current_user: dict = Depends(require_inventory_module)
):
    """Get all purchase orders"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id}
    
    if status:
        query["status"] = status
    if supplier_id:
        query["supplier_id"] = supplier_id
    
    orders = await db.purchase_orders.find(query).sort("created_at", -1).to_list(None)
    
    result = []
    for order in orders:
        # Get supplier name
        supplier = await db.inventory_suppliers.find_one({"_id": ObjectId(order.get("supplier_id"))}) if order.get("supplier_id") else None
        
        # Calculate totals
        items = order.get("items", [])
        total = sum(item.get("ordered_qty", 0) * item.get("unit_cost", 0) for item in items)
        total_ordered = sum(item.get("ordered_qty", 0) for item in items)
        total_received = sum(item.get("received_qty", 0) for item in items)
        
        result.append({
            "id": str(order["_id"]),
            "po_number": order.get("po_number", ""),
            "supplier_id": order.get("supplier_id", ""),
            "supplier": supplier.get("name", "") if supplier else "",
            "status": order.get("status", "draft"),
            "items": items,
            "total": total,
            "total_items": total_ordered,
            "received_items": total_received,
            "expected_date": order.get("expected_date", ""),
            "notes": order.get("notes", ""),
            "created_at": order.get("created_at", "").isoformat() if order.get("created_at") else "",
            "updated_at": order.get("updated_at", "").isoformat() if order.get("updated_at") else ""
        })
    
    return result


@router.post("/purchase-orders")
async def create_purchase_order(
    po: PurchaseOrderCreate,
    current_user: dict = Depends(require_inventory_module)
):
    """Create a new purchase order"""
    business_id = current_user.get("business_id")
    
    # Generate PO number
    count = await db.purchase_orders.count_documents({"business_id": business_id})
    po_number = f"PO-{datetime.now(timezone.utc).strftime('%Y')}-{count + 1:03d}"
    
    # Get supplier info
    supplier = None
    if po.supplier_id:
        supplier = await db.inventory_suppliers.find_one({"_id": ObjectId(po.supplier_id)})
    
    now = datetime.now(timezone.utc)
    
    new_po = {
        "business_id": business_id,
        "po_number": po_number,
        "supplier_id": po.supplier_id,
        "status": "draft",
        "items": [item.dict() for item in po.items],
        "expected_date": po.expected_date,
        "notes": po.notes,
        "created_at": now,
        "updated_at": now,
        "created_by": current_user.get("id")
    }
    
    result = await db.purchase_orders.insert_one(new_po)
    
    # Calculate total
    total = sum(item.ordered_qty * item.unit_cost for item in po.items)
    
    return {
        "id": str(result.inserted_id),
        "po_number": po_number,
        "supplier_id": po.supplier_id,
        "supplier": supplier.get("name", "") if supplier else "",
        "status": "draft",
        "items": [item.dict() for item in po.items],
        "total": total,
        "expected_date": po.expected_date,
        "notes": po.notes,
        "created_at": now.isoformat()
    }


@router.get("/purchase-orders/{po_id}")
async def get_purchase_order(
    po_id: str,
    current_user: dict = Depends(require_inventory_module)
):
    """Get a specific purchase order"""
    business_id = current_user.get("business_id")
    
    order = await db.purchase_orders.find_one({
        "_id": ObjectId(po_id),
        "business_id": business_id
    })
    
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Get supplier name
    supplier = await db.inventory_suppliers.find_one({"_id": ObjectId(order.get("supplier_id"))}) if order.get("supplier_id") else None
    
    items = order.get("items", [])
    total = sum(item.get("ordered_qty", 0) * item.get("unit_cost", 0) for item in items)
    
    return {
        "id": str(order["_id"]),
        "po_number": order.get("po_number", ""),
        "supplier_id": order.get("supplier_id", ""),
        "supplier": supplier.get("name", "") if supplier else "",
        "status": order.get("status", "draft"),
        "items": items,
        "total": total,
        "expected_date": order.get("expected_date", ""),
        "notes": order.get("notes", ""),
        "created_at": order.get("created_at", "").isoformat() if order.get("created_at") else ""
    }


@router.put("/purchase-orders/{po_id}")
async def update_purchase_order(
    po_id: str,
    po: PurchaseOrderUpdate,
    current_user: dict = Depends(require_inventory_module)
):
    """Update a purchase order"""
    business_id = current_user.get("business_id")
    
    existing = await db.purchase_orders.find_one({
        "_id": ObjectId(po_id),
        "business_id": business_id
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Don't allow updates to received/cancelled orders
    if existing.get("status") in ["received", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot update received or cancelled orders")
    
    update_data = {}
    if po.supplier_id is not None:
        update_data["supplier_id"] = po.supplier_id
    if po.expected_date is not None:
        update_data["expected_date"] = po.expected_date
    if po.notes is not None:
        update_data["notes"] = po.notes
    if po.status is not None:
        update_data["status"] = po.status
    if po.items is not None:
        update_data["items"] = [item.dict() for item in po.items]
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.purchase_orders.update_one(
        {"_id": ObjectId(po_id)},
        {"$set": update_data}
    )
    
    return {"message": "Purchase order updated successfully", "id": po_id}


@router.delete("/purchase-orders/{po_id}")
async def delete_purchase_order(
    po_id: str,
    current_user: dict = Depends(require_inventory_module)
):
    """Delete a purchase order (only drafts can be deleted)"""
    business_id = current_user.get("business_id")
    
    existing = await db.purchase_orders.find_one({
        "_id": ObjectId(po_id),
        "business_id": business_id
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if existing.get("status") != "draft":
        raise HTTPException(status_code=400, detail="Only draft purchase orders can be deleted")
    
    await db.purchase_orders.delete_one({"_id": ObjectId(po_id)})
    
    return {"message": "Purchase order deleted successfully", "id": po_id}


@router.post("/purchase-orders/{po_id}/submit")
async def submit_purchase_order(
    po_id: str,
    current_user: dict = Depends(require_inventory_module)
):
    """Submit a purchase order (change status from draft to submitted)"""
    business_id = current_user.get("business_id")
    
    existing = await db.purchase_orders.find_one({
        "_id": ObjectId(po_id),
        "business_id": business_id
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if existing.get("status") != "draft":
        raise HTTPException(status_code=400, detail="Only draft orders can be submitted")
    
    if not existing.get("items") or len(existing.get("items", [])) == 0:
        raise HTTPException(status_code=400, detail="Cannot submit empty purchase order")
    
    await db.purchase_orders.update_one(
        {"_id": ObjectId(po_id)},
        {"$set": {"status": "submitted", "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Purchase order submitted successfully", "id": po_id, "status": "submitted"}


@router.post("/purchase-orders/{po_id}/receive")
async def receive_purchase_order(
    po_id: str,
    receive: ReceiveStock,
    current_user: dict = Depends(require_inventory_module)
):
    """Receive stock against a purchase order"""
    business_id = current_user.get("business_id")
    
    existing = await db.purchase_orders.find_one({
        "_id": ObjectId(po_id),
        "business_id": business_id
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if existing.get("status") in ["draft", "received", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Cannot receive stock for {existing.get('status')} orders")
    
    now = datetime.now(timezone.utc)
    po_items = existing.get("items", [])
    items_received = []
    
    for recv_item in receive.items:
        # Find matching item in PO
        po_item = next((item for item in po_items if item.get("item_id") == recv_item.item_id), None)
        if not po_item:
            raise HTTPException(status_code=400, detail=f"Item {recv_item.item_id} not found in purchase order")
        
        # Check if receiving more than outstanding
        outstanding = po_item.get("ordered_qty", 0) - po_item.get("received_qty", 0)
        if recv_item.quantity > outstanding:
            raise HTTPException(status_code=400, detail=f"Cannot receive more than outstanding quantity for {po_item.get('item_name')}")
        
        # Update PO item received qty
        po_item["received_qty"] = po_item.get("received_qty", 0) + recv_item.quantity
        
        # Update inventory item quantity
        await db.inventory_items.update_one(
            {"_id": ObjectId(recv_item.item_id), "business_id": business_id},
            {"$inc": {"quantity": recv_item.quantity}}
        )
        
        # Create stock movement record
        movement = {
            "business_id": business_id,
            "item_id": recv_item.item_id,
            "item_name": po_item.get("item_name", ""),
            "type": "in",
            "quantity": recv_item.quantity,
            "reason": f"PO Receive: {existing.get('po_number')}",
            "reference": po_id,
            "reference_type": "purchase_order",
            "notes": recv_item.notes or receive.notes,
            "created_at": now,
            "created_by": current_user.get("id")
        }
        await db.inventory_movements.insert_one(movement)
        
        items_received.append({
            "item_id": recv_item.item_id,
            "item_name": po_item.get("item_name"),
            "quantity_received": recv_item.quantity
        })
    
    # Update PO with new item quantities
    await db.purchase_orders.update_one(
        {"_id": ObjectId(po_id)},
        {"$set": {"items": po_items, "updated_at": now}}
    )
    
    # Check if all items received - update status
    total_ordered = sum(item.get("ordered_qty", 0) for item in po_items)
    total_received = sum(item.get("received_qty", 0) for item in po_items)
    
    new_status = "partial"
    if total_received >= total_ordered:
        new_status = "received"
    
    await db.purchase_orders.update_one(
        {"_id": ObjectId(po_id)},
        {"$set": {"status": new_status}}
    )
    
    return {
        "message": "Stock received successfully",
        "po_id": po_id,
        "status": new_status,
        "items_received": items_received
    }


@router.get("/receiving/pending")
async def get_pending_receiving(
    current_user: dict = Depends(require_inventory_module)
):
    """Get all purchase orders pending receiving (submitted or partial)"""
    business_id = current_user.get("business_id")
    
    orders = await db.purchase_orders.find({
        "business_id": business_id,
        "status": {"$in": ["submitted", "partial"]}
    }).sort("expected_date", 1).to_list(None)
    
    result = []
    for order in orders:
        supplier = await db.inventory_suppliers.find_one({"_id": ObjectId(order.get("supplier_id"))}) if order.get("supplier_id") else None
        
        items = order.get("items", [])
        # Convert items to delivery format
        delivery_items = []
        for item in items:
            pending = item.get("ordered_qty", 0) - item.get("received_qty", 0)
            if pending > 0:
                delivery_items.append({
                    "product_id": item.get("item_id"),
                    "product_name": item.get("item_name"),
                    "sku": item.get("sku", ""),
                    "ordered_qty": item.get("ordered_qty", 0),
                    "received_qty": item.get("received_qty", 0),
                    "pending_qty": pending
                })
        
        total_items = sum(item.get("ordered_qty", 0) for item in items)
        received_items = sum(item.get("received_qty", 0) for item in items)
        
        result.append({
            "id": str(order["_id"]),
            "po_number": order.get("po_number", ""),
            "supplier": supplier.get("name", "") if supplier else "",
            "expected_date": order.get("expected_date", ""),
            "items": delivery_items,
            "total_items": total_items,
            "received_items": received_items,
            "status": "partial" if received_items > 0 else "pending"
        })
    
    return result


@router.get("/receiving/history")
async def get_receiving_history(
    limit: int = 20,
    current_user: dict = Depends(require_inventory_module)
):
    """Get receiving history (completed POs)"""
    business_id = current_user.get("business_id")
    
    orders = await db.purchase_orders.find({
        "business_id": business_id,
        "status": "received"
    }).sort("updated_at", -1).limit(limit).to_list(limit)
    
    result = []
    for order in orders:
        supplier = await db.inventory_suppliers.find_one({"_id": ObjectId(order.get("supplier_id"))}) if order.get("supplier_id") else None
        
        items = order.get("items", [])
        total_items = sum(item.get("received_qty", 0) for item in items)
        
        result.append({
            "id": str(order["_id"]),
            "po_number": order.get("po_number", ""),
            "supplier": supplier.get("name", "") if supplier else "",
            "received_date": order.get("updated_at", "").isoformat() if order.get("updated_at") else "",
            "items_count": total_items,
            "notes": order.get("notes", "")
        })
    
    return result
