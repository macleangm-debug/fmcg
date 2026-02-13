"""
Products & Categories Routes
Handles product catalog, categories, and inventory items
"""
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from pydantic import BaseModel, Field
from bson import ObjectId

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/products", tags=["Products"])

db = None
get_current_user = None

def set_dependencies(database, auth_func):
    global db, get_current_user
    db = database
    get_current_user = auth_func


# ============== MODELS ==============

class ProductCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    unit_price: float = Field(..., ge=0)
    cost_price: float = Field(0, ge=0)
    quantity: int = Field(0, ge=0)
    min_stock: int = Field(0, ge=0)
    unit_of_measure: str = "piece"
    is_active: bool = True
    tax_rate: float = Field(0, ge=0, le=100)
    images: List[str] = []
    attributes: Dict[str, Any] = {}


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    unit_price: Optional[float] = None
    cost_price: Optional[float] = None
    quantity: Optional[int] = None
    min_stock: Optional[int] = None
    unit_of_measure: Optional[str] = None
    is_active: Optional[bool] = None
    tax_rate: Optional[float] = None
    images: Optional[List[str]] = None
    attributes: Optional[Dict[str, Any]] = None


class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True


def serialize_doc(doc):
    if doc is None:
        return None
    result = {k: v for k, v in doc.items() if k != "_id"}
    result["id"] = str(doc.get("_id", ""))
    for key in ["created_at", "updated_at"]:
        if key in result and hasattr(result[key], "isoformat"):
            result[key] = result[key].isoformat()
    return result


# ============== CATEGORY ENDPOINTS ==============

@router.get("/categories")
async def list_categories(
    include_inactive: bool = False,
    current_user: dict = Depends(lambda: get_current_user)
):
    """List all product categories"""
    business_id = current_user.get("business_id")
    
    query = {"business_id": business_id}
    if not include_inactive:
        query["is_active"] = True
    
    categories = await db.categories.find(query).sort("name", 1).to_list(length=500)
    return {"categories": [serialize_doc(c) for c in categories]}


