"""
KYC (Know Your Customer) Routes
Multi-country KYC document upload and verification API
"""
import logging
import base64
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from bson import ObjectId
import jwt
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/kyc", tags=["KYC Verification"])

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'retail-management-secret-key-2025')
JWT_ALGORITHM = "HS256"
security = HTTPBearer()

db = None

def set_dependencies(database, auth_func=None):
    global db
    db = database


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
            "business_id": user.get("business_id")
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============== MODELS ==============

class KYCStartRequest(BaseModel):
    country_code: str


class DocumentUploadRequest(BaseModel):
    document_type: str
    document_category: str  # business, identity, address
    file_name: str
    file_content: str  # Base64 encoded
    mime_type: str
    side: Optional[str] = None  # front, back for IDs


class AdditionalInfoRequest(BaseModel):
    directors: Optional[List[dict]] = None
    shareholders: Optional[List[dict]] = None
    business_description: Optional[str] = None


# ============== PUBLIC ENDPOINTS ==============

@router.get("/requirements/{country_code}")
async def get_country_requirements(country_code: str):
    """Get KYC requirements for a specific country"""
    from core.kyc_service import get_kyc_requirements, KYC_REQUIREMENTS
    
    if country_code not in KYC_REQUIREMENTS:
        raise HTTPException(status_code=404, detail=f"Country {country_code} not supported")
    
    requirements = get_kyc_requirements(country_code)
    return {
        "country_code": country_code,
        "country_name": requirements["country_name"],
        "currency": requirements["currency"],
        "required_documents": requirements["required_documents"],
        "additional_info": requirements.get("additional_info", [])
    }


@router.get("/legal-policies/{country_code}")
async def get_legal_policies(country_code: str, policy_type: Optional[str] = None):
    """Get legal policies (Terms of Service, Privacy Policy, AML Policy) for a country"""
    from core.legal_policies import generate_policy_document, get_all_policies
    from core.kyc_service import KYC_REQUIREMENTS
    
    if country_code not in KYC_REQUIREMENTS:
        raise HTTPException(status_code=404, detail=f"Country {country_code} not supported")
    
    try:
        if policy_type:
            valid_types = ["terms_of_service", "privacy_policy", "aml_policy"]
            if policy_type not in valid_types:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid policy type. Must be one of: {', '.join(valid_types)}"
                )
            return generate_policy_document(policy_type, country_code)
        else:
            return get_all_policies(country_code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/supported-countries")
async def get_supported_countries():
    """Get list of all supported countries for KYC"""
    from core.kyc_service import get_supported_countries
    return {"countries": get_supported_countries()}


# ============== AUTHENTICATED ENDPOINTS ==============

@router.post("/start")
async def start_kyc_process(
    request: KYCStartRequest,
    current_user: dict = Depends(get_current_user)
):
    """Start KYC process for the merchant"""
    from core.kyc_service import create_kyc_submission, KYC_REQUIREMENTS
    
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="No business registered. Complete onboarding first.")
    
    if request.country_code not in KYC_REQUIREMENTS:
        raise HTTPException(status_code=400, detail=f"Country {request.country_code} not supported")
    
    # Check if KYC already started
    existing = await db.kyc_submissions.find_one({"business_id": business_id})
    if existing:
        return {
            "success": True,
            "message": "KYC process already started",
            "submission_id": existing.get("submission_id"),
            "status": existing.get("status")
        }
    
    result = await create_kyc_submission(db, business_id, request.country_code)
    return result


@router.get("/status")
async def get_kyc_status(current_user: dict = Depends(get_current_user)):
    """Get current KYC status and progress"""
    from core.kyc_service import get_kyc_status
    
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="No business registered")
    
    return await get_kyc_status(db, business_id)


@router.post("/documents/upload")
async def upload_document(
    request: DocumentUploadRequest,
    current_user: dict = Depends(get_current_user)
):
    """Upload a KYC document"""
    from core.kyc_service import upload_kyc_document
    
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="No business registered")
    
    # Validate base64 content
    try:
        file_bytes = base64.b64decode(request.file_content)
        file_size = len(file_bytes)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file content. Must be base64 encoded.")
    
    # Check file size (max 10MB)
    if file_size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB allowed.")
    
    result = await upload_kyc_document(
        db=db,
        business_id=business_id,
        document_type=request.document_type,
        document_category=request.document_category,
        file_name=request.file_name,
        file_content=request.file_content,
        file_size=file_size,
        mime_type=request.mime_type,
        side=request.side
    )
    
    return result


