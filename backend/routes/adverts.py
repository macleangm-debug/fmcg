"""
Advertisement Management Routes
Handles CRUD operations for promotional adverts/announcements
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from bson import ObjectId
import os
import jwt

router = APIRouter(prefix="/adverts", tags=["Advertisements"])

# Database connection
from motor.motor_asyncio import AsyncIOMotorClient
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "fmcg_db")
JWT_SECRET = os.environ.get("JWT_SECRET", "your-secret-key")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Auth dependency
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return current user"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return {
            "id": str(user["_id"]),
            "email": user.get("email"),
            "role": user.get("role", "user"),
            "business_id": str(user.get("business_id")) if user.get("business_id") else None,
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

# Models
class AdvertTranslation(BaseModel):
    """Translation for a single language"""
    title: str
    description: str
    cta_text: Optional[str] = None  # Call to action button text

class AdvertCreate(BaseModel):
    """Create a new advert"""
    translations: Dict[str, AdvertTranslation]  # e.g., {"en": {...}, "sw": {...}}
    cta_link: Optional[str] = None  # Where the CTA button links to
    background_color: Optional[str] = "#10B981"  # Default green
    text_color: Optional[str] = "#FFFFFF"
    icon: Optional[str] = "megaphone-outline"  # Ionicons name
    image_url: Optional[str] = None  # Optional background image
    target_products: List[str] = ["all"]  # ["all"] or ["retailpro", "inventory", etc.]
    priority: int = 0  # Higher = shows first
    is_active: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class AdvertUpdate(BaseModel):
    """Update an existing advert"""
    translations: Optional[Dict[str, AdvertTranslation]] = None
    cta_link: Optional[str] = None
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    icon: Optional[str] = None
    image_url: Optional[str] = None
    target_products: Optional[List[str]] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class AdvertResponse(BaseModel):
    """Response model for advert"""
    id: str
    translations: Dict[str, AdvertTranslation]
    cta_link: Optional[str]
    background_color: str
    text_color: str
    icon: Optional[str]
    image_url: Optional[str]
    target_products: List[str]
    priority: int
    is_active: bool
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

def serialize_advert(advert: dict) -> dict:
    """Convert MongoDB document to response format"""
    return {
        "id": str(advert["_id"]),
        "translations": advert.get("translations", {}),
        "cta_link": advert.get("cta_link"),
        "background_color": advert.get("background_color", "#10B981"),
        "text_color": advert.get("text_color", "#FFFFFF"),
        "icon": advert.get("icon"),
        "image_url": advert.get("image_url"),
        "target_products": advert.get("target_products", ["all"]),
        "priority": advert.get("priority", 0),
        "is_active": advert.get("is_active", True),
        "start_date": advert.get("start_date"),
        "end_date": advert.get("end_date"),
        "created_at": advert.get("created_at"),
        "updated_at": advert.get("updated_at"),
    }

# Routes

@router.get("/", response_model=List[AdvertResponse])
async def get_all_adverts(
    product: Optional[str] = None,
    active_only: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all adverts, optionally filtered by product
    """
    query = {}
    
    if active_only:
        query["is_active"] = True
        # Also check date range
        now = datetime.utcnow()
        query["$or"] = [
            {"start_date": None, "end_date": None},
            {"start_date": {"$lte": now}, "end_date": None},
            {"start_date": None, "end_date": {"$gte": now}},
            {"start_date": {"$lte": now}, "end_date": {"$gte": now}},
        ]
    
    if product:
        query["$or"] = [
            {"target_products": "all"},
            {"target_products": product}
        ]
    
    adverts = await db.adverts.find(query).sort("priority", -1).to_list(100)
    return [serialize_advert(a) for a in adverts]

