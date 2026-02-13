from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
from bson import ObjectId
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'retail_db')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'retail-management-secret-key-2025')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Retail Management API - Multi-Tenant")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== ENUMS ==============
class UserRole(str, Enum):
    SUPERADMIN = "superadmin"
    ADMIN = "admin"
    MANAGER = "manager"
    SALES_STAFF = "sales_staff"
    FRONT_DESK = "front_desk"
    FINANCE = "finance"

class BusinessStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    TRIAL = "trial"

class IndustryType(str, Enum):
    RETAIL = "retail"
    RESTAURANT = "restaurant"
    GROCERY = "grocery"
    PHARMACY = "pharmacy"
    ELECTRONICS = "electronics"
    FASHION = "fashion"
    HARDWARE = "hardware"
    OTHER = "other"

class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"
    MOBILE_MONEY = "mobile_money"
    CREDIT = "credit"

class OrderStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

class PromotionType(str, Enum):
    PERCENTAGE_DISCOUNT = "percentage_discount"
    FIXED_DISCOUNT = "fixed_discount"
    SPEND_X_GET_Y = "spend_x_get_y"
    BUY_X_GET_Y_FREE = "buy_x_get_y_free"

class ExpenseCategory(str, Enum):
    RENT = "rent"
    UTILITIES = "utilities"
    SALARIES = "salaries"
    SUPPLIES = "supplies"
    MARKETING = "marketing"
    MAINTENANCE = "maintenance"
    TRANSPORT = "transport"
    INVENTORY = "inventory"
    OTHER = "other"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    GRACE_PERIOD = "grace_period"
    SUSPENDED = "suspended"

# ============== BUSINESS/TENANT MODELS ==============
class BusinessCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str
    country: str
    city: Optional[str] = None
    address: Optional[str] = None
    industry: IndustryType = IndustryType.RETAIL

class BusinessResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    country: str
    city: Optional[str] = None
    address: Optional[str] = None
    industry: IndustryType
    status: BusinessStatus
    created_at: datetime
    last_active: Optional[datetime] = None
    total_users: int = 0
    total_orders: int = 0
    total_revenue: float = 0.0

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[IndustryType] = None
    status: Optional[BusinessStatus] = None

# ============== USER MODELS ==============
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.SALES_STAFF
    phone: Optional[str] = None
    is_active: bool = True

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole = UserRole.SALES_STAFF
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime
    business_id: Optional[str] = None
    business_name: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ============== SUPERADMIN ANALYTICS MODELS ==============
class SystemStats(BaseModel):
    total_businesses: int
    active_businesses: int
    total_users: int
    total_orders: int
    total_revenue: float
    new_businesses_today: int
    new_businesses_week: int
    new_businesses_month: int

class BusinessAnalytics(BaseModel):
    business_id: str
    business_name: str
    total_users: int
    total_orders: int
    total_revenue: float
    last_active: Optional[datetime]
    status: BusinessStatus

class UsageLog(BaseModel):
    id: str
    business_id: Optional[str]
    user_id: Optional[str]
    endpoint: str
    method: str
    status_code: int
    response_time_ms: float
    timestamp: datetime

# ============== EXISTING MODELS (with business_id) ==============
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    image: Optional[str] = None
    is_active: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: str
    created_at: datetime
    business_id: Optional[str] = None

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: str
    price: float
    cost_price: Optional[float] = None
    sku: str
    barcode: Optional[str] = None
    stock_quantity: int = 0
    low_stock_threshold: int = 10
    tax_rate: float = 0.0
    image: Optional[str] = None
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    price: Optional[float] = None
    cost_price: Optional[float] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    stock_quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    tax_rate: Optional[float] = None
    image: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    id: str
    created_at: datetime
    category_name: Optional[str] = None
    business_id: Optional[str] = None

class CustomerBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    birthday: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    birthday: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: str
    total_purchases: float = 0.0
    total_orders: int = 0
    created_at: datetime
    business_id: Optional[str] = None

# Order Models
class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    discount: float = 0.0
    tax_amount: float = 0.0
    subtotal: float

class PaymentInfo(BaseModel):
    method: PaymentMethod
    amount: float
    reference: Optional[str] = None

class OrderCreate(BaseModel):
    customer_id: Optional[str] = None
    items: List[OrderItem]
    payments: List[PaymentInfo]
    notes: Optional[str] = None

