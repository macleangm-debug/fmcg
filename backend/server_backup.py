from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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
app = FastAPI(title="Retail Management API")

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
    ADMIN = "admin"
    MANAGER = "manager"
    SALES_STAFF = "sales_staff"
    FRONT_DESK = "front_desk"
    FINANCE = "finance"

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

# ============== MODELS ==============

# User Models
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

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Category Models
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    image: Optional[str] = None  # base64 image
    is_active: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: str
    created_at: datetime

# Product Models
class ProductVariant(BaseModel):
    name: str
    sku: str
    price: float
    cost_price: Optional[float] = None
    stock_quantity: int = 0
    low_stock_threshold: int = 10

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: str
    image: Optional[str] = None  # base64 image
    price: float
    cost_price: Optional[float] = None
    sku: str
    barcode: Optional[str] = None
    stock_quantity: int = 0
    low_stock_threshold: int = 10
    variants: List[ProductVariant] = []
    is_active: bool = True
    tax_rate: float = 0.0  # VAT percentage

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    image: Optional[str] = None
    price: Optional[float] = None
    cost_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    is_active: Optional[bool] = None
    tax_rate: Optional[float] = None

class ProductResponse(ProductBase):
    id: str
    category_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# Customer Models
class CustomerBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: str
    address: Optional[str] = None
    birthday: Optional[str] = None  # Format: YYYY-MM-DD
    credit_limit: float = 0.0
    credit_balance: float = 0.0
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    birthday: Optional[str] = None
    credit_limit: Optional[float] = None
    notes: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: str
    total_purchases: float = 0.0
    total_orders: int = 0
    created_at: datetime

# Order/Sale Models
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
    discount_total: float = 0.0
    tax_total: float = 0.0
    subtotal: float
    total: float
    notes: Optional[str] = None

class OrderResponse(BaseModel):
    id: str
    order_number: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    items: List[OrderItem]
    payments: List[PaymentInfo]
    discount_total: float
    tax_total: float
    subtotal: float
    total: float
    amount_paid: float
    amount_due: float
    status: OrderStatus
    notes: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: datetime

# Dashboard/Stats Models
class DashboardStats(BaseModel):
    total_sales_today: float
    total_orders_today: int
    total_customers: int
    total_products: int
    low_stock_products: int
    top_products: List[Dict[str, Any]]
    recent_orders: List[Dict[str, Any]]
    sales_by_payment_method: Dict[str, float]

class SalesSummary(BaseModel):
    date: str
    total_sales: float
    total_orders: int
    cash_sales: float
    card_sales: float
    mobile_money_sales: float
    credit_sales: float

# Business Details Models
class BusinessDetails(BaseModel):
    name: str
    logo_base64: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    country_code: str = "+254"  # Default Kenya country code for phone numbers
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    tax_id: Optional[str] = None
    registration_number: Optional[str] = None
    currency: str = "USD"
    currency_symbol: str = "$"

class BusinessDetailsResponse(BusinessDetails):
    id: str
    updated_at: datetime

# Expense Models
class ExpenseCreate(BaseModel):
    category: ExpenseCategory
    description: str
    amount: float
    vendor: Optional[str] = None
    receipt_number: Optional[str] = None
    date: str  # YYYY-MM-DD format
    notes: Optional[str] = None

class ExpenseUpdate(BaseModel):
    category: Optional[ExpenseCategory] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    vendor: Optional[str] = None
    receipt_number: Optional[str] = None
    date: Optional[str] = None
    notes: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: str
    category: ExpenseCategory
    description: str
    amount: float
    vendor: Optional[str] = None
    receipt_number: Optional[str] = None
    date: str
    notes: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: datetime

# Subscription Models
class SubscriptionInfo(BaseModel):
    plan_name: str = "Professional"
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    start_date: str
    end_date: str
    days_remaining: int = 0
    amount: float = 0.0
    currency: str = "USD"

class SubscriptionPayment(BaseModel):
    plan_name: str
    amount: float
    payment_method: str
    payment_reference: Optional[str] = None

class SubscriptionResponse(BaseModel):
    id: str
    plan_name: str
    status: SubscriptionStatus
    start_date: datetime
    end_date: datetime
    amount_paid: float
    payment_method: str
    payment_reference: Optional[str] = None
    created_at: datetime

# Promotion/Campaign Models
class PromotionCondition(BaseModel):
    min_spend: Optional[float] = None  # For spend_x_get_y
    min_quantity: Optional[int] = None  # For buy_x_get_y_free
    product_id: Optional[str] = None  # Specific product for buy_x_get_y_free

class PromotionReward(BaseModel):
    discount_percentage: Optional[float] = None  # For percentage_discount
    discount_amount: Optional[float] = None  # For fixed_discount or spend_x_get_y
    free_product_id: Optional[str] = None  # For buy_x_get_y_free or spend_x_get_y
    free_quantity: Optional[int] = None  # For buy_x_get_y_free

class PromotionBase(BaseModel):
    name: str
    description: Optional[str] = None
    promotion_type: PromotionType
    start_date: str  # Format: YYYY-MM-DD
    end_date: str  # Format: YYYY-MM-DD
    is_active: bool = True
    applicable_product_ids: List[str] = []  # Empty means all products
    applicable_category_ids: List[str] = []  # Empty means all categories
    condition: Optional[PromotionCondition] = None
    reward: PromotionReward

class PromotionCreate(PromotionBase):
    pass

class PromotionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = None
    applicable_product_ids: Optional[List[str]] = None
    applicable_category_ids: Optional[List[str]] = None
    condition: Optional[PromotionCondition] = None
    reward: Optional[PromotionReward] = None

class PromotionResponse(PromotionBase):
    id: str
    created_at: datetime
    created_by: str
    created_by_name: str

# User Management Models (Admin)
class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole
    phone: Optional[str] = None

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

