"""
Software Galaxy Ecosystem Product Linking
Allows users to link multiple products under one account
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timedelta
from bson import ObjectId
from enum import Enum

router = APIRouter(prefix="/ecosystem", tags=["Software Galaxy Ecosystem"])

# Security scheme - same as server.py
security = HTTPBearer()

# Module-level variables
db = None
_get_current_user = None


def set_dependencies(database, current_user_dep):
    """Initialize router dependencies"""
    global db, _get_current_user
    db = database
    _get_current_user = current_user_dep


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Auth wrapper that uses the actual auth function from server.py.
    This properly receives credentials from FastAPI's dependency injection.
    """
    if _get_current_user is None:
        raise HTTPException(status_code=500, detail="Auth not initialized")
    # Call the actual auth dependency from server.py
    return await _get_current_user(credentials)


# ============== PRODUCT DEFINITIONS ==============

class ProductID(str, Enum):
    KWIKPAY = "kwikpay"
    RETAILPRO = "retailpro"
    INVOICING = "invoicing"
    INVENTORY = "inventory"
    UNITXT = "unitxt"
    CRM = "crm"
    EXPENSES = "expenses"


PRODUCTS_CATALOG = {
    ProductID.KWIKPAY: {
        "id": "kwikpay",
        "name": "KwikPay",
        "tagline": "Accept Payments Anywhere",
        "description": "Unified payment processing with mobile money, cards, and bank transfers. Get paid instantly with payment links and checkout pages.",
        "icon": "card-outline",
        "color": "#10B981",
        "category": "payments",
        "features": [
            "Payment Links & QR Codes",
            "Mobile Money (M-Pesa, Tigo, Airtel)",
            "Card Payments (Visa, Mastercard)",
            "Instant Payouts",
            "Transaction Analytics",
            "API & Webhooks"
        ],
        "pricing": {
            "type": "transaction_fee",
            "rate": "2.9% + $0.30",
            "monthly_fee": 0
        },
        "integrates_with": ["retailpro", "invoicing", "unitxt"],
        "setup_route": "/kwikpay/onboarding"
    },
    ProductID.RETAILPRO: {
        "id": "retailpro",
        "name": "RetailPro",
        "tagline": "Complete POS Solution",
        "description": "Full-featured point of sale system for retail stores. Manage sales, inventory, customers, and staff from one dashboard.",
        "icon": "storefront-outline",
        "color": "#3B82F6",
        "category": "retail",
        "features": [
            "Point of Sale (POS)",
            "Inventory Management",
            "Customer Database",
            "Staff Management",
            "Sales Reports",
            "Multi-location Support"
        ],
        "pricing": {
            "type": "subscription",
            "plans": [
                {"name": "Starter", "price": 29, "interval": "month"},
                {"name": "Pro", "price": 79, "interval": "month"},
                {"name": "Enterprise", "price": 199, "interval": "month"}
            ]
        },
        "integrates_with": ["kwikpay", "inventory", "unitxt"],
        "setup_route": "/retailpro/setup"
    },
    ProductID.INVOICING: {
        "id": "invoicing",
        "name": "Invoicing",
        "tagline": "Professional Billing Made Easy",
        "description": "Create and send professional invoices, track payments, and manage your billing workflow efficiently.",
        "icon": "document-text-outline",
        "color": "#8B5CF6",
        "category": "billing",
        "features": [
            "Professional Invoices",
            "Recurring Billing",
            "Payment Reminders",
            "Quote to Invoice",
            "Multi-currency",
            "Client Portal"
        ],
        "pricing": {
            "type": "subscription",
            "plans": [
                {"name": "Free", "price": 0, "interval": "month", "limit": "5 invoices/month"},
                {"name": "Pro", "price": 19, "interval": "month"},
                {"name": "Business", "price": 49, "interval": "month"}
            ]
        },
        "integrates_with": ["kwikpay", "unitxt", "crm"],
        "setup_route": "/invoicing/setup"
    },
    ProductID.INVENTORY: {
        "id": "inventory",
        "name": "Inventory",
        "tagline": "Stock Management Simplified",
        "description": "Track stock levels, manage warehouses, automate reorders, and never run out of stock again.",
        "icon": "cube-outline",
        "color": "#F59E0B",
        "category": "operations",
        "features": [
            "Real-time Stock Tracking",
            "Multi-warehouse Support",
            "Low Stock Alerts",
            "Barcode Scanning",
            "Stock Transfers",
            "Inventory Reports"
        ],
        "pricing": {
            "type": "subscription",
            "plans": [
                {"name": "Starter", "price": 19, "interval": "month"},
                {"name": "Pro", "price": 49, "interval": "month"},
                {"name": "Enterprise", "price": 129, "interval": "month"}
            ]
        },
        "integrates_with": ["retailpro", "invoicing"],
        "setup_route": "/inventory/setup"
    },
    ProductID.UNITXT: {
        "id": "unitxt",
        "name": "UniTxt",
        "tagline": "SMS & WhatsApp Marketing",
        "description": "Reach your customers with SMS campaigns, automated messages, and WhatsApp notifications.",
        "icon": "chatbubbles-outline",
        "color": "#06B6D4",
        "category": "communication",
        "features": [
            "Bulk SMS Campaigns",
            "WhatsApp Business API",
            "Automated Messages",
            "Contact Management",
            "Message Templates",
            "Delivery Analytics"
        ],
        "pricing": {
            "type": "credits",
            "rate": "$0.015 per SMS",
            "bundles": [
                {"credits": 1000, "price": 15},
                {"credits": 5000, "price": 65},
                {"credits": 10000, "price": 120}
            ]
        },
        "integrates_with": ["kwikpay", "retailpro", "invoicing"],
        "setup_route": "/unitxt/setup"
    },
    ProductID.CRM: {
        "id": "crm",
        "name": "CRM",
        "tagline": "Customer Relationships",
        "description": "Manage leads, track deals, and nurture customer relationships to grow your business.",
        "icon": "people-outline",
        "color": "#EC4899",
        "category": "sales",
        "features": [
            "Lead Management",
            "Deal Pipeline",
            "Contact Database",
            "Activity Tracking",
            "Email Integration",
            "Sales Reports"
        ],
        "pricing": {
            "type": "subscription",
            "plans": [
                {"name": "Starter", "price": 15, "interval": "month"},
                {"name": "Pro", "price": 39, "interval": "month"}
            ]
        },
        "integrates_with": ["invoicing", "unitxt"],
        "setup_route": "/crm/setup"
    },
    ProductID.EXPENSES: {
        "id": "expenses",
        "name": "Expenses",
        "tagline": "Track Business Spending",
        "description": "Record expenses, scan receipts, categorize spending, and manage budgets effortlessly.",
        "icon": "receipt-outline",
        "color": "#EF4444",
        "category": "finance",
        "features": [
            "Expense Recording",
            "Receipt Scanning",
            "Category Management",
            "Budget Tracking",
            "Approval Workflow",
            "Expense Reports"
        ],
        "pricing": {
            "type": "subscription",
            "plans": [
                {"name": "Free", "price": 0, "interval": "month", "limit": "20 expenses/month"},
                {"name": "Pro", "price": 9, "interval": "month"}
            ]
        },
        "integrates_with": ["invoicing"],
        "setup_route": "/expenses/setup"
    }
}


