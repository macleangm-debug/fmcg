"""
KYC (Know Your Customer) Service
Multi-country KYC document management and verification
Supports: Tanzania, Kenya, Uganda, Rwanda, Ghana, Nigeria
"""
import os
import logging
import secrets
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum

logger = logging.getLogger(__name__)

# KYC Status
class KYCStatus(str, Enum):
    NOT_STARTED = "not_started"
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    REQUIRES_UPDATE = "requires_update"


class DocumentStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    EXPIRED = "expired"


# Country-specific KYC requirements
KYC_REQUIREMENTS = {
    "TZ": {
        "country_name": "Tanzania",
        "currency": "TZS",
        "required_documents": {
            "business": [
                {
                    "type": "business_registration",
                    "name": "Certificate of Incorporation / Business Registration",
                    "description": "BRELA registration certificate or business license",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 5
                },
                {
                    "type": "tax_certificate",
                    "name": "TIN Certificate",
                    "description": "Tax Identification Number from TRA",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 5
                },
                {
                    "type": "business_license",
                    "name": "Business License",
                    "description": "Valid trading license from local authority",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 5
                }
            ],
            "identity": [
                {
                    "type": "national_id",
                    "name": "National ID (NIDA)",
                    "description": "Valid Tanzanian National ID card",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3,
                    "sides": ["front", "back"]
                },
                {
                    "type": "passport",
                    "name": "Passport (Alternative)",
                    "description": "Valid passport if no National ID",
                    "required": False,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3
                }
            ],
            "address": [
                {
                    "type": "utility_bill",
                    "name": "Utility Bill",
                    "description": "Recent utility bill (electricity, water) - max 3 months old",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3
                },
                {
                    "type": "bank_statement",
                    "name": "Bank Statement",
                    "description": "Business bank statement (last 3 months)",
                    "required": True,
                    "accepted_formats": ["pdf"],
                    "max_size_mb": 10
                }
            ]
        },
        "additional_info": [
            "directors_list",
            "shareholders_list",
            "business_description"
        ]
    },
    "KE": {
        "country_name": "Kenya",
        "currency": "KES",
        "required_documents": {
            "business": [
                {
                    "type": "business_registration",
                    "name": "Certificate of Registration",
                    "description": "Certificate from Registrar of Companies",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 5
                },
                {
                    "type": "tax_certificate",
                    "name": "KRA PIN Certificate",
                    "description": "Kenya Revenue Authority PIN certificate",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 5
                },
                {
                    "type": "cr12",
                    "name": "CR12 Form",
                    "description": "Company details from Registrar (for Ltd companies)",
                    "required": False,
                    "accepted_formats": ["pdf"],
                    "max_size_mb": 5
                }
            ],
            "identity": [
                {
                    "type": "national_id",
                    "name": "National ID Card",
                    "description": "Valid Kenyan National ID",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3,
                    "sides": ["front", "back"]
                },
                {
                    "type": "kra_pin",
                    "name": "Personal KRA PIN",
                    "description": "Director's personal KRA PIN",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3
                }
            ],
            "address": [
                {
                    "type": "utility_bill",
                    "name": "Utility Bill",
                    "description": "Recent utility bill (max 3 months old)",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3
                },
                {
                    "type": "bank_statement",
                    "name": "Bank Statement",
                    "description": "Business bank statement (last 3 months)",
                    "required": True,
                    "accepted_formats": ["pdf"],
                    "max_size_mb": 10
                }
            ]
        },
        "additional_info": [
            "directors_list",
            "shareholders_list",
            "business_description"
        ]
    },
    "UG": {
        "country_name": "Uganda",
        "currency": "UGX",
        "required_documents": {
            "business": [
                {
                    "type": "business_registration",
                    "name": "Certificate of Incorporation",
                    "description": "URSB registration certificate",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 5
                },
                {
                    "type": "tax_certificate",
                    "name": "TIN Certificate",
                    "description": "Tax Identification Number from URA",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 5
                },
                {
                    "type": "trading_license",
                    "name": "Trading License",
                    "description": "Valid trading license from KCCA/local authority",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 5
                }
            ],
            "identity": [
                {
                    "type": "national_id",
                    "name": "National ID (NIN)",
                    "description": "Valid Ugandan National ID",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3,
                    "sides": ["front", "back"]
                }
            ],
            "address": [
                {
                    "type": "utility_bill",
                    "name": "Utility Bill",
                    "description": "Recent UMEME or NWSC bill",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3
                },
                {
                    "type": "bank_statement",
                    "name": "Bank Statement",
                    "description": "Business bank statement (last 3 months)",
                    "required": True,
                    "accepted_formats": ["pdf"],
                    "max_size_mb": 10
                }
            ]
        },
        "additional_info": [
            "directors_list",
            "business_description"
        ]
    },
    "RW": {
        "country_name": "Rwanda",
        "currency": "RWF",
        "required_documents": {
            "business": [
                {
                    "type": "business_registration",
                    "name": "RDB Registration Certificate",
                    "description": "Certificate from Rwanda Development Board",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 5
                },
                {
                    "type": "tax_certificate",
                    "name": "TIN Certificate",
                    "description": "Tax Identification from RRA",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 5
                }
            ],
            "identity": [
                {
                    "type": "national_id",
                    "name": "National ID",
                    "description": "Valid Rwandan National ID",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3,
                    "sides": ["front", "back"]
                }
            ],
            "address": [
                {
                    "type": "utility_bill",
                    "name": "Utility Bill / Lease",
                    "description": "Recent utility bill or lease agreement",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3
                },
                {
                    "type": "bank_statement",
                    "name": "Bank Statement",
                    "description": "Business bank statement (last 3 months)",
                    "required": True,
                    "accepted_formats": ["pdf"],
                    "max_size_mb": 10
                }
            ]
        },
        "additional_info": [
            "directors_list",
            "business_description"
        ]
    },
    "GH": {
        "country_name": "Ghana",
        "currency": "GHS",
        "required_documents": {
            "business": [
                {
                    "type": "business_registration",
                    "name": "Certificate of Incorporation",
                    "description": "Registrar General's Department certificate",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 5
                },
                {
                    "type": "tax_certificate",
                    "name": "TIN Certificate",
                    "description": "Tax Identification Number from GRA",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 5
                },
                {
                    "type": "business_operating_permit",
                    "name": "Business Operating Permit",
                    "description": "District Assembly business permit",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 5
                }
            ],
            "identity": [
                {
                    "type": "ghana_card",
                    "name": "Ghana Card",
                    "description": "Valid Ghana Card (National ID)",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3,
                    "sides": ["front", "back"]
                },
                {
                    "type": "voter_id",
                    "name": "Voter ID (Alternative)",
                    "description": "Valid Voter ID if no Ghana Card",
                    "required": False,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3
                }
            ],
            "address": [
                {
                    "type": "utility_bill",
                    "name": "Utility Bill",
                    "description": "ECG or Ghana Water bill (max 3 months)",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3
                },
                {
                    "type": "bank_statement",
                    "name": "Bank Statement",
                    "description": "Business bank statement (last 3 months)",
                    "required": True,
                    "accepted_formats": ["pdf"],
                    "max_size_mb": 10
                }
            ]
        },
        "additional_info": [
            "directors_list",
            "shareholders_list",
            "business_description"
        ]
    },
    "NG": {
        "country_name": "Nigeria",
        "currency": "NGN",
        "required_documents": {
            "business": [
                {
                    "type": "cac_certificate",
                    "name": "CAC Certificate",
                    "description": "Corporate Affairs Commission registration",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 5
                },
                {
                    "type": "tax_certificate",
                    "name": "TIN Certificate",
                    "description": "Tax Identification Number from FIRS",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 5
                },
                {
                    "type": "cac_status_report",
                    "name": "CAC Status Report",
                    "description": "Recent CAC status report showing directors",
                    "required": True,
                    "accepted_formats": ["pdf"],
                    "max_size_mb": 5
                },
                {
                    "type": "memart",
                    "name": "MEMART",
                    "description": "Memorandum and Articles of Association",
                    "required": False,
                    "accepted_formats": ["pdf"],
                    "max_size_mb": 10
                }
            ],
            "identity": [
                {
                    "type": "nin",
                    "name": "NIN Slip / National ID",
                    "description": "National Identification Number slip or card",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3
                },
                {
                    "type": "bvn_verification",
                    "name": "BVN Verification",
                    "description": "Bank Verification Number confirmation",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3
                },
                {
                    "type": "drivers_license",
                    "name": "Driver's License (Alternative)",
                    "description": "Valid Nigerian driver's license",
                    "required": False,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3
                }
            ],
            "address": [
                {
                    "type": "utility_bill",
                    "name": "Utility Bill",
                    "description": "Recent NEPA/PHCN or water bill",
                    "required": True,
                    "accepted_formats": ["pdf", "jpg", "png"],
                    "max_size_mb": 3
                },
                {
                    "type": "bank_statement",
                    "name": "Bank Statement",
                    "description": "Business bank statement (last 6 months)",
                    "required": True,
                    "accepted_formats": ["pdf"],
                    "max_size_mb": 10
                }
            ]
        },
        "additional_info": [
            "directors_list",
            "shareholders_list",
            "business_description",
            "scuml_certificate"  # Special Control Unit against Money Laundering
        ]
    }
}