@router.post("/documents/upload-file")
async def upload_document_file(
    document_type: str = Form(...),
    document_category: str = Form(...),
    side: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a KYC document via multipart form"""
    from core.kyc_service import upload_kyc_document
    
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="No business registered")
    
    # Read and encode file
    file_content = await file.read()
    file_size = len(file_content)
    
    # Check file size
    if file_size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB allowed.")
    
    # Check file type
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: PDF, JPG, PNG")
    
    file_content_b64 = base64.b64encode(file_content).decode('utf-8')
    
    result = await upload_kyc_document(
        db=db,
        business_id=business_id,
        document_type=document_type,
        document_category=document_category,
        file_name=file.filename,
        file_content=file_content_b64,
        file_size=file_size,
        mime_type=file.content_type,
        side=side
    )
    
    return result


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an uploaded document"""
    business_id = current_user.get("business_id")
    
    # Find and verify ownership
    document = await db.kyc_documents.find_one({
        "document_id": document_id,
        "business_id": business_id
    })
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.get("status") == "verified":
        raise HTTPException(status_code=400, detail="Cannot delete verified documents")
    
    # Delete from documents collection
    await db.kyc_documents.delete_one({"document_id": document_id})
    
    # Remove from submission
    await db.kyc_submissions.update_one(
        {"business_id": business_id},
        {"$pull": {"documents": {"document_id": document_id}}}
    )
    
    return {"success": True, "message": "Document deleted"}


@router.post("/additional-info")
async def update_additional_info(
    request: AdditionalInfoRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update additional KYC information"""
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="No business registered")
    
    update_data = {}
    if request.directors is not None:
        update_data["additional_info.directors"] = request.directors
    if request.shareholders is not None:
        update_data["additional_info.shareholders"] = request.shareholders
    if request.business_description is not None:
        update_data["additional_info.business_description"] = request.business_description
    
    update_data["updated_at"] = datetime.utcnow()
    
    await db.kyc_submissions.update_one(
        {"business_id": business_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Additional info updated"}


@router.post("/submit")
async def submit_kyc(current_user: dict = Depends(get_current_user)):
    """Submit KYC for review"""
    from core.kyc_service import submit_kyc_for_review
    
    business_id = current_user.get("business_id")
    if not business_id:
        raise HTTPException(status_code=400, detail="No business registered")
    
    return await submit_kyc_for_review(db, business_id)


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/submissions")
async def list_kyc_submissions(
    status: Optional[str] = None,
    country_code: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """List all KYC submissions (admin only)"""
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if status:
        query["status"] = status
    if country_code:
        query["country_code"] = country_code
    
    submissions = await db.kyc_submissions.find(query) \
        .sort("created_at", -1) \
        .skip(offset) \
        .limit(limit) \
        .to_list(length=limit)
    
    total = await db.kyc_submissions.count_documents(query)
    
    # Get merchant names
    result = []
    for sub in submissions:
        merchant = await db.kwikpay_merchants.find_one({"business_id": sub.get("business_id")})
        result.append({
            "submission_id": sub.get("submission_id"),
            "business_id": sub.get("business_id"),
            "business_name": merchant.get("business_name") if merchant else "Unknown",
            "country_code": sub.get("country_code"),
            "status": sub.get("status"),
            "documents_count": len(sub.get("documents", [])),
            "submitted_at": sub.get("submitted_at").isoformat() if sub.get("submitted_at") else None,
            "created_at": sub.get("created_at").isoformat() if sub.get("created_at") else None
        })
    
    return {
        "submissions": result,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/admin/submissions/{submission_id}")
async def get_submission_details(
    submission_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed KYC submission (admin only)"""
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    submission = await db.kyc_submissions.find_one({"submission_id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    merchant = await db.kwikpay_merchants.find_one({"business_id": submission.get("business_id")})
    
    # Get document details with file content
    documents = []
    for doc in submission.get("documents", []):
        full_doc = await db.kyc_documents.find_one({"document_id": doc.get("document_id")})
        if full_doc:
            documents.append({
                "document_id": full_doc.get("document_id"),
                "type": full_doc.get("type"),
                "category": full_doc.get("category"),
                "file_name": full_doc.get("file_name"),
                "mime_type": full_doc.get("mime_type"),
                "file_size": full_doc.get("file_size"),
                "side": full_doc.get("side"),
                "status": full_doc.get("status"),
                "file_content": full_doc.get("file_content"),  # Base64 for admin to view
                "uploaded_at": full_doc.get("uploaded_at").isoformat() if full_doc.get("uploaded_at") else None,
                "rejection_reason": full_doc.get("rejection_reason")
            })
    
    return {
        "submission_id": submission.get("submission_id"),
        "business_id": submission.get("business_id"),
        "business_name": merchant.get("business_name") if merchant else "Unknown",
        "owner_name": merchant.get("owner_name") if merchant else "Unknown",
        "email": merchant.get("email") if merchant else "Unknown",
        "phone": merchant.get("phone") if merchant else "Unknown",
        "country_code": submission.get("country_code"),
        "status": submission.get("status"),
        "documents": documents,
        "additional_info": submission.get("additional_info", {}),
        "review_notes": submission.get("review_notes", []),
        "submitted_at": submission.get("submitted_at").isoformat() if submission.get("submitted_at") else None,
        "created_at": submission.get("created_at").isoformat() if submission.get("created_at") else None
    }


@router.post("/admin/documents/{document_id}/verify")
async def verify_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Verify a document (admin only)"""
    from core.kyc_service import review_kyc_document
    
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return await review_kyc_document(db, document_id, "verified", current_user.get("id"))


@router.post("/admin/documents/{document_id}/reject")
async def reject_document(
    document_id: str,
    reason: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    """Reject a document (admin only)"""
    from core.kyc_service import review_kyc_document
    
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return await review_kyc_document(db, document_id, "rejected", current_user.get("id"), reason)


@router.post("/admin/submissions/{submission_id}/approve")
async def approve_submission(
    submission_id: str,
    notes: Optional[str] = Body(None, embed=True),
    current_user: dict = Depends(get_current_user)
):
    """Approve KYC submission (admin only)"""
    from core.kyc_service import approve_kyc
    
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    submission = await db.kyc_submissions.find_one({"submission_id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return await approve_kyc(db, submission.get("business_id"), current_user.get("id"), notes)


@router.post("/admin/submissions/{submission_id}/reject")
async def reject_submission(
    submission_id: str,
    reason: str = Body(...),
    required_updates: List[str] = Body(default=[]),
    current_user: dict = Depends(get_current_user)
):
    """Reject KYC submission (admin only)"""
    from core.kyc_service import reject_kyc
    
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    submission = await db.kyc_submissions.find_one({"submission_id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return await reject_kyc(db, submission.get("business_id"), current_user.get("id"), reason, required_updates)
