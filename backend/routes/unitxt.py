"""
UniTxt SMS Routes
Handles SMS messaging, campaigns, sender IDs, and gateway management
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from bson import ObjectId
import uuid
import asyncio

router = APIRouter(prefix="/unitxt", tags=["UniTxt SMS"])
security = HTTPBearer()

# Module-level variables
db = None
_get_current_user_func = None


def set_dependencies(database, current_user_dep):
    """Initialize router dependencies"""
    global db, _get_current_user_func
    db = database
    _get_current_user_func = current_user_dep


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Wrapper for current user dependency - properly handles authentication"""
    if _get_current_user_func is None:
        raise HTTPException(status_code=500, detail="Auth not initialized")
    # Call the original get_current_user with credentials
    return await _get_current_user_func(credentials)


# ============== PYDANTIC MODELS ==============

class CreditAddRequest(BaseModel):
    amount: float
    payment_method: str = "card"


class SenderIdCreate(BaseModel):
    sender_id: str
    display_name: Optional[str] = None
    use_case: str = "transactional"


class CampaignCreate(BaseModel):
    name: str
    message: str
    recipients: List[str] = []
    contact_list_id: Optional[str] = None
    sender_id: Optional[str] = None
    scheduled_time: Optional[str] = None
    campaign_type: str = "promotional"


class SMSSendRequest(BaseModel):
    to: str
    message: str
    sender_id: Optional[str] = None


class ContactListCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ContactCreate(BaseModel):
    phone: str
    name: Optional[str] = None
    tags: List[str] = []


class TemplateCreate(BaseModel):
    name: str
    content: str
    variables: List[str] = []
    category: str = "general"


# ============== CREDITS ==============

@router.get("/credits")
async def get_credits(current_user: dict = Depends(get_current_user)):
    """Get SMS credit balance"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        return {"credits": 0, "used": 0, "transactions": []}
    
    credits = await db.sms_credits.find_one({"business_id": str(business_id)})
    
    if not credits:
        return {"credits": 0, "used": 0, "transactions": []}
    
    transactions = await db.credit_transactions.find(
        {"business_id": str(business_id)}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {
        "credits": credits.get("balance", 0),
        "used": credits.get("used", 0),
        "transactions": [{
            "id": str(t["_id"]),
            "type": t.get("type", ""),
            "amount": t.get("amount", 0),
            "description": t.get("description", ""),
            "created_at": t.get("created_at", datetime.utcnow()).isoformat() if isinstance(t.get("created_at"), datetime) else str(t.get("created_at", ""))
        } for t in transactions]
    }


@router.post("/credits/add")
async def add_credits(
    request: CreditAddRequest,
    current_user: dict = Depends(get_current_user)
):
    """Add SMS credits"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="No business associated")
    
    # Update credits
    await db.sms_credits.update_one(
        {"business_id": str(business_id)},
        {"$inc": {"balance": request.amount}},
        upsert=True
    )
    
    # Log transaction
    await db.credit_transactions.insert_one({
        "business_id": str(business_id),
        "type": "credit",
        "amount": request.amount,
        "description": f"Added {request.amount} credits via {request.payment_method}",
        "created_at": datetime.utcnow()
    })
    
    return {"message": "Credits added successfully", "amount": request.amount}


# ============== SENDER IDS ==============