# ============== PYDANTIC MODELS ==============

class LinkProductRequest(BaseModel):
    product_id: str
    plan: Optional[str] = None  # For subscription products


class UnlinkProductRequest(BaseModel):
    product_id: str
    reason: Optional[str] = None


class IntegrationToggle(BaseModel):
    source_product: str
    target_product: str
    enabled: bool


# ============== PRODUCT CATALOG ==============

@router.get("/products")
async def get_products_catalog():
    """Get all available Software Galaxy products"""
    products = []
    for product_id, product in PRODUCTS_CATALOG.items():
        products.append({
            **product,
            "id": product_id.value
        })
    
    # Group by category
    categories = {}
    for p in products:
        cat = p.get("category", "other")
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(p)
    
    return {
        "products": products,
        "categories": categories,
        "total": len(products)
    }


@router.get("/products/{product_id}")
async def get_product_details(product_id: str):
    """Get detailed information about a specific product"""
    try:
        product_enum = ProductID(product_id)
        product = PRODUCTS_CATALOG.get(product_enum)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product
    except ValueError:
        raise HTTPException(status_code=404, detail="Product not found")


# ============== USER'S LINKED PRODUCTS ==============

@router.get("/my-products")
async def get_my_linked_products(current_user: dict = Depends(get_current_user)):
    """Get all products linked to user's account"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = str(current_user.get("_id", current_user.get("id", "")))
    business_id = current_user.get("business_id")
    
    # Get linked products
    linked = await db.ecosystem_linked_products.find({
        "$or": [{"user_id": user_id}, {"business_id": str(business_id)}],
        "status": {"$in": ["active", "trial"]}
    }).to_list(20)
    
    linked_products = []
    for link in linked:
        product_id = link.get("product_id")
        try:
            product_enum = ProductID(product_id)
            product_info = PRODUCTS_CATALOG.get(product_enum, {})
        except ValueError:
            product_info = {}
        
        linked_products.append({
            "id": str(link["_id"]),
            "product_id": product_id,
            "product_name": product_info.get("name", product_id),
            "product_icon": product_info.get("icon", "apps-outline"),
            "product_color": product_info.get("color", "#6B7280"),
            "status": link.get("status", "active"),
            "plan": link.get("plan"),
            "linked_at": link.get("linked_at", datetime.utcnow()).isoformat() if isinstance(link.get("linked_at"), datetime) else str(link.get("linked_at", "")),
            "setup_completed": link.get("setup_completed", False),
            "setup_route": product_info.get("setup_route", f"/{product_id}/setup")
        })
    
    # Get available products (not yet linked)
    linked_ids = [p["product_id"] for p in linked_products]
    available_products = []
    for product_id, product in PRODUCTS_CATALOG.items():
        if product_id.value not in linked_ids:
            available_products.append({
                "id": product_id.value,
                "name": product.get("name"),
                "tagline": product.get("tagline"),
                "icon": product.get("icon"),
                "color": product.get("color"),
                "category": product.get("category")
            })
    
    return {
        "linked": linked_products,
        "available": available_products,
        "total_linked": len(linked_products),
        "total_available": len(available_products)
    }


@router.post("/link")
async def link_product(
    request: LinkProductRequest,
    current_user: dict = Depends(get_current_user)
):
    """Link a new product to user's account"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = str(current_user.get("_id", current_user.get("id", "")))
    business_id = current_user.get("business_id")
    
    # Validate product
    try:
        product_enum = ProductID(request.product_id)
        product = PRODUCTS_CATALOG.get(product_enum)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if already linked
    existing = await db.ecosystem_linked_products.find_one({
        "$or": [{"user_id": user_id}, {"business_id": str(business_id)}],
        "product_id": request.product_id,
        "status": {"$in": ["active", "trial"]}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Product already linked to your account")
    
    # Create link record
    link_data = {
        "user_id": user_id,
        "business_id": str(business_id) if business_id else None,
        "product_id": request.product_id,
        "plan": request.plan,
        "status": "trial" if product.get("pricing", {}).get("type") == "subscription" else "active",
        "trial_ends_at": datetime.utcnow() + timedelta(days=14) if product.get("pricing", {}).get("type") == "subscription" else None,
        "setup_completed": False,
        "linked_at": datetime.utcnow(),
        "linked_by": current_user.get("email")
    }
    
    result = await db.ecosystem_linked_products.insert_one(link_data)
    
    # Initialize product-specific data
    await _initialize_product_data(request.product_id, user_id, business_id)
    
    # Log activity
    await db.ecosystem_activity_log.insert_one({
        "user_id": user_id,
        "business_id": str(business_id) if business_id else None,
        "action": "product_linked",
        "product_id": request.product_id,
        "details": {"plan": request.plan},
        "timestamp": datetime.utcnow()
    })
    
    return {
        "success": True,
        "message": f"{product.get('name')} has been linked to your account",
        "link_id": str(result.inserted_id),
        "product_id": request.product_id,
        "status": link_data["status"],
        "setup_route": product.get("setup_route"),
        "trial_days": 14 if link_data["status"] == "trial" else None
    }


@router.post("/unlink")
async def unlink_product(
    request: UnlinkProductRequest,
    current_user: dict = Depends(get_current_user)
):
    """Unlink a product from user's account"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = str(current_user.get("_id", current_user.get("id", "")))
    business_id = current_user.get("business_id")
    
    result = await db.ecosystem_linked_products.update_one(
        {
            "$or": [{"user_id": user_id}, {"business_id": str(business_id)}],
            "product_id": request.product_id,
            "status": {"$in": ["active", "trial"]}
        },
        {
            "$set": {
                "status": "unlinked",
                "unlinked_at": datetime.utcnow(),
                "unlink_reason": request.reason
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product link not found")
    
    # Log activity
    await db.ecosystem_activity_log.insert_one({
        "user_id": user_id,
        "business_id": str(business_id) if business_id else None,
        "action": "product_unlinked",
        "product_id": request.product_id,
        "details": {"reason": request.reason},
        "timestamp": datetime.utcnow()
    })
    
    return {
        "success": True,
        "message": f"Product has been unlinked from your account"
    }


# ============== INTEGRATIONS BETWEEN PRODUCTS ==============

@router.get("/integrations")
async def get_integrations(current_user: dict = Depends(get_current_user)):
    """Get available integrations between linked products"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = str(current_user.get("_id", current_user.get("id", "")))
    business_id = current_user.get("business_id")
    
    # Get linked products
    linked = await db.ecosystem_linked_products.find({
        "$or": [{"user_id": user_id}, {"business_id": str(business_id)}],
        "status": {"$in": ["active", "trial"]}
    }).to_list(20)
    
    linked_ids = [l["product_id"] for l in linked]
    
    # Get current integration settings
    integration_settings = await db.ecosystem_integrations.find({
        "$or": [{"user_id": user_id}, {"business_id": str(business_id)}]
    }).to_list(50)
    
    settings_map = {f"{s['source']}_{s['target']}": s for s in integration_settings}
    
    # Build available integrations
    integrations = []
    
    INTEGRATION_DEFINITIONS = [
        {
            "source": "kwikpay",
            "target": "retailpro",
            "name": "KwikPay → RetailPro",
            "description": "Process payments at POS, auto-sync transactions",
            "features": ["Payment processing at checkout", "Transaction sync", "Receipt generation"]
        },
        {
            "source": "kwikpay",
            "target": "invoicing",
            "name": "KwikPay → Invoicing",
            "description": "Add payment links to invoices, auto-mark as paid",
            "features": ["Payment links on invoices", "Auto-reconciliation", "Payment notifications"]
        },
        {
            "source": "kwikpay",
            "target": "unitxt",
            "name": "KwikPay → UniTxt",
            "description": "Send SMS notifications for payments and payouts",
            "features": ["Payment confirmations", "Payout alerts", "Failed payment notifications"]
        },
        {
            "source": "retailpro",
            "target": "inventory",
            "name": "RetailPro → Inventory",
            "description": "Auto-deduct stock on sales, sync product catalog",
            "features": ["Auto stock deduction", "Low stock alerts", "Product sync"]
        },
        {
            "source": "retailpro",
            "target": "unitxt",
            "name": "RetailPro → UniTxt",
            "description": "Send order notifications and marketing messages",
            "features": ["Order confirmations", "Shipping updates", "Marketing campaigns"]
        },
        {
            "source": "invoicing",
            "target": "unitxt",
            "name": "Invoicing → UniTxt",
            "description": "Send invoice and payment reminder notifications",
            "features": ["Invoice notifications", "Payment reminders", "Thank you messages"]
        },
        {
            "source": "inventory",
            "target": "unitxt",
            "name": "Inventory → UniTxt",
            "description": "Get alerts for low stock and reorder reminders",
            "features": ["Low stock alerts", "Reorder notifications", "Stock reports"]
        }
    ]
    
    for integ in INTEGRATION_DEFINITIONS:
        # Check if both products are linked
        if integ["source"] in linked_ids and integ["target"] in linked_ids:
            key = f"{integ['source']}_{integ['target']}"
            current_setting = settings_map.get(key, {})
            
            integrations.append({
                **integ,
                "available": True,
                "enabled": current_setting.get("enabled", False),
                "config": current_setting.get("config", {})
            })
        elif integ["source"] in linked_ids or integ["target"] in linked_ids:
            # One product linked, show as available but disabled
            missing = integ["target"] if integ["source"] in linked_ids else integ["source"]
            integrations.append({
                **integ,
                "available": False,
                "enabled": False,
                "missing_product": missing,
                "missing_product_name": PRODUCTS_CATALOG.get(ProductID(missing), {}).get("name", missing)
            })
    
    return {
        "integrations": integrations,
        "linked_products": linked_ids
    }


@router.post("/integrations/toggle")
async def toggle_integration(
    request: IntegrationToggle,
    current_user: dict = Depends(get_current_user)
):
    """Enable or disable an integration between two products"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = str(current_user.get("_id", current_user.get("id", "")))
    business_id = current_user.get("business_id")
    
    # Verify both products are linked
    linked = await db.ecosystem_linked_products.find({
        "$or": [{"user_id": user_id}, {"business_id": str(business_id)}],
        "product_id": {"$in": [request.source_product, request.target_product]},
        "status": {"$in": ["active", "trial"]}
    }).to_list(2)
    
    if len(linked) < 2:
        raise HTTPException(status_code=400, detail="Both products must be linked to enable integration")
    
    # Update or create integration setting
    await db.ecosystem_integrations.update_one(
        {
            "$or": [{"user_id": user_id}, {"business_id": str(business_id)}],
            "source": request.source_product,
            "target": request.target_product
        },
        {
            "$set": {
                "user_id": user_id,
                "business_id": str(business_id) if business_id else None,
                "source": request.source_product,
                "target": request.target_product,
                "enabled": request.enabled,
                "updated_at": datetime.utcnow()
            },
            "$setOnInsert": {
                "created_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    action = "enabled" if request.enabled else "disabled"
    return {
        "success": True,
        "message": f"Integration {action}",
        "source": request.source_product,
        "target": request.target_product,
        "enabled": request.enabled
    }


# ============== ECOSYSTEM DASHBOARD ==============

@router.get("/dashboard")
async def get_ecosystem_dashboard(current_user: dict = Depends(get_current_user)):
    """Get unified dashboard data across all linked products"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    user_id = str(current_user.get("_id", current_user.get("id", "")))
    business_id = current_user.get("business_id")
    
    # Get linked products
    linked = await db.ecosystem_linked_products.find({
        "$or": [{"user_id": user_id}, {"business_id": str(business_id)}],
        "status": {"$in": ["active", "trial"]}
    }).to_list(20)
    
    linked_ids = [l["product_id"] for l in linked]
    
    dashboard = {
        "products": [],
        "quick_stats": {},
        "recent_activity": [],
        "integrations_active": 0
    }
    
    # Collect stats from each linked product
    for product_id in linked_ids:
        product_info = PRODUCTS_CATALOG.get(ProductID(product_id), {})
        product_stats = await _get_product_stats(product_id, user_id, business_id)
        
        dashboard["products"].append({
            "id": product_id,
            "name": product_info.get("name", product_id),
            "icon": product_info.get("icon"),
            "color": product_info.get("color"),
            "stats": product_stats
        })
    
    # Count active integrations
    integrations = await db.ecosystem_integrations.count_documents({
        "$or": [{"user_id": user_id}, {"business_id": str(business_id)}],
        "enabled": True
    })
    dashboard["integrations_active"] = integrations
    
    # Recent activity across products
    activity = await db.ecosystem_activity_log.find({
        "$or": [{"user_id": user_id}, {"business_id": str(business_id)}]
    }).sort("timestamp", -1).limit(10).to_list(10)
    
    dashboard["recent_activity"] = [{
        "action": a.get("action"),
        "product_id": a.get("product_id"),
        "details": a.get("details", {}),
        "timestamp": a.get("timestamp", datetime.utcnow()).isoformat() if isinstance(a.get("timestamp"), datetime) else str(a.get("timestamp", ""))
    } for a in activity]
    
    return dashboard


# ============== HELPER FUNCTIONS ==============

async def _initialize_product_data(product_id: str, user_id: str, business_id: str):
    """Initialize default data/settings for a newly linked product"""
    if db is None:
        return
    
    if product_id == "kwikpay":
        # Check if merchant profile exists
        existing = await db.kwikpay_merchants.find_one({
            "$or": [{"owner_user_id": user_id}, {"business_id": str(business_id)}]
        })
        if not existing:
            # Will be created via onboarding wizard
            pass
    
    elif product_id == "inventory":
        # Initialize default warehouse
        await db.warehouses.update_one(
            {"business_id": str(business_id), "is_default": True},
            {
                "$setOnInsert": {
                    "name": "Main Warehouse",
                    "business_id": str(business_id),
                    "is_default": True,
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )
    
    elif product_id == "unitxt":
        # Initialize SMS credits
        await db.sms_credits.update_one(
            {"business_id": str(business_id)},
            {
                "$setOnInsert": {
                    "business_id": str(business_id),
                    "balance": 10,  # Free trial credits
                    "used": 0,
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )


async def _get_product_stats(product_id: str, user_id: str, business_id: str) -> Dict[str, Any]:
    """Get quick stats for a product"""
    if db is None:
        return {}
    
    stats = {}
    
    if product_id == "kwikpay":
        # Get payment stats
        total_transactions = await db.transactions.count_documents({
            "business_id": str(business_id)
        })
        balance = await db.merchant_balances.find_one({"business_id": str(business_id)})
        stats = {
            "transactions": total_transactions,
            "balance": balance.get("available", 0) if balance else 0
        }
    
    elif product_id == "retailpro":
        orders = await db.orders.count_documents({"business_id": str(business_id)})
        products = await db.products.count_documents({"business_id": str(business_id)})
        stats = {
            "orders": orders,
            "products": products
        }
    
    elif product_id == "invoicing":
        invoices = await db.invoices.count_documents({"business_id": str(business_id)})
        paid = await db.invoices.count_documents({
            "business_id": str(business_id),
            "status": "paid"
        })
        stats = {
            "invoices": invoices,
            "paid": paid
        }
    
    elif product_id == "inventory":
        products = await db.products.count_documents({"business_id": str(business_id)})
        low_stock = await db.products.count_documents({
            "business_id": str(business_id),
            "quantity": {"$lt": 20, "$gt": 0}
        })
        stats = {
            "products": products,
            "low_stock": low_stock
        }
    
    elif product_id == "unitxt":
        credits = await db.sms_credits.find_one({"business_id": str(business_id)})
        messages = await db.sms_messages.count_documents({"business_id": str(business_id)})
        stats = {
            "credits": credits.get("balance", 0) if credits else 0,
            "messages_sent": messages
        }
    
    return stats
