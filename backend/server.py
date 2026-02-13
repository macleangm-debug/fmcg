from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
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
import io
import csv
import pandas as pd

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

# Galaxy App Identifiers
class GalaxyApp(str, Enum):
    RETAIL_PRO = "retail_pro"
    INVENTORY = "inventory"
    PAYMENTS = "payments"
    BULK_SMS = "bulk_sms"
    INVOICING = "invoicing"
    ACCOUNTING = "accounting"

class GalaxyAppStatus(str, Enum):
    AVAILABLE = "available"
    COMING_SOON = "coming_soon"
    BETA = "beta"

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

# Product Variant Models
class ProductVariantOption(BaseModel):
    name: str  # e.g., "Size", "Color"
    values: List[str]  # e.g., ["S", "M", "L", "XL"] or ["Red", "Blue", "Green"]

class ProductVariant(BaseModel):
    id: Optional[str] = None
    options: dict  # e.g., {"Size": "M", "Color": "Red"}
    sku: str
    price: Optional[float] = None  # Override price for this variant
    cost_price: Optional[float] = None
    stock_quantity: int = 0
    barcode: Optional[str] = None
    is_active: bool = True

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
    track_stock: bool = True  # Whether to track stock for this product
    unit_of_measure: str = "pcs"  # Unit of measure (pcs, kg, liters, boxes, meters, etc.)
    has_variants: bool = False  # Whether product has variants
    variant_options: Optional[List[ProductVariantOption]] = None  # e.g., [{"name": "Size", "values": ["S", "M", "L"]}]
    variants: Optional[List[ProductVariant]] = None  # List of all variant combinations

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
    track_stock: Optional[bool] = None
    unit_of_measure: Optional[str] = None
    has_variants: Optional[bool] = None
    variant_options: Optional[List[ProductVariantOption]] = None
    variants: Optional[List[ProductVariant]] = None

class ProductResponse(ProductBase):
    id: str
    created_at: datetime
    category_name: Optional[str] = None
    business_id: Optional[str] = None
    total_stock: Optional[int] = None  # Sum of all variant stocks if has_variants

# ============== STOCK MOVEMENT MODELS ==============
class StockMovementType(str, Enum):
    IN = "in"  # Stock received/added
    OUT = "out"  # Stock sold/removed
    ADJUSTMENT = "adjustment"  # Manual adjustment
    RETURN = "return"  # Customer return

class StockMovementCreate(BaseModel):
    product_id: str
    quantity: int
    movement_type: StockMovementType
    reason: Optional[str] = None
    reference: Optional[str] = None  # Order ID or reference number
    unit_cost: Optional[float] = None  # Cost per unit for Stock In
    supplier: Optional[str] = None  # Supplier name for Stock In
    create_expense: bool = True  # Automatically create expense for Stock In

class StockMovementResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    quantity: int
    movement_type: StockMovementType
    reason: Optional[str] = None
    reference: Optional[str] = None
    previous_stock: int
    new_stock: int
    created_by: str
    created_at: datetime
    business_id: str
    unit_cost: Optional[float] = None
    total_cost: Optional[float] = None
    expense_id: Optional[str] = None

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
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if user was created via Google (no password)
    if not user.get("password_hash"):
        raise HTTPException(
            status_code=401, 
            detail="This account was created with Google Sign-In. Please use 'Continue with Google' to login."
        )
    
    if not verify_password(credentials.password, user["password_hash"]):
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

# Google Auth Model
class GoogleAuthRequest(BaseModel):
    google_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    access_token: Optional[str] = None