@router.get("/sender-ids")
async def get_sender_ids(current_user: dict = Depends(get_current_user)):
    """Get all sender IDs"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        return {"sender_ids": []}
    
    sender_ids = await db.sender_ids.find({"business_id": str(business_id)}).to_list(50)
    
    return {
        "sender_ids": [{
            "id": str(s["_id"]),
            "sender_id": s.get("sender_id", ""),
            "display_name": s.get("display_name", ""),
            "status": s.get("status", "pending"),
            "use_case": s.get("use_case", "transactional"),
            "created_at": s.get("created_at", datetime.utcnow()).isoformat() if isinstance(s.get("created_at"), datetime) else str(s.get("created_at", ""))
        } for s in sender_ids]
    }


@router.post("/sender-ids")
async def create_sender_id(
    request: SenderIdCreate,
    current_user: dict = Depends(get_current_user)
):
    """Request a new sender ID"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="No business associated")
    
    # Check if sender ID already exists
    existing = await db.sender_ids.find_one({
        "sender_id": request.sender_id,
        "business_id": str(business_id)
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Sender ID already exists")
    
    sender = {
        "sender_id": request.sender_id,
        "display_name": request.display_name or request.sender_id,
        "business_id": str(business_id),
        "use_case": request.use_case,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    result = await db.sender_ids.insert_one(sender)
    
    return {
        "id": str(result.inserted_id),
        "message": "Sender ID submitted for approval",
        "sender_id": request.sender_id
    }


@router.delete("/sender-ids/{sender_id}")
async def delete_sender_id(
    sender_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a sender ID"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    result = await db.sender_ids.delete_one({
        "_id": ObjectId(sender_id),
        "business_id": str(business_id)
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sender ID not found")
    
    return {"message": "Sender ID deleted"}


@router.get("/sender-ids/{sender_id}/stats")
async def get_sender_id_stats(
    sender_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get statistics for a sender ID"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    sender = await db.sender_ids.find_one({
        "_id": ObjectId(sender_id),
        "business_id": str(business_id)
    })
    
    if not sender:
        raise HTTPException(status_code=404, detail="Sender ID not found")
    
    # Get message stats
    total_sent = await db.sms_messages.count_documents({
        "sender_id": sender.get("sender_id"),
        "business_id": str(business_id)
    })
    
    delivered = await db.sms_messages.count_documents({
        "sender_id": sender.get("sender_id"),
        "business_id": str(business_id),
        "status": "delivered"
    })
    
    return {
        "sender_id": sender.get("sender_id"),
        "total_sent": total_sent,
        "delivered": delivered,
        "delivery_rate": (delivered / total_sent * 100) if total_sent > 0 else 0
    }


# ============== CAMPAIGNS ==============

@router.get("/campaigns")
async def get_campaigns(
    status: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get all SMS campaigns"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        return {"campaigns": []}
    
    query = {"business_id": str(business_id)}
    if status:
        query["status"] = status
    
    campaigns = await db.sms_campaigns.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "campaigns": [{
            "id": str(c["_id"]),
            "name": c.get("name", ""),
            "message": c.get("message", "")[:100],
            "status": c.get("status", "draft"),
            "recipients_count": c.get("recipients_count", 0),
            "sent_count": c.get("sent_count", 0),
            "delivered_count": c.get("delivered_count", 0),
            "campaign_type": c.get("campaign_type", "promotional"),
            "scheduled_time": c.get("scheduled_time"),
            "created_at": c.get("created_at", datetime.utcnow()).isoformat() if isinstance(c.get("created_at"), datetime) else str(c.get("created_at", ""))
        } for c in campaigns]
    }


@router.post("/campaigns")
async def create_campaign(
    request: CampaignCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new SMS campaign"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="No business associated")
    
    recipients = request.recipients
    
    # If contact list provided, get recipients from it
    if request.contact_list_id:
        contacts = await db.contacts.find({
            "contact_list_id": request.contact_list_id,
            "business_id": str(business_id)
        }).to_list(10000)
        recipients = [c.get("phone") for c in contacts if c.get("phone")]
    
    campaign = {
        "name": request.name,
        "message": request.message,
        "recipients": recipients,
        "recipients_count": len(recipients),
        "sender_id": request.sender_id,
        "business_id": str(business_id),
        "campaign_type": request.campaign_type,
        "status": "draft",
        "sent_count": 0,
        "delivered_count": 0,
        "failed_count": 0,
        "scheduled_time": request.scheduled_time,
        "created_at": datetime.utcnow(),
        "created_by": current_user.get("email")
    }
    
    result = await db.sms_campaigns.insert_one(campaign)
    
    return {
        "id": str(result.inserted_id),
        "message": "Campaign created",
        "recipients_count": len(recipients)
    }


@router.get("/campaigns/{campaign_id}")
async def get_campaign(
    campaign_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get campaign details"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    campaign = await db.sms_campaigns.find_one({
        "_id": ObjectId(campaign_id),
        "business_id": str(business_id)
    })
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {
        "id": str(campaign["_id"]),
        "name": campaign.get("name", ""),
        "message": campaign.get("message", ""),
        "status": campaign.get("status", "draft"),
        "recipients_count": campaign.get("recipients_count", 0),
        "sent_count": campaign.get("sent_count", 0),
        "delivered_count": campaign.get("delivered_count", 0),
        "failed_count": campaign.get("failed_count", 0),
        "campaign_type": campaign.get("campaign_type", ""),
        "sender_id": campaign.get("sender_id"),
        "scheduled_time": campaign.get("scheduled_time"),
        "created_at": campaign.get("created_at", datetime.utcnow()).isoformat() if isinstance(campaign.get("created_at"), datetime) else str(campaign.get("created_at", ""))
    }


@router.post("/campaigns/{campaign_id}/send")
async def send_campaign(
    campaign_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Start sending a campaign"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    campaign = await db.sms_campaigns.find_one({
        "_id": ObjectId(campaign_id),
        "business_id": str(business_id)
    })
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.get("status") not in ["draft", "paused"]:
        raise HTTPException(status_code=400, detail="Campaign cannot be sent in current status")
    
    # Update status
    await db.sms_campaigns.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$set": {"status": "sending", "started_at": datetime.utcnow()}}
    )
    
    # In production, this would trigger actual SMS sending
    # For now, we'll simulate progress
    background_tasks.add_task(simulate_campaign_sending, campaign_id, str(business_id))
    
    return {"message": "Campaign started", "status": "sending"}


async def simulate_campaign_sending(campaign_id: str, business_id: str):
    """Simulate campaign sending (for demo purposes)"""
    campaign = await db.sms_campaigns.find_one({"_id": ObjectId(campaign_id)})
    if not campaign:
        return
    
    recipients = campaign.get("recipients", [])
    total = len(recipients)
    
    # Simulate sending in batches
    for i, recipient in enumerate(recipients):
        # Simulate send delay
        await asyncio.sleep(0.1)
        
        # Create message record
        await db.sms_messages.insert_one({
            "campaign_id": campaign_id,
            "business_id": business_id,
            "recipient": recipient,
            "message": campaign.get("message", ""),
            "sender_id": campaign.get("sender_id"),
            "status": "delivered" if i % 20 != 0 else "failed",  # 95% success rate
            "sent_at": datetime.utcnow()
        })
        
        # Update progress
        delivered = i + 1 - (i // 20)
        await db.sms_campaigns.update_one(
            {"_id": ObjectId(campaign_id)},
            {"$set": {
                "sent_count": i + 1,
                "delivered_count": delivered,
                "failed_count": i // 20
            }}
        )
    
    # Mark complete
    await db.sms_campaigns.update_one(
        {"_id": ObjectId(campaign_id)},
        {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
    )


@router.get("/campaigns/{campaign_id}/progress")
async def get_campaign_progress(
    campaign_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get campaign sending progress"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    campaign = await db.sms_campaigns.find_one({
        "_id": ObjectId(campaign_id),
        "business_id": str(business_id)
    })
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    total = campaign.get("recipients_count", 0)
    sent = campaign.get("sent_count", 0)
    
    return {
        "status": campaign.get("status", ""),
        "total": total,
        "sent": sent,
        "delivered": campaign.get("delivered_count", 0),
        "failed": campaign.get("failed_count", 0),
        "progress_percent": (sent / total * 100) if total > 0 else 0
    }


@router.post("/campaigns/{campaign_id}/cancel")
async def cancel_campaign(
    campaign_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel a running campaign"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    result = await db.sms_campaigns.update_one(
        {
            "_id": ObjectId(campaign_id),
            "business_id": str(business_id),
            "status": {"$in": ["sending", "scheduled"]}
        },
        {"$set": {"status": "cancelled", "cancelled_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Campaign cannot be cancelled")
    
    return {"message": "Campaign cancelled"}


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a campaign"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    result = await db.sms_campaigns.delete_one({
        "_id": ObjectId(campaign_id),
        "business_id": str(business_id),
        "status": {"$in": ["draft", "completed", "cancelled"]}
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found or cannot be deleted")
    
    return {"message": "Campaign deleted"}


# ============== CONTACT LISTS ==============

@router.get("/contact-lists")
async def get_contact_lists(current_user: dict = Depends(get_current_user)):
    """Get all contact lists"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        return {"contact_lists": []}
    
    lists = await db.contact_lists.find({"business_id": str(business_id)}).to_list(100)
    
    result = []
    for l in lists:
        count = await db.contacts.count_documents({"contact_list_id": str(l["_id"])})
        result.append({
            "id": str(l["_id"]),
            "name": l.get("name", ""),
            "description": l.get("description", ""),
            "contacts_count": count,
            "created_at": l.get("created_at", datetime.utcnow()).isoformat() if isinstance(l.get("created_at"), datetime) else str(l.get("created_at", ""))
        })
    
    return {"contact_lists": result}


@router.post("/contact-lists")
async def create_contact_list(
    request: ContactListCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new contact list"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="No business associated")
    
    contact_list = {
        "name": request.name,
        "description": request.description,
        "business_id": str(business_id),
        "created_at": datetime.utcnow()
    }
    
    result = await db.contact_lists.insert_one(contact_list)
    
    return {"id": str(result.inserted_id), "message": "Contact list created"}


@router.post("/contact-lists/{list_id}/contacts")
async def add_contact_to_list(
    list_id: str,
    request: ContactCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a contact to a list"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    # Verify list exists
    contact_list = await db.contact_lists.find_one({
        "_id": ObjectId(list_id),
        "business_id": str(business_id)
    })
    
    if not contact_list:
        raise HTTPException(status_code=404, detail="Contact list not found")
    
    contact = {
        "contact_list_id": list_id,
        "business_id": str(business_id),
        "phone": request.phone,
        "name": request.name,
        "tags": request.tags,
        "created_at": datetime.utcnow()
    }
    
    result = await db.contacts.insert_one(contact)
    
    return {"id": str(result.inserted_id), "message": "Contact added"}


# ============== TEMPLATES ==============

@router.get("/templates")
async def get_templates(current_user: dict = Depends(get_current_user)):
    """Get SMS templates"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        return {"templates": []}
    
    templates = await db.sms_templates.find({"business_id": str(business_id)}).to_list(100)
    
    return {
        "templates": [{
            "id": str(t["_id"]),
            "name": t.get("name", ""),
            "content": t.get("content", ""),
            "variables": t.get("variables", []),
            "category": t.get("category", "general"),
            "created_at": t.get("created_at", datetime.utcnow()).isoformat() if isinstance(t.get("created_at"), datetime) else str(t.get("created_at", ""))
        } for t in templates]
    }


@router.post("/templates")
async def create_template(
    request: TemplateCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create an SMS template"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="No business associated")
    
    template = {
        "name": request.name,
        "content": request.content,
        "variables": request.variables,
        "category": request.category,
        "business_id": str(business_id),
        "created_at": datetime.utcnow()
    }
    
    result = await db.sms_templates.insert_one(template)
    
    return {"id": str(result.inserted_id), "message": "Template created"}


# ============== QUICK SEND ==============

@router.post("/send")
async def send_sms(
    request: SMSSendRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a single SMS message"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="No business associated")
    
    # Check credits
    credits = await db.sms_credits.find_one({"business_id": str(business_id)})
    if not credits or credits.get("balance", 0) < 1:
        raise HTTPException(status_code=402, detail="Insufficient SMS credits")
    
    # Create message record
    message = {
        "business_id": str(business_id),
        "recipient": request.to,
        "message": request.message,
        "sender_id": request.sender_id,
        "status": "delivered",  # Simulated
        "sent_at": datetime.utcnow()
    }
    
    await db.sms_messages.insert_one(message)
    
    # Deduct credit
    await db.sms_credits.update_one(
        {"business_id": str(business_id)},
        {"$inc": {"balance": -1, "used": 1}}
    )
    
    return {"message": "SMS sent successfully", "status": "delivered"}


# ============== TIGO SMPP INTEGRATION ==============

class TigoSendRequest(BaseModel):
    to: str
    message: str
    sender_id: Optional[str] = None


class TigoBulkSendRequest(BaseModel):
    recipients: List[Dict[str, str]]  # List of {"phone": "...", "name": "..."}
    message: str
    sender_id: Optional[str] = None


@router.post("/tigo/send")
async def send_via_tigo(
    request: TigoSendRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Send a single SMS via Tigo SMPP
    
    This endpoint uses the Tigo SMPP service to send SMS.
    Note: Requires VPN connectivity to Tigo when sandbox=false.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="No business associated")
    
    # Check credits
    credits = await db.sms_credits.find_one({"business_id": str(business_id)})
    if not credits or credits.get("balance", 0) < 1:
        raise HTTPException(status_code=402, detail="Insufficient SMS credits")
    
    try:
        # Import and get Tigo service
        from services.tigo_smpp_service import get_tigo_service
        
        tigo_service = get_tigo_service()
        result = tigo_service.send_sms(
            to=request.to,
            message=request.message,
            sender_id=request.sender_id
        )
        
        # Record message in database
        message_doc = {
            "business_id": str(business_id),
            "recipient": request.to,
            "message": request.message,
            "sender_id": request.sender_id,
            "provider": "tigo_smpp",
            "message_id": result.message_id,
            "status": result.status.value,
            "segments": result.segments,
            "cost": result.cost,
            "sent_at": datetime.utcnow()
        }
        await db.sms_messages.insert_one(message_doc)
        
        # Deduct credits if successful
        if result.success:
            await db.sms_credits.update_one(
                {"business_id": str(business_id)},
                {"$inc": {"balance": -result.segments, "used": result.segments}}
            )
        
        return {
            "success": result.success,
            "message_id": result.message_id,
            "status": result.status.value,
            "segments": result.segments,
            "cost": result.cost,
            "error": result.error
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send SMS: {str(e)}")


@router.post("/tigo/bulk-send")
async def send_bulk_via_tigo(
    request: TigoBulkSendRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Send bulk SMS via Tigo SMPP
    
    Sends SMS to multiple recipients using the Tigo SMPP service.
    Message can include {{name}} placeholder for personalization.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="No business associated")
    
    # Check credits
    total_recipients = len(request.recipients)
    credits = await db.sms_credits.find_one({"business_id": str(business_id)})
    if not credits or credits.get("balance", 0) < total_recipients:
        raise HTTPException(
            status_code=402, 
            detail=f"Insufficient credits. Need {total_recipients}, have {credits.get('balance', 0) if credits else 0}"
        )
    
    # Create batch record
    batch_id = str(uuid.uuid4())
    batch_doc = {
        "_id": batch_id,
        "business_id": str(business_id),
        "total_recipients": total_recipients,
        "message_template": request.message,
        "sender_id": request.sender_id,
        "status": "processing",
        "sent_count": 0,
        "delivered_count": 0,
        "failed_count": 0,
        "created_at": datetime.utcnow(),
        "created_by": current_user.get("email")
    }
    await db.sms_batches.insert_one(batch_doc)
    
    # Process bulk send in background
    background_tasks.add_task(
        process_tigo_bulk_send,
        batch_id,
        str(business_id),
        request.recipients,
        request.message,
        request.sender_id
    )
    
    return {
        "batch_id": batch_id,
        "message": f"Bulk SMS job started for {total_recipients} recipients",
        "status": "processing"
    }


async def process_tigo_bulk_send(
    batch_id: str,
    business_id: str,
    recipients: List[Dict[str, str]],
    message: str,
    sender_id: Optional[str]
):
    """Background task to process bulk SMS via Tigo"""
    try:
        from services.tigo_smpp_service import get_tigo_service
        
        tigo_service = get_tigo_service()
        results = tigo_service.send_bulk_sms(recipients, message, sender_id)
        
        sent_count = 0
        delivered_count = 0
        failed_count = 0
        total_cost = 0.0
        
        for i, result in enumerate(results):
            recipient = recipients[i]
            
            # Record each message
            message_doc = {
                "batch_id": batch_id,
                "business_id": business_id,
                "recipient": recipient.get("phone"),
                "recipient_name": recipient.get("name"),
                "message": message.replace("{{name}}", recipient.get("name", "")),
                "sender_id": sender_id,
                "provider": "tigo_smpp",
                "message_id": result.message_id,
                "status": result.status.value,
                "segments": result.segments,
                "cost": result.cost,
                "sent_at": datetime.utcnow()
            }
            await db.sms_messages.insert_one(message_doc)
            
            sent_count += 1
            total_cost += result.cost
            
            if result.success:
                delivered_count += 1
            else:
                failed_count += 1
            
            # Update batch progress periodically
            if sent_count % 10 == 0:
                await db.sms_batches.update_one(
                    {"_id": batch_id},
                    {"$set": {
                        "sent_count": sent_count,
                        "delivered_count": delivered_count,
                        "failed_count": failed_count
                    }}
                )
        
        # Update final batch status
        await db.sms_batches.update_one(
            {"_id": batch_id},
            {"$set": {
                "status": "completed",
                "sent_count": sent_count,
                "delivered_count": delivered_count,
                "failed_count": failed_count,
                "total_cost": total_cost,
                "completed_at": datetime.utcnow()
            }}
        )
        
        # Deduct credits
        await db.sms_credits.update_one(
            {"business_id": business_id},
            {"$inc": {"balance": -sent_count, "used": sent_count}}
        )
        
    except Exception as e:
        # Mark batch as failed
        await db.sms_batches.update_one(
            {"_id": batch_id},
            {"$set": {
                "status": "failed",
                "error": str(e),
                "completed_at": datetime.utcnow()
            }}
        )


@router.get("/tigo/batch/{batch_id}")
async def get_tigo_batch_status(
    batch_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get status of a bulk SMS batch"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    
    batch = await db.sms_batches.find_one({
        "_id": batch_id,
        "business_id": str(business_id)
    })
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    return {
        "batch_id": batch_id,
        "status": batch.get("status"),
        "total_recipients": batch.get("total_recipients", 0),
        "sent_count": batch.get("sent_count", 0),
        "delivered_count": batch.get("delivered_count", 0),
        "failed_count": batch.get("failed_count", 0),
        "total_cost": batch.get("total_cost", 0),
        "progress_percent": (batch.get("sent_count", 0) / batch.get("total_recipients", 1)) * 100,
        "created_at": batch.get("created_at").isoformat() if batch.get("created_at") else None,
        "completed_at": batch.get("completed_at").isoformat() if batch.get("completed_at") else None
    }


@router.get("/tigo/status")
async def get_tigo_service_status(
    current_user: dict = Depends(get_current_user)
):
    """Get Tigo SMPP service status"""
    try:
        from services.tigo_smpp_service import get_tigo_service
        
        tigo_service = get_tigo_service()
        status = tigo_service.get_connection_status()
        
        return {
            "provider": "Tigo Tanzania (SMPP)",
            "status": "connected" if status["connected"] else "disconnected",
            "sandbox": status["sandbox"],
            "host": status["host"],
            "port": status["port"],
            "cost_per_sms": status["cost_per_sms"],
            "note": "VPN connectivity required for production" if not status["sandbox"] else "Running in sandbox mode"
        }
        
    except Exception as e:
        return {
            "provider": "Tigo Tanzania (SMPP)",
            "status": "error",
            "error": str(e)
        }


# ============== ANALYTICS ==============

@router.get("/analytics")
async def get_sms_analytics(
    period: str = Query("30d", description="Period: 7d, 30d, 90d"),
    current_user: dict = Depends(get_current_user)
):
    """Get SMS analytics"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    business_id = current_user.get("business_id")
    if not business_id:
        return {"total_sent": 0, "delivered": 0, "failed": 0}
    
    # Calculate date range
    days = int(period.replace("d", ""))
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = {
        "business_id": str(business_id),
        "sent_at": {"$gte": start_date}
    }
    
    total_sent = await db.sms_messages.count_documents(query)
    delivered = await db.sms_messages.count_documents({**query, "status": "delivered"})
    failed = await db.sms_messages.count_documents({**query, "status": "failed"})
    
    return {
        "period": period,
        "total_sent": total_sent,
        "delivered": delivered,
        "failed": failed,
        "delivery_rate": (delivered / total_sent * 100) if total_sent > 0 else 0,
        "credits_used": total_sent
    }
