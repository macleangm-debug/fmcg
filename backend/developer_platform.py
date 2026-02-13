"""
Software Galaxy Developer Platform - Extended Features

This module adds industry-standard features:
1. API Keys (for public APIs)
2. Webhooks System
3. Rate Limiting
4. Service Accounts
5. Scopes & Permissions
"""

from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import secrets
import hashlib
import hmac
import json
import httpx
import asyncio
import logging
from bson import ObjectId

logger = logging.getLogger(__name__)

# ============== SCOPES DEFINITION ==============

SCOPES = {
    "openid": {
        "name": "OpenID",
        "description": "Authenticate and get user's unique identifier",
        "category": "Identity",
        "claims": ["sub"],
        "sensitive": False,
    },
    "profile": {
        "name": "Profile Information",
        "description": "Access user's basic profile (name, picture)",
        "category": "Identity",
        "claims": ["name", "given_name", "family_name", "picture", "locale"],
        "sensitive": False,
    },
    "email": {
        "name": "Email Address",
        "description": "Access user's email address",
        "category": "Identity",
        "claims": ["email", "email_verified"],
        "sensitive": False,
    },
    "phone": {
        "name": "Phone Number",
        "description": "Access user's phone number",
        "category": "Identity",
        "claims": ["phone_number", "phone_number_verified"],
        "sensitive": True,
    },
    "businesses": {
        "name": "Business Access",
        "description": "View businesses the user has access to",
        "category": "Business",
        "claims": ["businesses"],
        "sensitive": False,
    },
    "businesses.read": {
        "name": "Read Business Data",
        "description": "Read business information, products, customers",
        "category": "Business",
        "claims": [],
        "sensitive": False,
    },
    "businesses.write": {
        "name": "Modify Business Data",
        "description": "Create and update business data",
        "category": "Business",
        "claims": [],
        "sensitive": True,
    },
    "orders.read": {
        "name": "Read Orders",
        "description": "View orders and sales data",
        "category": "Commerce",
        "claims": [],
        "sensitive": False,
    },
    "orders.write": {
        "name": "Create Orders",
        "description": "Create and manage orders",
        "category": "Commerce",
        "claims": [],
        "sensitive": True,
    },
    "inventory.read": {
        "name": "Read Inventory",
        "description": "View product inventory levels",
        "category": "Inventory",
        "claims": [],
        "sensitive": False,
    },
    "inventory.write": {
        "name": "Manage Inventory",
        "description": "Update inventory quantities",
        "category": "Inventory",
        "claims": [],
        "sensitive": True,
    },
    "customers.read": {
        "name": "Read Customers",
        "description": "View customer information",
        "category": "CRM",
        "claims": [],
        "sensitive": True,
    },
    "customers.write": {
        "name": "Manage Customers",
        "description": "Create and update customers",
        "category": "CRM",
        "claims": [],
        "sensitive": True,
    },
    "invoices.read": {
        "name": "Read Invoices",
        "description": "View invoices and billing data",
        "category": "Finance",
        "claims": [],
        "sensitive": True,
    },
    "invoices.write": {
        "name": "Create Invoices",
        "description": "Create and send invoices",
        "category": "Finance",
        "claims": [],
        "sensitive": True,
    },
    "payments.read": {
        "name": "Read Payments",
        "description": "View payment transactions",
        "category": "Finance",
        "claims": [],
        "sensitive": True,
    },
    "messages.send": {
        "name": "Send Messages",
        "description": "Send SMS and WhatsApp messages",
        "category": "Messaging",
        "claims": [],
        "sensitive": True,
    },
    "offline_access": {
        "name": "Offline Access",
        "description": "Access data when user is not logged in (refresh tokens)",
        "category": "System",
        "claims": [],
        "sensitive": False,
    },
}

# ============== WEBHOOK EVENTS ==============