class OrderResponse(BaseModel):
    id: str
    order_number: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    items: List[OrderItem]
    payments: List[PaymentInfo]
    subtotal: float
    tax_total: float
    discount_total: float
    total: float
    amount_paid: float
    amount_due: float
    status: OrderStatus
    notes: Optional[str] = None
    created_at: datetime
    created_by: str
    created_by_name: str
    business_id: Optional[str] = None

# Expense Models
class ExpenseBase(BaseModel):
    category: ExpenseCategory
    description: str
    amount: float
    vendor: Optional[str] = None
    receipt_number: Optional[str] = None
    date: str
    notes: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: str
    created_at: datetime
    created_by: str
    created_by_name: str
    business_id: Optional[str] = None

# Promotion Models
class PromotionBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: PromotionType
    value: float
    min_purchase: float = 0.0
    max_discount: Optional[float] = None
    applicable_products: List[str] = []
    applicable_categories: List[str] = []
    start_date: datetime
    end_date: datetime
    is_active: bool = True
    usage_limit: Optional[int] = None
    usage_count: int = 0

class PromotionCreate(PromotionBase):
    pass

class PromotionResponse(PromotionBase):
    id: str
    created_at: datetime
    business_id: Optional[str] = None

# Business Details Model
class BusinessDetailsBase(BaseModel):
    name: str
    logo_url: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    tax_id: Optional[str] = None
    currency: str = "USD"
    country: Optional[str] = None
    city: Optional[str] = None
    country_code: str = "+255"

class BusinessDetailsResponse(BusinessDetailsBase):
    id: str

# ============== HELPER FUNCTIONS ==============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str, business_id: str = None) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "business_id": business_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def normalize_phone(phone: str) -> str:
    """Normalize phone number for comparison"""
    digits = ''.join(filter(str.isdigit, phone))
    if len(digits) >= 9:
        return digits[-9:]
    return digits

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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

async def get_superadmin_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return current_user

async def log_api_call(request: Request, business_id: str = None, user_id: str = None, 
                       status_code: int = 200, response_time_ms: float = 0):
    """Log API calls for analytics"""
    try:
        log_entry = {
            "business_id": business_id,
            "user_id": user_id,
            "endpoint": str(request.url.path),
            "method": request.method,
            "status_code": status_code,
            "response_time_ms": response_time_ms,
            "timestamp": datetime.utcnow(),
            "ip_address": request.client.host if request.client else None
        }
        await db.api_logs.insert_one(log_entry)
    except Exception as e:
        logger.error(f"Failed to log API call: {e}")