@api_router.post("/auth/google", response_model=TokenResponse)
async def google_auth(auth_data: GoogleAuthRequest):
    """Authenticate or register user via Google OAuth"""
    # Check if user already exists with this email
    existing_user = await db.users.find_one({"email": auth_data.email})
    
    if existing_user:
        # User exists - check if it's a Google user or convert to Google auth
        if not existing_user.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account is deactivated")
        
        # Update Google ID if not set
        if not existing_user.get("google_id"):
            await db.users.update_one(
                {"_id": existing_user["_id"]},
                {"$set": {"google_id": auth_data.google_id, "profile_picture": auth_data.picture}}
            )
        
        business_id = existing_user.get("business_id")
        business_name = None
        
        if business_id:
            business = await db.businesses.find_one({"_id": ObjectId(business_id)})
            if business:
                business_name = business.get("name")
                await db.businesses.update_one(
                    {"_id": ObjectId(business_id)},
                    {"$set": {"last_active": datetime.utcnow()}}
                )
        
        token = create_token(str(existing_user["_id"]), existing_user["email"], existing_user["role"], business_id)
        
        return TokenResponse(
            access_token=token,
            user=UserResponse(
                id=str(existing_user["_id"]),
                email=existing_user["email"],
                name=existing_user["name"],
                role=existing_user["role"],
                phone=existing_user.get("phone"),
                is_active=existing_user.get("is_active", True),
                created_at=existing_user.get("created_at", datetime.utcnow()),
                business_id=business_id,
                business_name=business_name
            )
        )
    
    # New user - create business and user
    # Create business record
    business_name = f"{auth_data.name}'s Business"
    business_doc = {
        "name": business_name,
        "email": auth_data.email,
        "phone": "",
        "country": "United States",
        "industry": "retail",
        "status": BusinessStatus.TRIAL.value,
        "created_at": datetime.utcnow(),
        "last_active": datetime.utcnow(),
        "trial_ends_at": datetime.utcnow() + timedelta(days=14),
        "auth_provider": "google"
    }
    
    business_result = await db.businesses.insert_one(business_doc)
    business_id = str(business_result.inserted_id)
    
    # Create admin user for this business
    user_doc = {
        "email": auth_data.email,
        "google_id": auth_data.google_id,
        "profile_picture": auth_data.picture,
        "name": auth_data.name,
        "role": UserRole.ADMIN.value,
        "is_active": True,
        "business_id": business_id,
        "created_at": datetime.utcnow(),
        "auth_provider": "google"
    }
    
    user_result = await db.users.insert_one(user_doc)
    user_id = str(user_result.inserted_id)
    
    # Create default business details
    await db.business_details.insert_one({
        "business_id": business_id,
        "name": business_name,
        "currency": "USD",
        "country": "United States",
        "country_code": "+1",
        "created_at": datetime.utcnow()
    })
    
    # Generate token
    token = create_token(user_id, auth_data.email, UserRole.ADMIN.value, business_id)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=auth_data.email,
            name=auth_data.name,
            role=UserRole.ADMIN,
            phone=None,
            is_active=True,
            created_at=user_doc["created_at"],
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
    skip: int = 0,
    limit: int = 20,
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
    
    products = await db.products.find(query).skip(skip).limit(limit).to_list(limit)
    
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
            track_stock=p.get("track_stock", True),
            has_variants=p.get("has_variants", False),
            variant_options=p.get("variant_options"),
            variants=p.get("variants"),
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
    skip: int = 0,
    limit: int = 20,
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
    
    customers = await db.customers.find(query).skip(skip).limit(limit).to_list(limit)
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
    
    # Update stock quantities and create stock movement records for products that track stock
    for item in order.items:
        # Handle variant product IDs (format: "product_id_v<index>")
        product_id = item.product_id
        variant_index = None
        
        if "_v" in product_id:
            parts = product_id.rsplit("_v", 1)
            product_id = parts[0]
            try:
                variant_index = int(parts[1])
            except (ValueError, IndexError):
                variant_index = None
        
        # Get product to check if it tracks stock
        try:
            product = await db.products.find_one({"_id": ObjectId(product_id)})
        except Exception:
            logger.warning(f"Invalid product_id in order: {item.product_id}")
            continue
            
        if product and product.get("track_stock", True):
            previous_stock = product.get("stock_quantity", 0)
            
            # If this is a variant, update the variant's stock
            if variant_index is not None and product.get("variants"):
                variants = product.get("variants", [])
                if 0 <= variant_index < len(variants):
                    # Update variant stock
                    variant_previous_stock = variants[variant_index].get("stock_quantity", 0)
                    variants[variant_index]["stock_quantity"] = max(0, variant_previous_stock - item.quantity)
                    
                    # Recalculate total stock from all variants
                    new_total_stock = sum(v.get("stock_quantity", 0) for v in variants)
                    
                    await db.products.update_one(
                        {"_id": ObjectId(product_id)},
                        {"$set": {
                            "variants": variants,
                            "stock_quantity": new_total_stock
                        }}
                    )
                    new_stock = new_total_stock
                    previous_stock = variant_previous_stock
                else:
                    # Invalid variant index, update main stock
                    new_stock = max(0, previous_stock - item.quantity)
                    await db.products.update_one(
                        {"_id": ObjectId(product_id)},
                        {"$set": {"stock_quantity": new_stock}}
                    )
            else:
                # Regular product without variants
                new_stock = max(0, previous_stock - item.quantity)
                await db.products.update_one(
                    {"_id": ObjectId(product_id)},
                    {"$set": {"stock_quantity": new_stock}}
                )
            
            # Create stock movement record for the sale
            cost_price = product.get("cost_price") or 0
            movement_doc = {
                "product_id": product_id,  # Store base product_id
                "product_name": product.get("name", item.product_name),
                "quantity": item.quantity,
                "movement_type": "out",
                "reason": f"Sale - Order #{order_number}",
                "reference": order_number,
                "previous_stock": previous_stock,
                "new_stock": new_stock,
                "unit_cost": cost_price,
                "total_cost": cost_price * item.quantity,
                "created_by": current_user["id"],
                "created_by_name": current_user["name"],
                "created_at": datetime.utcnow(),
                "business_id": business_id,
                "variant_index": variant_index  # Track which variant was sold
            }
            await db.stock_movements.insert_one(movement_doc)
    
    # Update customer stats
    if order.customer_id:
        await db.customers.update_one(
            {"_id": ObjectId(order.customer_id)},
            {
                "$inc": {"total_purchases": total, "total_orders": 1}
            }
        )
    
    # Remove business_id from order_doc since we're passing it explicitly
    order_doc_for_response = {k: v for k, v in order_doc.items() if k not in ["_id", "business_id"]}
    
    return OrderResponse(
        id=str(result.inserted_id),
        business_id=business_id,
        **order_doc_for_response
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
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
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

# User Update Model
class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_update: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Update a staff member"""
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    business_id = current_user.get("business_id")
    
    # Find user and verify they belong to same business
    user = await db.users.find_one({
        "_id": ObjectId(user_id),
        "business_id": business_id
    })
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Build update document
    update_data = {}
    if user_update.name is not None:
        update_data["name"] = user_update.name
    if user_update.email is not None:
        # Check email uniqueness if changed
        if user_update.email != user["email"]:
            existing = await db.users.find_one({"email": user_update.email})
            if existing:
                raise HTTPException(status_code=400, detail="Email already exists")
        update_data["email"] = user_update.email
    if user_update.phone is not None:
        update_data["phone"] = user_update.phone
    if user_update.role is not None:
        update_data["role"] = user_update.role.value
    if user_update.is_active is not None:
        update_data["is_active"] = user_update.is_active
    if user_update.password is not None:
        update_data["password_hash"] = hash_password(user_update.password)
    
    if update_data:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
    
    # Get updated user
    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    return UserResponse(
        id=str(updated_user["_id"]),
        email=updated_user["email"],
        name=updated_user["name"],
        role=updated_user["role"],
        phone=updated_user.get("phone"),
        is_active=updated_user.get("is_active", True),
        created_at=updated_user.get("created_at", datetime.utcnow()),
        business_id=business_id
    )

@api_router.delete("/users/{user_id}")
async def deactivate_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Deactivate a staff member"""
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    business_id = current_user.get("business_id")
    
    # Find user and verify they belong to same business
    user = await db.users.find_one({
        "_id": ObjectId(user_id),
        "business_id": business_id
    })
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow deactivating yourself
    if str(user["_id"]) == current_user["sub"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    # Deactivate instead of delete
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "User deactivated successfully"}

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
async def get_expenses(
    skip: int = 0,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    business_id = current_user.get("business_id")
    query = {}
    
    if business_id and current_user["role"] != "superadmin":
        query["business_id"] = business_id
    
    expenses = await db.expenses.find(query).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    
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

@api_router.get("/expenses/summary")
async def get_expenses_summary(period: str = "month", current_user: dict = Depends(get_current_user)):
    """Get expense summary for a period"""
    business_id = current_user.get("business_id")
    
    # Calculate date range
    now = datetime.utcnow()
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    query = {"date": {"$gte": start_date}}
    if business_id and current_user["role"] != "superadmin":
        query["business_id"] = business_id
    
    expenses = await db.expenses.find(query).to_list(None)
    
    total = sum(e.get("amount", 0) for e in expenses)
    
    # Group by category
    by_category = {}
    for e in expenses:
        cat = e.get("category", "other")
        if cat not in by_category:
            by_category[cat] = 0
        by_category[cat] += e.get("amount", 0)
    
    return {
        "total_expenses": total,
        "count": len(expenses),
        "by_category": by_category,
        "period": period
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

# ============== STOCK MANAGEMENT ==============
@api_router.get("/stock/movements")
async def get_stock_movements(
    product_id: Optional[str] = None,
    movement_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get stock movements history"""
    business_id = current_user.get("business_id")
    
    query = {}
    if business_id and current_user["role"] != "superadmin":
        query["business_id"] = business_id
    
    if product_id:
        query["product_id"] = product_id
    
    if movement_type:
        query["movement_type"] = movement_type
    
    movements = await db.stock_movements.find(query).sort("created_at", -1).limit(100).to_list(None)
    
    return [
        {
            "id": str(m["_id"]),
            "product_id": m["product_id"],
            "product_name": m.get("product_name", ""),
            "quantity": m["quantity"],
            "movement_type": m["movement_type"],
            "reason": m.get("reason"),
            "reference": m.get("reference"),
            "previous_stock": m.get("previous_stock", 0),
            "new_stock": m.get("new_stock", 0),
            "created_by": m.get("created_by", ""),
            "created_by_name": m.get("created_by_name", ""),
            "created_at": m.get("created_at", datetime.utcnow()),
            "business_id": m.get("business_id")
        }
        for m in movements
    ]

@api_router.post("/stock/movements")
async def create_stock_movement(
    movement: StockMovementCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a stock movement (add/remove/adjust stock)"""
    # Check permissions - admin, manager can manage stock
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and managers can manage stock"
        )
    
    business_id = current_user.get("business_id")
    
    # Get the product
    try:
        product = await db.products.find_one({"_id": ObjectId(movement.product_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check business ownership
    if business_id and product.get("business_id") != business_id:
        raise HTTPException(status_code=403, detail="Product not in your business")
    
    # Check if product tracks stock
    if not product.get("track_stock", True):
        raise HTTPException(status_code=400, detail="This product does not track stock")
    
    previous_stock = product.get("stock_quantity", 0)
    
    # Calculate new stock based on movement type
    if movement.movement_type == "in" or movement.movement_type == "return":
        new_stock = previous_stock + movement.quantity
    elif movement.movement_type == "out":
        new_stock = previous_stock - movement.quantity
        if new_stock < 0:
            raise HTTPException(status_code=400, detail=f"Insufficient stock. Current: {previous_stock}")
    elif movement.movement_type == "adjustment":
        new_stock = previous_stock + movement.quantity
        if new_stock < 0:
            new_stock = 0
    else:
        raise HTTPException(status_code=400, detail="Invalid movement type")
    
    # Calculate costs
    unit_cost = movement.unit_cost or product.get("cost_price", 0)
    total_cost = unit_cost * movement.quantity
    
    expense_id = None
    
    # Auto-create expense for Stock In movements
    if movement.movement_type == "in" and movement.create_expense and total_cost > 0:
        expense_doc = {
            "description": f"Stock purchase: {product.get('name', 'Product')} x {movement.quantity}",
            "amount": total_cost,
            "category": "Inventory/Stock",
            "date": datetime.utcnow(),
            "payment_method": "cash",
            "vendor": movement.supplier or "Supplier",
            "notes": f"Auto-generated from stock movement. Reference: {movement.reference or 'N/A'}",
            "receipt_url": None,
            "is_recurring": False,
            "created_by": current_user["id"],
            "created_at": datetime.utcnow(),
            "business_id": business_id,
            "linked_stock_movement": True
        }
        expense_result = await db.expenses.insert_one(expense_doc)
        expense_id = str(expense_result.inserted_id)
    
    # Create movement record
    movement_doc = {
        "product_id": movement.product_id,
        "product_name": product.get("name", ""),
        "quantity": movement.quantity,
        "movement_type": str(movement.movement_type.value) if hasattr(movement.movement_type, 'value') else str(movement.movement_type),
        "reason": movement.reason,
        "reference": movement.reference,
        "previous_stock": previous_stock,
        "new_stock": new_stock,
        "unit_cost": unit_cost,
        "total_cost": total_cost,
        "supplier": movement.supplier,
        "expense_id": expense_id,
        "created_by": current_user["id"],
        "created_by_name": current_user["name"],
        "created_at": datetime.utcnow(),
        "business_id": business_id
    }
    
    result = await db.stock_movements.insert_one(movement_doc)
    
    # Update product stock and cost price if provided
    update_data = {"stock_quantity": new_stock}
    if movement.unit_cost and movement.movement_type == "in":
        update_data["cost_price"] = movement.unit_cost
    
    await db.products.update_one(
        {"_id": ObjectId(movement.product_id)},
        {"$set": update_data}
    )
    
    # Return serializable response
    return {
        "id": str(result.inserted_id),
        "product_id": movement_doc["product_id"],
        "product_name": movement_doc["product_name"],
        "quantity": movement_doc["quantity"],
        "movement_type": movement_doc["movement_type"],
        "reason": movement_doc["reason"],
        "reference": movement_doc["reference"],
        "previous_stock": movement_doc["previous_stock"],
        "new_stock": movement_doc["new_stock"],
        "unit_cost": movement_doc["unit_cost"],
        "total_cost": movement_doc["total_cost"],
        "supplier": movement_doc["supplier"],
        "expense_id": movement_doc["expense_id"],
        "created_by": movement_doc["created_by"],
        "created_by_name": movement_doc["created_by_name"],
        "created_at": movement_doc["created_at"].isoformat() if movement_doc["created_at"] else None,
        "business_id": movement_doc["business_id"],
        "expense_created": expense_id is not None
    }

@api_router.get("/stock/summary")
async def get_stock_summary(current_user: dict = Depends(get_current_user)):
    """Get stock summary for all products"""
    business_id = current_user.get("business_id")
    
    query = {"track_stock": True}
    if business_id and current_user["role"] != "superadmin":
        query["business_id"] = business_id
    
    products = await db.products.find(query).to_list(None)
    
    # Get categories for names
    categories = await db.categories.find({}).to_list(None)
    category_map = {str(c["_id"]): c["name"] for c in categories}
    
    total_value = 0
    low_stock_count = 0
    out_of_stock_count = 0
    
    product_summaries = []
    for p in products:
        stock_qty = p.get("stock_quantity", 0)
        cost_price = p.get("cost_price", p.get("price", 0))
        value = stock_qty * cost_price
        total_value += value
        
        if stock_qty <= 0:
            out_of_stock_count += 1
            status = "out_of_stock"
        elif stock_qty <= p.get("low_stock_threshold", 10):
            low_stock_count += 1
            status = "low_stock"
        else:
            status = "in_stock"
        
        product_summaries.append({
            "id": str(p["_id"]),
            "name": p["name"],
            "sku": p.get("sku", ""),
            "category_name": category_map.get(p.get("category_id", ""), "Uncategorized"),
            "stock_quantity": stock_qty,
            "low_stock_threshold": p.get("low_stock_threshold", 10),
            "cost_price": cost_price,
            "stock_value": value,
            "status": status,
            "track_stock": p.get("track_stock", True)
        })
    
    # Sort by status priority (out_of_stock first, then low_stock)
    status_priority = {"out_of_stock": 0, "low_stock": 1, "in_stock": 2}
    product_summaries.sort(key=lambda x: (status_priority.get(x["status"], 2), x["name"]))
    
    return {
        "total_products": len(products),
        "total_stock_value": total_value,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "products": product_summaries
    }

# ============== SEED DATA ==============
@api_router.post("/seed/ppe-products")
async def seed_ppe_products(current_user: dict = Depends(get_current_user)):
    """Seed PPE category and products for the current business"""
    if current_user["role"] not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Only admins can seed data")
    
    business_id = current_user.get("business_id")
    
    # Create PPE category if not exists
    existing_category = await db.categories.find_one({
        "name": "PPE",
        "business_id": business_id
    })
    
    if existing_category:
        category_id = str(existing_category["_id"])
    else:
        category_doc = {
            "name": "PPE",
            "description": "Personal Protective Equipment",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "business_id": business_id
        }
        result = await db.categories.insert_one(category_doc)
        category_id = str(result.inserted_id)
    
    # PPE Products to seed
    ppe_products = [
        {
            "name": "Safety Boots",
            "description": "Steel toe safety boots for industrial use",
            "sku": "PPE-BOOT-001",
            "price": 45000,
            "cost_price": 35000,
            "stock_quantity": 25,
            "low_stock_threshold": 5,
            "tax_rate": 18,
            "track_stock": True
        },
        {
            "name": "PVC Gloves",
            "description": "Chemical resistant PVC gloves",
            "sku": "PPE-GLOVE-001",
            "price": 8000,
            "cost_price": 5000,
            "stock_quantity": 100,
            "low_stock_threshold": 20,
            "tax_rate": 18,
            "track_stock": True
        },
        {
            "name": "Safety Helmet",
            "description": "Industrial safety helmet with chin strap",
            "sku": "PPE-HELM-001",
            "price": 15000,
            "cost_price": 10000,
            "stock_quantity": 50,
            "low_stock_threshold": 10,
            "tax_rate": 18,
            "track_stock": True
        },
        {
            "name": "Safety Goggles",
            "description": "Anti-fog safety goggles",
            "sku": "PPE-GOG-001",
            "price": 12000,
            "cost_price": 7500,
            "stock_quantity": 75,
            "low_stock_threshold": 15,
            "tax_rate": 18,
            "track_stock": True
        },
        {
            "name": "Reflective Vest",
            "description": "High visibility reflective safety vest",
            "sku": "PPE-VEST-001",
            "price": 18000,
            "cost_price": 12000,
            "stock_quantity": 40,
            "low_stock_threshold": 10,
            "tax_rate": 18,
            "track_stock": True
        },
        {
            "name": "Ear Plugs (Box of 50)",
            "description": "Disposable foam ear plugs for noise protection",
            "sku": "PPE-EAR-001",
            "price": 25000,
            "cost_price": 15000,
            "stock_quantity": 30,
            "low_stock_threshold": 5,
            "tax_rate": 18,
            "track_stock": True
        },
        {
            "name": "Dust Mask N95 (Box of 20)",
            "description": "N95 rated dust masks",
            "sku": "PPE-MASK-001",
            "price": 35000,
            "cost_price": 22000,
            "stock_quantity": 60,
            "low_stock_threshold": 10,
            "tax_rate": 18,
            "track_stock": True
        },
        {
            "name": "Safety Coverall",
            "description": "Full body protective coverall",
            "sku": "PPE-COV-001",
            "price": 55000,
            "cost_price": 38000,
            "stock_quantity": 20,
            "low_stock_threshold": 5,
            "tax_rate": 18,
            "track_stock": True
        }
    ]
    
    created_count = 0
    for product_data in ppe_products:
        # Check if product already exists
        existing = await db.products.find_one({
            "sku": product_data["sku"],
            "business_id": business_id
        })
        
        if not existing:
            product_doc = {
                **product_data,
                "category_id": category_id,
                "is_active": True,
                "created_at": datetime.utcnow(),
                "business_id": business_id
            }
            await db.products.insert_one(product_doc)
            created_count += 1
    
    return {
        "message": f"PPE category and {created_count} products seeded successfully",
        "category_id": category_id,
        "products_created": created_count
    }

# ============== SOFTWARE GALAXY SSO SYSTEM ==============

# SSO Models
class GalaxyAppInfo(BaseModel):
    app_id: GalaxyApp
    name: str
    tagline: str
    description: str
    icon: str
    color: str
    status: GalaxyAppStatus
    route: str
    features: List[str]
    pricing: str

class AppSubscription(BaseModel):
    app_id: GalaxyApp
    status: SubscriptionStatus
    subscribed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    plan: str = "free_trial"

class UserAppAccess(BaseModel):
    user_id: str
    email: str
    name: str
    business_id: Optional[str]
    business_name: Optional[str]
    subscriptions: List[AppSubscription]
    sso_token: str

class SSOTokenRequest(BaseModel):
    app_id: GalaxyApp

class SSOTokenResponse(BaseModel):
    app_token: str
    app_id: GalaxyApp
    user: UserResponse
    expires_in: int = 86400  # 24 hours

# Galaxy Apps Configuration
GALAXY_APPS = {
    GalaxyApp.RETAIL_PRO: GalaxyAppInfo(
        app_id=GalaxyApp.RETAIL_PRO,
        name="Retail Pro",
        tagline="Complete retail management",
        description="Point of sale, customer management, orders, and sales analytics for retail businesses.",
        icon="cart-outline",
        color="#2563EB",
        status=GalaxyAppStatus.AVAILABLE,
        route="/(tabs)/dashboard",
        features=["Point of Sale (POS)", "Customer Management", "Order Tracking", "Sales Reports", "Multi-payment Support"],
        pricing="From $29/month"
    ),
    GalaxyApp.INVENTORY: GalaxyAppInfo(
        app_id=GalaxyApp.INVENTORY,
        name="Inventory",
        tagline="Stock & product control",
        description="Complete inventory management with stock tracking, product catalog, and supplier management.",
        icon="cube-outline",
        color="#10B981",
        status=GalaxyAppStatus.COMING_SOON,
        route="/galaxy/coming-soon",
        features=["Product Catalog", "Stock Tracking", "Low Stock Alerts", "Supplier Management", "Barcode Support"],
        pricing="From $19/month"
    ),
    GalaxyApp.PAYMENTS: GalaxyAppInfo(
        app_id=GalaxyApp.PAYMENTS,
        name="Payment Solution",
        tagline="Accept payments anywhere",
        description="Integrated payment processing with multiple gateways, mobile money, and card payments.",
        icon="card-outline",
        color="#8B5CF6",
        status=GalaxyAppStatus.COMING_SOON,
        route="/galaxy/coming-soon",
        features=["Multi-gateway Support", "Mobile Money", "Card Payments", "Payment Links", "Transaction Reports"],
        pricing="From $15/month"
    ),
    GalaxyApp.BULK_SMS: GalaxyAppInfo(
        app_id=GalaxyApp.BULK_SMS,
        name="Bulk SMS",
        tagline="Reach customers instantly",
        description="Send promotional messages, alerts, and notifications to thousands of customers at once.",
        icon="chatbubbles-outline",
        color="#F59E0B",
        status=GalaxyAppStatus.COMING_SOON,
        route="/galaxy/coming-soon",
        features=["Mass Messaging", "Contact Groups", "Scheduled SMS", "Delivery Reports", "Templates"],
        pricing="Pay-as-you-go"
    ),
    GalaxyApp.INVOICING: GalaxyAppInfo(
        app_id=GalaxyApp.INVOICING,
        name="Invoicing",
        tagline="Professional invoices",
        description="Create, send, and track professional invoices. Get paid faster with online payments.",
        icon="document-text-outline",
        color="#EF4444",
        status=GalaxyAppStatus.COMING_SOON,
        route="/galaxy/coming-soon",
        features=["Invoice Templates", "Online Payments", "Recurring Invoices", "Payment Reminders", "Tax Calculations"],
        pricing="From $12/month"
    ),
    GalaxyApp.ACCOUNTING: GalaxyAppInfo(
        app_id=GalaxyApp.ACCOUNTING,
        name="Accounting",
        tagline="Financial clarity",
        description="Complete accounting solution with expense tracking, financial reports, and tax management.",
        icon="calculator-outline",
        color="#EC4899",
        status=GalaxyAppStatus.COMING_SOON,
        route="/galaxy/coming-soon",
        features=["Expense Tracking", "Financial Reports", "Tax Management", "Bank Reconciliation", "Multi-currency"],
        pricing="From $25/month"
    ),
}

@api_router.get("/galaxy/apps", response_model=List[GalaxyAppInfo])
async def get_galaxy_apps():
    """Get all available Galaxy apps"""
    return list(GALAXY_APPS.values())

@api_router.get("/galaxy/apps/{app_id}", response_model=GalaxyAppInfo)
async def get_galaxy_app(app_id: GalaxyApp):
    """Get details for a specific Galaxy app"""
    if app_id not in GALAXY_APPS:
        raise HTTPException(status_code=404, detail="App not found")
    return GALAXY_APPS[app_id]

@api_router.get("/galaxy/user/access")
async def get_user_app_access(current_user: dict = Depends(get_current_user)):
    """Get user's app subscriptions and access"""
    user_id = current_user["id"]
    business_id = current_user.get("business_id")
    
    # Get user's app subscriptions from database
    user_subscriptions = await db.app_subscriptions.find_one({"user_id": user_id})
    
    subscriptions = []
    if user_subscriptions:
        subscriptions = user_subscriptions.get("apps", [])
    else:
        # New user - grant free trial to Retail Pro by default
        default_subscription = {
            "user_id": user_id,
            "business_id": business_id,
            "apps": [
                {
                    "app_id": GalaxyApp.RETAIL_PRO.value,
                    "status": SubscriptionStatus.ACTIVE.value,
                    "subscribed_at": datetime.utcnow(),
                    "expires_at": datetime.utcnow() + timedelta(days=30),  # 30 day trial
                    "plan": "free_trial"
                }
            ],
            "created_at": datetime.utcnow()
        }
        await db.app_subscriptions.insert_one(default_subscription)
        subscriptions = default_subscription["apps"]
    
    # Get business name
    business_name = None
    if business_id:
        business = await db.businesses.find_one({"_id": ObjectId(business_id)})
        if business:
            business_name = business.get("name")
    
    # Build response with app details
    app_access = []
    for sub in subscriptions:
        app_id = sub.get("app_id")
        if app_id in [app.value for app in GalaxyApp]:
            app_info = GALAXY_APPS.get(GalaxyApp(app_id))
            if app_info:
                app_access.append({
                    "app": app_info.dict(),
                    "subscription": {
                        "status": sub.get("status"),
                        "subscribed_at": sub.get("subscribed_at"),
                        "expires_at": sub.get("expires_at"),
                        "plan": sub.get("plan", "free_trial")
                    }
                })
    
    return {
        "user_id": user_id,
        "email": current_user["email"],
        "name": current_user["name"],
        "business_id": business_id,
        "business_name": business_name,
        "app_access": app_access,
        "available_apps": [app.dict() for app in GALAXY_APPS.values()]
    }

@api_router.post("/galaxy/sso/token", response_model=SSOTokenResponse)
async def generate_app_token(request: SSOTokenRequest, current_user: dict = Depends(get_current_user)):
    """Generate an SSO token for accessing a specific Galaxy app"""
    app_id = request.app_id
    
    # Check if app exists
    if app_id not in GALAXY_APPS:
        raise HTTPException(status_code=404, detail="App not found")
    
    app_info = GALAXY_APPS[app_id]
    
    # Check if app is available
    if app_info.status == GalaxyAppStatus.COMING_SOON:
        raise HTTPException(status_code=400, detail="This app is coming soon and not yet available")
    
    # Check user's subscription status for this app
    user_id = current_user["id"]
    user_subscriptions = await db.app_subscriptions.find_one({"user_id": user_id})
    
    has_access = False
    if user_subscriptions:
        for sub in user_subscriptions.get("apps", []):
            if sub.get("app_id") == app_id.value:
                if sub.get("status") == SubscriptionStatus.ACTIVE.value:
                    # Check expiration
                    expires_at = sub.get("expires_at")
                    if expires_at is None or expires_at > datetime.utcnow():
                        has_access = True
                        break
    
    if not has_access:
        raise HTTPException(
            status_code=403, 
            detail=f"You don't have an active subscription to {app_info.name}. Please subscribe to access this app."
        )
    
    # Generate app-specific SSO token
    business_id = current_user.get("business_id")
    app_token = create_sso_token(user_id, current_user["email"], current_user["role"], business_id, app_id.value)
    
    # Get business name
    business_name = None
    if business_id:
        business = await db.businesses.find_one({"_id": ObjectId(business_id)})
        if business:
            business_name = business.get("name")
    
    return SSOTokenResponse(
        app_token=app_token,
        app_id=app_id,
        user=UserResponse(
            id=user_id,
            email=current_user["email"],
            name=current_user["name"],
            role=current_user["role"],
            phone=current_user.get("phone"),
            is_active=current_user.get("is_active", True),
            created_at=datetime.utcnow(),
            business_id=business_id,
            business_name=business_name
        ),
        expires_in=86400
    )

@api_router.post("/galaxy/subscribe/{app_id}")
async def subscribe_to_app(app_id: GalaxyApp, current_user: dict = Depends(get_current_user)):
    """Subscribe to a Galaxy app (free trial for now)"""
    if app_id not in GALAXY_APPS:
        raise HTTPException(status_code=404, detail="App not found")
    
    app_info = GALAXY_APPS[app_id]
    
    if app_info.status == GalaxyAppStatus.COMING_SOON:
        # Just record interest for coming soon apps
        await db.app_waitlist.update_one(
            {"app_id": app_id.value, "user_id": current_user["id"]},
            {
                "$set": {
                    "app_id": app_id.value,
                    "user_id": current_user["id"],
                    "email": current_user["email"],
                    "business_id": current_user.get("business_id"),
                    "signed_up_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        return {"message": f"You've been added to the waitlist for {app_info.name}!", "status": "waitlisted"}
    
    user_id = current_user["id"]
    business_id = current_user.get("business_id")
    
    # Check if already subscribed
    user_subscriptions = await db.app_subscriptions.find_one({"user_id": user_id})
    
    new_subscription = {
        "app_id": app_id.value,
        "status": SubscriptionStatus.ACTIVE.value,
        "subscribed_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=30),  # 30 day free trial
        "plan": "free_trial"
    }
    
    if user_subscriptions:
        # Check if already has this app
        existing = next((sub for sub in user_subscriptions.get("apps", []) if sub.get("app_id") == app_id.value), None)
        if existing:
            return {"message": f"You already have access to {app_info.name}", "status": "existing"}
        
        # Add new subscription
        await db.app_subscriptions.update_one(
            {"user_id": user_id},
            {"$push": {"apps": new_subscription}}
        )
    else:
        # Create new subscription document
        await db.app_subscriptions.insert_one({
            "user_id": user_id,
            "business_id": business_id,
            "apps": [new_subscription],
            "created_at": datetime.utcnow()
        })
    
    return {
        "message": f"Successfully subscribed to {app_info.name}!",
        "status": "subscribed",
        "subscription": new_subscription
    }

# Waitlist model
class WaitlistSignup(BaseModel):
    app_id: str
    email: EmailStr
    user_id: Optional[str] = None

@api_router.post("/galaxy/waitlist")
async def join_waitlist(signup: WaitlistSignup):
    """Join the waitlist for a coming soon app"""
    
    # Validate app_id is a coming soon app
    coming_soon_apps = ['payments', 'bulk_sms', 'accounting']
    if signup.app_id not in coming_soon_apps:
        raise HTTPException(
            status_code=400, 
            detail="This app is already available. Please use the subscribe endpoint."
        )
    
    # Check if already on waitlist
    existing = await db.waitlist.find_one({
        "app_id": signup.app_id,
        "email": signup.email
    })
    
    if existing:
        return {
            "message": "You're already on the waitlist!",
            "status": "already_signed_up"
        }
    
    # Add to waitlist
    waitlist_entry = {
        "app_id": signup.app_id,
        "email": signup.email,
        "user_id": signup.user_id,
        "signed_up_at": datetime.utcnow(),
        "notified": False
    }
    
    await db.waitlist.insert_one(waitlist_entry)
    
    # Get app name for response
    app_names = {
        'payments': 'Payment Solution',
        'bulk_sms': 'Bulk SMS',
        'accounting': 'Accounting'
    }
    
    return {
        "message": f"You've been added to the {app_names.get(signup.app_id, signup.app_id)} waitlist!",
        "status": "signed_up",
        "app_id": signup.app_id,
        "email": signup.email
    }

@api_router.get("/galaxy/waitlist/{app_id}/count")
async def get_waitlist_count(app_id: str):
    """Get the number of people on the waitlist for an app"""
    count = await db.waitlist.count_documents({"app_id": app_id})
    return {"app_id": app_id, "count": count}

@api_router.post("/galaxy/verify-token")
async def verify_sso_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify an SSO token and return user info"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        user_id = payload.get("sub")
        app_id = payload.get("app_id")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account is deactivated")
        
        business_id = user.get("business_id")
        business_name = None
        if business_id:
            business = await db.businesses.find_one({"_id": ObjectId(business_id)})
            if business:
                business_name = business.get("name")
        
        return {
            "valid": True,
            "user": UserResponse(
                id=str(user["_id"]),
                email=user["email"],
                name=user["name"],
                role=user["role"],
                phone=user.get("phone"),
                is_active=user.get("is_active", True),
                created_at=user.get("created_at", datetime.utcnow()),
                business_id=business_id,
                business_name=business_name
            ).dict(),
            "app_id": app_id
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

def create_sso_token(user_id: str, email: str, role: str, business_id: str = None, app_id: str = None) -> str:
    """Create an SSO token for app access"""
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "business_id": business_id,
        "app_id": app_id,
        "type": "sso",
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ============== INVENTORY APP ENDPOINTS ==============
# Separate inventory system for Inventory app subscribers

class InventoryItemCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    unit: str = "pcs"  # pcs, kg, liters, boxes, etc.
    quantity: int = 0
    min_quantity: int = 10
    max_quantity: Optional[int] = None
    cost_price: float = 0
    location: Optional[str] = None  # warehouse location
    supplier: Optional[str] = None
    notes: Optional[str] = None

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    unit: Optional[str] = None
    min_quantity: Optional[int] = None
    max_quantity: Optional[int] = None
    cost_price: Optional[float] = None
    location: Optional[str] = None
    supplier: Optional[str] = None
    notes: Optional[str] = None

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

@api_router.get("/inventory/items")
async def get_inventory_items(
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    status: Optional[str] = None,  # all, low_stock, out_of_stock
    current_user: dict = Depends(get_current_user)
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
        
        # Filter by status if specified
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
            "stock_value": qty * item.get("cost_price", 0),
            "location": item.get("location", ""),
            "supplier": item.get("supplier", ""),
            "notes": item.get("notes", ""),
            "status": item_status,
            "created_at": item.get("created_at", datetime.utcnow()).isoformat(),
            "updated_at": item.get("updated_at", datetime.utcnow()).isoformat()
        })
    
    return result

@api_router.get("/inventory/summary")
async def get_inventory_summary(current_user: dict = Depends(get_current_user)):
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

@api_router.post("/inventory/items")
async def create_inventory_item(
    item: InventoryItemCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new inventory item"""
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    business_id = current_user.get("business_id")
    
    # Get category name if category_id provided
    category_name = "Uncategorized"
    if item.category_id:
        try:
            category = await db.inventory_categories.find_one({"_id": ObjectId(item.category_id)})
            if category:
                category_name = category.get("name", "Uncategorized")
        except:
            pass
    
    # Generate SKU if not provided
    sku = item.sku
    if not sku:
        count = await db.inventory_items.count_documents({"business_id": business_id})
        sku = f"INV-{count + 1:04d}"
    
    item_doc = {
        "name": item.name,
        "sku": sku,
        "description": item.description,
        "category_id": item.category_id,
        "category_name": category_name,
        "unit": item.unit,
        "quantity": item.quantity,
        "min_quantity": item.min_quantity,
        "max_quantity": item.max_quantity,
        "cost_price": item.cost_price,
        "location": item.location,
        "supplier": item.supplier,
        "notes": item.notes,
        "created_by": current_user["id"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "business_id": business_id
    }
    
    result = await db.inventory_items.insert_one(item_doc)
    
    return {
        "id": str(result.inserted_id),
        "message": "Item created successfully"
    }

@api_router.put("/inventory/items/{item_id}")
async def update_inventory_item(
    item_id: str,
    item: InventoryItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an inventory item"""
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        existing = await db.inventory_items.find_one({"_id": ObjectId(item_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid item ID")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = {k: v for k, v in item.dict().items() if v is not None}
    
    # Update category name if category changed
    if "category_id" in update_data and update_data["category_id"]:
        try:
            category = await db.inventory_categories.find_one({"_id": ObjectId(update_data["category_id"])})
            if category:
                update_data["category_name"] = category.get("name", "Uncategorized")
        except:
            pass
    
    update_data["updated_at"] = datetime.utcnow()
    
    await db.inventory_items.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": update_data}
    )
    
    return {"message": "Item updated successfully"}

@api_router.delete("/inventory/items/{item_id}")
async def delete_inventory_item(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an inventory item"""
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        result = await db.inventory_items.delete_one({"_id": ObjectId(item_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid item ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item deleted successfully"}

@api_router.get("/inventory/categories")
async def get_inventory_categories(current_user: dict = Depends(get_current_user)):
    """Get all inventory categories"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    categories = await db.inventory_categories.find(query).sort("name", 1).to_list(None)
    
    return [
        {
            "id": str(cat["_id"]),
            "name": cat.get("name", ""),
            "description": cat.get("description", ""),
            "color": cat.get("color", "#10B981"),
            "item_count": await db.inventory_items.count_documents({"category_id": str(cat["_id"]), "business_id": business_id})
        }
        for cat in categories
    ]

@api_router.post("/inventory/categories")
async def create_inventory_category(
    category: InventoryCategoryCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new inventory category"""
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    business_id = current_user.get("business_id")
    
    cat_doc = {
        "name": category.name,
        "description": category.description,
        "color": category.color,
        "created_at": datetime.utcnow(),
        "business_id": business_id
    }
    
    result = await db.inventory_categories.insert_one(cat_doc)
    
    return {
        "id": str(result.inserted_id),
        "message": "Category created successfully"
    }

@api_router.delete("/inventory/categories/{category_id}")
async def delete_inventory_category(
    category_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an inventory category"""
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Check if category has items
    item_count = await db.inventory_items.count_documents({"category_id": category_id})
    if item_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {item_count} items")
    
    try:
        result = await db.inventory_categories.delete_one({"_id": ObjectId(category_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid category ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted successfully"}

@api_router.post("/inventory/adjust")
async def adjust_inventory(
    adjustment: InventoryAdjustment,
    current_user: dict = Depends(get_current_user)
):
    """Adjust inventory quantity"""
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    business_id = current_user.get("business_id")
    
    try:
        item = await db.inventory_items.find_one({"_id": ObjectId(adjustment.item_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid item ID")
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    previous_qty = item.get("quantity", 0)
    
    # Calculate new quantity
    if adjustment.adjustment_type == "in":
        new_qty = previous_qty + adjustment.quantity
    elif adjustment.adjustment_type == "out":
        new_qty = previous_qty - adjustment.quantity
        if new_qty < 0:
            raise HTTPException(status_code=400, detail=f"Insufficient stock. Current: {previous_qty}")
    elif adjustment.adjustment_type == "adjustment":
        new_qty = adjustment.quantity  # Direct set
    elif adjustment.adjustment_type == "transfer":
        new_qty = previous_qty - adjustment.quantity
        if new_qty < 0:
            raise HTTPException(status_code=400, detail=f"Insufficient stock. Current: {previous_qty}")
    else:
        raise HTTPException(status_code=400, detail="Invalid adjustment type")
    
    # Update item quantity
    await db.inventory_items.update_one(
        {"_id": ObjectId(adjustment.item_id)},
        {"$set": {"quantity": new_qty, "updated_at": datetime.utcnow()}}
    )
    
    # Create movement record
    movement_doc = {
        "item_id": adjustment.item_id,
        "item_name": item.get("name", ""),
        "adjustment_type": adjustment.adjustment_type,
        "quantity": adjustment.quantity,
        "previous_quantity": previous_qty,
        "new_quantity": new_qty,
        "reason": adjustment.reason,
        "reference": adjustment.reference,
        "location_from": adjustment.location_from,
        "location_to": adjustment.location_to,
        "created_by": current_user["id"],
        "created_by_name": current_user["name"],
        "created_at": datetime.utcnow(),
        "business_id": business_id
    }
    
    await db.inventory_movements.insert_one(movement_doc)
    
    return {
        "message": "Inventory adjusted successfully",
        "previous_quantity": previous_qty,
        "new_quantity": new_qty
    }

@api_router.get("/inventory/movements")
async def get_inventory_movements(
    item_id: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get inventory movement history"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    if item_id:
        query["item_id"] = item_id
    
    movements = await db.inventory_movements.find(query).sort("created_at", -1).limit(limit).to_list(None)
    
    return [
        {
            "id": str(m["_id"]),
            "item_id": m.get("item_id"),
            "item_name": m.get("item_name", ""),
            "adjustment_type": m.get("adjustment_type"),
            "quantity": m.get("quantity", 0),
            "previous_quantity": m.get("previous_quantity", 0),
            "new_quantity": m.get("new_quantity", 0),
            "reason": m.get("reason", ""),
            "reference": m.get("reference", ""),
            "location_from": m.get("location_from"),
            "location_to": m.get("location_to"),
            "created_by_name": m.get("created_by_name", "System"),
            "created_at": m.get("created_at", datetime.utcnow()).isoformat()
        }
        for m in movements
    ]

# ============== INVOICE APP ENDPOINTS ==============
class InvoiceLineItem(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float
    tax_rate: float = 0
    amount: float = 0  # Will be calculated

class InvoiceCreate(BaseModel):
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    items: List[InvoiceLineItem]
    notes: Optional[str] = None
    terms: Optional[str] = None
    discount_type: Optional[str] = None  # percentage or fixed
    discount_value: float = 0

class InvoiceUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    due_date: Optional[str] = None
    items: Optional[List[InvoiceLineItem]] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    status: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None

@api_router.get("/invoices")
async def get_invoices(
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all invoices"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    if status and status != "all":
        query["status"] = status
    
    if search:
        query["$or"] = [
            {"invoice_number": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"customer_email": {"$regex": search, "$options": "i"}}
        ]
    
    invoices = await db.invoices.find(query).sort("created_at", -1).to_list(None)
    
    return [
        {
            "id": str(inv["_id"]),
            "invoice_number": inv.get("invoice_number", ""),
            "customer_name": inv.get("customer_name", ""),
            "customer_email": inv.get("customer_email", ""),
            "customer_phone": inv.get("customer_phone", ""),
            "customer_address": inv.get("customer_address", ""),
            "invoice_date": inv.get("invoice_date", ""),
            "due_date": inv.get("due_date", ""),
            "items": inv.get("items", []),
            "subtotal": inv.get("subtotal", 0),
            "tax_total": inv.get("tax_total", 0),
            "discount_type": inv.get("discount_type"),
            "discount_value": inv.get("discount_value", 0),
            "discount_amount": inv.get("discount_amount", 0),
            "total": inv.get("total", 0),
            "amount_paid": inv.get("amount_paid", 0),
            "balance_due": inv.get("balance_due", 0),
            "status": inv.get("status", "draft"),
            "notes": inv.get("notes", ""),
            "terms": inv.get("terms", ""),
            "created_at": inv.get("created_at", datetime.utcnow()).isoformat(),
        }
        for inv in invoices
    ]

@api_router.get("/invoices/summary")
async def get_invoices_summary(current_user: dict = Depends(get_current_user)):
    """Get invoice summary stats"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    invoices = await db.invoices.find(query).to_list(None)
    
    total_invoices = len(invoices)
    total_amount = sum(inv.get("total", 0) for inv in invoices)
    total_paid = sum(inv.get("amount_paid", 0) for inv in invoices)
    total_outstanding = total_amount - total_paid
    
    draft_count = len([inv for inv in invoices if inv.get("status") == "draft"])
    sent_count = len([inv for inv in invoices if inv.get("status") == "sent"])
    paid_count = len([inv for inv in invoices if inv.get("status") == "paid"])
    overdue_count = len([inv for inv in invoices if inv.get("status") == "overdue"])
    
    return {
        "total_invoices": total_invoices,
        "total_amount": total_amount,
        "total_paid": total_paid,
        "total_outstanding": total_outstanding,
        "draft_count": draft_count,
        "sent_count": sent_count,
        "paid_count": paid_count,
        "overdue_count": overdue_count
    }

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single invoice"""
    try:
        invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {
        "id": str(invoice["_id"]),
        "invoice_number": invoice.get("invoice_number", ""),
        "customer_name": invoice.get("customer_name", ""),
        "customer_email": invoice.get("customer_email", ""),
        "customer_phone": invoice.get("customer_phone", ""),
        "customer_address": invoice.get("customer_address", ""),
        "invoice_date": invoice.get("invoice_date", ""),
        "due_date": invoice.get("due_date", ""),
        "items": invoice.get("items", []),
        "subtotal": invoice.get("subtotal", 0),
        "tax_total": invoice.get("tax_total", 0),
        "discount_type": invoice.get("discount_type"),
        "discount_value": invoice.get("discount_value", 0),
        "discount_amount": invoice.get("discount_amount", 0),
        "total": invoice.get("total", 0),
        "amount_paid": invoice.get("amount_paid", 0),
        "balance_due": invoice.get("balance_due", 0),
        "status": invoice.get("status", "draft"),
        "notes": invoice.get("notes", ""),
        "terms": invoice.get("terms", ""),
        "created_at": invoice.get("created_at", datetime.utcnow()).isoformat(),
    }

@api_router.post("/invoices")
async def create_invoice(
    invoice: InvoiceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new invoice"""
    business_id = current_user.get("business_id")
    
    # Generate invoice number
    count = await db.invoices.count_documents({"business_id": business_id})
    invoice_number = f"INV-{count + 1:05d}"
    
    # Calculate totals
    subtotal = 0
    tax_total = 0
    items_with_amounts = []
    
    for item in invoice.items:
        item_amount = item.quantity * item.unit_price
        item_tax = item_amount * (item.tax_rate / 100)
        subtotal += item_amount
        tax_total += item_tax
        items_with_amounts.append({
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "tax_rate": item.tax_rate,
            "amount": item_amount + item_tax
        })
    
    # Apply discount
    discount_amount = 0
    if invoice.discount_value > 0:
        if invoice.discount_type == "percentage":
            discount_amount = subtotal * (invoice.discount_value / 100)
        else:
            discount_amount = invoice.discount_value
    
    total = subtotal + tax_total - discount_amount
    
    invoice_doc = {
        "invoice_number": invoice_number,
        "customer_name": invoice.customer_name,
        "customer_email": invoice.customer_email,
        "customer_phone": invoice.customer_phone,
        "customer_address": invoice.customer_address,
        "invoice_date": invoice.invoice_date or datetime.utcnow().strftime("%Y-%m-%d"),
        "due_date": invoice.due_date,
        "items": items_with_amounts,
        "subtotal": subtotal,
        "tax_total": tax_total,
        "discount_type": invoice.discount_type,
        "discount_value": invoice.discount_value,
        "discount_amount": discount_amount,
        "total": total,
        "amount_paid": 0,
        "balance_due": total,
        "status": "draft",
        "notes": invoice.notes,
        "terms": invoice.terms,
        "created_by": current_user["id"],
        "created_at": datetime.utcnow(),
        "business_id": business_id
    }
    
    result = await db.invoices.insert_one(invoice_doc)
    
    return {
        "id": str(result.inserted_id),
        "invoice_number": invoice_number,
        "message": "Invoice created successfully"
    }

@api_router.put("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: str,
    invoice: InvoiceUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an invoice"""
    try:
        existing = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_data = {k: v for k, v in invoice.dict().items() if v is not None}
    
    # Recalculate totals if items changed
    if "items" in update_data:
        subtotal = 0
        tax_total = 0
        items_with_amounts = []
        
        for item in update_data["items"]:
            item_amount = item["quantity"] * item["unit_price"]
            item_tax = item_amount * (item.get("tax_rate", 0) / 100)
            subtotal += item_amount
            tax_total += item_tax
            items_with_amounts.append({
                "description": item["description"],
                "quantity": item["quantity"],
                "unit_price": item["unit_price"],
                "tax_rate": item.get("tax_rate", 0),
                "amount": item_amount + item_tax
            })
        
        update_data["items"] = items_with_amounts
        update_data["subtotal"] = subtotal
        update_data["tax_total"] = tax_total
        
        # Apply discount
        discount_type = update_data.get("discount_type", existing.get("discount_type"))
        discount_value = update_data.get("discount_value", existing.get("discount_value", 0))
        discount_amount = 0
        if discount_value > 0:
            if discount_type == "percentage":
                discount_amount = subtotal * (discount_value / 100)
            else:
                discount_amount = discount_value
        
        update_data["discount_amount"] = discount_amount
        update_data["total"] = subtotal + tax_total - discount_amount
        update_data["balance_due"] = update_data["total"] - existing.get("amount_paid", 0)
    
    update_data["updated_at"] = datetime.utcnow()
    
    await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": update_data}
    )
    
    return {"message": "Invoice updated successfully"}

@api_router.post("/invoices/{invoice_id}/send")
async def send_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark invoice as sent"""
    try:
        existing = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": {"status": "sent", "sent_at": datetime.utcnow()}}
    )
    
    return {"message": "Invoice marked as sent"}

@api_router.post("/invoices/{invoice_id}/payment")
async def record_payment(
    invoice_id: str,
    amount: float,
    payment_method: str = "cash",
    reference: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Record a payment for an invoice"""
    try:
        existing = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    new_amount_paid = existing.get("amount_paid", 0) + amount
    new_balance = existing.get("total", 0) - new_amount_paid
    new_status = "paid" if new_balance <= 0 else existing.get("status", "sent")
    
    # Add payment record
    payment = {
        "amount": amount,
        "payment_method": payment_method,
        "reference": reference,
        "recorded_by": current_user["id"],
        "recorded_at": datetime.utcnow()
    }
    
    await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {
            "$set": {
                "amount_paid": new_amount_paid,
                "balance_due": max(0, new_balance),
                "status": new_status
            },
            "$push": {"payments": payment}
        }
    )
    
    return {"message": "Payment recorded successfully", "balance_due": max(0, new_balance)}

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an invoice"""
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        result = await db.invoices.delete_one({"_id": ObjectId(invoice_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice deleted successfully"}

# ============== UNITS OF MEASURE ENDPOINT ==============
UNITS_OF_MEASURE = [
    # Basic units
    {"code": "pcs", "name": "Pieces", "category": "count"},
    {"code": "units", "name": "Units", "category": "count"},
    {"code": "kg", "name": "Kilograms", "category": "weight"},
    {"code": "g", "name": "Grams", "category": "weight"},
    {"code": "liters", "name": "Liters", "category": "volume"},
    {"code": "ml", "name": "Milliliters", "category": "volume"},
    {"code": "meters", "name": "Meters", "category": "length"},
    {"code": "cm", "name": "Centimeters", "category": "length"},
    {"code": "boxes", "name": "Boxes", "category": "packaging"},
    # Extended units
    {"code": "dozen", "name": "Dozen", "category": "count"},
    {"code": "pairs", "name": "Pairs", "category": "count"},
    {"code": "bundles", "name": "Bundles", "category": "packaging"},
    {"code": "cartons", "name": "Cartons", "category": "packaging"},
    {"code": "packs", "name": "Packs", "category": "packaging"},
    {"code": "gallons", "name": "Gallons", "category": "volume"},
    {"code": "feet", "name": "Feet", "category": "length"},
    {"code": "inches", "name": "Inches", "category": "length"},
    {"code": "lbs", "name": "Pounds", "category": "weight"},
    {"code": "oz", "name": "Ounces", "category": "weight"},
]

@api_router.get("/units-of-measure")
async def get_units_of_measure(current_user: dict = Depends(get_current_user)):
    """Get all available units of measure"""
    business_id = current_user.get("business_id")
    
    # Get custom units for this business
    custom_units = await db.custom_units.find({"business_id": business_id}).to_list(None)
    custom_list = [{"code": u["code"], "name": u["name"], "category": "custom"} for u in custom_units]
    
    return UNITS_OF_MEASURE + custom_list

@api_router.post("/units-of-measure")
async def create_custom_unit(
    code: str,
    name: str,
    current_user: dict = Depends(get_current_user)
):
    """Create a custom unit of measure"""
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    business_id = current_user.get("business_id")
    
    # Check if code already exists
    existing = await db.custom_units.find_one({"code": code, "business_id": business_id})
    if existing:
        raise HTTPException(status_code=400, detail="Unit code already exists")
    
    unit_doc = {
        "code": code,
        "name": name,
        "business_id": business_id,
        "created_at": datetime.utcnow()
    }
    await db.custom_units.insert_one(unit_doc)
    
    return {"message": "Custom unit created successfully"}

# ============== BULK IMPORT/EXPORT ENDPOINTS ==============

@api_router.get("/products/export")
async def export_products(
    format: str = "csv",  # csv or excel
    current_user: dict = Depends(get_current_user)
):
    """Export all products as CSV or Excel"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    products = await db.products.find(query).to_list(None)
    
    # Prepare data
    data = []
    for p in products:
        category = await db.categories.find_one({"_id": ObjectId(p["category_id"])}) if p.get("category_id") else None
        data.append({
            "name": p.get("name", ""),
            "sku": p.get("sku", ""),
            "description": p.get("description", ""),
            "category": category.get("name", "") if category else "",
            "price": p.get("price", 0),
            "cost_price": p.get("cost_price", 0),
            "stock_quantity": p.get("stock_quantity", 0),
            "low_stock_threshold": p.get("low_stock_threshold", 10),
            "unit_of_measure": p.get("unit_of_measure", "pcs"),
            "tax_rate": p.get("tax_rate", 0),
            "barcode": p.get("barcode", ""),
            "is_active": "Yes" if p.get("is_active", True) else "No",
            "track_stock": "Yes" if p.get("track_stock", True) else "No",
        })
    
    df = pd.DataFrame(data)
    
    if format == "excel":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Products')
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=products.xlsx"}
        )
    else:
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=products.csv"}
        )

@api_router.get("/products/import-template")
async def get_import_template(
    format: str = "csv",
    current_user: dict = Depends(get_current_user)
):
    """Get a template for product import"""
    template_data = [{
        "name": "Sample Product",
        "sku": "PROD-001",
        "description": "Product description",
        "category": "Category Name",
        "price": 1000,
        "cost_price": 800,
        "stock_quantity": 50,
        "low_stock_threshold": 10,
        "unit_of_measure": "pcs",
        "tax_rate": 18,
        "barcode": "",
        "is_active": "Yes",
        "track_stock": "Yes",
    }]
    
    df = pd.DataFrame(template_data)
    
    if format == "excel":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Products')
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=products_template.xlsx"}
        )
    else:
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=products_template.csv"}
        )

@api_router.post("/products/import")
async def import_products(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Import products from CSV or Excel file"""
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    business_id = current_user.get("business_id")
    
    # Read file
    content = await file.read()
    
    try:
        if file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            df = pd.read_excel(io.BytesIO(content))
        else:
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
    
    # Process rows
    success_count = 0
    error_rows = []
    
    for idx, row in df.iterrows():
        try:
            # Find or create category
            category_id = None
            if row.get('category') and pd.notna(row['category']):
                category = await db.categories.find_one({
                    "name": {"$regex": f"^{row['category']}$", "$options": "i"},
                    "business_id": business_id
                })
                if category:
                    category_id = str(category["_id"])
                else:
                    # Create category
                    new_cat = await db.categories.insert_one({
                        "name": row['category'],
                        "description": "",
                        "is_active": True,
                        "created_at": datetime.utcnow(),
                        "business_id": business_id
                    })
                    category_id = str(new_cat.inserted_id)
            
            # Check if product with same SKU exists
            sku = str(row.get('sku', '')) if pd.notna(row.get('sku')) else None
            existing = None
            if sku:
                existing = await db.products.find_one({"sku": sku, "business_id": business_id})
            
            product_data = {
                "name": str(row['name']),
                "sku": sku or f"SKU-{uuid.uuid4().hex[:8].upper()}",
                "description": str(row.get('description', '')) if pd.notna(row.get('description')) else "",
                "category_id": category_id,
                "price": float(row.get('price', 0)) if pd.notna(row.get('price')) else 0,
                "cost_price": float(row.get('cost_price', 0)) if pd.notna(row.get('cost_price')) else 0,
                "stock_quantity": int(row.get('stock_quantity', 0)) if pd.notna(row.get('stock_quantity')) else 0,
                "low_stock_threshold": int(row.get('low_stock_threshold', 10)) if pd.notna(row.get('low_stock_threshold')) else 10,
                "unit_of_measure": str(row.get('unit_of_measure', 'pcs')) if pd.notna(row.get('unit_of_measure')) else "pcs",
                "tax_rate": float(row.get('tax_rate', 0)) if pd.notna(row.get('tax_rate')) else 0,
                "barcode": str(row.get('barcode', '')) if pd.notna(row.get('barcode')) else "",
                "is_active": str(row.get('is_active', 'Yes')).lower() in ['yes', 'true', '1'],
                "track_stock": str(row.get('track_stock', 'Yes')).lower() in ['yes', 'true', '1'],
                "business_id": business_id,
                "updated_at": datetime.utcnow()
            }
            
            if existing:
                # Update existing product
                await db.products.update_one(
                    {"_id": existing["_id"]},
                    {"$set": product_data}
                )
            else:
                # Create new product
                product_data["created_at"] = datetime.utcnow()
                await db.products.insert_one(product_data)
            
            success_count += 1
            
        except Exception as e:
            error_rows.append({"row": idx + 2, "error": str(e)})
    
    return {
        "message": f"Import completed. {success_count} products processed.",
        "success_count": success_count,
        "error_count": len(error_rows),
        "errors": error_rows[:10]  # Return first 10 errors
    }

# Inventory bulk import/export
@api_router.get("/inventory/export")
async def export_inventory(
    format: str = "csv",
    current_user: dict = Depends(get_current_user)
):
    """Export inventory items as CSV or Excel"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    items = await db.inventory_items.find(query).to_list(None)
    
    data = []
    for item in items:
        data.append({
            "name": item.get("name", ""),
            "sku": item.get("sku", ""),
            "description": item.get("description", ""),
            "category": item.get("category_name", ""),
            "unit": item.get("unit", "pcs"),
            "quantity": item.get("quantity", 0),
            "min_quantity": item.get("min_quantity", 10),
            "cost_price": item.get("cost_price", 0),
            "location": item.get("location", ""),
            "supplier": item.get("supplier", ""),
            "notes": item.get("notes", ""),
        })
    
    df = pd.DataFrame(data)
    
    if format == "excel":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Inventory')
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=inventory.xlsx"}
        )
    else:
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=inventory.csv"}
        )

@api_router.post("/inventory/import")
async def import_inventory(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Import inventory items from CSV or Excel"""
    if current_user["role"] not in ["admin", "manager", "superadmin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    business_id = current_user.get("business_id")
    content = await file.read()
    
    try:
        if file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            df = pd.read_excel(io.BytesIO(content))
        else:
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
    
    success_count = 0
    error_rows = []
    
    for idx, row in df.iterrows():
        try:
            sku = str(row.get('sku', '')) if pd.notna(row.get('sku')) else None
            existing = None
            if sku:
                existing = await db.inventory_items.find_one({"sku": sku, "business_id": business_id})
            
            # Handle category
            category_id = None
            category_name = "Uncategorized"
            if row.get('category') and pd.notna(row['category']):
                cat = await db.inventory_categories.find_one({
                    "name": {"$regex": f"^{row['category']}$", "$options": "i"},
                    "business_id": business_id
                })
                if cat:
                    category_id = str(cat["_id"])
                    category_name = cat["name"]
                else:
                    new_cat = await db.inventory_categories.insert_one({
                        "name": row['category'],
                        "description": "",
                        "color": "#10B981",
                        "created_at": datetime.utcnow(),
                        "business_id": business_id
                    })
                    category_id = str(new_cat.inserted_id)
                    category_name = row['category']
            
            item_data = {
                "name": str(row['name']),
                "sku": sku or f"INV-{uuid.uuid4().hex[:8].upper()}",
                "description": str(row.get('description', '')) if pd.notna(row.get('description')) else "",
                "category_id": category_id,
                "category_name": category_name,
                "unit": str(row.get('unit', 'pcs')) if pd.notna(row.get('unit')) else "pcs",
                "quantity": int(row.get('quantity', 0)) if pd.notna(row.get('quantity')) else 0,
                "min_quantity": int(row.get('min_quantity', 10)) if pd.notna(row.get('min_quantity')) else 10,
                "cost_price": float(row.get('cost_price', 0)) if pd.notna(row.get('cost_price')) else 0,
                "location": str(row.get('location', '')) if pd.notna(row.get('location')) else "",
                "supplier": str(row.get('supplier', '')) if pd.notna(row.get('supplier')) else "",
                "notes": str(row.get('notes', '')) if pd.notna(row.get('notes')) else "",
                "business_id": business_id,
                "updated_at": datetime.utcnow()
            }
            
            if existing:
                await db.inventory_items.update_one({"_id": existing["_id"]}, {"$set": item_data})
            else:
                item_data["created_at"] = datetime.utcnow()
                await db.inventory_items.insert_one(item_data)
            
            success_count += 1
            
        except Exception as e:
            error_rows.append({"row": idx + 2, "error": str(e)})
    
    return {
        "message": f"Import completed. {success_count} items processed.",
        "success_count": success_count,
        "error_count": len(error_rows),
        "errors": error_rows[:10]
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