@router.post("/categories")
async def create_category(
    category: CategoryCreate,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Create a new category"""
    business_id = current_user.get("business_id")
    
    # Check for duplicate name
    existing = await db.categories.find_one({
        "business_id": business_id,
        "name": {"$regex": f"^{category.name}$", "$options": "i"}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    cat_doc = {
        "business_id": business_id,
        "name": category.name,
        "description": category.description,
        "parent_id": category.parent_id,
        "image_url": category.image_url,
        "is_active": category.is_active,
        "product_count": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.categories.insert_one(cat_doc)
    cat_doc["id"] = str(result.inserted_id)
    
    return serialize_doc(cat_doc)


@router.get("/categories/{category_id}")
async def get_category(
    category_id: str,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Get category by ID"""
    business_id = current_user.get("business_id")
    
    category = await db.categories.find_one({
        "_id": ObjectId(category_id),
        "business_id": business_id
    })
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return serialize_doc(category)


@router.put("/categories/{category_id}")
async def update_category(
    category_id: str,
    category: CategoryCreate,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Update a category"""
    business_id = current_user.get("business_id")
    
    existing = await db.categories.find_one({
        "_id": ObjectId(category_id),
        "business_id": business_id
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = {
        "name": category.name,
        "description": category.description,
        "parent_id": category.parent_id,
        "image_url": category.image_url,
        "is_active": category.is_active,
        "updated_at": datetime.utcnow()
    }
    
    await db.categories.update_one(
        {"_id": ObjectId(category_id)},
        {"$set": update_data}
    )
    
    return {"message": "Category updated successfully"}


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Delete a category (soft delete)"""
    business_id = current_user.get("business_id")
    
    # Check if category has products
    product_count = await db.products.count_documents({
        "business_id": business_id,
        "category_id": category_id
    })
    
    if product_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category with {product_count} products. Move products first."
        )
    
    result = await db.categories.delete_one({
        "_id": ObjectId(category_id),
        "business_id": business_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted successfully"}


# ============== PRODUCT ENDPOINTS ==============

@router.get("")
async def list_products(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock: Optional[bool] = None,
    is_active: bool = True,
    sort_by: str = "name",
    sort_order: str = "asc",
    limit: int = Query(50, le=500),
    offset: int = 0,
    current_user: dict = Depends(lambda: get_current_user)
):
    """List products with filtering and pagination"""
    business_id = current_user.get("business_id")
    
    query = {"business_id": business_id}
    
    if category_id:
        query["category_id"] = category_id
    if is_active is not None:
        query["is_active"] = is_active
    if in_stock:
        query["quantity"] = {"$gt": 0}
    if min_price is not None:
        query["unit_price"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("unit_price", {})["$lte"] = max_price
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}},
            {"barcode": {"$regex": search, "$options": "i"}}
        ]
    
    sort_dir = 1 if sort_order == "asc" else -1
    
    products = await db.products.find(query) \
        .sort(sort_by, sort_dir) \
        .skip(offset) \
        .limit(limit) \
        .to_list(length=limit)
    
    total = await db.products.count_documents(query)
    
    return {
        "products": [serialize_doc(p) for p in products],
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.post("")
async def create_product(
    product: ProductCreate,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Create a new product"""
    business_id = current_user.get("business_id")
    
    # Generate SKU if not provided
    if not product.sku:
        import secrets
        product.sku = f"SKU-{secrets.token_hex(4).upper()}"
    
    # Check for duplicate SKU
    existing = await db.products.find_one({
        "business_id": business_id,
        "sku": product.sku
    })
    if existing:
        raise HTTPException(status_code=400, detail="Product with this SKU already exists")
    
    prod_doc = {
        "business_id": business_id,
        **product.dict(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.products.insert_one(prod_doc)
    
    # Update category product count
    if product.category_id:
        await db.categories.update_one(
            {"_id": ObjectId(product.category_id)},
            {"$inc": {"product_count": 1}}
        )
    
    prod_doc["id"] = str(result.inserted_id)
    return serialize_doc(prod_doc)


@router.get("/{product_id}")
async def get_product(
    product_id: str,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Get product by ID"""
    business_id = current_user.get("business_id")
    
    product = await db.products.find_one({
        "_id": ObjectId(product_id),
        "business_id": business_id
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return serialize_doc(product)


@router.put("/{product_id}")
async def update_product(
    product_id: str,
    product: ProductUpdate,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Update a product"""
    business_id = current_user.get("business_id")
    
    existing = await db.products.find_one({
        "_id": ObjectId(product_id),
        "business_id": business_id
    })
    
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in product.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Handle category change
    old_category = existing.get("category_id")
    new_category = update_data.get("category_id")
    
    if old_category != new_category:
        if old_category:
            await db.categories.update_one(
                {"_id": ObjectId(old_category)},
                {"$inc": {"product_count": -1}}
            )
        if new_category:
            await db.categories.update_one(
                {"_id": ObjectId(new_category)},
                {"$inc": {"product_count": 1}}
            )
    
    await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": update_data}
    )
    
    return {"message": "Product updated successfully"}


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_user: dict = Depends(lambda: get_current_user)
):
    """Delete a product"""
    business_id = current_user.get("business_id")
    
    product = await db.products.find_one({
        "_id": ObjectId(product_id),
        "business_id": business_id
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update category count
    if product.get("category_id"):
        await db.categories.update_one(
            {"_id": ObjectId(product["category_id"])},
            {"$inc": {"product_count": -1}}
        )
    
    await db.products.delete_one({"_id": ObjectId(product_id)})
    
    return {"message": "Product deleted successfully"}


@router.post("/{product_id}/adjust-stock")
async def adjust_stock(
    product_id: str,
    adjustment: int = Body(...),
    reason: str = Body("Manual adjustment"),
    current_user: dict = Depends(lambda: get_current_user)
):
    """Adjust product stock quantity"""
    business_id = current_user.get("business_id")
    
    product = await db.products.find_one({
        "_id": ObjectId(product_id),
        "business_id": business_id
    })
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    new_quantity = product.get("quantity", 0) + adjustment
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")
    
    # Update product
    await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {"quantity": new_quantity, "updated_at": datetime.utcnow()}}
    )
    
    # Log stock movement
    await db.stock_movements.insert_one({
        "business_id": business_id,
        "product_id": product_id,
        "product_name": product.get("name"),
        "adjustment": adjustment,
        "previous_quantity": product.get("quantity", 0),
        "new_quantity": new_quantity,
        "reason": reason,
        "user_id": current_user.get("id"),
        "created_at": datetime.utcnow()
    })
    
    return {
        "message": "Stock adjusted successfully",
        "previous_quantity": product.get("quantity", 0),
        "new_quantity": new_quantity
    }


@router.get("/low-stock/alerts")
async def get_low_stock_alerts(
    current_user: dict = Depends(lambda: get_current_user)
):
    """Get products with low stock"""
    business_id = current_user.get("business_id")
    
    # Find products where quantity <= min_stock
    pipeline = [
        {"$match": {
            "business_id": business_id,
            "is_active": True,
            "$expr": {"$lte": ["$quantity", "$min_stock"]}
        }},
        {"$sort": {"quantity": 1}},
        {"$limit": 50}
    ]
    
    low_stock = await db.products.aggregate(pipeline).to_list(length=50)
    
    return {
        "low_stock_products": [serialize_doc(p) for p in low_stock],
        "count": len(low_stock)
    }
