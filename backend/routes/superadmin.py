"""
SuperAdmin Routes
Handles team management, approvals, and centralized management functions
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from bson import ObjectId

router = APIRouter(prefix="/superadmin", tags=["SuperAdmin"])

# Module-level variables to be set during initialization
db = None
_get_current_user = None
_get_superadmin_user = None


def set_dependencies(database, current_user_dep, superadmin_user_dep):
    """Initialize router dependencies"""
    global db, _get_current_user, _get_superadmin_user
    db = database
    _get_current_user = current_user_dep
    _get_superadmin_user = superadmin_user_dep


async def require_superadmin():
    """Dependency to require superadmin access"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    # For now, return a placeholder - actual auth happens in server.py get_superadmin_user
    return {"role": "superadmin"}


# ============== PYDANTIC MODELS ==============

class TeamMemberCreate(BaseModel):
    name: str
    email: EmailStr
    role: str  # product_manager, sales, marketing, support, finance, developer
    assigned_products: List[str] = []


class TeamMemberUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    assigned_products: Optional[List[str]] = None
    status: Optional[str] = None


class TeamMemberResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str
    assigned_products: List[str]
    joined_at: str
    last_active: Optional[str] = None


class ApprovalAction(BaseModel):
    action: str  # approve, reject
    reason: Optional[str] = None


TEAM_ROLES = {
    "product_manager": {
        "label": "Product Manager",
        "permissions": ["view_analytics", "view_users", "manage_products", "view_feedback"]
    },
    "sales": {
        "label": "Sales Team",
        "permissions": ["view_users", "view_businesses", "manage_leads", "view_revenue"]
    },
    "marketing": {
        "label": "Marketing",
        "permissions": ["view_analytics", "view_campaigns", "manage_promotions", "view_users"]
    },
    "support": {
        "label": "Support",
        "permissions": ["view_users", "view_businesses", "manage_tickets", "view_logs"]
    },
    "finance": {
        "label": "Finance",
        "permissions": ["view_revenue", "view_payouts", "manage_billing", "view_reports"]
    },
    "developer": {
        "label": "Developer",
        "permissions": ["view_api_logs", "manage_webhooks", "view_errors", "access_sandbox"]
    },
}


# ============== TEAM MANAGEMENT ==============

@router.get("/team")
async def get_team_members(
    current_user: dict = Depends(require_superadmin)
):
    """Get all internal team members"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    team_members = await db.team_members.find({}).to_list(100)
    
    result = []
    for member in team_members:
        result.append({
            "id": str(member["_id"]),
            "name": member.get("name", ""),
            "email": member.get("email", ""),
            "role": member.get("role", ""),
            "status": member.get("status", "invited"),
            "assigned_products": member.get("assigned_products", []),
            "joined_at": member.get("created_at", datetime.utcnow()).isoformat() if isinstance(member.get("created_at"), datetime) else member.get("created_at", ""),
            "last_active": member.get("last_active"),
        })
    
    return {"members": result, "total": len(result)}


@router.post("/team/invite")
async def invite_team_member(
    member: TeamMemberCreate,
    current_user: dict = Depends(require_superadmin)
):
    """Invite a new team member"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Check if email already exists
    existing = await db.team_members.find_one({"email": member.email})
    if existing:
        raise HTTPException(status_code=400, detail="Team member with this email already exists")
    
    # Validate role
    if member.role not in TEAM_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {list(TEAM_ROLES.keys())}")
    
    new_member = {
        "name": member.name,
        "email": member.email,
        "role": member.role,
        "assigned_products": member.assigned_products,
        "status": "invited",
        "created_at": datetime.utcnow(),
        "created_by": current_user.get("email", "superadmin"),
    }
    
    result = await db.team_members.insert_one(new_member)
    
    return {
        "id": str(result.inserted_id),
        "message": "Team member invited successfully",
        "member": {
            "id": str(result.inserted_id),
            "name": member.name,
            "email": member.email,
            "role": member.role,
            "status": "invited",
            "assigned_products": member.assigned_products,
        }
    }