# ============== HELPER FUNCTIONS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="User is inactive")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable format"""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc

async def generate_order_number() -> str:
    """Generate unique order number"""
    today = datetime.utcnow().strftime("%Y%m%d")
    count = await db.orders.count_documents({
        "created_at": {"$gte": datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)}
    })
    return f"ORD-{today}-{str(count + 1).zfill(4)}"

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = {
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "phone": user_data.phone,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    token = create_token(user_id, user_data.email, user_data.role)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            role=user_data.role,
            phone=user_data.phone,
            is_active=True,
            created_at=user_dict["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is inactive")
    
    user_id = str(user["_id"])
    token = create_token(user_id, user["email"], user["role"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user["email"],
            name=user["name"],
            role=user["role"],
            phone=user.get("phone"),
            is_active=user["is_active"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        phone=current_user.get("phone"),
        is_active=current_user["is_active"],
        created_at=current_user["created_at"]
    )

# ============== CATEGORY ROUTES ==============

@api_router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.categories.find({"is_active": True}).to_list(100)
    return [CategoryResponse(
        id=str(cat["_id"]),
        name=cat["name"],
        description=cat.get("description"),
        image=cat.get("image"),
        is_active=cat["is_active"],
        created_at=cat["created_at"]
    ) for cat in categories]

@api_router.post("/categories", response_model=CategoryResponse)
async def create_category(category: CategoryCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    cat_dict = category.dict()
    cat_dict["created_at"] = datetime.utcnow()
    
    result = await db.categories.insert_one(cat_dict)
    cat_dict["id"] = str(result.inserted_id)
    cat_dict.pop("_id", None)
    
    return CategoryResponse(**cat_dict)

@api_router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, category: CategoryCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in category.dict().items() if v is not None}
    
    result = await db.categories.update_one(
        {"_id": ObjectId(category_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    updated_cat = await db.categories.find_one({"_id": ObjectId(category_id)})
    return CategoryResponse(
        id=str(updated_cat["_id"]),
        name=updated_cat["name"],
        description=updated_cat.get("description"),
        image=updated_cat.get("image"),
        is_active=updated_cat["is_active"],
        created_at=updated_cat["created_at"]
    )

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.categories.update_one(
        {"_id": ObjectId(category_id)},
        {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted"}

# ============== PRODUCT ROUTES ==============

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    low_stock_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    query = {"is_active": True}
    
    if category_id:
        query["category_id"] = category_id
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}},
            {"barcode": {"$regex": search, "$options": "i"}}
        ]
    
    if low_stock_only:
        query["$expr"] = {"$lte": ["$stock_quantity", "$low_stock_threshold"]}
    
    products = await db.products.find(query).sort("name", 1).to_list(500)
    
    # Get category names
    category_ids = list(set(p.get("category_id") for p in products if p.get("category_id")))
    categories = {}
    if category_ids:
        cats = await db.categories.find({"_id": {"$in": [ObjectId(cid) for cid in category_ids]}}).to_list(100)
        categories = {str(c["_id"]): c["name"] for c in cats}
    
    return [ProductResponse(
        id=str(p["_id"]),
        name=p["name"],
        description=p.get("description"),
        category_id=p.get("category_id", ""),
        category_name=categories.get(p.get("category_id")),
        image=p.get("image"),
        price=p["price"],
        cost_price=p.get("cost_price"),
        sku=p["sku"],
        barcode=p.get("barcode"),
        stock_quantity=p.get("stock_quantity", 0),
        low_stock_threshold=p.get("low_stock_threshold", 10),
        variants=p.get("variants", []),
        is_active=p["is_active"],
        tax_rate=p.get("tax_rate", 0.0),
        created_at=p["created_at"],
        updated_at=p.get("updated_at", p["created_at"])
    ) for p in products]

@api_router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    category_name = None
    if product.get("category_id"):
        cat = await db.categories.find_one({"_id": ObjectId(product["category_id"])})
        if cat:
            category_name = cat["name"]
    
    return ProductResponse(
        id=str(product["_id"]),
        name=product["name"],
        description=product.get("description"),
        category_id=product.get("category_id", ""),
        category_name=category_name,
        image=product.get("image"),
        price=product["price"],
        cost_price=product.get("cost_price"),
        sku=product["sku"],
        barcode=product.get("barcode"),
        stock_quantity=product.get("stock_quantity", 0),
        low_stock_threshold=product.get("low_stock_threshold", 10),
        variants=product.get("variants", []),
        is_active=product["is_active"],
        tax_rate=product.get("tax_rate", 0.0),
        created_at=product["created_at"],
        updated_at=product.get("updated_at", product["created_at"])
    )

@api_router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check SKU uniqueness
    existing = await db.products.find_one({"sku": product.sku})
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")
    
    prod_dict = product.dict()
    prod_dict["created_at"] = datetime.utcnow()
    prod_dict["updated_at"] = datetime.utcnow()
    
    result = await db.products.insert_one(prod_dict)
    
    category_name = None
    if product.category_id:
        cat = await db.categories.find_one({"_id": ObjectId(product.category_id)})
        if cat:
            category_name = cat["name"]
    
    return ProductResponse(
        id=str(result.inserted_id),
        category_name=category_name,
        created_at=prod_dict["created_at"],
        updated_at=prod_dict["updated_at"],
        **product.dict()
    )

@api_router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, product: ProductUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in product.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return await get_product(product_id, current_user)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deleted"}

# ============== CUSTOMER ROUTES ==============

@api_router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    customers = await db.customers.find(query).sort("name", 1).to_list(500)
    
    return [CustomerResponse(
        id=str(c["_id"]),
        name=c["name"],
        email=c.get("email"),
        phone=c["phone"],
        address=c.get("address"),
        birthday=c.get("birthday"),
        credit_limit=c.get("credit_limit", 0.0),
        credit_balance=c.get("credit_balance", 0.0),
        notes=c.get("notes"),
        total_purchases=c.get("total_purchases", 0.0),
        total_orders=c.get("total_orders", 0),
        created_at=c["created_at"]
    ) for c in customers]

@api_router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return CustomerResponse(
        id=str(customer["_id"]),
        name=customer["name"],
        email=customer.get("email"),
        phone=customer["phone"],
        address=customer.get("address"),
        birthday=customer.get("birthday"),
        credit_limit=customer.get("credit_limit", 0.0),
        credit_balance=customer.get("credit_balance", 0.0),
        notes=customer.get("notes"),
        total_purchases=customer.get("total_purchases", 0.0),
        total_orders=customer.get("total_orders", 0),
        created_at=customer["created_at"]
    )

def normalize_phone(phone: str) -> str:
    """Normalize phone number by removing non-digits and handling country codes"""
    if not phone:
        return ""
    # Remove all non-digit characters
    digits_only = ''.join(filter(str.isdigit, phone))
    # Remove leading zeros
    digits_only = digits_only.lstrip('0')
    # Remove common country codes (254 for Kenya, 1 for US, etc.)
    # Keep only the last 9 digits (local number without country code)
    if len(digits_only) >= 9:
        digits_only = digits_only[-9:]
    return digits_only

@api_router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, current_user: dict = Depends(get_current_user)):
    # Validate phone number - must have at least 9 digits
    phone_digits = ''.join(filter(str.isdigit, customer.phone))
    if len(phone_digits) < 9:
        raise HTTPException(status_code=400, detail="Phone number must have at least 9 digits")
    
    # Normalize the incoming phone number
    normalized_phone = normalize_phone(customer.phone)
    
    # Check phone uniqueness by comparing normalized versions
    all_customers = await db.customers.find().to_list(None)
    for existing in all_customers:
        if normalize_phone(existing.get("phone", "")) == normalized_phone:
            raise HTTPException(status_code=400, detail="Customer with this phone number already exists")
    
    cust_dict = customer.dict()
    cust_dict["created_at"] = datetime.utcnow()
    cust_dict["total_purchases"] = 0.0
    cust_dict["total_orders"] = 0
    
    result = await db.customers.insert_one(cust_dict)
    
    return CustomerResponse(
        id=str(result.inserted_id),
        total_purchases=0.0,
        total_orders=0,
        created_at=cust_dict["created_at"],
        **customer.dict()
    )

@api_router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, customer: CustomerUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in customer.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    # Validate phone number if being updated
    if "phone" in update_data:
        phone_digits = ''.join(filter(str.isdigit, update_data["phone"]))
        if len(phone_digits) < 9:
            raise HTTPException(status_code=400, detail="Phone number must have at least 9 digits")
    
    result = await db.customers.update_one(
        {"_id": ObjectId(customer_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return await get_customer(customer_id, current_user)

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    # Check if customer has orders
    order_count = await db.orders.count_documents({"customer_id": customer_id})
    if order_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete customer with {order_count} orders. Consider deactivating instead."
        )
    
    result = await db.customers.delete_one({"_id": ObjectId(customer_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {"message": "Customer deleted successfully"}

# ============== ORDER/SALE ROUTES ==============

@api_router.get("/orders", response_model=List[OrderResponse])
async def get_orders(
    status: Optional[OrderStatus] = None,
    customer_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if status:
        query["status"] = status
    
    if customer_id:
        query["customer_id"] = customer_id
    
    if date_from:
        query["created_at"] = {"$gte": datetime.fromisoformat(date_from)}
    
    if date_to:
        if "created_at" in query:
            query["created_at"]["$lte"] = datetime.fromisoformat(date_to)
        else:
            query["created_at"] = {"$lte": datetime.fromisoformat(date_to)}
    
    # Sales staff can only see their own orders
    if current_user["role"] == UserRole.SALES_STAFF:
        query["created_by"] = str(current_user["_id"])
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(limit)
    
    return [OrderResponse(
        id=str(o["_id"]),
        order_number=o["order_number"],
        customer_id=o.get("customer_id"),
        customer_name=o.get("customer_name"),
        items=o["items"],
        payments=[PaymentInfo(**p) for p in o["payments"]],
        discount_total=o.get("discount_total", 0),
        tax_total=o.get("tax_total", 0),
        subtotal=o["subtotal"],
        total=o["total"],
        amount_paid=o.get("amount_paid", 0),
        amount_due=o.get("amount_due", 0),
        status=o["status"],
        notes=o.get("notes"),
        created_by=o["created_by"],
        created_by_name=o.get("created_by_name", ""),
        created_at=o["created_at"]
    ) for o in orders]

@api_router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return OrderResponse(
        id=str(order["_id"]),
        order_number=order["order_number"],
        customer_id=order.get("customer_id"),
        customer_name=order.get("customer_name"),
        items=order["items"],
        payments=[PaymentInfo(**p) for p in order["payments"]],
        discount_total=order.get("discount_total", 0),
        tax_total=order.get("tax_total", 0),
        subtotal=order["subtotal"],
        total=order["total"],
        amount_paid=order.get("amount_paid", 0),
        amount_due=order.get("amount_due", 0),
        status=order["status"],
        notes=order.get("notes"),
        created_by=order["created_by"],
        created_by_name=order.get("created_by_name", ""),
        created_at=order["created_at"]
    )

@api_router.post("/orders", response_model=OrderResponse)
async def create_order(order: OrderCreate, current_user: dict = Depends(get_current_user)):
    # Generate order number
    order_number = await generate_order_number()
    
    # Calculate amounts
    amount_paid = sum(p.amount for p in order.payments)
    amount_due = order.total - amount_paid
    
    # Get customer name if customer_id provided
    customer_name = None
    if order.customer_id:
        customer = await db.customers.find_one({"_id": ObjectId(order.customer_id)})
        if customer:
            customer_name = customer["name"]
    
    order_dict = {
        "order_number": order_number,
        "customer_id": order.customer_id,
        "customer_name": customer_name,
        "items": [item.dict() for item in order.items],
        "payments": [p.dict() for p in order.payments],
        "discount_total": order.discount_total,
        "tax_total": order.tax_total,
        "subtotal": order.subtotal,
        "total": order.total,
        "amount_paid": amount_paid,
        "amount_due": amount_due,
        "status": OrderStatus.COMPLETED if amount_due <= 0 else OrderStatus.PENDING,
        "notes": order.notes,
        "created_by": str(current_user["_id"]),
        "created_by_name": current_user["name"],
        "created_at": datetime.utcnow()
    }
    
    result = await db.orders.insert_one(order_dict)
    
    # Update stock quantities
    for item in order.items:
        await db.products.update_one(
            {"_id": ObjectId(item.product_id)},
            {"$inc": {"stock_quantity": -item.quantity}}
        )
    
    # Update customer stats if customer provided
    if order.customer_id:
        await db.customers.update_one(
            {"_id": ObjectId(order.customer_id)},
            {
                "$inc": {
                    "total_purchases": order.total,
                    "total_orders": 1,
                    "credit_balance": amount_due if any(p.method == PaymentMethod.CREDIT for p in order.payments) else 0
                }
            }
        )
    
    return OrderResponse(
        id=str(result.inserted_id),
        order_number=order_number,
        customer_id=order.customer_id,
        customer_name=customer_name,
        items=[item.dict() for item in order.items],
        payments=order.payments,
        discount_total=order.discount_total,
        tax_total=order.tax_total,
        subtotal=order.subtotal,
        total=order.total,
        amount_paid=amount_paid,
        amount_due=amount_due,
        status=order_dict["status"],
        notes=order.notes,
        created_by=order_dict["created_by"],
        created_by_name=order_dict["created_by_name"],
        created_at=order_dict["created_at"]
    )

# ============== DASHBOARD ROUTES ==============

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Build query based on role
    order_query = {"created_at": {"$gte": today_start}, "status": {"$ne": OrderStatus.CANCELLED}}
    if current_user["role"] == UserRole.SALES_STAFF:
        order_query["created_by"] = str(current_user["_id"])
    
    # Today's sales
    today_orders = await db.orders.find(order_query).to_list(1000)
    total_sales_today = sum(o["total"] for o in today_orders)
    total_orders_today = len(today_orders)
    
    # Sales by payment method
    sales_by_payment = {"cash": 0, "card": 0, "mobile_money": 0, "credit": 0}
    for order in today_orders:
        for payment in order.get("payments", []):
            method = payment.get("method", "cash")
            sales_by_payment[method] = sales_by_payment.get(method, 0) + payment.get("amount", 0)
    
    # Totals
    total_customers = await db.customers.count_documents({})
    total_products = await db.products.count_documents({"is_active": True})
    
    # Low stock products
    low_stock = await db.products.count_documents({
        "is_active": True,
        "$expr": {"$lte": ["$stock_quantity", "$low_stock_threshold"]}
    })
    
    # Top products (by quantity sold today)
    product_sales = {}
    for order in today_orders:
        for item in order.get("items", []):
            pid = item.get("product_id")
            if pid:
                if pid not in product_sales:
                    product_sales[pid] = {"name": item.get("product_name"), "quantity": 0, "revenue": 0}
                product_sales[pid]["quantity"] += item.get("quantity", 0)
                product_sales[pid]["revenue"] += item.get("subtotal", 0)
    
    top_products = sorted(product_sales.values(), key=lambda x: x["revenue"], reverse=True)[:5]
    
    # Recent orders
    recent_orders = [
        {
            "id": str(o["_id"]),
            "order_number": o["order_number"],
            "total": o["total"],
            "customer_name": o.get("customer_name", "Walk-in"),
            "status": o["status"],
            "created_at": o["created_at"].isoformat()
        }
        for o in today_orders[:10]
    ]
    
    return DashboardStats(
        total_sales_today=total_sales_today,
        total_orders_today=total_orders_today,
        total_customers=total_customers,
        total_products=total_products,
        low_stock_products=low_stock,
        top_products=top_products,
        recent_orders=recent_orders,
        sales_by_payment_method=sales_by_payment
    )

@api_router.get("/dashboard/sales-summary", response_model=List[SalesSummary])
async def get_sales_summary(
    days: int = 7,
    current_user: dict = Depends(get_current_user)
):
    summaries = []
    
    for i in range(days):
        date = datetime.utcnow() - timedelta(days=i)
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        query = {
            "created_at": {"$gte": day_start, "$lt": day_end},
            "status": {"$ne": OrderStatus.CANCELLED}
        }
        
        if current_user["role"] == UserRole.SALES_STAFF:
            query["created_by"] = str(current_user["_id"])
        
        orders = await db.orders.find(query).to_list(1000)
        
        total_sales = sum(o["total"] for o in orders)
        cash_sales = 0
        card_sales = 0
        mobile_money_sales = 0
        credit_sales = 0
        
        for order in orders:
            for payment in order.get("payments", []):
                amount = payment.get("amount", 0)
                method = payment.get("method", "cash")
                if method == "cash":
                    cash_sales += amount
                elif method == "card":
                    card_sales += amount
                elif method == "mobile_money":
                    mobile_money_sales += amount
                elif method == "credit":
                    credit_sales += amount
        
        summaries.append(SalesSummary(
            date=day_start.strftime("%Y-%m-%d"),
            total_sales=total_sales,
            total_orders=len(orders),
            cash_sales=cash_sales,
            card_sales=card_sales,
            mobile_money_sales=mobile_money_sales,
            credit_sales=credit_sales
        ))
    
    return summaries

# ============== INVENTORY ROUTES ==============

@api_router.post("/inventory/stock-adjustment")
async def adjust_stock(
    product_id: str,
    quantity: int,
    reason: str,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update stock
    new_quantity = product.get("stock_quantity", 0) + quantity
    await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {"stock_quantity": new_quantity, "updated_at": datetime.utcnow()}}
    )
    
    # Log the adjustment
    await db.stock_adjustments.insert_one({
        "product_id": product_id,
        "product_name": product["name"],
        "previous_quantity": product.get("stock_quantity", 0),
        "adjustment": quantity,
        "new_quantity": new_quantity,
        "reason": reason,
        "adjusted_by": str(current_user["_id"]),
        "adjusted_by_name": current_user["name"],
        "created_at": datetime.utcnow()
    })
    
    return {"message": "Stock adjusted", "new_quantity": new_quantity}

@api_router.get("/inventory/low-stock", response_model=List[ProductResponse])
async def get_low_stock_products(current_user: dict = Depends(get_current_user)):
    products = await db.products.find({
        "is_active": True,
        "$expr": {"$lte": ["$stock_quantity", "$low_stock_threshold"]}
    }).to_list(100)
    
    return [ProductResponse(
        id=str(p["_id"]),
        name=p["name"],
        description=p.get("description"),
        category_id=p.get("category_id", ""),
        image=p.get("image"),
        price=p["price"],
        cost_price=p.get("cost_price"),
        sku=p["sku"],
        barcode=p.get("barcode"),
        stock_quantity=p.get("stock_quantity", 0),
        low_stock_threshold=p.get("low_stock_threshold", 10),
        variants=p.get("variants", []),
        is_active=p["is_active"],
        tax_rate=p.get("tax_rate", 0.0),
        created_at=p["created_at"],
        updated_at=p.get("updated_at", p["created_at"])
    ) for p in products]

# ============== ADMIN REPORTS ROUTES ==============

class ReportSummary(BaseModel):
    period: str
    total_revenue: float
    total_orders: int
    total_items_sold: int
    avg_order_value: float
    new_customers: int
    top_selling_products: List[Dict[str, Any]]
    sales_by_category: List[Dict[str, Any]]
    sales_by_staff: List[Dict[str, Any]]
    hourly_sales: List[Dict[str, Any]]
    payment_method_breakdown: Dict[str, float]

@api_router.get("/admin/reports/summary")
async def get_report_summary(
    period: str = "today",  # today, yesterday, week, month
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Only admin or manager can view reports")
    
    # Calculate date range
    now = datetime.utcnow()
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now
    elif period == "yesterday":
        start_date = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=1)
    elif period == "week":
        start_date = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now
    elif period == "month":
        start_date = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now
    else:
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now
    
    # Get orders in date range
    orders = await db.orders.find({
        "created_at": {"$gte": start_date, "$lte": end_date},
        "status": {"$ne": OrderStatus.CANCELLED}
    }).to_list(10000)
    
    # Calculate metrics
    total_revenue = sum(o["total"] for o in orders)
    total_orders = len(orders)
    total_items_sold = sum(sum(item.get("quantity", 0) for item in o.get("items", [])) for o in orders)
    avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
    
    # New customers in period
    new_customers = await db.customers.count_documents({
        "created_at": {"$gte": start_date, "$lte": end_date}
    })
    
    # Top selling products
    product_sales = {}
    for order in orders:
        for item in order.get("items", []):
            pid = item.get("product_id", "unknown")
            pname = item.get("product_name", "Unknown")
            if pid not in product_sales:
                product_sales[pid] = {"name": pname, "quantity": 0, "revenue": 0}
            product_sales[pid]["quantity"] += item.get("quantity", 0)
            product_sales[pid]["revenue"] += item.get("subtotal", 0)
    
    top_products = sorted(product_sales.values(), key=lambda x: x["revenue"], reverse=True)[:10]
    
    # Sales by category
    category_sales = {}
    for order in orders:
        for item in order.get("items", []):
            pid = item.get("product_id")
            if pid:
                product = await db.products.find_one({"_id": ObjectId(pid)})
                if product:
                    cat_id = product.get("category_id")
                    if cat_id:
                        cat = await db.categories.find_one({"_id": ObjectId(cat_id)})
                        cat_name = cat["name"] if cat else "Uncategorized"
                    else:
                        cat_name = "Uncategorized"
                    if cat_name not in category_sales:
                        category_sales[cat_name] = {"name": cat_name, "revenue": 0, "quantity": 0}
                    category_sales[cat_name]["revenue"] += item.get("subtotal", 0)
                    category_sales[cat_name]["quantity"] += item.get("quantity", 0)
    
    sales_by_category = sorted(category_sales.values(), key=lambda x: x["revenue"], reverse=True)
    
    # Sales by staff
    staff_sales = {}
    for order in orders:
        staff_id = order.get("created_by", "unknown")
        staff_name = order.get("created_by_name", "Unknown")
        if staff_id not in staff_sales:
            staff_sales[staff_id] = {"name": staff_name, "orders": 0, "revenue": 0}
        staff_sales[staff_id]["orders"] += 1
        staff_sales[staff_id]["revenue"] += order["total"]
    
    sales_by_staff = sorted(staff_sales.values(), key=lambda x: x["revenue"], reverse=True)
    
    # Hourly sales distribution
    hourly_sales = {str(h).zfill(2): {"hour": f"{h}:00", "orders": 0, "revenue": 0} for h in range(24)}
    for order in orders:
        hour = str(order["created_at"].hour).zfill(2)
        hourly_sales[hour]["orders"] += 1
        hourly_sales[hour]["revenue"] += order["total"]
    
    hourly_data = [hourly_sales[str(h).zfill(2)] for h in range(24)]
    
    # Payment method breakdown
    payment_breakdown = {"cash": 0, "card": 0, "mobile_money": 0, "credit": 0}
    for order in orders:
        for payment in order.get("payments", []):
            method = payment.get("method", "cash")
            if method in payment_breakdown:
                payment_breakdown[method] += payment.get("amount", 0)
    
    return {
        "period": period,
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_items_sold": total_items_sold,
        "avg_order_value": avg_order_value,
        "new_customers": new_customers,
        "top_selling_products": top_products,
        "sales_by_category": sales_by_category,
        "sales_by_staff": sales_by_staff,
        "hourly_sales": hourly_data,
        "payment_method_breakdown": payment_breakdown
    }

# ============== BUSINESS DETAILS ROUTES ==============

@api_router.get("/business")
async def get_business_details(current_user: dict = Depends(get_current_user)):
    business = await db.business_details.find_one()
    if not business:
        # Return default business details
        return {
            "id": None,
            "name": "My Business",
            "logo_base64": None,
            "address": None,
            "city": None,
            "country": None,
            "country_code": "+254",
            "phone": None,
            "email": None,
            "website": None,
            "tax_id": None,
            "registration_number": None,
            "currency": "USD",
            "currency_symbol": "$",
            "updated_at": datetime.utcnow()
        }
    
    return {
        "id": str(business["_id"]),
        **{k: v for k, v in business.items() if k != "_id"},
    }

@api_router.put("/business")
async def update_business_details(details: BusinessDetails, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admin can update business details")
    
    details_dict = details.dict()
    details_dict["updated_at"] = datetime.utcnow()
    
    # Upsert - update if exists, create if not
    existing = await db.business_details.find_one()
    if existing:
        await db.business_details.update_one(
            {"_id": existing["_id"]},
            {"$set": details_dict}
        )
        details_dict["id"] = str(existing["_id"])
    else:
        result = await db.business_details.insert_one(details_dict)
        details_dict["id"] = str(result.inserted_id)
    
    return details_dict

# ============== EXPENSE ROUTES ==============

@api_router.get("/expenses", response_model=List[ExpenseResponse])
async def get_expenses(
    category: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE]:
        raise HTTPException(status_code=403, detail="Not authorized to view expenses")
    
    query = {}
    if category:
        query["category"] = category
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query:
            query["date"]["$lte"] = date_to
        else:
            query["date"] = {"$lte": date_to}
    
    expenses = await db.expenses.find(query).sort("date", -1).limit(limit).to_list(limit)
    
    return [ExpenseResponse(
        id=str(exp["_id"]),
        category=exp["category"],
        description=exp["description"],
        amount=exp["amount"],
        vendor=exp.get("vendor"),
        receipt_number=exp.get("receipt_number"),
        date=exp["date"],
        notes=exp.get("notes"),
        created_by=exp["created_by"],
        created_by_name=exp["created_by_name"],
        created_at=exp["created_at"]
    ) for exp in expenses]

@api_router.post("/expenses", response_model=ExpenseResponse)
async def create_expense(expense: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE]:
        raise HTTPException(status_code=403, detail="Not authorized to create expenses")
    
    exp_dict = expense.dict()
    exp_dict["created_by"] = str(current_user["_id"])
    exp_dict["created_by_name"] = current_user["name"]
    exp_dict["created_at"] = datetime.utcnow()
    
    result = await db.expenses.insert_one(exp_dict)
    exp_dict["id"] = str(result.inserted_id)
    
    return ExpenseResponse(**exp_dict)

@api_router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(expense_id: str, expense: ExpenseUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE]:
        raise HTTPException(status_code=403, detail="Not authorized to update expenses")
    
    update_data = {k: v for k, v in expense.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.expenses.update_one(
        {"_id": ObjectId(expense_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    updated = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    return ExpenseResponse(
        id=str(updated["_id"]),
        category=updated["category"],
        description=updated["description"],
        amount=updated["amount"],
        vendor=updated.get("vendor"),
        receipt_number=updated.get("receipt_number"),
        date=updated["date"],
        notes=updated.get("notes"),
        created_by=updated["created_by"],
        created_by_name=updated["created_by_name"],
        created_at=updated["created_at"]
    )

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE]:
        raise HTTPException(status_code=403, detail="Not authorized to delete expenses")
    
    result = await db.expenses.delete_one({"_id": ObjectId(expense_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return {"message": "Expense deleted successfully"}

@api_router.get("/expenses/summary")
async def get_expense_summary(
    period: str = "month",
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER, UserRole.FINANCE]:
        raise HTTPException(status_code=403, detail="Not authorized to view expense summary")
    
    now = datetime.utcnow()
    if period == "today":
        start_date = now.strftime("%Y-%m-%d")
    elif period == "week":
        start_date = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    elif period == "month":
        start_date = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    elif period == "year":
        start_date = (now - timedelta(days=365)).strftime("%Y-%m-%d")
    else:
        start_date = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    
    expenses = await db.expenses.find({"date": {"$gte": start_date}}).to_list(10000)
    
    total = sum(exp["amount"] for exp in expenses)
    by_category = {}
    for exp in expenses:
        cat = exp["category"]
        if cat not in by_category:
            by_category[cat] = 0
        by_category[cat] += exp["amount"]
    
    return {
        "period": period,
        "total_expenses": total,
        "count": len(expenses),
        "by_category": [{"category": k, "amount": v} for k, v in sorted(by_category.items(), key=lambda x: x[1], reverse=True)]
    }

# ============== SUBSCRIPTION ROUTES ==============

@api_router.get("/subscription")
async def get_subscription_status(current_user: dict = Depends(get_current_user)):
    # Get the latest subscription
    subscription = await db.subscriptions.find_one(sort=[("created_at", -1)])
    
    if not subscription:
        # Create a default trial subscription
        trial_end = datetime.utcnow() + timedelta(days=30)
        default_sub = {
            "plan_name": "Trial",
            "status": SubscriptionStatus.ACTIVE,
            "start_date": datetime.utcnow(),
            "end_date": trial_end,
            "amount_paid": 0,
            "payment_method": "trial",
            "created_at": datetime.utcnow()
        }
        await db.subscriptions.insert_one(default_sub)
        subscription = default_sub
    
    # Check if subscription has expired
    end_date = subscription["end_date"]
    now = datetime.utcnow()
    days_remaining = max(0, (end_date - now).days)
    
    status = subscription["status"]
    if end_date < now:
        if days_remaining >= -7:  # 7 day grace period
            status = SubscriptionStatus.GRACE_PERIOD
        else:
            status = SubscriptionStatus.EXPIRED
    
    return {
        "id": str(subscription.get("_id", "")),
        "plan_name": subscription["plan_name"],
        "status": status,
        "start_date": subscription["start_date"].isoformat() if isinstance(subscription["start_date"], datetime) else subscription["start_date"],
        "end_date": subscription["end_date"].isoformat() if isinstance(subscription["end_date"], datetime) else subscription["end_date"],
        "days_remaining": days_remaining,
        "amount_paid": subscription.get("amount_paid", 0),
        "payment_method": subscription.get("payment_method", ""),
        "is_active": status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE_PERIOD]
    }

@api_router.post("/subscription/pay")
async def record_subscription_payment(payment: SubscriptionPayment, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admin can manage subscription")
    
    # Calculate subscription period based on plan
    plan_durations = {
        "Monthly": 30,
        "Quarterly": 90,
        "Annual": 365,
        "Professional": 30,
        "Enterprise": 30
    }
    
    duration_days = plan_durations.get(payment.plan_name, 30)
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=duration_days)
    
    subscription = {
        "plan_name": payment.plan_name,
        "status": SubscriptionStatus.ACTIVE,
        "start_date": start_date,
        "end_date": end_date,
        "amount_paid": payment.amount,
        "payment_method": payment.payment_method,
        "payment_reference": payment.payment_reference,
        "created_by": current_user["user_id"],
        "created_at": datetime.utcnow()
    }
    
    result = await db.subscriptions.insert_one(subscription)
    
    return {
        "message": "Subscription payment recorded",
        "subscription_id": str(result.inserted_id),
        "end_date": end_date.isoformat(),
        "days": duration_days
    }

@api_router.get("/subscription/history")
async def get_subscription_history(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admin can view subscription history")
    
    subscriptions = await db.subscriptions.find().sort("created_at", -1).limit(20).to_list(20)
    
    return [{
        "id": str(sub["_id"]),
        "plan_name": sub["plan_name"],
        "status": sub["status"],
        "start_date": sub["start_date"].isoformat() if isinstance(sub["start_date"], datetime) else sub["start_date"],
        "end_date": sub["end_date"].isoformat() if isinstance(sub["end_date"], datetime) else sub["end_date"],
        "amount_paid": sub.get("amount_paid", 0),
        "payment_method": sub.get("payment_method", ""),
        "created_at": sub["created_at"].isoformat() if isinstance(sub["created_at"], datetime) else sub["created_at"]
    } for sub in subscriptions]

# ============== ROOT ROUTE ==============

@api_router.get("/")
async def root():
    return {"message": "Retail Management API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# ============== ADMIN USER MANAGEMENT ROUTES ==============

@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admin can manage users")
    
    users = await db.users.find().sort("name", 1).to_list(500)
    return [UserResponse(
        id=str(u["_id"]),
        email=u["email"],
        name=u["name"],
        role=u["role"],
        phone=u.get("phone"),
        is_active=u.get("is_active", True),
        created_at=u["created_at"]
    ) for u in users]

@api_router.post("/admin/users", response_model=UserResponse)
async def admin_create_user(user_data: AdminUserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admin can create users")
    
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = {
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "phone": user_data.phone,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    
    return UserResponse(
        id=str(result.inserted_id),
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        phone=user_data.phone,
        is_active=True,
        created_at=user_dict["created_at"]
    )

@api_router.put("/admin/users/{user_id}", response_model=UserResponse)
async def admin_update_user(user_id: str, user_data: AdminUserUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admin can update users")
    
    update_data = {k: v for k, v in user_data.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        role=user["role"],
        phone=user.get("phone"),
        is_active=user.get("is_active", True),
        created_at=user["created_at"]
    )

@api_router.delete("/admin/users/{user_id}")
async def admin_deactivate_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admin can deactivate users")
    
    # Prevent deactivating yourself
    if user_id == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deactivated"}

# ============== PROMOTION/CAMPAIGN ROUTES ==============

@api_router.get("/promotions", response_model=List[PromotionResponse])
async def get_promotions(
    active_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if active_only:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        query["is_active"] = True
        query["start_date"] = {"$lte": today}
        query["end_date"] = {"$gte": today}
    
    promotions = await db.promotions.find(query).sort("created_at", -1).to_list(100)
    
    return [PromotionResponse(
        id=str(p["_id"]),
        name=p["name"],
        description=p.get("description"),
        promotion_type=p["promotion_type"],
        start_date=p["start_date"],
        end_date=p["end_date"],
        is_active=p["is_active"],
        applicable_product_ids=p.get("applicable_product_ids", []),
        applicable_category_ids=p.get("applicable_category_ids", []),
        condition=p.get("condition"),
        reward=p["reward"],
        created_at=p["created_at"],
        created_by=p["created_by"],
        created_by_name=p["created_by_name"]
    ) for p in promotions]

@api_router.get("/promotions/{promotion_id}", response_model=PromotionResponse)
async def get_promotion(promotion_id: str, current_user: dict = Depends(get_current_user)):
    promotion = await db.promotions.find_one({"_id": ObjectId(promotion_id)})
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    return PromotionResponse(
        id=str(promotion["_id"]),
        name=promotion["name"],
        description=promotion.get("description"),
        promotion_type=promotion["promotion_type"],
        start_date=promotion["start_date"],
        end_date=promotion["end_date"],
        is_active=promotion["is_active"],
        applicable_product_ids=promotion.get("applicable_product_ids", []),
        applicable_category_ids=promotion.get("applicable_category_ids", []),
        condition=promotion.get("condition"),
        reward=promotion["reward"],
        created_at=promotion["created_at"],
        created_by=promotion["created_by"],
        created_by_name=promotion["created_by_name"]
    )

@api_router.post("/promotions", response_model=PromotionResponse)
async def create_promotion(promotion: PromotionCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Only admin or manager can create promotions")
    
    promo_dict = promotion.dict()
    promo_dict["created_at"] = datetime.utcnow()
    promo_dict["created_by"] = str(current_user["_id"])
    promo_dict["created_by_name"] = current_user["name"]
    
    result = await db.promotions.insert_one(promo_dict)
    
    return PromotionResponse(
        id=str(result.inserted_id),
        created_at=promo_dict["created_at"],
        created_by=promo_dict["created_by"],
        created_by_name=promo_dict["created_by_name"],
        **promotion.dict()
    )

@api_router.put("/promotions/{promotion_id}", response_model=PromotionResponse)
async def update_promotion(promotion_id: str, promotion: PromotionUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Only admin or manager can update promotions")
    
    update_data = {k: v for k, v in promotion.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.promotions.update_one(
        {"_id": ObjectId(promotion_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    return await get_promotion(promotion_id, current_user)

@api_router.put("/promotions/{promotion_id}/deactivate")
async def deactivate_promotion(promotion_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Only admin or manager can deactivate promotions")
    
    result = await db.promotions.update_one(
        {"_id": ObjectId(promotion_id)},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Promotion not found or already inactive")
    
    return {"message": "Promotion deactivated"}

@api_router.delete("/promotions/{promotion_id}")
async def delete_promotion(promotion_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Only admin or manager can delete promotions")
    
    result = await db.promotions.delete_one({"_id": ObjectId(promotion_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    return {"message": "Promotion permanently deleted"}

# Helper endpoint to get applicable promotions for cart
@api_router.post("/promotions/calculate")
async def calculate_promotions(
    items: List[OrderItem],
    current_user: dict = Depends(get_current_user)
):
    """Calculate applicable promotions for cart items"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    # Get active promotions
    active_promotions = await db.promotions.find({
        "is_active": True,
        "start_date": {"$lte": today},
        "end_date": {"$gte": today}
    }).to_list(100)
    
    applied_promotions = []
    total_discount = 0
    free_items = []
    
    cart_total = sum(item.subtotal for item in items)
    
    for promo in active_promotions:
        promo_type = promo["promotion_type"]
        reward = promo["reward"]
        condition = promo.get("condition", {})
        applicable_products = promo.get("applicable_product_ids", [])
        applicable_categories = promo.get("applicable_category_ids", [])
        
        # Check if promotion applies to any cart items
        applies_to_cart = False
        applicable_items = []
        
        for item in items:
            if not applicable_products and not applicable_categories:
                # Applies to all products
                applies_to_cart = True
                applicable_items.append(item)
            elif item.product_id in applicable_products:
                applies_to_cart = True
                applicable_items.append(item)
        
        if not applies_to_cart:
            continue
        
        # Apply promotion based on type
        if promo_type == PromotionType.PERCENTAGE_DISCOUNT:
            discount_pct = reward.get("discount_percentage", 0)
            for item in applicable_items:
                item_discount = (item.subtotal * discount_pct) / 100
                total_discount += item_discount
            applied_promotions.append({
                "id": str(promo["_id"]),
                "name": promo["name"],
                "type": promo_type,
                "discount": total_discount
            })
        
        elif promo_type == PromotionType.FIXED_DISCOUNT:
            discount_amt = reward.get("discount_amount", 0)
            total_discount += discount_amt
            applied_promotions.append({
                "id": str(promo["_id"]),
                "name": promo["name"],
                "type": promo_type,
                "discount": discount_amt
            })
        
        elif promo_type == PromotionType.SPEND_X_GET_Y:
            min_spend = condition.get("min_spend", 0)
            if cart_total >= min_spend:
                if reward.get("discount_amount"):
                    total_discount += reward["discount_amount"]
                    applied_promotions.append({
                        "id": str(promo["_id"]),
                        "name": promo["name"],
                        "type": promo_type,
                        "discount": reward["discount_amount"]
                    })
                elif reward.get("free_product_id"):
                    free_items.append({
                        "product_id": reward["free_product_id"],
                        "promotion_id": str(promo["_id"]),
                        "promotion_name": promo["name"]
                    })
                    applied_promotions.append({
                        "id": str(promo["_id"]),
                        "name": promo["name"],
                        "type": promo_type,
                        "free_product": reward["free_product_id"]
                    })
        
        elif promo_type == PromotionType.BUY_X_GET_Y_FREE:
            required_product_id = condition.get("product_id")
            min_quantity = condition.get("min_quantity", 1)
            
            for item in items:
                if item.product_id == required_product_id and item.quantity >= min_quantity:
                    free_qty = reward.get("free_quantity", 1)
                    free_product_id = reward.get("free_product_id", required_product_id)
                    free_items.append({
                        "product_id": free_product_id,
                        "quantity": free_qty,
                        "promotion_id": str(promo["_id"]),
                        "promotion_name": promo["name"]
                    })
                    applied_promotions.append({
                        "id": str(promo["_id"]),
                        "name": promo["name"],
                        "type": promo_type,
                        "free_product": free_product_id,
                        "free_quantity": free_qty
                    })
    
    return {
        "applied_promotions": applied_promotions,
        "total_discount": total_discount,
        "free_items": free_items
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