# ============== BUSINESS REGISTRATION ENDPOINTS ==============
@api_router.post("/register", response_model=TokenResponse)
async def register_business(business: BusinessCreate):
    """Register a new business and create admin user"""
    # Check if email already exists
    existing = await db.users.find_one({"email": business.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate phone
    phone_digits = ''.join(filter(str.isdigit, business.phone))
    if len(phone_digits) < 9:
        raise HTTPException(status_code=400, detail="Phone number must have at least 9 digits")
    
    # Create business record
    business_doc = {
        "name": business.name,
        "email": business.email,
        "phone": business.phone,
        "country": business.country,
        "city": business.city,
        "address": business.address,
        "industry": business.industry.value,
        "status": BusinessStatus.TRIAL.value,
        "created_at": datetime.utcnow(),
        "last_active": datetime.utcnow(),
        "trial_ends_at": datetime.utcnow() + timedelta(days=14)
    }
    
    business_result = await db.businesses.insert_one(business_doc)
    business_id = str(business_result.inserted_id)
    
    # Create admin user for this business
    user_doc = {
        "email": business.email,
        "password_hash": hash_password(business.password),
        "name": business.name,
        "role": UserRole.ADMIN.value,
        "phone": business.phone,
        "is_active": True,
        "business_id": business_id,
        "created_at": datetime.utcnow()
    }
    
    user_result = await db.users.insert_one(user_doc)
    user_id = str(user_result.inserted_id)
    
    # Create default business details
    await db.business_details.insert_one({
        "business_id": business_id,
        "name": business.name,
        "currency": "USD",
        "country": business.country,
        "city": business.city,
        "country_code": "+255",
        "created_at": datetime.utcnow()
    })
    
    # Generate token
    token = create_token(user_id, business.email, UserRole.ADMIN.value, business_id)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=business.email,
            name=business.name,
            role=UserRole.ADMIN,
            phone=business.phone,
            is_active=True,
            created_at=user_doc["created_at"],
            business_id=business_id,
            business_name=business.name
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login for all users including superadmin"""
    user = await db.users.find_one({"email": credentials.email})
    
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    business_id = user.get("business_id")
    business_name = None
    
    # Get business name if user belongs to a business
    if business_id:
        business = await db.businesses.find_one({"_id": ObjectId(business_id)})
        if business:
            business_name = business.get("name")
            # Update last active
            await db.businesses.update_one(
                {"_id": ObjectId(business_id)},
                {"$set": {"last_active": datetime.utcnow()}}
            )
    
    token = create_token(str(user["_id"]), user["email"], user["role"], business_id)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            name=user["name"],
            role=user["role"],
            phone=user.get("phone"),
            is_active=user.get("is_active", True),
            created_at=user.get("created_at", datetime.utcnow()),
            business_id=business_id,
            business_name=business_name
        )
    )

# ============== SUPERADMIN ENDPOINTS ==============
@api_router.get("/superadmin/stats", response_model=SystemStats)
async def get_system_stats(current_user: dict = Depends(get_superadmin_user)):
    """Get overall system statistics"""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)
    
    total_businesses = await db.businesses.count_documents({})
    active_businesses = await db.businesses.count_documents({"status": "active"})
    total_users = await db.users.count_documents({"role": {"$ne": "superadmin"}})
    
    # Aggregate orders and revenue
    pipeline = [
        {"$group": {
            "_id": None,
            "total_orders": {"$sum": 1},
            "total_revenue": {"$sum": "$total"}
        }}
    ]
    order_stats = await db.orders.aggregate(pipeline).to_list(1)
    total_orders = order_stats[0]["total_orders"] if order_stats else 0
    total_revenue = order_stats[0]["total_revenue"] if order_stats else 0
    
    new_today = await db.businesses.count_documents({"created_at": {"$gte": today_start}})
    new_week = await db.businesses.count_documents({"created_at": {"$gte": week_start}})
    new_month = await db.businesses.count_documents({"created_at": {"$gte": month_start}})
    
    return SystemStats(
        total_businesses=total_businesses,
        active_businesses=active_businesses,
        total_users=total_users,
        total_orders=total_orders,
        total_revenue=total_revenue,
        new_businesses_today=new_today,
        new_businesses_week=new_week,
        new_businesses_month=new_month
    )

@api_router.get("/superadmin/businesses", response_model=List[BusinessResponse])
async def get_all_businesses(
    skip: int = 0, 
    limit: int = 50,
    status: Optional[str] = None,
    current_user: dict = Depends(get_superadmin_user)
):
    """Get all registered businesses"""
    query = {}
    if status:
        query["status"] = status
    
    businesses = await db.businesses.find(query).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for b in businesses:
        business_id = str(b["_id"])
        
        # Get user count
        user_count = await db.users.count_documents({"business_id": business_id})
        
        # Get order stats
        order_pipeline = [
            {"$match": {"business_id": business_id}},
            {"$group": {
                "_id": None,
                "total_orders": {"$sum": 1},
                "total_revenue": {"$sum": "$total"}
            }}
        ]
        order_stats = await db.orders.aggregate(order_pipeline).to_list(1)
        
        result.append(BusinessResponse(
            id=business_id,
            name=b["name"],
            email=b["email"],
            phone=b["phone"],
            country=b["country"],
            city=b.get("city"),
            address=b.get("address"),
            industry=b.get("industry", "retail"),
            status=b.get("status", "active"),
            created_at=b.get("created_at", datetime.utcnow()),
            last_active=b.get("last_active"),
            total_users=user_count,
            total_orders=order_stats[0]["total_orders"] if order_stats else 0,
            total_revenue=order_stats[0]["total_revenue"] if order_stats else 0
        ))
    
    return result

@api_router.put("/superadmin/businesses/{business_id}")
async def update_business_status(
    business_id: str,
    update: BusinessUpdate,
    current_user: dict = Depends(get_superadmin_user)
):
    """Update business details or status"""
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.businesses.update_one(
        {"_id": ObjectId(business_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Business not found")
    
    return {"message": "Business updated successfully"}

@api_router.get("/superadmin/analytics/usage")
async def get_usage_analytics(
    days: int = 30,
    current_user: dict = Depends(get_superadmin_user)
):
    """Get API usage analytics"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Daily API calls
    pipeline = [
        {"$match": {"timestamp": {"$gte": start_date}}},
        {"$group": {
            "_id": {
                "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                "endpoint": "$endpoint"
            },
            "count": {"$sum": 1},
            "avg_response_time": {"$avg": "$response_time_ms"}
        }},
        {"$sort": {"_id.date": 1}}
    ]
    
    usage_data = await db.api_logs.aggregate(pipeline).to_list(None)
    
    # Most active businesses
    business_pipeline = [
        {"$match": {"timestamp": {"$gte": start_date}, "business_id": {"$ne": None}}},
        {"$group": {
            "_id": "$business_id",
            "api_calls": {"$sum": 1}
        }},
        {"$sort": {"api_calls": -1}},
        {"$limit": 10}
    ]
    
    active_businesses = await db.api_logs.aggregate(business_pipeline).to_list(10)
    
    # Error rate
    total_calls = await db.api_logs.count_documents({"timestamp": {"$gte": start_date}})
    error_calls = await db.api_logs.count_documents({
        "timestamp": {"$gte": start_date},
        "status_code": {"$gte": 400}
    })
    
    return {
        "daily_usage": usage_data,
        "most_active_businesses": active_businesses,
        "total_api_calls": total_calls,
        "error_calls": error_calls,
        "error_rate": (error_calls / total_calls * 100) if total_calls > 0 else 0
    }

@api_router.get("/superadmin/analytics/revenue")
async def get_revenue_analytics(
    days: int = 30,
    current_user: dict = Depends(get_superadmin_user)
):
    """Get revenue analytics across all businesses"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Daily revenue
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}, "status": "completed"}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "revenue": {"$sum": "$total"},
            "orders": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    daily_revenue = await db.orders.aggregate(pipeline).to_list(None)
    
    # Revenue by business
    business_pipeline = [
        {"$match": {"created_at": {"$gte": start_date}, "status": "completed"}},
        {"$group": {
            "_id": "$business_id",
            "revenue": {"$sum": "$total"},
            "orders": {"$sum": 1}
        }},
        {"$sort": {"revenue": -1}},
        {"$limit": 10}
    ]
    
    revenue_by_business = await db.orders.aggregate(business_pipeline).to_list(10)
    
    # Add business names
    for item in revenue_by_business:
        if item["_id"]:
            business = await db.businesses.find_one({"_id": ObjectId(item["_id"])})
            item["business_name"] = business["name"] if business else "Unknown"
    
    return {
        "daily_revenue": daily_revenue,
        "top_businesses_by_revenue": revenue_by_business
    }

# ============== MULTI-TENANT AWARE ENDPOINTS ==============
# These endpoints filter data by business_id

@api_router.get("/business", response_model=BusinessDetailsResponse)
async def get_business_details(current_user: dict = Depends(get_current_user)):
    """Get business details for current user's business"""
    business_id = current_user.get("business_id")
    
    if current_user["role"] == "superadmin":
        # Superadmin can see default
        details = await db.business_details.find_one({}) or {}
    else:
        details = await db.business_details.find_one({"business_id": business_id}) or {}
    
    return BusinessDetailsResponse(
        id=str(details.get("_id", "")),
        name=details.get("name", ""),
        logo_url=details.get("logo_url"),
        address=details.get("address"),
        phone=details.get("phone"),
        email=details.get("email"),
        website=details.get("website"),
        tax_id=details.get("tax_id"),
        currency=details.get("currency", "USD"),
        country=details.get("country"),
        city=details.get("city"),
        country_code=details.get("country_code", "+255")
    )

@api_router.put("/business")
async def update_business_details(details: BusinessDetailsBase, current_user: dict = Depends(get_current_user)):
    """Update business details"""
    if current_user["role"] not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    business_id = current_user.get("business_id")
    
    update_data = details.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    if business_id:
        result = await db.business_details.update_one(
            {"business_id": business_id},
            {"$set": update_data},
            upsert=True
        )
    else:
        result = await db.business_details.update_one(
            {},
            {"$set": update_data},
            upsert=True
        )
    
    return {"message": "Business details updated successfully"}

# Products - Multi-tenant
@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    business_id = current_user.get("business_id")
    query = {}
    
    if business_id and current_user["role"] != "superadmin":
        query["business_id"] = business_id
    
    if category_id:
        query["category_id"] = category_id
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}}
        ]
    
    products = await db.products.find(query).to_list(None)
    
    result = []
    for p in products:
        category_name = None
        if p.get("category_id"):
            category = await db.categories.find_one({"_id": ObjectId(p["category_id"])})
            category_name = category["name"] if category else None
        
        result.append(ProductResponse(
            id=str(p["_id"]),
            name=p["name"],
            description=p.get("description"),
            category_id=p.get("category_id", ""),
            category_name=category_name,
            price=p["price"],
            cost_price=p.get("cost_price"),
            sku=p.get("sku", ""),
            barcode=p.get("barcode"),
            stock_quantity=p.get("stock_quantity", 0),
            low_stock_threshold=p.get("low_stock_threshold", 10),
            tax_rate=p.get("tax_rate", 0),
            image=p.get("image"),
            is_active=p.get("is_active", True),
            created_at=p.get("created_at", datetime.utcnow()),
            business_id=p.get("business_id")
        ))
    
    return result