WEBHOOK_EVENTS = {
    "user.created": {
        "name": "User Created",
        "description": "Triggered when a new user signs up",
        "category": "Users",
        "payload_example": {"user_id": "123", "email": "user@example.com", "created_at": "2025-01-01T00:00:00Z"}
    },
    "user.updated": {
        "name": "User Updated",
        "description": "Triggered when user profile is updated",
        "category": "Users",
        "payload_example": {"user_id": "123", "changes": ["name", "email"]}
    },
    "order.created": {
        "name": "Order Created",
        "description": "Triggered when a new order is placed",
        "category": "Orders",
        "payload_example": {"order_id": "456", "total": 99.99, "items_count": 3}
    },
    "order.completed": {
        "name": "Order Completed",
        "description": "Triggered when an order is fulfilled",
        "category": "Orders",
        "payload_example": {"order_id": "456", "status": "completed"}
    },
    "order.cancelled": {
        "name": "Order Cancelled",
        "description": "Triggered when an order is cancelled",
        "category": "Orders",
        "payload_example": {"order_id": "456", "reason": "customer_request"}
    },
    "payment.received": {
        "name": "Payment Received",
        "description": "Triggered when a payment is processed",
        "category": "Payments",
        "payload_example": {"payment_id": "789", "amount": 99.99, "method": "card"}
    },
    "payment.failed": {
        "name": "Payment Failed",
        "description": "Triggered when a payment fails",
        "category": "Payments",
        "payload_example": {"payment_id": "789", "error": "insufficient_funds"}
    },
    "invoice.created": {
        "name": "Invoice Created",
        "description": "Triggered when an invoice is created",
        "category": "Invoices",
        "payload_example": {"invoice_id": "101", "amount": 500.00, "due_date": "2025-02-01"}
    },
    "invoice.paid": {
        "name": "Invoice Paid",
        "description": "Triggered when an invoice is paid",
        "category": "Invoices",
        "payload_example": {"invoice_id": "101", "paid_at": "2025-01-15T10:30:00Z"}
    },
    "inventory.low_stock": {
        "name": "Low Stock Alert",
        "description": "Triggered when product stock falls below threshold",
        "category": "Inventory",
        "payload_example": {"product_id": "202", "current_stock": 5, "threshold": 10}
    },
    "customer.created": {
        "name": "Customer Created",
        "description": "Triggered when a new customer is added",
        "category": "Customers",
        "payload_example": {"customer_id": "303", "name": "John Doe"}
    },
    "message.sent": {
        "name": "Message Sent",
        "description": "Triggered when SMS/WhatsApp message is sent",
        "category": "Messaging",
        "payload_example": {"message_id": "404", "type": "sms", "recipient": "+1234567890"}
    },
    "message.delivered": {
        "name": "Message Delivered",
        "description": "Triggered when message is delivered",
        "category": "Messaging",
        "payload_example": {"message_id": "404", "delivered_at": "2025-01-15T10:30:00Z"}
    },
}

# ============== MODELS ==============

class APIKeyType(str, Enum):
    LIVE = "live"
    TEST = "test"


class APIKey(BaseModel):
    """API Key for public API access"""
    id: str = Field(default_factory=lambda: str(ObjectId()))
    key_prefix: str  # First 8 chars shown to user (e.g., "gx_live_")
    key_hash: str  # SHA256 hash of full key
    name: str
    key_type: APIKeyType = APIKeyType.LIVE
    
    client_id: str  # Associated OAuth app
    created_by: str  # User ID
    
    # Permissions
    allowed_scopes: List[str] = []
    ip_whitelist: List[str] = []  # Empty = all IPs allowed
    
    # Usage tracking
    last_used_at: Optional[datetime] = None
    usage_count: int = 0
    
    # Status
    is_active: bool = True
    expires_at: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WebhookEndpoint(BaseModel):
    """Webhook subscription"""
    id: str = Field(default_factory=lambda: str(ObjectId()))
    client_id: str
    
    url: str
    description: Optional[str] = None
    
    # Events to subscribe to
    events: List[str] = []  # ["order.created", "payment.received"]
    
    # Security
    secret: str = Field(default_factory=lambda: secrets.token_hex(32))
    
    # Status
    is_active: bool = True
    
    # Health tracking
    last_triggered_at: Optional[datetime] = None
    success_count: int = 0
    failure_count: int = 0
    last_error: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WebhookDelivery(BaseModel):
    """Record of webhook delivery attempt"""
    id: str = Field(default_factory=lambda: str(ObjectId()))
    webhook_id: str
    event_type: str
    
    payload: Dict[str, Any]
    
    # Delivery status
    status: str  # pending, success, failed
    response_code: Optional[int] = None
    response_body: Optional[str] = None
    error_message: Optional[str] = None
    
    # Timing
    created_at: datetime = Field(default_factory=datetime.utcnow)
    delivered_at: Optional[datetime] = None
    retry_count: int = 0


