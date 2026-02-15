"""
Advertisement Management Routes
Handles CRUD operations for promotional adverts/announcements
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from bson import ObjectId
import os

router = APIRouter(prefix="/adverts", tags=["Advertisements"])

# Database connection
from motor.motor_asyncio import AsyncIOMotorClient
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "fmcg_db")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Import auth dependency
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from routes.auth import get_current_user

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
        {
            "translations": {
                "en": {
                    "title": "Refer & Earn $10",
                    "description": "Invite friends and earn $10 credit for each successful referral!",
                    "cta_text": "Get Your Link"
                },
                "sw": {
                    "title": "Alika & Pata $10",
                    "description": "Walika marafiki na upate $10 kwa kila aliyejiandikisha!",
                    "cta_text": "Pata Link Yako"
                },
                "fr": {
                    "title": "Parrainez & Gagnez $10",
                    "description": "Invitez des amis et gagnez $10 pour chaque parrainage réussi!",
                    "cta_text": "Obtenir Votre Lien"
                },
                "ar": {
                    "title": "أحِل واربح $10",
                    "description": "ادعُ أصدقائك واحصل على $10 لكل إحالة ناجحة!",
                    "cta_text": "احصل على رابطك"
                },
                "pt": {
                    "title": "Indique & Ganhe $10",
                    "description": "Convide amigos e ganhe $10 por cada indicação bem-sucedida!",
                    "cta_text": "Obter Seu Link"
                }
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
                "en": {
                    "title": "New: Bulk SMS",
                    "description": "Send thousands of messages instantly with UniTxt Bulk SMS!",
                    "cta_text": "Try Now"
                },
                "sw": {
                    "title": "Mpya: SMS Nyingi",
                    "description": "Tuma maelfu ya ujumbe kwa wakati mmoja na UniTxt!",
                    "cta_text": "Jaribu Sasa"
                },
                "fr": {
                    "title": "Nouveau: SMS en Masse",
                    "description": "Envoyez des milliers de messages instantanément avec UniTxt!",
                    "cta_text": "Essayer"
                },
                "ar": {
                    "title": "جديد: رسائل جماعية",
                    "description": "أرسل آلاف الرسائل فوراً مع UniTxt!",
                    "cta_text": "جرب الآن"
                },
                "pt": {
                    "title": "Novo: SMS em Massa",
                    "description": "Envie milhares de mensagens instantaneamente com UniTxt!",
                    "cta_text": "Experimente"
                }
            },
            "cta_link": "/products/bulk-sms",
            "background_color": "#F59E0B",
            "text_color": "#FFFFFF",
            "icon": "chatbubbles-outline",
            "target_products": ["all"],
            "priority": 9,
            "is_active": True
        },
        {
            "translations": {
                "en": {
                    "title": "Sales Up 40%!",
                    "description": "Businesses using RetailPro see an average 40% increase in sales.",
                    "cta_text": "See Statistics"
                },
                "sw": {
                    "title": "Mauzo Yameongezeka 40%!",
                    "description": "Biashara zinazotumia RetailPro zinaona ongezeko la 40%.",
                    "cta_text": "Ona Takwimu"
                },
                "fr": {
                    "title": "Ventes en Hausse de 40%!",
                    "description": "Les entreprises utilisant RetailPro voient une augmentation de 40%.",
                    "cta_text": "Voir Statistiques"
                },
                "ar": {
                    "title": "زيادة المبيعات 40%!",
                    "description": "الشركات التي تستخدم RetailPro تشهد زيادة 40% في المبيعات.",
                    "cta_text": "عرض الإحصائيات"
                },
                "pt": {
                    "title": "Vendas Aumentaram 40%!",
                    "description": "Empresas usando RetailPro veem aumento médio de 40% nas vendas.",
                    "cta_text": "Ver Estatísticas"
                }
            },
            "cta_link": "/admin/reports",
            "background_color": "#10B981",
            "text_color": "#FFFFFF",
            "icon": "trending-up-outline",
            "target_products": ["retailpro"],
            "priority": 8,
            "is_active": True
        },
        {
            "translations": {
                "en": {
                    "title": "Level Up Your Business",
                    "description": "Upgrade to Pro for advanced features and priority support.",
                    "cta_text": "Upgrade Now"
                },
                "sw": {
                    "title": "Boresha Biashara Yako",
                    "description": "Panda hadi Pro kwa vipengele vya hali ya juu na msaada wa kipaumbele.",
                    "cta_text": "Panda Sasa"
                },
                "fr": {
                    "title": "Faites Évoluer Votre Entreprise",
                    "description": "Passez à Pro pour des fonctionnalités avancées et un support prioritaire.",
                    "cta_text": "Mettre à Niveau"
                },
                "ar": {
                    "title": "ارتقِ بعملك",
                    "description": "قم بالترقية إلى Pro للحصول على ميزات متقدمة ودعم أولوية.",
                    "cta_text": "ترقية الآن"
                },
                "pt": {
                    "title": "Eleve Seu Negócio",
                    "description": "Atualize para Pro para recursos avançados e suporte prioritário.",
                    "cta_text": "Atualizar Agora"
                }
            },
            "cta_link": "/subscription",
            "background_color": "#1F2937",
            "text_color": "#FFFFFF",
            "icon": "rocket-outline",
            "image_url": None,
            "target_products": ["all"],
            "priority": 7,
            "is_active": True
        }
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