@api_router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    business_id = current_user.get("business_id")
    
    prod_dict = product.dict()
    prod_dict["business_id"] = business_id
    prod_dict["created_at"] = datetime.utcnow()
    
    result = await db.products.insert_one(prod_dict)
    
    category_name = None
    if product.category_id:
        category = await db.categories.find_one({"_id": ObjectId(product.category_id)})
        category_name = category["name"] if category else None
    
    return ProductResponse(
        id=str(result.inserted_id),
        category_name=category_name,
        created_at=prod_dict["created_at"],
        business_id=business_id,
        **product.dict()
    )

# Categories - Multi-tenant
@api_router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(current_user: dict = Depends(get_current_user)):
    business_id = current_user.get("business_id")
    query = {}
    
    if business_id and current_user["role"] != "superadmin":
        query["business_id"] = business_id
    
    categories = await db.categories.find(query).to_list(None)
    return [
        CategoryResponse(
            id=str(c["_id"]),
            name=c["name"],
            description=c.get("description"),
            image=c.get("image"),
            is_active=c.get("is_active", True),
            created_at=c.get("created_at", datetime.utcnow()),
            business_id=c.get("business_id")
        )
        for c in categories
    ]

@api_router.post("/categories", response_model=CategoryResponse)
async def create_category(category: CategoryCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    business_id = current_user.get("business_id")
    
    cat_dict = category.dict()
    cat_dict["business_id"] = business_id
    cat_dict["created_at"] = datetime.utcnow()
    
    result = await db.categories.insert_one(cat_dict)
    
    return CategoryResponse(
        id=str(result.inserted_id),
        created_at=cat_dict["created_at"],
        business_id=business_id,
        **category.dict()
    )

# Customers - Multi-tenant
@api_router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    business_id = current_user.get("business_id")
    query = {}
    
    if business_id and current_user["role"] != "superadmin":
        query["business_id"] = business_id
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    customers = await db.customers.find(query).to_list(None)
    return [
        CustomerResponse(
            id=str(c["_id"]),
            name=c["name"],
            phone=c["phone"],
            email=c.get("email"),
            address=c.get("address"),
            birthday=c.get("birthday"),
            total_purchases=c.get("total_purchases", 0),
            total_orders=c.get("total_orders", 0),
            created_at=c.get("created_at", datetime.utcnow()),
            business_id=c.get("business_id")
        )
        for c in customers
    ]

@api_router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, current_user: dict = Depends(get_current_user)):
    business_id = current_user.get("business_id")
    
    # Validate phone
    phone_digits = ''.join(filter(str.isdigit, customer.phone))
    if len(phone_digits) < 9:
        raise HTTPException(status_code=400, detail="Phone number must have at least 9 digits")
    
    # Check uniqueness within business
    normalized_phone = normalize_phone(customer.phone)
    query = {"business_id": business_id} if business_id else {}
    existing_customers = await db.customers.find(query).to_list(None)
    
    for existing in existing_customers:
        if normalize_phone(existing.get("phone", "")) == normalized_phone:
            raise HTTPException(status_code=400, detail="Customer with this phone number already exists")
    
    cust_dict = customer.dict()
    cust_dict["business_id"] = business_id
    cust_dict["created_at"] = datetime.utcnow()
    cust_dict["total_purchases"] = 0.0
    cust_dict["total_orders"] = 0
    
    result = await db.customers.insert_one(cust_dict)
    
    return CustomerResponse(
        id=str(result.inserted_id),
        total_purchases=0.0,
        total_orders=0,
        created_at=cust_dict["created_at"],
        business_id=business_id,
        **customer.dict()
    )