@router.get("/public")
async def get_public_adverts(
    product: str = "all",
    language: str = "en"
):
    """
    Get active adverts for public display (no auth required)
    Returns adverts with translated content for the specified language
    """
    now = datetime.utcnow()
    
    query = {
        "is_active": True,
        "$and": [
            {"$or": [{"start_date": None}, {"start_date": {"$lte": now}}]},
            {"$or": [{"end_date": None}, {"end_date": {"$gte": now}}]},
        ],
        "$or": [
            {"target_products": "all"},
            {"target_products": product}
        ]
    }
    
    adverts = await db.adverts.find(query).sort("priority", -1).to_list(20)
    
    # Return with localized content
    result = []
    for advert in adverts:
        translations = advert.get("translations", {})
        # Try requested language, fallback to English, then first available
        content = translations.get(language) or translations.get("en") or (list(translations.values())[0] if translations else {})
        
        result.append({
            "id": str(advert["_id"]),
            "title": content.get("title", ""),
            "description": content.get("description", ""),
            "cta_text": content.get("cta_text"),
            "cta_link": advert.get("cta_link"),
            "background_color": advert.get("background_color", "#10B981"),
            "text_color": advert.get("text_color", "#FFFFFF"),
            "icon": advert.get("icon"),
            "image_url": advert.get("image_url"),
        })
    
    return result