class ServiceAccount(BaseModel):
    """Service account for server-to-server auth"""
    id: str = Field(default_factory=lambda: str(ObjectId()))
    client_id: str
    
    name: str
    description: Optional[str] = None
    
    # Credentials
    service_account_id: str = Field(default_factory=lambda: f"sa-{secrets.token_hex(8)}")
    private_key_hash: str  # Hashed private key
    
    # Permissions
    scopes: List[str] = []
    
    # Status
    is_active: bool = True
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used_at: Optional[datetime] = None


class RateLimitInfo(BaseModel):
    """Rate limit tracking"""
    client_id: str
    endpoint: str
    
    # Current period
    requests_count: int = 0
    period_start: datetime = Field(default_factory=datetime.utcnow)
    
    # Limits
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    requests_per_day: int = 10000


class ConsentScreenConfig(BaseModel):
    """OAuth consent screen configuration"""
    client_id: str
    
    # Branding
    app_name: str
    app_logo_url: Optional[str] = None
    app_homepage_url: Optional[str] = None
    
    # Legal
    privacy_policy_url: Optional[str] = None
    terms_of_service_url: Optional[str] = None
    
    # Contact
    support_email: Optional[str] = None
    
    # Customization
    primary_color: Optional[str] = None
    
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AppVerification(BaseModel):
    """App verification status"""
    client_id: str
    
    status: str  # unverified, pending, verified, rejected
    
    # Verification details
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    
    # Requirements
    has_privacy_policy: bool = False
    has_terms: bool = False
    domain_verified: bool = False
    
    rejection_reason: Optional[str] = None


# ============== REQUEST/RESPONSE MODELS ==============

class CreateAPIKeyRequest(BaseModel):
    name: str
    key_type: APIKeyType = APIKeyType.LIVE
    allowed_scopes: List[str] = []
    ip_whitelist: List[str] = []
    expires_in_days: Optional[int] = None


class CreateAPIKeyResponse(BaseModel):
    api_key: str  # Full key - only shown once!
    key_prefix: str
    name: str
    key_type: str
    message: str


class CreateWebhookRequest(BaseModel):
    url: HttpUrl
    description: Optional[str] = None
    events: List[str]


class UpdateConsentScreenRequest(BaseModel):
    app_name: Optional[str] = None
    app_logo_url: Optional[str] = None
    app_homepage_url: Optional[str] = None
    privacy_policy_url: Optional[str] = None
    terms_of_service_url: Optional[str] = None
    support_email: Optional[str] = None
    primary_color: Optional[str] = None


# ============== API ROUTER ==============

developer_router = APIRouter(prefix="/developer", tags=["Developer Platform"])
security = HTTPBearer(auto_error=False)