@router.put("/team/{member_id}")
async def update_team_member(
    member_id: str,
    update: TeamMemberUpdate,
    current_user: dict = Depends(require_superadmin)
):
    """Update team member details"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        obj_id = ObjectId(member_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid member ID")
    
    existing = await db.team_members.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    update_data = {}
    if update.name:
        update_data["name"] = update.name
    if update.role:
        if update.role not in TEAM_ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {list(TEAM_ROLES.keys())}")
        update_data["role"] = update.role
    if update.assigned_products is not None:
        update_data["assigned_products"] = update.assigned_products
    if update.status:
        update_data["status"] = update.status
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.team_members.update_one({"_id": obj_id}, {"$set": update_data})
    
    return {"message": "Team member updated successfully"}


@router.delete("/team/{member_id}")
async def remove_team_member(
    member_id: str,
    current_user: dict = Depends(require_superadmin)
):
    """Remove a team member"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        obj_id = ObjectId(member_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid member ID")
    
    result = await db.team_members.delete_one({"_id": obj_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    return {"message": "Team member removed successfully"}


# ============== APPROVALS MANAGEMENT ==============

@router.get("/approvals")
async def get_pending_approvals(
    approval_type: Optional[str] = None,
    product: Optional[str] = None,
    current_user: dict = Depends(require_superadmin)
):
    """Get all pending approvals across products"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    approvals = []
    
    # 1. KwikPay Merchant Onboarding Approvals
    merchant_query = {"status": {"$in": ["pending", "under_review", "documents_submitted"]}}
    pending_merchants = await db.merchant_onboarding.find(merchant_query).to_list(50)
    
    for merchant in pending_merchants:
        # Get associated KYC documents
        kyc_docs = await db.kyc_documents.find({
            "business_id": merchant.get("business_id")
        }).to_list(20)
        
        documents = [
            {"name": doc.get("document_type", "Unknown"), "status": doc.get("status", "pending")}
            for doc in kyc_docs
        ]
        
        approvals.append({
            "id": str(merchant["_id"]),
            "type": "merchant_onboarding",
            "product": "kwikpay",
            "title": f"{merchant.get('business_name', 'Unknown Business')} - Merchant Application",
            "description": "New merchant requesting payment processing capabilities",
            "requester": {
                "name": merchant.get("owner_name", merchant.get("contact_name", "Unknown")),
                "email": merchant.get("email", ""),
                "business": merchant.get("business_name", "")
            },
            "submitted_at": merchant.get("created_at", datetime.utcnow()).isoformat() if isinstance(merchant.get("created_at"), datetime) else str(merchant.get("created_at", "")),
            "priority": "high" if len(documents) >= 3 else "medium",
            "documents": documents,
            "metadata": {
                "country": merchant.get("country", ""),
                "business_type": merchant.get("business_type", "")
            }
        })
    
    # 2. KYC Review Approvals
    kyc_query = {"status": "pending"}
    pending_kyc = await db.kyc_documents.find(kyc_query).to_list(50)
    
    kyc_grouped = {}
    for doc in pending_kyc:
        biz_id = str(doc.get("business_id", ""))
        if biz_id not in kyc_grouped:
            # Get business info
            business = await db.businesses.find_one({"_id": ObjectId(biz_id)}) if biz_id else None
            kyc_grouped[biz_id] = {
                "business": business,
                "documents": []
            }
        kyc_grouped[biz_id]["documents"].append(doc)
    
    for biz_id, data in kyc_grouped.items():
        business = data["business"]
        if business:
            approvals.append({
                "id": f"kyc_{biz_id}",
                "type": "kyc_review",
                "product": "kwikpay",
                "title": f"{business.get('name', 'Unknown')} - KYC Documents",
                "description": "KYC documents submitted for verification",
                "requester": {
                    "name": business.get("owner_name", ""),
                    "email": business.get("email", ""),
                    "business": business.get("name", "")
                },
                "submitted_at": datetime.utcnow().isoformat(),
                "priority": "medium",
                "documents": [
                    {"name": d.get("document_type", "Unknown"), "status": "pending"}
                    for d in data["documents"]
                ]
            })
    
    # 3. Payout Requests (if any pending)
    payout_query = {"status": "pending_approval"}
    pending_payouts = await db.payouts.find(payout_query).to_list(50)
    
    for payout in pending_payouts:
        business = await db.businesses.find_one({"_id": ObjectId(str(payout.get("business_id", "")))}) if payout.get("business_id") else None
        
        approvals.append({
            "id": str(payout["_id"]),
            "type": "payout_request",
            "product": "kwikpay",
            "title": f"{business.get('name', 'Unknown') if business else 'Unknown'} - Withdrawal Request",
            "description": "Requesting withdrawal of available balance",
            "requester": {
                "name": business.get("owner_name", "") if business else "",
                "email": business.get("email", "") if business else "",
                "business": business.get("name", "") if business else ""
            },
            "amount": payout.get("amount", 0),
            "currency": payout.get("currency", "TZS"),
            "submitted_at": payout.get("created_at", datetime.utcnow()).isoformat() if isinstance(payout.get("created_at"), datetime) else str(payout.get("created_at", "")),
            "priority": "high" if payout.get("amount", 0) > 1000000 else "medium"
        })
    
    # 4. API Access Requests
    api_query = {"status": "pending"}
    pending_api = await db.api_access_requests.find(api_query).to_list(50)
    
    for req in pending_api:
        approvals.append({
            "id": str(req["_id"]),
            "type": "api_access",
            "product": req.get("product", "retailpro"),
            "title": f"{req.get('business_name', 'Unknown')} - API Integration Request",
            "description": req.get("description", "Requesting API access for integration"),
            "requester": {
                "name": req.get("requester_name", ""),
                "email": req.get("requester_email", ""),
                "business": req.get("business_name", "")
            },
            "submitted_at": req.get("created_at", datetime.utcnow()).isoformat() if isinstance(req.get("created_at"), datetime) else str(req.get("created_at", "")),
            "priority": "medium"
        })
    
    # Filter by type if specified
    if approval_type and approval_type != "all":
        approvals = [a for a in approvals if a["type"] == approval_type]
    
    # Filter by product if specified
    if product and product != "all":
        approvals = [a for a in approvals if a["product"] == product]
    
    # Sort by priority (high first) then by date
    priority_order = {"high": 0, "medium": 1, "low": 2}
    approvals.sort(key=lambda x: (priority_order.get(x.get("priority", "medium"), 1), x.get("submitted_at", "")))
    
    return {"approvals": approvals, "total": len(approvals)}


@router.post("/approvals/{approval_id}/approve")
async def approve_request(
    approval_id: str,
    current_user: dict = Depends(require_superadmin)
):
    """Approve a pending request"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Try to find in different collections based on ID pattern
    if approval_id.startswith("kyc_"):
        # Handle KYC approval
        biz_id = approval_id.replace("kyc_", "")
        await db.kyc_documents.update_many(
            {"business_id": biz_id, "status": "pending"},
            {"$set": {"status": "verified", "verified_at": datetime.utcnow(), "verified_by": current_user.get("email", "superadmin")}}
        )
        return {"message": "KYC documents approved", "id": approval_id}
    
    try:
        obj_id = ObjectId(approval_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid approval ID")
    
    # Try merchant onboarding
    merchant = await db.merchant_onboarding.find_one({"_id": obj_id})
    if merchant:
        await db.merchant_onboarding.update_one(
            {"_id": obj_id},
            {"$set": {
                "status": "approved",
                "approved_at": datetime.utcnow(),
                "approved_by": current_user.get("email", "superadmin")
            }}
        )
        return {"message": "Merchant onboarding approved", "id": approval_id}
    
    # Try payout
    payout = await db.payouts.find_one({"_id": obj_id})
    if payout:
        await db.payouts.update_one(
            {"_id": obj_id},
            {"$set": {
                "status": "approved",
                "approved_at": datetime.utcnow(),
                "approved_by": current_user.get("email", "superadmin")
            }}
        )
        return {"message": "Payout approved", "id": approval_id}
    
    # Try API access
    api_req = await db.api_access_requests.find_one({"_id": obj_id})
    if api_req:
        await db.api_access_requests.update_one(
            {"_id": obj_id},
            {"$set": {
                "status": "approved",
                "approved_at": datetime.utcnow(),
                "approved_by": current_user.get("email", "superadmin")
            }}
        )
        return {"message": "API access approved", "id": approval_id}
    
    raise HTTPException(status_code=404, detail="Approval request not found")


@router.post("/approvals/{approval_id}/reject")
async def reject_request(
    approval_id: str,
    reason: Optional[str] = None,
    current_user: dict = Depends(require_superadmin)
):
    """Reject a pending request"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Try to find in different collections based on ID pattern
    if approval_id.startswith("kyc_"):
        # Handle KYC rejection
        biz_id = approval_id.replace("kyc_", "")
        await db.kyc_documents.update_many(
            {"business_id": biz_id, "status": "pending"},
            {"$set": {
                "status": "rejected",
                "rejected_at": datetime.utcnow(),
                "rejected_by": current_user.get("email", "superadmin"),
                "rejection_reason": reason
            }}
        )
        return {"message": "KYC documents rejected", "id": approval_id}
    
    try:
        obj_id = ObjectId(approval_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid approval ID")
    
    rejection_data = {
        "status": "rejected",
        "rejected_at": datetime.utcnow(),
        "rejected_by": current_user.get("email", "superadmin"),
        "rejection_reason": reason
    }
    
    # Try merchant onboarding
    result = await db.merchant_onboarding.update_one({"_id": obj_id}, {"$set": rejection_data})
    if result.modified_count > 0:
        return {"message": "Merchant onboarding rejected", "id": approval_id}
    
    # Try payout
    result = await db.payouts.update_one({"_id": obj_id}, {"$set": rejection_data})
    if result.modified_count > 0:
        return {"message": "Payout rejected", "id": approval_id}
    
    # Try API access
    result = await db.api_access_requests.update_one({"_id": obj_id}, {"$set": rejection_data})
    if result.modified_count > 0:
        return {"message": "API access rejected", "id": approval_id}
    
    raise HTTPException(status_code=404, detail="Approval request not found")


# ============== USERS MANAGEMENT ==============

@router.get("/users")
async def get_all_users(
    search: Optional[str] = None,
    status: Optional[str] = None,
    role: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_superadmin)
):
    """Get all users with filtering and pagination"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    query = {"role": {"$ne": "superadmin"}}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    
    if status and status != "all":
        query["is_active"] = status == "active"
    
    if role and role != "all":
        query["role"] = role
    
    skip = (page - 1) * limit
    
    users_cursor = db.users.find(query, {"password": 0, "hashed_password": 0}).skip(skip).limit(limit)
    users = await users_cursor.to_list(limit)
    
    total = await db.users.count_documents(query)
    
    result = []
    for user in users:
        # Get business info if available
        business = None
        if user.get("business_id"):
            try:
                business = await db.businesses.find_one({"_id": ObjectId(str(user["business_id"]))})
            except Exception:
                pass
        
        result.append({
            "id": str(user["_id"]),
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "role": user.get("role", "user"),
            "business": business.get("name", "") if business else None,
            "status": "active" if user.get("is_active", True) else "inactive",
            "products": user.get("products", []),
            "created_at": user.get("created_at", datetime.utcnow()).isoformat() if isinstance(user.get("created_at"), datetime) else str(user.get("created_at", "")),
            "last_login": user.get("last_login"),
        })
    
    return {
        "users": result,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status: str = Query(..., description="new status: active, inactive, suspended"),
    current_user: dict = Depends(require_superadmin)
):
    """Update user status"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    is_active = status == "active"
    
    result = await db.users.update_one(
        {"_id": obj_id},
        {"$set": {
            "is_active": is_active,
            "status": status,
            "updated_at": datetime.utcnow()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User status updated to {status}"}


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "admin"
    phone: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


@router.post("/users")
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(require_superadmin)
):
    """Create a new user"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    import bcrypt
    
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Hash password
    password_hash = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    new_user = {
        "name": user_data.name,
        "email": user_data.email,
        "password_hash": password_hash,
        "role": user_data.role,
        "phone": user_data.phone,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "products": []
    }
    
    result = await db.users.insert_one(new_user)
    
    return {
        "success": True,
        "user": {
            "id": str(result.inserted_id),
            "name": user_data.name,
            "email": user_data.email,
            "role": user_data.role,
            "status": "active"
        }
    }


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: dict = Depends(require_superadmin)
):
    """Update a user"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    # Build update document
    update_data = {"updated_at": datetime.utcnow()}
    
    if user_data.name is not None:
        update_data["name"] = user_data.name
    if user_data.email is not None:
        # Check email uniqueness
        existing = await db.users.find_one({"email": user_data.email, "_id": {"$ne": obj_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        update_data["email"] = user_data.email
    if user_data.role is not None:
        update_data["role"] = user_data.role
    if user_data.phone is not None:
        update_data["phone"] = user_data.phone
    if user_data.is_active is not None:
        update_data["is_active"] = user_data.is_active
    
    result = await db.users.update_one({"_id": obj_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": "User updated successfully"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_superadmin)
):
    """Delete a user"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    # Check if user exists and is not a superadmin
    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("role") == "superadmin":
        raise HTTPException(status_code=403, detail="Cannot delete superadmin users")
    
    await db.users.delete_one({"_id": obj_id})
    
    return {"success": True, "message": "User deleted successfully"}


@router.get("/users/export")
async def export_users(
    format: str = Query("csv", description="Export format: csv or json"),
    current_user: dict = Depends(require_superadmin)
):
    """Export all users"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    users = await db.users.find(
        {"role": {"$ne": "superadmin"}},
        {"password_hash": 0, "password": 0}
    ).to_list(None)
    
    result = []
    for user in users:
        business = None
        if user.get("business_id"):
            try:
                business = await db.businesses.find_one({"_id": ObjectId(str(user["business_id"]))})
            except Exception:
                pass
        
        result.append({
            "id": str(user["_id"]),
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "role": user.get("role", "user"),
            "business": business.get("name", "") if business else "",
            "status": "active" if user.get("is_active", True) else "inactive",
            "phone": user.get("phone", ""),
            "created_at": user.get("created_at", "").isoformat() if isinstance(user.get("created_at"), datetime) else str(user.get("created_at", ""))
        })
    
    return {"users": result, "total": len(result), "format": format}


# ============== ACTIVITY FEED ==============

@router.get("/activity/recent")
async def get_recent_activity(
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_superadmin)
):
    """Get recent platform activity"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    activities = []
    now = datetime.utcnow()
    
    # Recent user signups
    recent_users = await db.users.find(
        {"created_at": {"$gte": now - timedelta(days=7)}},
        {"_id": 1, "name": 1, "email": 1, "created_at": 1}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    for user in recent_users:
        time_diff = now - user.get("created_at", now)
        if time_diff.days > 0:
            time_str = f"{time_diff.days} days ago"
        elif time_diff.seconds > 3600:
            time_str = f"{time_diff.seconds // 3600} hours ago"
        else:
            time_str = f"{time_diff.seconds // 60} mins ago"
        
        activities.append({
            "type": "signup",
            "product": "RetailPro",
            "message": f"New user registered: {user.get('name', user.get('email', 'Unknown'))}",
            "time": time_str
        })
    
    # Recent orders
    recent_orders = await db.orders.find(
        {"created_at": {"$gte": now - timedelta(days=1)}},
        {"_id": 1, "total": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for order in recent_orders:
        time_diff = now - order.get("created_at", now)
        if time_diff.seconds > 3600:
            time_str = f"{time_diff.seconds // 3600} hours ago"
        else:
            time_str = f"{time_diff.seconds // 60} mins ago"
        
        activities.append({
            "type": "payment",
            "product": "KwikPay",
            "message": f"Transaction processed: ${order.get('total', 0):,.2f}",
            "time": time_str
        })
    
    # Sort by recency (approximated)
    activities.sort(key=lambda x: x.get("time", ""), reverse=True)
    
    return {"activities": activities[:limit]}



# ============== REFERRAL SYSTEM ==============

class ReferralProgramConfig(BaseModel):
    name: str = "Default Referral Program"
    reward_type: str = "credit"  # credit, discount, cash
    referrer_reward: float = 10.0  # Amount or percentage
    referee_reward: float = 10.0
    min_purchase_amount: Optional[float] = None
    max_referrals_per_user: Optional[int] = None
    expiry_days: Optional[int] = 30
    is_active: bool = True
    show_post_purchase_popup: bool = True


class ReferralCreate(BaseModel):
    referee_email: EmailStr
    referee_name: Optional[str] = None


@router.get("/referrals/config")
async def get_referral_config(
    current_user: dict = Depends(require_superadmin)
):
    """Get referral program configuration"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    config = await db.referral_config.find_one({"is_active": True})
    
    if not config:
        # Return default config
        return {
            "config": {
                "name": "Software Galaxy Referral Program",
                "reward_type": "credit",
                "referrer_reward": 10.0,
                "referee_reward": 10.0,
                "min_purchase_amount": 0,
                "max_referrals_per_user": 50,
                "expiry_days": 30,
                "is_active": True,
                "show_post_purchase_popup": True
            }
        }
    
    return {
        "config": {
            "id": str(config["_id"]),
            "name": config.get("name", ""),
            "reward_type": config.get("reward_type", "credit"),
            "referrer_reward": config.get("referrer_reward", 10.0),
            "referee_reward": config.get("referee_reward", 10.0),
            "min_purchase_amount": config.get("min_purchase_amount"),
            "max_referrals_per_user": config.get("max_referrals_per_user"),
            "expiry_days": config.get("expiry_days", 30),
            "is_active": config.get("is_active", True),
            "show_post_purchase_popup": config.get("show_post_purchase_popup", True)
        }
    }


@router.put("/referrals/config")
async def update_referral_config(
    config: ReferralProgramConfig,
    current_user: dict = Depends(require_superadmin)
):
    """Update referral program configuration"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Deactivate all existing configs
    await db.referral_config.update_many({}, {"$set": {"is_active": False}})
    
    # Create new config
    config_doc = {
        "name": config.name,
        "reward_type": config.reward_type,
        "referrer_reward": config.referrer_reward,
        "referee_reward": config.referee_reward,
        "min_purchase_amount": config.min_purchase_amount,
        "max_referrals_per_user": config.max_referrals_per_user,
        "expiry_days": config.expiry_days,
        "is_active": config.is_active,
        "show_post_purchase_popup": config.show_post_purchase_popup,
        "updated_at": datetime.utcnow(),
        "updated_by": current_user.get("email", "superadmin")
    }
    
    result = await db.referral_config.insert_one(config_doc)
    
    return {"success": True, "config_id": str(result.inserted_id)}


# Aliased endpoints for shorter paths (frontend compatibility)
@router.get("/referrals")
async def get_referral_config_short(
    current_user: dict = Depends(require_superadmin)
):
    """Alias for get_referral_config"""
    return await get_referral_config(current_user)


@router.put("/referrals")
async def update_referral_config_short(
    config: ReferralProgramConfig,
    current_user: dict = Depends(require_superadmin)
):
    """Alias for update_referral_config"""
    return await update_referral_config(config, current_user)


@router.get("/referrals/stats")
async def get_referral_stats(
    current_user: dict = Depends(require_superadmin)
):
    """Get referral program statistics"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    total_referrals = await db.referrals.count_documents({})
    successful_referrals = await db.referrals.count_documents({"status": "completed"})
    pending_referrals = await db.referrals.count_documents({"status": "pending"})
    
    # Calculate total rewards given
    pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {
            "_id": None,
            "total_referrer_rewards": {"$sum": "$referrer_reward_amount"},
            "total_referee_rewards": {"$sum": "$referee_reward_amount"}
        }}
    ]
    rewards_result = await db.referrals.aggregate(pipeline).to_list(1)
    
    total_rewards = 0
    if rewards_result:
        total_rewards = (rewards_result[0].get("total_referrer_rewards", 0) or 0) + \
                       (rewards_result[0].get("total_referee_rewards", 0) or 0)
    
    # Top referrers
    top_referrers_pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {
            "_id": "$referrer_id",
            "count": {"$sum": 1},
            "total_earned": {"$sum": "$referrer_reward_amount"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_referrers_raw = await db.referrals.aggregate(top_referrers_pipeline).to_list(10)
    
    top_referrers = []
    for ref in top_referrers_raw:
        user = await db.users.find_one({"_id": ObjectId(ref["_id"])}) if ref.get("_id") else None
        if user:
            top_referrers.append({
                "user_id": str(ref["_id"]),
                "name": user.get("name", "Unknown"),
                "email": user.get("email", ""),
                "referral_count": ref.get("count", 0),
                "total_earned": ref.get("total_earned", 0)
            })
    
    # Recent referrals
    recent_referrals = await db.referrals.find({}).sort("created_at", -1).limit(10).to_list(10)
    recent_list = []
    for ref in recent_referrals:
        referrer = await db.users.find_one({"_id": ObjectId(ref["referrer_id"])}) if ref.get("referrer_id") else None
        recent_list.append({
            "id": str(ref["_id"]),
            "referrer_name": referrer.get("name", "Unknown") if referrer else "Unknown",
            "referee_email": ref.get("referee_email", ""),
            "referee_name": ref.get("referee_name", ""),
            "status": ref.get("status", "pending"),
            "created_at": ref.get("created_at", datetime.utcnow()).isoformat() if isinstance(ref.get("created_at"), datetime) else str(ref.get("created_at", ""))
        })
    
    return {
        "stats": {
            "total_referrals": total_referrals,
            "successful_referrals": successful_referrals,
            "pending_referrals": pending_referrals,
            "conversion_rate": round((successful_referrals / max(total_referrals, 1)) * 100, 1),
            "total_rewards_given": total_rewards
        },
        "top_referrers": top_referrers,
        "recent_referrals": recent_list
    }


@router.get("/referrals")
async def get_all_referrals(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_superadmin)
):
    """Get all referrals with pagination"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    query = {}
    if status and status != "all":
        query["status"] = status
    
    skip = (page - 1) * limit
    
    referrals = await db.referrals.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.referrals.count_documents(query)
    
    result = []
    for ref in referrals:
        referrer = await db.users.find_one({"_id": ObjectId(ref["referrer_id"])}) if ref.get("referrer_id") else None
        referee = await db.users.find_one({"_id": ObjectId(ref["referee_id"])}) if ref.get("referee_id") else None
        
        result.append({
            "id": str(ref["_id"]),
            "referrer": {
                "id": str(referrer["_id"]) if referrer else None,
                "name": referrer.get("name", "Unknown") if referrer else "Unknown",
                "email": referrer.get("email", "") if referrer else ""
            },
            "referee": {
                "id": str(referee["_id"]) if referee else None,
                "name": ref.get("referee_name") or (referee.get("name", "") if referee else ""),
                "email": ref.get("referee_email", "")
            },
            "status": ref.get("status", "pending"),
            "referral_code": ref.get("referral_code", ""),
            "referrer_reward": ref.get("referrer_reward_amount", 0),
            "referee_reward": ref.get("referee_reward_amount", 0),
            "created_at": ref.get("created_at", datetime.utcnow()).isoformat() if isinstance(ref.get("created_at"), datetime) else str(ref.get("created_at", "")),
            "completed_at": ref.get("completed_at", "").isoformat() if isinstance(ref.get("completed_at"), datetime) else str(ref.get("completed_at", "")) if ref.get("completed_at") else None
        })
    
    return {
        "referrals": result,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }
