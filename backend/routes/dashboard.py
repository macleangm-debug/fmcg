"""
Dashboard Routes
Handles dashboard statistics and summary endpoints
"""
import os
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import jwt
from collections import defaultdict

# Setup logging
logger = logging.getLogger(__name__)

# Router
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# Security
security = HTTPBearer()

# Database connection
db = None

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'retail-management-secret-key-2025')
JWT_ALGORITHM = "HS256"


def set_dependencies(database):
    """Set the database connection for this router"""
    global db
    db = database
    logger.info("Dashboard routes dependencies set")


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


# ============== ENDPOINTS ==============

@router.get("/stats")
async def get_dashboard_stats(
    period: str = "today",
    current_user: dict = Depends(get_current_user)
):
    """Get dashboard statistics"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    # Determine date range
    now = datetime.utcnow()
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    elif period == "year":
        start_date = now - timedelta(days=365)
    else:
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Sales stats
    sales_query = {**query, "created_at": {"$gte": start_date}}
    orders = await db.orders.find(sales_query).to_list(None)
    
    total_sales = sum(order.get("total", 0) for order in orders)
    total_orders = len(orders)
    avg_order_value = total_sales / total_orders if total_orders > 0 else 0
    
    # Customer stats
    customers_query = {**query}
    total_customers = await db.customers.count_documents(customers_query)
    new_customers_query = {**query, "created_at": {"$gte": start_date}}
    new_customers = await db.customers.count_documents(new_customers_query)
    
    # Inventory stats
    inventory_items = await db.inventory_items.find(query).to_list(None)
    low_stock_items = 0
    out_of_stock_items = 0
    total_stock_value = 0
    
    for item in inventory_items:
        qty = item.get("quantity", 0)
        min_qty = item.get("min_quantity", 10)
        cost = item.get("cost_price", 0)
        
        total_stock_value += qty * cost
        if qty == 0:
            out_of_stock_items += 1
        elif qty <= min_qty:
            low_stock_items += 1
    
    # Products stats
    products_count = await db.products.count_documents(query)
    
    # Previous period for comparison
    if period == "today":
        prev_start = start_date - timedelta(days=1)
        prev_end = start_date
    elif period == "week":
        prev_start = start_date - timedelta(days=7)
        prev_end = start_date
    elif period == "month":
        prev_start = start_date - timedelta(days=30)
        prev_end = start_date
    else:
        prev_start = start_date - timedelta(days=1)
        prev_end = start_date
    
    prev_sales_query = {**query, "created_at": {"$gte": prev_start, "$lt": prev_end}}
    prev_orders = await db.orders.find(prev_sales_query).to_list(None)
    prev_total_sales = sum(order.get("total", 0) for order in prev_orders)
    
    # Calculate growth
    sales_growth = ((total_sales - prev_total_sales) / prev_total_sales * 100) if prev_total_sales > 0 else 0
    
    return {
        "period": period,
        "sales": {
            "total": total_sales,
            "orders_count": total_orders,
            "average_order": avg_order_value,
            "growth_percent": round(sales_growth, 1)
        },
        "customers": {
            "total": total_customers,
            "new": new_customers
        },
        "inventory": {
            "total_items": len(inventory_items),
            "low_stock": low_stock_items,
            "out_of_stock": out_of_stock_items,
            "stock_value": total_stock_value
        },
        "products": {
            "total": products_count
        }
    }


@router.get("/recent-activity")
async def get_recent_activity(
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get recent activity across all modules"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    activities = []
    
    # Recent orders
    orders = await db.orders.find(query).sort("created_at", -1).limit(limit).to_list(None)
    for order in orders:
        activities.append({
            "type": "order",
            "action": "New order",
            "description": f"Order #{order.get('order_number', str(order['_id'])[:8])} - {order.get('customer_name', 'Customer')}",
            "amount": order.get("total", 0),
            "timestamp": order.get("created_at", datetime.utcnow()).isoformat()
        })
    
    # Recent inventory movements
    movements = await db.inventory_movements.find(query).sort("created_at", -1).limit(limit).to_list(None)
    for mov in movements:
        action_map = {
            "in": "Stock received",
            "out": "Stock sold",
            "adjustment": "Stock adjusted",
            "transfer": "Stock transferred"
        }
        activities.append({
            "type": "inventory",
            "action": action_map.get(mov.get("movement_type"), "Stock movement"),
            "description": f"{mov.get('item_name', 'Item')} - {mov.get('quantity', 0)} units",
            "timestamp": mov.get("created_at", datetime.utcnow()).isoformat()
        })
    
    # Recent invoices
    invoices = await db.invoices.find(query).sort("created_at", -1).limit(limit).to_list(None)
    for inv in invoices:
        activities.append({
            "type": "invoice",
            "action": f"Invoice {inv.get('status', 'created')}",
            "description": f"Invoice #{inv.get('invoice_number', str(inv['_id'])[:8])} - {inv.get('client_name', 'Client')}",
            "amount": inv.get("total", 0),
            "timestamp": inv.get("created_at", datetime.utcnow()).isoformat()
        })
    
    # Sort all activities by timestamp
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return activities[:limit]


@router.get("/sales-chart")
async def get_sales_chart_data(
    period: str = "7d",
    current_user: dict = Depends(get_current_user)
):
    """Get sales chart data for dashboard"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    # Determine date range
    now = datetime.utcnow()
    if period == "7d":
        start_date = now - timedelta(days=7)
        date_format = "%Y-%m-%d"
    elif period == "30d":
        start_date = now - timedelta(days=30)
        date_format = "%Y-%m-%d"
    elif period == "90d":
        start_date = now - timedelta(days=90)
        date_format = "%Y-%m-%d"
    elif period == "12m":
        start_date = now - timedelta(days=365)
        date_format = "%Y-%m"
    else:
        start_date = now - timedelta(days=7)
        date_format = "%Y-%m-%d"
    
    # Get orders in the period
    orders_query = {**query, "created_at": {"$gte": start_date}}
    orders = await db.orders.find(orders_query).to_list(None)
    
    # Group by date
    daily_data = defaultdict(lambda: {"sales": 0, "orders": 0})
    
    for order in orders:
        if order.get("created_at"):
            date_key = order["created_at"].strftime(date_format)
            daily_data[date_key]["sales"] += order.get("total", 0)
            daily_data[date_key]["orders"] += 1
    
    # Fill in missing dates
    chart_data = []
    current = start_date
    while current <= now:
        date_key = current.strftime(date_format)
        chart_data.append({
            "date": date_key,
            "sales": daily_data[date_key]["sales"],
            "orders": daily_data[date_key]["orders"]
        })
        current += timedelta(days=1)
    
    return {
        "period": period,
        "data": chart_data
    }