def get_kyc_requirements(country_code: str) -> Dict[str, Any]:
    """Get KYC requirements for a specific country"""
    return KYC_REQUIREMENTS.get(country_code, KYC_REQUIREMENTS["TZ"])


def get_supported_countries() -> List[Dict[str, str]]:
    """Get list of all supported countries"""
    return [
        {"code": code, "name": config["country_name"], "currency": config["currency"]}
        for code, config in KYC_REQUIREMENTS.items()
    ]


def generate_document_id() -> str:
    """Generate unique document ID"""
    return f"DOC-{secrets.token_hex(8).upper()}"


async def create_kyc_submission(
    db,
    business_id: str,
    country_code: str
) -> Dict[str, Any]:
    """Create a new KYC submission for a merchant"""
    requirements = get_kyc_requirements(country_code)
    
    submission = {
        "submission_id": f"KYC-{secrets.token_hex(6).upper()}",
        "business_id": business_id,
        "country_code": country_code,
        "status": KYCStatus.PENDING.value,
        "documents": [],
        "additional_info": {},
        "review_notes": [],
        "submitted_at": None,
        "reviewed_at": None,
        "reviewed_by": None,
        "approved_at": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.kyc_submissions.insert_one(submission)
    
    return {
        "submission_id": submission["submission_id"],
        "status": submission["status"],
        "requirements": requirements
    }


async def upload_kyc_document(
    db,
    business_id: str,
    document_type: str,
    document_category: str,  # business, identity, address
    file_name: str,
    file_content: str,  # Base64 encoded
    file_size: int,
    mime_type: str,
    side: Optional[str] = None  # front, back for IDs
) -> Dict[str, Any]:
    """Upload a KYC document"""
    
    # Get or create KYC submission
    submission = await db.kyc_submissions.find_one({"business_id": business_id})
    
    if not submission:
        return {"success": False, "error": "No KYC submission found. Start KYC process first."}
    
    document_id = generate_document_id()
    
    document = {
        "document_id": document_id,
        "type": document_type,
        "category": document_category,
        "file_name": file_name,
        "file_size": file_size,
        "mime_type": mime_type,
        "side": side,
        "status": DocumentStatus.PENDING.value,
        "uploaded_at": datetime.utcnow(),
        "verified_at": None,
        "rejection_reason": None
    }
    
    # Store document metadata (file content would go to S3/blob storage in production)
    # For now, we'll store a reference
    await db.kyc_documents.insert_one({
        "document_id": document_id,
        "business_id": business_id,
        "submission_id": submission["submission_id"],
        "file_content": file_content,  # In production, this would be an S3 URL
        **document
    })
    
    # Update submission with document reference
    await db.kyc_submissions.update_one(
        {"business_id": business_id},
        {
            "$push": {"documents": document},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    logger.info(f"KYC document uploaded: {document_id} for business {business_id}")
    
    return {
        "success": True,
        "document_id": document_id,
        "status": DocumentStatus.PENDING.value,
        "message": "Document uploaded successfully"
    }


async def submit_kyc_for_review(
    db,
    business_id: str
) -> Dict[str, Any]:
    """Submit KYC for review after all documents uploaded"""
    submission = await db.kyc_submissions.find_one({"business_id": business_id})
    
    if not submission:
        return {"success": False, "error": "No KYC submission found"}
    
    # Check if all required documents are uploaded
    country_code = submission.get("country_code", "TZ")
    requirements = get_kyc_requirements(country_code)
    
    uploaded_types = {doc["type"] for doc in submission.get("documents", [])}
    missing_docs = []
    
    for category, docs in requirements["required_documents"].items():
        for doc in docs:
            if doc["required"] and doc["type"] not in uploaded_types:
                missing_docs.append(doc["name"])
    
    if missing_docs:
        return {
            "success": False,
            "error": "Missing required documents",
            "missing_documents": missing_docs
        }
    
    # Update status to under review
    await db.kyc_submissions.update_one(
        {"business_id": business_id},
        {"$set": {
            "status": KYCStatus.UNDER_REVIEW.value,
            "submitted_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Update merchant status
    await db.kwikpay_merchants.update_one(
        {"business_id": business_id},
        {"$set": {
            "kyc_status": KYCStatus.UNDER_REVIEW.value,
            "kyc_submitted_at": datetime.utcnow()
        }}
    )
    
    return {
        "success": True,
        "status": KYCStatus.UNDER_REVIEW.value,
        "message": "KYC submitted for review. You will be notified once reviewed."
    }


async def get_kyc_status(db, business_id: str) -> Dict[str, Any]:
    """Get current KYC status and progress"""
    submission = await db.kyc_submissions.find_one({"business_id": business_id})
    
    if not submission:
        return {
            "status": KYCStatus.NOT_STARTED.value,
            "progress": 0,
            "documents": [],
            "message": "KYC process not started"
        }
    
    country_code = submission.get("country_code", "TZ")
    requirements = get_kyc_requirements(country_code)
    
    # Calculate progress
    total_required = 0
    uploaded = 0
    
    for category, docs in requirements["required_documents"].items():
        for doc in docs:
            if doc["required"]:
                total_required += 1
                if any(d["type"] == doc["type"] for d in submission.get("documents", [])):
                    uploaded += 1
    
    progress = int((uploaded / total_required) * 100) if total_required > 0 else 0
    
    return {
        "submission_id": submission.get("submission_id"),
        "status": submission.get("status"),
        "progress": progress,
        "documents_uploaded": len(submission.get("documents", [])),
        "documents_required": total_required,
        "documents": [
            {
                "document_id": d.get("document_id"),
                "type": d.get("type"),
                "category": d.get("category"),
                "file_name": d.get("file_name"),
                "status": d.get("status"),
                "uploaded_at": d.get("uploaded_at").isoformat() if d.get("uploaded_at") else None,
                "rejection_reason": d.get("rejection_reason")
            }
            for d in submission.get("documents", [])
        ],
        "review_notes": submission.get("review_notes", []),
        "submitted_at": submission.get("submitted_at").isoformat() if submission.get("submitted_at") else None,
        "approved_at": submission.get("approved_at").isoformat() if submission.get("approved_at") else None
    }


async def review_kyc_document(
    db,
    document_id: str,
    status: str,  # verified, rejected
    reviewer_id: str,
    rejection_reason: Optional[str] = None
) -> Dict[str, Any]:
    """Review a single KYC document (admin function)"""
    
    document = await db.kyc_documents.find_one({"document_id": document_id})
    if not document:
        return {"success": False, "error": "Document not found"}
    
    update_data = {
        "status": status,
        "verified_at": datetime.utcnow() if status == "verified" else None,
        "rejection_reason": rejection_reason if status == "rejected" else None,
        "reviewed_by": reviewer_id
    }
    
    await db.kyc_documents.update_one(
        {"document_id": document_id},
        {"$set": update_data}
    )
    
    # Update in submission as well
    await db.kyc_submissions.update_one(
        {"business_id": document["business_id"], "documents.document_id": document_id},
        {"$set": {
            "documents.$.status": status,
            "documents.$.rejection_reason": rejection_reason
        }}
    )
    
    return {"success": True, "status": status}


async def approve_kyc(
    db,
    business_id: str,
    reviewer_id: str,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """Approve KYC submission (admin function)"""
    
    submission = await db.kyc_submissions.find_one({"business_id": business_id})
    if not submission:
        return {"success": False, "error": "No KYC submission found"}
    
    await db.kyc_submissions.update_one(
        {"business_id": business_id},
        {"$set": {
            "status": KYCStatus.APPROVED.value,
            "approved_at": datetime.utcnow(),
            "reviewed_at": datetime.utcnow(),
            "reviewed_by": reviewer_id
        },
        "$push": {
            "review_notes": {
                "note": notes or "KYC approved",
                "by": reviewer_id,
                "at": datetime.utcnow(),
                "action": "approved"
            }
        }}
    )
    
    # Update merchant status - ready for live mode
    await db.kwikpay_merchants.update_one(
        {"business_id": business_id},
        {"$set": {
            "kyc_status": KYCStatus.APPROVED.value,
            "kyc_approved_at": datetime.utcnow(),
            "is_verified": True
        }}
    )
    
    return {
        "success": True,
        "status": KYCStatus.APPROVED.value,
        "message": "KYC approved. Merchant is now verified."
    }


async def reject_kyc(
    db,
    business_id: str,
    reviewer_id: str,
    reason: str,
    required_updates: List[str] = None
) -> Dict[str, Any]:
    """Reject KYC submission with reason (admin function)"""
    
    await db.kyc_submissions.update_one(
        {"business_id": business_id},
        {"$set": {
            "status": KYCStatus.REQUIRES_UPDATE.value,
            "reviewed_at": datetime.utcnow(),
            "reviewed_by": reviewer_id
        },
        "$push": {
            "review_notes": {
                "note": reason,
                "required_updates": required_updates or [],
                "by": reviewer_id,
                "at": datetime.utcnow(),
                "action": "rejected"
            }
        }}
    )
    
    await db.kwikpay_merchants.update_one(
        {"business_id": business_id},
        {"$set": {"kyc_status": KYCStatus.REQUIRES_UPDATE.value}}
    )
    
    return {
        "success": True,
        "status": KYCStatus.REQUIRES_UPDATE.value,
        "message": "KYC requires updates",
        "reason": reason,
        "required_updates": required_updates
    }