# Orders - Multi-tenant
@api_router.get("/orders", response_model=List[OrderResponse])
async def get_orders(
    limit: int = 50,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    business_id = current_user.get("business_id")
    query = {}
    
    if business_id and current_user["role"] != "superadmin":
        query["business_id"] = business_id
    
    if status:
        query["status"] = status
    if date_from:
        query["created_at"] = {"$gte": datetime.fromisoformat(date_from.replace('Z', '+00:00'))}
    if date_to:
        if "created_at" not in query:
            query["created_at"] = {}
        query["created_at"]["$lte"] = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
    
    orders = await db.orders.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    result = []
    for o in orders:
        result.append(OrderResponse(
            id=str(o["_id"]),
            order_number=o["order_number"],
            customer_id=o.get("customer_id"),
            customer_name=o.get("customer_name"),
            items=o["items"],
            payments=o["payments"],
            subtotal=o["subtotal"],
            tax_total=o["tax_total"],
            discount_total=o.get("discount_total", 0),
            total=o["total"],
            amount_paid=o["amount_paid"],
            amount_due=o.get("amount_due", 0),
            status=o["status"],
            notes=o.get("notes"),
            created_at=o["created_at"],
            created_by=o["created_by"],
            created_by_name=o.get("created_by_name", ""),
            business_id=o.get("business_id")
        ))
    
    return result

@api_router.post("/orders", response_model=OrderResponse)
async def create_order(order: OrderCreate, current_user: dict = Depends(get_current_user)):
    business_id = current_user.get("business_id")
    
    # Generate order number
    count = await db.orders.count_documents({})
    order_number = f"ORD-{str(count + 1).zfill(6)}"
    
    # Calculate totals
    subtotal = sum(item.subtotal for item in order.items)
    tax_total = sum(item.tax_amount for item in order.items)
    discount_total = sum(item.discount for item in order.items)
    total = subtotal + tax_total - discount_total
    amount_paid = sum(p.amount for p in order.payments)
    
    # Get customer name
    customer_name = None
    if order.customer_id:
        customer = await db.customers.find_one({"_id": ObjectId(order.customer_id)})
        if customer:
            customer_name = customer["name"]
    
    order_doc = {
        "order_number": order_number,
        "business_id": business_id,
        "customer_id": order.customer_id,
        "customer_name": customer_name,
        "items": [item.dict() for item in order.items],
        "payments": [p.dict() for p in order.payments],
        "subtotal": subtotal,
        "tax_total": tax_total,
        "discount_total": discount_total,
        "total": total,
        "amount_paid": amount_paid,
        "amount_due": max(0, total - amount_paid),
        "status": OrderStatus.COMPLETED.value if amount_paid >= total else OrderStatus.PENDING.value,
        "notes": order.notes,
        "created_at": datetime.utcnow(),
        "created_by": current_user["id"],
        "created_by_name": current_user["name"]
    }
    
    result = await db.orders.insert_one(order_doc)
    
    # Update stock quantities
    for item in order.items:
        await db.products.update_one(
            {"_id": ObjectId(item.product_id)},
            {"$inc": {"stock_quantity": -item.quantity}}
        )
    
    # Update customer stats
    if order.customer_id:
        await db.customers.update_one(
            {"_id": ObjectId(order.customer_id)},
            {
                "$inc": {"total_purchases": total, "total_orders": 1}
            }
        )
    
    return OrderResponse(
        id=str(result.inserted_id),
        business_id=business_id,
        **{k: v for k, v in order_doc.items() if k != "_id"}
    )

# Dashboard Stats - Multi-tenant
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    business_id = current_user.get("business_id")
    query = {}
    
    if business_id and current_user["role"] != "superadmin":
        query["business_id"] = business_id
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Today's orders
    today_query = {**query, "created_at": {"$gte": today}}
    today_orders = await db.orders.find(today_query).to_list(None)
    
    total_sales_today = sum(o.get("total", 0) for o in today_orders)
    total_orders_today = len(today_orders)
    
    # Counts
    total_customers = await db.customers.count_documents(query)
    total_products = await db.products.count_documents(query)
    
    # Low stock
    low_stock_query = {**query, "$expr": {"$lt": ["$stock_quantity", "$low_stock_threshold"]}}
    low_stock_products = await db.products.count_documents(low_stock_query)
    
    # Sales by payment method
    sales_by_payment = {"cash": 0, "card": 0, "mobile_money": 0, "credit": 0}
    for order in today_orders:
        for payment in order.get("payments", []):
            method = payment.get("method", "cash")
            sales_by_payment[method] = sales_by_payment.get(method, 0) + payment.get("amount", 0)
    
    # Top products
    product_sales = {}
    for order in today_orders:
        for item in order.get("items", []):
            pid = item.get("product_id", item.get("product_name"))
            if pid not in product_sales:
                product_sales[pid] = {"name": item.get("product_name", ""), "quantity": 0, "revenue": 0}
            product_sales[pid]["quantity"] += item.get("quantity", 0)
            product_sales[pid]["revenue"] += item.get("subtotal", 0)
    
    top_products = sorted(product_sales.values(), key=lambda x: x["revenue"], reverse=True)[:5]
    
    return {
        "total_sales_today": total_sales_today,
        "total_orders_today": total_orders_today,
        "total_customers": total_customers,
        "total_products": total_products,
        "low_stock_products": low_stock_products,
        "sales_by_payment_method": sales_by_payment,
        "top_products": top_products,
        "recent_orders": []
    }

# Users Management - Multi-tenant
@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    business_id = current_user.get("business_id")
    query = {}
    
    if business_id and current_user["role"] != "superadmin":
        query["business_id"] = business_id
    
    users = await db.users.find(query).to_list(None)
    
    result = []
    for u in users:
        business_name = None
        if u.get("business_id"):
            business = await db.businesses.find_one({"_id": ObjectId(u["business_id"])})
            business_name = business["name"] if business else None
        
        result.append(UserResponse(
            id=str(u["_id"]),
            email=u["email"],
            name=u["name"],
            role=u["role"],
            phone=u.get("phone"),
            is_active=u.get("is_active", True),
            created_at=u.get("created_at", datetime.utcnow()),
            business_id=u.get("business_id"),
            business_name=business_name
        ))
    
    return result

@api_router.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    business_id = current_user.get("business_id")
    
    # Check email uniqueness
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    user_doc = {
        "email": user.email,
        "password_hash": hash_password(user.password),
        "name": user.name,
        "role": user.role.value,
        "phone": user.phone,
        "is_active": True,
        "business_id": business_id,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=str(result.inserted_id),
        email=user.email,
        name=user.name,
        role=user.role,
        phone=user.phone,
        is_active=True,
        created_at=user_doc["created_at"],
        business_id=business_id
    )

# Reports - Multi-tenant
@api_router.get("/admin/reports/summary")
async def get_reports_summary(
    period: str = "today",
    current_user: dict = Depends(get_current_user)
):
    business_id = current_user.get("business_id")
    
    now = datetime.utcnow()
    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "yesterday":
        start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        now = start + timedelta(days=1)
    elif period == "week":
        start = now - timedelta(days=7)
    elif period == "month":
        start = now - timedelta(days=30)
    else:
        start = now - timedelta(days=365)
    
    query = {"created_at": {"$gte": start, "$lte": now}, "status": "completed"}
    if business_id and current_user["role"] != "superadmin":
        query["business_id"] = business_id
    
    orders = await db.orders.find(query).to_list(None)
    
    total_revenue = sum(o.get("total", 0) for o in orders)
    total_orders = len(orders)
    total_items = sum(sum(item.get("quantity", 0) for item in o.get("items", [])) for o in orders)
    avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
    
    # Payment breakdown
    payment_breakdown = {"cash": 0, "card": 0, "mobile_money": 0, "credit": 0}
    for order in orders:
        for payment in order.get("payments", []):
            method = payment.get("method", "cash")
            payment_breakdown[method] = payment_breakdown.get(method, 0) + payment.get("amount", 0)
    
    # Top products
    product_sales = {}
    for order in orders:
        for item in order.get("items", []):
            name = item.get("product_name", "Unknown")
            if name not in product_sales:
                product_sales[name] = {"name": name, "quantity": 0, "revenue": 0}
            product_sales[name]["quantity"] += item.get("quantity", 0)
            product_sales[name]["revenue"] += item.get("subtotal", 0)
    
    top_products = sorted(product_sales.values(), key=lambda x: x["revenue"], reverse=True)[:10]
    
    return {
        "period": period,
        "date_range": {"start": start.isoformat(), "end": now.isoformat()},
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_items_sold": total_items,
        "avg_order_value": avg_order_value,
        "new_customers": 0,
        "top_selling_products": top_products,
        "sales_by_category": [],
        "sales_by_staff": [],
        "hourly_sales": [],
        "payment_method_breakdown": payment_breakdown
    }

# Expenses - Multi-tenant
@api_router.get("/expenses")
async def get_expenses(current_user: dict = Depends(get_current_user)):
    business_id = current_user.get("business_id")
    query = {}
    
    if business_id and current_user["role"] != "superadmin":
        query["business_id"] = business_id
    
    expenses = await db.expenses.find(query).sort("date", -1).to_list(None)
    
    return [
        {
            "id": str(e["_id"]),
            "category": e["category"],
            "description": e["description"],
            "amount": e["amount"],
            "vendor": e.get("vendor"),
            "receipt_number": e.get("receipt_number"),
            "date": e["date"],
            "notes": e.get("notes"),
            "created_at": e.get("created_at", datetime.utcnow()),
            "created_by": e.get("created_by", ""),
            "created_by_name": e.get("created_by_name", ""),
            "business_id": e.get("business_id")
        }
        for e in expenses
    ]

@api_router.post("/expenses")
async def create_expense(expense: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    business_id = current_user.get("business_id")
    
    expense_doc = expense.dict()
    expense_doc["business_id"] = business_id
    expense_doc["created_at"] = datetime.utcnow()
    expense_doc["created_by"] = current_user["id"]
    expense_doc["created_by_name"] = current_user["name"]
    
    result = await db.expenses.insert_one(expense_doc)
    
    return {
        "id": str(result.inserted_id),
        "business_id": business_id,
        **expense.dict(),
        "created_at": expense_doc["created_at"],
        "created_by": current_user["id"],
        "created_by_name": current_user["name"]
    }

# Promotions - Multi-tenant  
@api_router.get("/promotions")
async def get_promotions(current_user: dict = Depends(get_current_user)):
    business_id = current_user.get("business_id")
    query = {}
    
    if business_id and current_user["role"] != "superadmin":
        query["business_id"] = business_id
    
    promotions = await db.promotions.find(query).to_list(None)
    
    return [
        {
            "id": str(p["_id"]),
            "name": p["name"],
            "description": p.get("description"),
            "type": p["type"],
            "value": p["value"],
            "min_purchase": p.get("min_purchase", 0),
            "max_discount": p.get("max_discount"),
            "applicable_products": p.get("applicable_products", []),
            "applicable_categories": p.get("applicable_categories", []),
            "start_date": p["start_date"],
            "end_date": p["end_date"],
            "is_active": p.get("is_active", True),
            "usage_limit": p.get("usage_limit"),
            "usage_count": p.get("usage_count", 0),
            "created_at": p.get("created_at", datetime.utcnow()),
            "business_id": p.get("business_id")
        }
        for p in promotions
    ]

@api_router.post("/promotions")
async def create_promotion(promotion: PromotionCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    business_id = current_user.get("business_id")
    
    promo_dict = promotion.dict()
    promo_dict["business_id"] = business_id
    promo_dict["created_at"] = datetime.utcnow()
    
    result = await db.promotions.insert_one(promo_dict)
    
    return {
        "id": str(result.inserted_id),
        "business_id": business_id,
        **promotion.dict(),
        "created_at": promo_dict["created_at"]
    }

# ============== STARTUP ==============
@app.on_event("startup")
async def startup_event():
    """Create superadmin user if not exists"""
    superadmin = await db.users.find_one({"role": "superadmin"})
    if not superadmin:
        await db.users.insert_one({
            "email": "superadmin@retail.com",
            "password_hash": hash_password("SuperAdmin123!"),
            "name": "Super Admin",
            "role": "superadmin",
            "is_active": True,
            "created_at": datetime.utcnow()
        })
        logger.info("Superadmin user created: superadmin@retail.com / SuperAdmin123!")
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.businesses.create_index("email", unique=True)
    await db.api_logs.create_index("timestamp")
    await db.api_logs.create_index("business_id")
    
    logger.info("Multi-tenant Retail Management API started")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