@router.get("/top-products")
async def get_top_products(
    limit: int = 5,
    period: str = "30d",
    current_user: dict = Depends(get_current_user)
):
    """Get top selling products"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    # Determine date range
    now = datetime.utcnow()
    if period == "7d":
        start_date = now - timedelta(days=7)
    elif period == "30d":
        start_date = now - timedelta(days=30)
    else:
        start_date = now - timedelta(days=30)
    
    # Get orders in the period
    orders_query = {**query, "created_at": {"$gte": start_date}}
    orders = await db.orders.find(orders_query).to_list(None)
    
    # Aggregate product sales
    product_sales = defaultdict(lambda: {"quantity": 0, "revenue": 0})
    
    for order in orders:
        for item in order.get("items", []):
            product_id = item.get("product_id", item.get("name", "Unknown"))
            product_sales[product_id]["name"] = item.get("name", "Unknown Product")
            product_sales[product_id]["quantity"] += item.get("quantity", 1)
            product_sales[product_id]["revenue"] += item.get("total", item.get("quantity", 1) * item.get("price", 0))
    
    # Sort by revenue
    top_products = sorted(
        [{"product_id": k, **v} for k, v in product_sales.items()],
        key=lambda x: x["revenue"],
        reverse=True
    )[:limit]
    
    return {
        "period": period,
        "products": top_products
    }


@router.get("/notifications")
async def get_dashboard_notifications(
    current_user: dict = Depends(get_current_user)
):
    """Get dashboard notifications (alerts, reminders)"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    notifications = []
    
    # Low stock alerts
    low_stock_items = await db.inventory_items.find({
        **query,
        "$expr": {"$lte": ["$quantity", "$min_quantity"]}
    }).to_list(None)
    
    for item in low_stock_items[:5]:
        notifications.append({
            "type": "warning",
            "category": "inventory",
            "title": "Low Stock Alert",
            "message": f"{item.get('name')} is running low ({item.get('quantity')} remaining)",
            "action_url": "/inventory"
        })
    
    # Unpaid invoices
    unpaid_invoices = await db.invoices.find({
        **query,
        "status": {"$in": ["sent", "overdue"]},
        "due_date": {"$lt": datetime.utcnow()}
    }).to_list(None)
    
    for inv in unpaid_invoices[:5]:
        notifications.append({
            "type": "alert",
            "category": "invoices",
            "title": "Overdue Invoice",
            "message": f"Invoice #{inv.get('invoice_number')} for {inv.get('client_name')} is overdue",
            "action_url": f"/invoicing/invoices/{str(inv['_id'])}"
        })
    
    # Trial expiring soon
    user_subscriptions = await db.app_subscriptions.find_one({"user_id": current_user["id"]})
    if user_subscriptions:
        for sub in user_subscriptions.get("apps", []):
            if sub.get("plan") == "free_trial" and sub.get("expires_at"):
                days_left = (sub["expires_at"] - datetime.utcnow()).days
                if 0 < days_left <= 7:
                    notifications.append({
                        "type": "info",
                        "category": "subscription",
                        "title": "Trial Expiring Soon",
                        "message": f"Your {sub.get('app_id')} trial expires in {days_left} days",
                        "action_url": "/settings/billing"
                    })
    
    return notifications