def create_developer_routes(db, jwt_secret: str):
    """Factory function to create developer platform routes"""
    
    import jwt
    
    async def get_current_user(credentials: HTTPAuthorizationCredentials):
        """Helper to get current user from token"""
        if not credentials:
            return None
        try:
            payload = jwt.decode(credentials.credentials, jwt_secret, algorithms=["HS256"])
            return payload.get("sub")
        except:
            return None
    
    # ============== SCOPES ==============
    
    @developer_router.get("/scopes")
    async def list_scopes():
        """
        List all available OAuth scopes
        
        Returns detailed information about each scope including:
        - What data it provides access to
        - Whether it's considered sensitive
        - Required for verification
        """
        scopes_by_category = {}
        
        for scope_id, scope_info in SCOPES.items():
            category = scope_info["category"]
            if category not in scopes_by_category:
                scopes_by_category[category] = []
            
            scopes_by_category[category].append({
                "scope": scope_id,
                **scope_info
            })
        
        return {
            "scopes": SCOPES,
            "by_category": scopes_by_category,
            "sensitive_scopes": [k for k, v in SCOPES.items() if v.get("sensitive")],
            "total": len(SCOPES)
        }
    
    
    # ============== API KEYS ==============
    
    @developer_router.post("/api-keys", response_model=CreateAPIKeyResponse)
    async def create_api_key(
        request: CreateAPIKeyRequest,
        client_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """
        Create a new API key for your application
        
        API keys are used for server-side API calls that don't require user authentication.
        The full key is only shown once - save it securely!
        """
        user_id = await get_current_user(credentials)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Verify user owns this app
        app = await db.oauth_apps.find_one({"client_id": client_id})
        if not app or app.get("created_by") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized for this app")
        
        # Generate API key
        key_type_prefix = "gx_live_" if request.key_type == APIKeyType.LIVE else "gx_test_"
        random_part = secrets.token_urlsafe(32)
        full_key = f"{key_type_prefix}{random_part}"
        
        # Store hashed version
        key_hash = hashlib.sha256(full_key.encode()).hexdigest()
        
        expires_at = None
        if request.expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=request.expires_in_days)
        
        api_key_doc = {
            "key_prefix": full_key[:16],
            "key_hash": key_hash,
            "name": request.name,
            "key_type": request.key_type,
            "client_id": client_id,
            "created_by": user_id,
            "allowed_scopes": request.allowed_scopes,
            "ip_whitelist": request.ip_whitelist,
            "is_active": True,
            "expires_at": expires_at,
            "usage_count": 0,
            "created_at": datetime.utcnow()
        }
        
        await db.api_keys.insert_one(api_key_doc)
        
        return CreateAPIKeyResponse(
            api_key=full_key,
            key_prefix=full_key[:16],
            name=request.name,
            key_type=request.key_type,
            message="Save this API key securely - it won't be shown again!"
        )
    
    
    @developer_router.get("/api-keys")
    async def list_api_keys(
        client_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """List all API keys for an application (keys are masked)"""
        user_id = await get_current_user(credentials)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        keys = await db.api_keys.find({
            "client_id": client_id,
            "created_by": user_id
        }).to_list(None)
        
        return {
            "api_keys": [
                {
                    "id": str(k.get("_id")),
                    "key_prefix": k["key_prefix"],
                    "name": k["name"],
                    "key_type": k["key_type"],
                    "is_active": k["is_active"],
                    "last_used_at": k.get("last_used_at"),
                    "usage_count": k.get("usage_count", 0),
                    "created_at": k["created_at"],
                    "expires_at": k.get("expires_at")
                }
                for k in keys
            ]
        }
    
    
    @developer_router.delete("/api-keys/{key_id}")
    async def revoke_api_key(
        key_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Revoke an API key"""
        user_id = await get_current_user(credentials)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        result = await db.api_keys.update_one(
            {"_id": ObjectId(key_id), "created_by": user_id},
            {"$set": {"is_active": False, "revoked_at": datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="API key not found")
        
        return {"status": "revoked", "key_id": key_id}
    
    
    # ============== WEBHOOKS ==============
    
    @developer_router.get("/webhooks/events")
    async def list_webhook_events():
        """
        List all available webhook events
        
        Shows all events you can subscribe to, with example payloads.
        """
        events_by_category = {}
        
        for event_id, event_info in WEBHOOK_EVENTS.items():
            category = event_info["category"]
            if category not in events_by_category:
                events_by_category[category] = []
            
            events_by_category[category].append({
                "event": event_id,
                **event_info
            })
        
        return {
            "events": WEBHOOK_EVENTS,
            "by_category": events_by_category,
            "total": len(WEBHOOK_EVENTS)
        }
    
    
    @developer_router.post("/webhooks")
    async def create_webhook(
        request: CreateWebhookRequest,
        client_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """
        Create a webhook endpoint
        
        Webhooks allow your application to receive real-time notifications
        when events happen in Software Galaxy.
        """
        user_id = await get_current_user(credentials)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Validate events
        for event in request.events:
            if event not in WEBHOOK_EVENTS and event != "*":
                raise HTTPException(status_code=400, detail=f"Invalid event: {event}")
        
        webhook_secret = secrets.token_hex(32)
        
        webhook_doc = {
            "client_id": client_id,
            "url": str(request.url),
            "description": request.description,
            "events": request.events,
            "secret": webhook_secret,
            "is_active": True,
            "success_count": 0,
            "failure_count": 0,
            "created_at": datetime.utcnow()
        }
        
        result = await db.webhooks.insert_one(webhook_doc)
        
        return {
            "webhook_id": str(result.inserted_id),
            "url": str(request.url),
            "events": request.events,
            "secret": webhook_secret,
            "message": "Save the webhook secret - use it to verify webhook signatures!"
        }
    
    
    @developer_router.get("/webhooks")
    async def list_webhooks(
        client_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """List all webhooks for an application"""
        user_id = await get_current_user(credentials)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        webhooks = await db.webhooks.find({"client_id": client_id}).to_list(None)
        
        return {
            "webhooks": [
                {
                    "id": str(w.get("_id")),
                    "url": w["url"],
                    "description": w.get("description"),
                    "events": w["events"],
                    "is_active": w["is_active"],
                    "last_triggered_at": w.get("last_triggered_at"),
                    "success_count": w.get("success_count", 0),
                    "failure_count": w.get("failure_count", 0),
                    "last_error": w.get("last_error"),
                    "created_at": w["created_at"]
                }
                for w in webhooks
            ]
        }
    
    
    @developer_router.delete("/webhooks/{webhook_id}")
    async def delete_webhook(
        webhook_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Delete a webhook endpoint"""
        user_id = await get_current_user(credentials)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        result = await db.webhooks.delete_one({"_id": ObjectId(webhook_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Webhook not found")
        
        return {"status": "deleted", "webhook_id": webhook_id}
    
    
    @developer_router.post("/webhooks/{webhook_id}/test")
    async def test_webhook(
        webhook_id: str,
        background_tasks: BackgroundTasks,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Send a test webhook to verify your endpoint"""
        user_id = await get_current_user(credentials)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        webhook = await db.webhooks.find_one({"_id": ObjectId(webhook_id)})
        if not webhook:
            raise HTTPException(status_code=404, detail="Webhook not found")
        
        # Send test payload
        test_payload = {
            "event": "test.webhook",
            "timestamp": datetime.utcnow().isoformat(),
            "data": {
                "message": "This is a test webhook from Software Galaxy",
                "webhook_id": webhook_id
            }
        }
        
        background_tasks.add_task(
            send_webhook, 
            webhook["url"], 
            webhook["secret"], 
            "test.webhook", 
            test_payload
        )
        
        return {"status": "test_sent", "message": "Test webhook queued for delivery"}
    
    
    @developer_router.get("/webhooks/{webhook_id}/deliveries")
    async def get_webhook_deliveries(
        webhook_id: str,
        limit: int = 20,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Get recent webhook delivery attempts"""
        user_id = await get_current_user(credentials)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        deliveries = await db.webhook_deliveries.find(
            {"webhook_id": webhook_id}
        ).sort("created_at", -1).limit(limit).to_list(None)
        
        return {
            "deliveries": [
                {
                    "id": str(d.get("_id")),
                    "event_type": d["event_type"],
                    "status": d["status"],
                    "response_code": d.get("response_code"),
                    "error_message": d.get("error_message"),
                    "created_at": d["created_at"],
                    "delivered_at": d.get("delivered_at"),
                    "retry_count": d.get("retry_count", 0)
                }
                for d in deliveries
            ]
        }
    
    
    # ============== RATE LIMITS ==============
    
    @developer_router.get("/rate-limits")
    async def get_rate_limits(
        client_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """
        Get current rate limit status for your application
        """
        user_id = await get_current_user(credentials)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Get app info
        app = await db.oauth_apps.find_one({"client_id": client_id})
        if not app:
            raise HTTPException(status_code=404, detail="App not found")
        
        # Get current usage
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)
        hour_ago = now - timedelta(hours=1)
        day_ago = now - timedelta(days=1)
        
        # Count requests
        minute_count = await db.api_requests.count_documents({
            "client_id": client_id,
            "timestamp": {"$gte": minute_ago}
        })
        
        hour_count = await db.api_requests.count_documents({
            "client_id": client_id,
            "timestamp": {"$gte": hour_ago}
        })
        
        day_count = await db.api_requests.count_documents({
            "client_id": client_id,
            "timestamp": {"$gte": day_ago}
        })
        
        # Default limits
        limits = {
            "per_minute": app.get("rate_limit_per_minute", 60),
            "per_hour": app.get("rate_limit_per_hour", 1000),
            "per_day": app.get("rate_limit_per_day", 10000)
        }
        
        return {
            "client_id": client_id,
            "limits": limits,
            "usage": {
                "per_minute": {
                    "used": minute_count,
                    "limit": limits["per_minute"],
                    "remaining": max(0, limits["per_minute"] - minute_count),
                    "reset_at": (minute_ago + timedelta(minutes=1)).isoformat()
                },
                "per_hour": {
                    "used": hour_count,
                    "limit": limits["per_hour"],
                    "remaining": max(0, limits["per_hour"] - hour_count),
                    "reset_at": (hour_ago + timedelta(hours=1)).isoformat()
                },
                "per_day": {
                    "used": day_count,
                    "limit": limits["per_day"],
                    "remaining": max(0, limits["per_day"] - day_count),
                    "reset_at": (day_ago + timedelta(days=1)).isoformat()
                }
            }
        }
    
    
    # ============== CONSENT SCREEN ==============
    
    @developer_router.get("/consent-screen/{client_id}")
    async def get_consent_screen(
        client_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Get consent screen configuration"""
        user_id = await get_current_user(credentials)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        config = await db.consent_screens.find_one({"client_id": client_id})
        
        if not config:
            # Return defaults from app
            app = await db.oauth_apps.find_one({"client_id": client_id})
            if not app:
                raise HTTPException(status_code=404, detail="App not found")
            
            return {
                "client_id": client_id,
                "app_name": app.get("name"),
                "app_logo_url": app.get("icon_url"),
                "privacy_policy_url": None,
                "terms_of_service_url": None,
                "support_email": app.get("developer_email")
            }
        
        return config
    
    
    @developer_router.put("/consent-screen/{client_id}")
    async def update_consent_screen(
        client_id: str,
        request: UpdateConsentScreenRequest,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """
        Update OAuth consent screen configuration
        
        Customize what users see when authorizing your application.
        """
        user_id = await get_current_user(credentials)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        update_data = {k: v for k, v in request.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        await db.consent_screens.update_one(
            {"client_id": client_id},
            {"$set": update_data},
            upsert=True
        )
        
        return {"status": "updated", "client_id": client_id}
    
    
    # ============== APP VERIFICATION ==============
    
    @developer_router.get("/verification/{client_id}")
    async def get_verification_status(
        client_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Get app verification status"""
        user_id = await get_current_user(credentials)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        verification = await db.app_verifications.find_one({"client_id": client_id})
        
        if not verification:
            # Check requirements
            app = await db.oauth_apps.find_one({"client_id": client_id})
            consent = await db.consent_screens.find_one({"client_id": client_id})
            
            return {
                "client_id": client_id,
                "status": "unverified",
                "requirements": {
                    "has_privacy_policy": bool(consent and consent.get("privacy_policy_url")),
                    "has_terms": bool(consent and consent.get("terms_of_service_url")),
                    "domain_verified": False,
                    "app_review": False
                },
                "message": "Submit your app for verification to get the verified badge"
            }
        
        return verification
    
    
    @developer_router.post("/verification/{client_id}/submit")
    async def submit_for_verification(
        client_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Submit app for verification review"""
        user_id = await get_current_user(credentials)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Check requirements
        consent = await db.consent_screens.find_one({"client_id": client_id})
        
        if not consent or not consent.get("privacy_policy_url"):
            raise HTTPException(status_code=400, detail="Privacy policy URL required")
        
        if not consent.get("terms_of_service_url"):
            raise HTTPException(status_code=400, detail="Terms of service URL required")
        
        await db.app_verifications.update_one(
            {"client_id": client_id},
            {
                "$set": {
                    "status": "pending",
                    "submitted_at": datetime.utcnow(),
                    "submitted_by": user_id,
                    "has_privacy_policy": True,
                    "has_terms": True
                }
            },
            upsert=True
        )
        
        return {
            "status": "pending",
            "message": "Your app has been submitted for verification review"
        }
    
    
    # ============== SERVICE ACCOUNTS ==============
    
    @developer_router.post("/service-accounts")
    async def create_service_account(
        client_id: str,
        name: str,
        scopes: List[str],
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """
        Create a service account for server-to-server authentication
        
        Service accounts don't require user interaction - useful for
        background jobs and automated integrations.
        """
        user_id = await get_current_user(credentials)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Generate service account credentials
        service_account_id = f"sa-{secrets.token_hex(8)}"
        private_key = secrets.token_urlsafe(64)
        private_key_hash = hashlib.sha256(private_key.encode()).hexdigest()
        
        sa_doc = {
            "client_id": client_id,
            "name": name,
            "service_account_id": service_account_id,
            "private_key_hash": private_key_hash,
            "scopes": scopes,
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.utcnow()
        }
        
        await db.service_accounts.insert_one(sa_doc)
        
        return {
            "service_account_id": service_account_id,
            "private_key": private_key,  # Only shown once!
            "scopes": scopes,
            "message": "Save the private key securely - it won't be shown again!"
        }
    
    
    @developer_router.get("/service-accounts")
    async def list_service_accounts(
        client_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """List service accounts for an application"""
        user_id = await get_current_user(credentials)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        accounts = await db.service_accounts.find({"client_id": client_id}).to_list(None)
        
        return {
            "service_accounts": [
                {
                    "id": str(a.get("_id")),
                    "service_account_id": a["service_account_id"],
                    "name": a["name"],
                    "scopes": a["scopes"],
                    "is_active": a["is_active"],
                    "last_used_at": a.get("last_used_at"),
                    "created_at": a["created_at"]
                }
                for a in accounts
            ]
        }
    
    
    # ============== USAGE ANALYTICS ==============
    
    @developer_router.get("/analytics/{client_id}")
    async def get_analytics(
        client_id: str,
        days: int = 7,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """
        Get usage analytics for your application
        """
        user_id = await get_current_user(credentials)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get daily request counts
        pipeline = [
            {
                "$match": {
                    "client_id": client_id,
                    "timestamp": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$timestamp"},
                        "month": {"$month": "$timestamp"},
                        "day": {"$dayOfMonth": "$timestamp"}
                    },
                    "count": {"$sum": 1},
                    "errors": {"$sum": {"$cond": [{"$gte": ["$status_code", 400]}, 1, 0]}}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        daily_stats = await db.api_requests.aggregate(pipeline).to_list(None)
        
        # Get endpoint breakdown
        endpoint_pipeline = [
            {
                "$match": {
                    "client_id": client_id,
                    "timestamp": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": "$endpoint",
                    "count": {"$sum": 1},
                    "avg_latency": {"$avg": "$latency_ms"}
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        
        endpoint_stats = await db.api_requests.aggregate(endpoint_pipeline).to_list(None)
        
        # Get totals
        total_requests = sum(d["count"] for d in daily_stats)
        total_errors = sum(d["errors"] for d in daily_stats)
        
        return {
            "client_id": client_id,
            "period_days": days,
            "summary": {
                "total_requests": total_requests,
                "total_errors": total_errors,
                "error_rate": round(total_errors / max(total_requests, 1) * 100, 2),
                "daily_average": round(total_requests / max(days, 1), 1)
            },
            "daily_stats": [
                {
                    "date": f"{d['_id']['year']}-{d['_id']['month']:02d}-{d['_id']['day']:02d}",
                    "requests": d["count"],
                    "errors": d["errors"]
                }
                for d in daily_stats
            ],
            "top_endpoints": [
                {
                    "endpoint": e["_id"],
                    "requests": e["count"],
                    "avg_latency_ms": round(e.get("avg_latency", 0), 1)
                }
                for e in endpoint_stats
            ]
        }
    
    
    # ============== API CHANGELOG ==============
    
    @developer_router.get("/changelog")
    async def get_changelog():
        """
        Get API changelog and version history
        """
        changelog = [
            {
                "version": "1.0.0",
                "date": "2025-01-15",
                "changes": [
                    {"type": "added", "description": "Initial OAuth 2.0 / OpenID Connect implementation"},
                    {"type": "added", "description": "User authentication endpoints"},
                    {"type": "added", "description": "Business management APIs"},
                ]
            },
            {
                "version": "1.1.0",
                "date": "2025-02-01",
                "changes": [
                    {"type": "added", "description": "Webhook support for real-time events"},
                    {"type": "added", "description": "API Keys for server-side authentication"},
                    {"type": "added", "description": "Service accounts for server-to-server auth"},
                    {"type": "improved", "description": "Rate limiting with detailed headers"},
                ]
            },
            {
                "version": "1.2.0",
                "date": "2025-02-05",
                "changes": [
                    {"type": "added", "description": "Developer analytics dashboard"},
                    {"type": "added", "description": "Consent screen customization"},
                    {"type": "added", "description": "App verification program"},
                    {"type": "added", "description": "Social login (Google, Microsoft)"},
                ]
            }
        ]
        
        return {
            "current_version": "1.2.0",
            "changelog": changelog,
            "deprecations": [],
            "upcoming": [
                {"feature": "SAML 2.0 support", "expected": "Q2 2025"},
                {"feature": "GraphQL API", "expected": "Q3 2025"},
            ]
        }
    
    
    return developer_router


# ============== WEBHOOK HELPER ==============

async def send_webhook(url: str, secret: str, event_type: str, payload: dict):
    """Send webhook to endpoint with signature"""
    try:
        timestamp = int(datetime.utcnow().timestamp())
        payload_str = json.dumps(payload, default=str)
        
        # Create signature
        signature_payload = f"{timestamp}.{payload_str}"
        signature = hmac.new(
            secret.encode(),
            signature_payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        headers = {
            "Content-Type": "application/json",
            "X-Galaxy-Event": event_type,
            "X-Galaxy-Timestamp": str(timestamp),
            "X-Galaxy-Signature": f"sha256={signature}",
            "User-Agent": "SoftwareGalaxy-Webhooks/1.0"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=payload,
                headers=headers,
                timeout=30.0
            )
            
            logger.info(f"Webhook delivered to {url}: {response.status_code}")
            return response.status_code, response.text
            
    except Exception as e:
        logger.error(f"Webhook delivery failed: {e}")
        return None, str(e)


async def trigger_webhook_event(db, event_type: str, payload: dict, business_id: str = None):
    """Trigger webhooks for an event"""
    query = {"events": {"$in": [event_type, "*"]}, "is_active": True}
    
    webhooks = await db.webhooks.find(query).to_list(None)
    
    for webhook in webhooks:
        status_code, response_text = await send_webhook(
            webhook["url"],
            webhook["secret"],
            event_type,
            payload
        )
        
        # Record delivery
        delivery_doc = {
            "webhook_id": str(webhook["_id"]),
            "event_type": event_type,
            "payload": payload,
            "status": "success" if status_code and 200 <= status_code < 300 else "failed",
            "response_code": status_code,
            "response_body": response_text[:1000] if response_text else None,
            "created_at": datetime.utcnow(),
            "delivered_at": datetime.utcnow() if status_code else None
        }
        
        await db.webhook_deliveries.insert_one(delivery_doc)
        
        # Update webhook stats
        update = {
            "$set": {"last_triggered_at": datetime.utcnow()},
            "$inc": {"success_count" if delivery_doc["status"] == "success" else "failure_count": 1}
        }
        
        if delivery_doc["status"] == "failed":
            update["$set"]["last_error"] = response_text[:200] if response_text else "Unknown error"
        
        await db.webhooks.update_one({"_id": webhook["_id"]}, update)