@router.get("/{advert_id}", response_model=AdvertResponse)
async def get_advert(
    advert_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single advert by ID"""
    try:
        advert = await db.adverts.find_one({"_id": ObjectId(advert_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid advert ID")
    
    if not advert:
        raise HTTPException(status_code=404, detail="Advert not found")
    
    return serialize_advert(advert)

@router.post("/", response_model=AdvertResponse)
async def create_advert(
    advert: AdvertCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new advert (admin only)"""
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    now = datetime.utcnow()
    
    # Convert translations to dict format for MongoDB
    translations_dict = {}
    for lang, trans in advert.translations.items():
        translations_dict[lang] = {
            "title": trans.title,
            "description": trans.description,
            "cta_text": trans.cta_text
        }
    
    advert_doc = {
        "translations": translations_dict,
        "cta_link": advert.cta_link,
        "background_color": advert.background_color,
        "text_color": advert.text_color,
        "icon": advert.icon,
        "image_url": advert.image_url,
        "target_products": advert.target_products,
        "priority": advert.priority,
        "is_active": advert.is_active,
        "start_date": advert.start_date,
        "end_date": advert.end_date,
        "created_at": now,
        "updated_at": now,
        "created_by": current_user.get("id")
    }
    
    result = await db.adverts.insert_one(advert_doc)
    advert_doc["_id"] = result.inserted_id
    
    return serialize_advert(advert_doc)

@router.put("/{advert_id}", response_model=AdvertResponse)
async def update_advert(
    advert_id: str,
    advert: AdvertUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an existing advert (admin only)"""
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        existing = await db.adverts.find_one({"_id": ObjectId(advert_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid advert ID")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Advert not found")
    
    update_data = {"updated_at": datetime.utcnow()}
    
    if advert.translations is not None:
        translations_dict = {}
        for lang, trans in advert.translations.items():
            translations_dict[lang] = {
                "title": trans.title,
                "description": trans.description,
                "cta_text": trans.cta_text
            }
        update_data["translations"] = translations_dict
    
    for field in ["cta_link", "background_color", "text_color", "icon", "image_url", 
                  "target_products", "priority", "is_active", "start_date", "end_date"]:
        value = getattr(advert, field)
        if value is not None:
            update_data[field] = value
    
    await db.adverts.update_one(
        {"_id": ObjectId(advert_id)},
        {"$set": update_data}
    )
    
    updated = await db.adverts.find_one({"_id": ObjectId(advert_id)})
    return serialize_advert(updated)

@router.delete("/{advert_id}")
async def delete_advert(
    advert_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an advert (admin only)"""
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        result = await db.adverts.delete_one({"_id": ObjectId(advert_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid advert ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Advert not found")
    
    return {"message": "Advert deleted successfully"}

@router.post("/seed")
async def seed_sample_adverts(
    current_user: dict = Depends(get_current_user)
):
    """Seed sample adverts for testing (admin only)"""
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    sample_adverts = [
        # ========== UNIVERSAL ADVERTS (all products) ==========
        {
            "translations": {
                "en": {"title": "Refer & Earn $10", "description": "Invite friends and earn $10 credit for each successful referral!", "cta_text": "Get Your Link"},
                "sw": {"title": "Alika & Pata $10", "description": "Walika marafiki na upate $10 kwa kila aliyejiandikisha!", "cta_text": "Pata Link Yako"},
            },
            "cta_link": "/(tabs)/referral",
            "background_color": "#6366F1",
            "text_color": "#FFFFFF",
            "icon": "gift-outline",
            "target_products": ["all"],
            "priority": 10,
            "is_active": True
        },
        {
            "translations": {
                "en": {"title": "Level Up Your Business", "description": "Upgrade to Pro for advanced features and priority support.", "cta_text": "Upgrade Now"},
                "sw": {"title": "Boresha Biashara Yako", "description": "Panda hadi Pro kwa vipengele vya hali ya juu.", "cta_text": "Panda Sasa"},
            },
            "cta_link": "/subscription",
            "background_color": "#1F2937",
            "text_color": "#FFFFFF",
            "icon": "rocket-outline",
            "target_products": ["all"],
            "priority": 5,
            "is_active": True
        },
        # ========== RETAILPRO-SPECIFIC ==========
        {
            "translations": {
                "en": {"title": "Sales Up 40%!", "description": "Businesses using RetailPro see an average 40% increase in sales.", "cta_text": "See Statistics"},
                "sw": {"title": "Mauzo Yameongezeka 40%!", "description": "Biashara zinazotumia RetailPro zinaona ongezeko la 40%.", "cta_text": "Ona Takwimu"},
            },
            "cta_link": "/admin/reports",
            "background_color": "#1B4332",
            "text_color": "#FFFFFF",
            "icon": "trending-up-outline",
            "target_products": ["retailpro"],
            "priority": 9,
            "is_active": True
        },
        {
            "translations": {
                "en": {"title": "Smart POS Features", "description": "Barcode scanning, receipts, and real-time inventory sync.", "cta_text": "Explore POS"},
                "sw": {"title": "Vipengele vya POS", "description": "Kusoma barcode, risiti, na usawazishaji wa wakati halisi.", "cta_text": "Chunguza POS"},
            },
            "cta_link": "/retailpro/pos",
            "background_color": "#2D6A4F",
            "text_color": "#FFFFFF",
            "icon": "scan-outline",
            "target_products": ["retailpro"],
            "priority": 8,
            "is_active": True
        },
        # ========== INVENTORY-SPECIFIC ==========
        {
            "translations": {
                "en": {"title": "Never Run Out of Stock", "description": "Set up automatic low-stock alerts and reorder notifications.", "cta_text": "Set Alerts"},
                "sw": {"title": "Usikose Bidhaa", "description": "Weka arifa za bidhaa zinazopungua na kuagiza tena.", "cta_text": "Weka Arifa"},
            },
            "cta_link": "/inventory/alerts",
            "background_color": "#2563EB",
            "text_color": "#FFFFFF",
            "icon": "alert-circle-outline",
            "target_products": ["inventory"],
            "priority": 9,
            "is_active": True
        },
        {
            "translations": {
                "en": {"title": "Bulk Import Products", "description": "Upload hundreds of products at once with CSV import.", "cta_text": "Import Now"},
                "sw": {"title": "Ingiza Bidhaa Nyingi", "description": "Pakia mamia ya bidhaa kwa wakati mmoja na CSV.", "cta_text": "Ingiza Sasa"},
            },
            "cta_link": "/inventory/import",
            "background_color": "#1D4ED8",
            "text_color": "#FFFFFF",
            "icon": "cloud-upload-outline",
            "target_products": ["inventory"],
            "priority": 8,
            "is_active": True
        },
        # ========== INVOICING-SPECIFIC ==========
        {
            "translations": {
                "en": {"title": "Get Paid 2x Faster", "description": "Send professional invoices with online payment links.", "cta_text": "Create Invoice"},
                "sw": {"title": "Lipa Haraka Mara 2", "description": "Tuma ankara za kitaalamu na viungo vya malipo.", "cta_text": "Unda Ankara"},
            },
            "cta_link": "/invoicing/new",
            "background_color": "#7C3AED",
            "text_color": "#FFFFFF",
            "icon": "document-text-outline",
            "target_products": ["invoicing"],
            "priority": 9,
            "is_active": True
        },
        {
            "translations": {
                "en": {"title": "Recurring Invoices", "description": "Automate billing for subscription-based clients.", "cta_text": "Set Up"},
                "sw": {"title": "Ankara za Kurudia", "description": "Otomatiki ankara kwa wateja wa usajili.", "cta_text": "Sanidi"},
            },
            "cta_link": "/invoicing/recurring",
            "background_color": "#6D28D9",
            "text_color": "#FFFFFF",
            "icon": "repeat-outline",
            "target_products": ["invoicing"],
            "priority": 8,
            "is_active": True
        },
        # ========== KWIKPAY-SPECIFIC ==========
        {
            "translations": {
                "en": {"title": "Accept Mobile Money", "description": "M-Pesa, Tigo Pesa, Airtel Money - all in one place.", "cta_text": "Connect Now"},
                "sw": {"title": "Pokea Pesa za Simu", "description": "M-Pesa, Tigo Pesa, Airtel Money - mahali pamoja.", "cta_text": "Unganisha Sasa"},
            },
            "cta_link": "/kwikpay/connect",
            "background_color": "#14B8A6",
            "text_color": "#FFFFFF",
            "icon": "phone-portrait-outline",
            "target_products": ["kwikpay"],
            "priority": 9,
            "is_active": True
        },
        {
            "translations": {
                "en": {"title": "0% Transaction Fees", "description": "First month free! Accept payments without fees.", "cta_text": "Activate Offer"},
                "sw": {"title": "0% Ada za Muamala", "description": "Mwezi wa kwanza bila malipo! Pokea malipo bila ada.", "cta_text": "Amilisha Ofa"},
            },
            "cta_link": "/kwikpay/promo",
            "background_color": "#0D9488",
            "text_color": "#FFFFFF",
            "icon": "pricetag-outline",
            "target_products": ["kwikpay"],
            "priority": 8,
            "is_active": True
        },
        # ========== UNITXT-SPECIFIC ==========
        {
            "translations": {
                "en": {"title": "Bulk SMS at TZS 18/msg", "description": "Send thousands of messages instantly to your customers.", "cta_text": "Start Campaign"},
                "sw": {"title": "SMS Nyingi TZS 18/msg", "description": "Tuma maelfu ya ujumbe kwa wateja wako mara moja.", "cta_text": "Anza Kampeni"},
            },
            "cta_link": "/unitxt/campaign/new",
            "background_color": "#F59E0B",
            "text_color": "#FFFFFF",
            "icon": "chatbubbles-outline",
            "target_products": ["unitxt"],
            "priority": 9,
            "is_active": True
        },
        {
            "translations": {
                "en": {"title": "Free SMS Credits", "description": "Get 100 free SMS credits when you top up TZS 50,000+", "cta_text": "Top Up Now"},
                "sw": {"title": "Salio la SMS Bure", "description": "Pata SMS 100 bure ukiweka TZS 50,000+", "cta_text": "Weka Sasa"},
            },
            "cta_link": "/unitxt/topup",
            "background_color": "#D97706",
            "text_color": "#FFFFFF",
            "icon": "gift-outline",
            "target_products": ["unitxt"],
            "priority": 8,
            "is_active": True
        },
        # ========== EXPENSES-SPECIFIC ==========
        {
            "translations": {
                "en": {"title": "Snap & Track Receipts", "description": "Take a photo of receipts and auto-categorize expenses.", "cta_text": "Add Receipt"},
                "sw": {"title": "Piga & Fuatilia Risiti", "description": "Piga picha ya risiti na ugawanye matumizi kiotomatiki.", "cta_text": "Ongeza Risiti"},
            },
            "cta_link": "/expenses/scan",
            "background_color": "#EF4444",
            "text_color": "#FFFFFF",
            "icon": "camera-outline",
            "target_products": ["expenses"],
            "priority": 9,
            "is_active": True
        },
        {
            "translations": {
                "en": {"title": "Tax Season Ready", "description": "Export expense reports for easy tax filing.", "cta_text": "Generate Report"},
                "sw": {"title": "Tayari kwa Kodi", "description": "Hamisha ripoti za matumizi kwa urahisi wa kulipa kodi.", "cta_text": "Tengeneza Ripoti"},
            },
            "cta_link": "/expenses/reports",
            "background_color": "#DC2626",
            "text_color": "#FFFFFF",
            "icon": "document-attach-outline",
            "target_products": ["expenses"],
            "priority": 8,
            "is_active": True
        },
        # ========== LOYALTY-SPECIFIC ==========
        {
            "translations": {
                "en": {"title": "Boost Repeat Sales", "description": "Customers with loyalty cards spend 67% more.", "cta_text": "Start Program"},
                "sw": {"title": "Ongeza Mauzo Yanayorudia", "description": "Wateja wenye kadi za uaminifu hutumia 67% zaidi.", "cta_text": "Anza Programu"},
            },
            "cta_link": "/loyalty/setup",
            "background_color": "#EC4899",
            "text_color": "#FFFFFF",
            "icon": "heart-outline",
            "target_products": ["loyalty"],
            "priority": 9,
            "is_active": True
        },
        {
            "translations": {
                "en": {"title": "Birthday Rewards", "description": "Auto-send birthday discounts to delight your customers.", "cta_text": "Set Up"},
                "sw": {"title": "Zawadi za Siku ya Kuzaliwa", "description": "Tuma punguzo la siku ya kuzaliwa kiotomatiki.", "cta_text": "Sanidi"},
            },
            "cta_link": "/loyalty/birthday",
            "background_color": "#DB2777",
            "text_color": "#FFFFFF",
            "icon": "gift-outline",
            "target_products": ["loyalty"],
            "priority": 8,
            "is_active": True
        },
    ]
    
    now = datetime.utcnow()
    for advert in sample_adverts:
        advert["created_at"] = now
        advert["updated_at"] = now
        advert["created_by"] = current_user.get("id")
    
    # Clear existing adverts first
    await db.adverts.delete_many({})
    
    # Insert sample adverts
    result = await db.adverts.insert_many(sample_adverts)
    
    return {
        "message": f"Seeded {len(result.inserted_ids)} sample adverts",
        "advert_ids": [str(id) for id in result.inserted_ids]
    }

# Language settings routes
@router.get("/languages/available")
async def get_available_languages():
    """Get list of available languages"""
    return {
        "languages": [
            {"code": "en", "name": "English", "native_name": "English", "rtl": False},
            {"code": "sw", "name": "Swahili", "native_name": "Kiswahili", "rtl": False},
            {"code": "fr", "name": "French", "native_name": "Français", "rtl": False},
            {"code": "ar", "name": "Arabic", "native_name": "العربية", "rtl": True},
            {"code": "pt", "name": "Portuguese", "native_name": "Português", "rtl": False},
        ],
        "default": "en"
    }
