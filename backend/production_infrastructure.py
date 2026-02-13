"""
UniTxt Production Infrastructure
- Delivery Webhooks for real-time SMS status updates
- Rate Limiting to prevent abuse
- Sentry Monitoring for error tracking

Author: UniTxt Platform
"""

import os
import hashlib
import hmac
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from functools import wraps

from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

logger = logging.getLogger(__name__)

# =============================================================================
# SENTRY MONITORING SETUP
# =============================================================================

def init_sentry(dsn: str = None, environment: str = "development"):
    """
    Initialize Sentry for error tracking and performance monitoring.
    
    Args:
        dsn: Sentry DSN (Data Source Name) - get from sentry.io
        environment: deployment environment (development/staging/production)
    """
    sentry_dsn = dsn or os.environ.get("SENTRY_DSN", "")
    
    if not sentry_dsn:
        logger.warning("Sentry DSN not configured - error tracking disabled")
        return False
    
    try:
        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=environment,
            
            # Integrations
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                CeleryIntegration(),
                RedisIntegration(),
                LoggingIntegration(
                    level=logging.INFO,
                    event_level=logging.ERROR
                ),
            ],
            
            # Performance monitoring
            traces_sample_rate=0.1,  # 10% of transactions
            profiles_sample_rate=0.1,  # 10% of profiled transactions
            
            # Release tracking
            release=os.environ.get("APP_VERSION", "1.0.0"),
            
            # Data scrubbing
            send_default_pii=False,
            
            # Before send hook for filtering
            before_send=_before_send_filter,
        )
        
        logger.info(f"Sentry initialized for environment: {environment}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {e}")
        return False


def _before_send_filter(event, hint):
    """Filter sensitive data before sending to Sentry"""
    # Remove sensitive headers
    if "request" in event and "headers" in event["request"]:
        headers = event["request"]["headers"]
        sensitive_headers = ["authorization", "x-api-key", "cookie"]
        for header in sensitive_headers:
            if header in headers:
                headers[header] = "[FILTERED]"
    
    # Don't send certain error types
    if "exc_info" in hint:
        exc_type, exc_value, tb = hint["exc_info"]
        # Skip rate limit errors
        if isinstance(exc_value, RateLimitExceeded):
            return None
    
    return event


def capture_message(message: str, level: str = "info", extra: Dict = None):
    """Capture a message in Sentry"""
    with sentry_sdk.push_scope() as scope:
        if extra:
            for key, value in extra.items():
                scope.set_extra(key, value)
        sentry_sdk.capture_message(message, level=level)


def capture_exception(exception: Exception, extra: Dict = None):
    """Capture an exception in Sentry"""
    with sentry_sdk.push_scope() as scope:
        if extra:
            for key, value in extra.items():
                scope.set_extra(key, value)
        sentry_sdk.capture_exception(exception)


# =============================================================================
# RATE LIMITING SETUP
# =============================================================================

def get_user_identifier(request: Request) -> str:
    """
    Get unique identifier for rate limiting.
    Uses user ID if authenticated, otherwise IP address.
    """
    # Try to get user from request state (set by auth middleware)
    if hasattr(request.state, "user") and request.state.user:
        return f"user:{request.state.user.get('id', 'unknown')}"
    
    # Check for API key
    api_key = request.headers.get("X-API-Key")
    if api_key:
        return f"api:{api_key[:16]}"
    
    # Fall back to IP address
    return f"ip:{get_remote_address(request)}"


# Create limiter instance
limiter = Limiter(
    key_func=get_user_identifier,
    default_limits=["1000/hour", "100/minute"],
    storage_uri=os.environ.get("REDIS_URL", "redis://localhost:6379/1"),
    strategy="fixed-window"
)


# Rate limit configurations for different endpoints
RATE_LIMITS = {
    # Authentication endpoints - strict limits to prevent brute force
    "auth": {
        "login": "5/minute",
        "register": "3/minute",
        "forgot_password": "3/minute",
    },
    
    # SMS sending endpoints - balanced for legitimate use
    "sms": {
        "send_single": "60/minute",
        "send_campaign": "10/minute",
        "send_bulk": "5/minute",
    },
    
    # API endpoints - standard limits
    "api": {
        "read": "100/minute",
        "write": "30/minute",
        "delete": "10/minute",
    },
    
    # Webhook endpoints - higher limits for incoming callbacks
    "webhook": {
        "delivery": "1000/minute",
    },
    
    # File upload endpoints
    "upload": {
        "contacts": "10/minute",
        "media": "20/minute",
    }
}


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded errors"""
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": f"Rate limit exceeded: {exc.detail}",
            "retry_after": getattr(exc, "retry_after", 60),
        },
        headers={"Retry-After": str(getattr(exc, "retry_after", 60))}
    )


# =============================================================================
# DELIVERY WEBHOOKS
# =============================================================================

webhook_router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


async def get_db():
    """Get database connection"""
    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'retail_db')
    client = AsyncIOMotorClient(mongo_url)
    return client[db_name]


def verify_twilio_signature(request: Request, body: bytes) -> bool:
    """Verify Twilio webhook signature"""
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    if not auth_token:
        return True  # Skip verification in development
    
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)
    
    # Twilio signature validation logic
    try:
        from twilio.request_validator import RequestValidator
        validator = RequestValidator(auth_token)
        
        # Parse form data for validation
        import urllib.parse
        params = dict(urllib.parse.parse_qsl(body.decode()))
        
        return validator.validate(url, params, signature)
    except Exception as e:
        logger.error(f"Twilio signature verification failed: {e}")
        return False


def verify_africastalking_signature(request: Request, body: bytes) -> bool:
    """Verify Africa's Talking webhook signature"""
    api_key = os.environ.get("AT_API_KEY", "")
    if not api_key:
        return True  # Skip in development
    
    # AT uses basic authentication or API key header
    auth_header = request.headers.get("Authorization", "")
    return True  # AT doesn't sign webhooks by default


def verify_vonage_signature(request: Request, body: bytes) -> bool:
    """Verify Vonage webhook signature"""
    signature_secret = os.environ.get("VONAGE_SIGNATURE_SECRET", "")
    if not signature_secret:
        return True
    
    signature = request.headers.get("Authorization", "")
    
    try:
        # Vonage uses JWT or signature header
        expected = hmac.new(
            signature_secret.encode(),
            body,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected)
    except Exception:
        return False


@webhook_router.post("/twilio/delivery")
@limiter.limit("1000/minute")
async def twilio_delivery_webhook(request: Request):
    """
    Twilio Delivery Receipt Webhook
    
    Twilio sends delivery status updates to this endpoint.
    Configure in Twilio Console: Phone Numbers > Messaging > Webhook URL
    
    Status values: queued, sending, sent, delivered, undelivered, failed
    """
    try:
        body = await request.body()
        
        # Verify signature in production
        if os.environ.get("VERIFY_WEBHOOKS", "false").lower() == "true":
            if not verify_twilio_signature(request, body):
                logger.warning("Invalid Twilio webhook signature")
                raise HTTPException(status_code=403, detail="Invalid signature")
        
        # Parse form data
        import urllib.parse
        data = dict(urllib.parse.parse_qsl(body.decode()))
        
        message_sid = data.get("MessageSid") or data.get("SmsSid")
        status = data.get("MessageStatus") or data.get("SmsStatus", "").lower()
        error_code = data.get("ErrorCode")
        error_message = data.get("ErrorMessage")
        
        if not message_sid:
            return {"status": "ignored", "reason": "no message_sid"}
        
        # Map Twilio status to our status
        status_map = {
            "queued": "queued",
            "sending": "sending",
            "sent": "sent",
            "delivered": "delivered",
            "undelivered": "undelivered",
            "failed": "failed",
            "read": "read",  # For WhatsApp
        }
        
        mapped_status = status_map.get(status, status)
        
        # Update message in database
        db = await get_db()
        update_data = {
            "status": mapped_status,
            "delivery_status_updated_at": datetime.utcnow(),
            "provider_status": status,
        }
        
        if error_code:
            update_data["error_code"] = error_code
            update_data["error_message"] = error_message
        
        if mapped_status == "delivered":
            update_data["delivered_at"] = datetime.utcnow()
        
        result = await db.unitxt_message_logs.update_one(
            {"external_id": message_sid},
            {"$set": update_data}
        )
        
        # Update campaign stats if delivered/failed
        if result.modified_count > 0 and mapped_status in ["delivered", "failed", "undelivered"]:
            message = await db.unitxt_message_logs.find_one({"external_id": message_sid})
            if message and message.get("campaign_id"):
                campaign_id = message["campaign_id"]
                if mapped_status == "delivered":
                    await db.unitxt_campaigns.update_one(
                        {"_id": message["campaign_id"]},
                        {"$inc": {"confirmed_delivered": 1}}
                    )
        
        logger.info(f"Twilio webhook: {message_sid} -> {mapped_status}")
        
        return {"status": "ok", "message_id": message_sid, "new_status": mapped_status}
        
    except Exception as e:
        logger.error(f"Twilio webhook error: {e}")
        capture_exception(e, {"webhook": "twilio"})
        raise HTTPException(status_code=500, detail=str(e))


@webhook_router.post("/africastalking/delivery")
@limiter.limit("1000/minute")
async def africastalking_delivery_webhook(request: Request):
    """
    Africa's Talking Delivery Receipt Webhook
    
    Configure in AT Dashboard: SMS > Delivery Reports > Callback URL
    
    Status values: Success, Sent, Buffered, Rejected, Failed
    """
    try:
        body = await request.body()
        
        # AT sends form data
        import urllib.parse
        data = dict(urllib.parse.parse_qsl(body.decode()))
        
        message_id = data.get("id")
        status = data.get("status", "").lower()
        failure_reason = data.get("failureReason")
        
        if not message_id:
            # Try JSON body
            import json
            try:
                data = json.loads(body.decode())
                message_id = data.get("id")
                status = data.get("status", "").lower()
                failure_reason = data.get("failureReason")
            except:
                return {"status": "ignored", "reason": "no message_id"}
        
        # Map AT status
        status_map = {
            "success": "delivered",
            "sent": "sent",
            "buffered": "queued",
            "rejected": "failed",
            "failed": "failed",
        }
        
        mapped_status = status_map.get(status, status)
        
        db = await get_db()
        update_data = {
            "status": mapped_status,
            "delivery_status_updated_at": datetime.utcnow(),
            "provider_status": status,
        }
        
        if failure_reason:
            update_data["error_message"] = failure_reason
        
        if mapped_status == "delivered":
            update_data["delivered_at"] = datetime.utcnow()
        
        await db.unitxt_message_logs.update_one(
            {"external_id": message_id},
            {"$set": update_data}
        )
        
        logger.info(f"AT webhook: {message_id} -> {mapped_status}")
        
        return {"status": "ok", "message_id": message_id, "new_status": mapped_status}
        
    except Exception as e:
        logger.error(f"AT webhook error: {e}")
        capture_exception(e, {"webhook": "africastalking"})
        raise HTTPException(status_code=500, detail=str(e))


@webhook_router.post("/vonage/delivery")
@limiter.limit("1000/minute")
async def vonage_delivery_webhook(request: Request):
    """
    Vonage (Nexmo) Delivery Receipt Webhook
    
    Configure in Vonage Dashboard: Numbers > Your Number > Inbound Webhook URL
    
    Status values: delivered, expired, failed, rejected, accepted, buffered, unknown
    """
    try:
        body = await request.body()
        
        import json
        try:
            data = json.loads(body.decode())
        except:
            import urllib.parse
            data = dict(urllib.parse.parse_qsl(body.decode()))
        
        message_id = data.get("messageId") or data.get("message-id")
        status = data.get("status", "").lower()
        error_code = data.get("err-code") or data.get("error-code")
        
        if not message_id:
            return {"status": "ignored", "reason": "no message_id"}
        
        # Map Vonage status
        status_map = {
            "delivered": "delivered",
            "accepted": "sent",
            "buffered": "queued",
            "expired": "failed",
            "failed": "failed",
            "rejected": "failed",
            "unknown": "unknown",
        }
        
        mapped_status = status_map.get(status, status)
        
        db = await get_db()
        update_data = {
            "status": mapped_status,
            "delivery_status_updated_at": datetime.utcnow(),
            "provider_status": status,
        }
        
        if error_code and error_code != "0":
            update_data["error_code"] = error_code
        
        if mapped_status == "delivered":
            update_data["delivered_at"] = datetime.utcnow()
        
        await db.unitxt_message_logs.update_one(
            {"external_id": message_id},
            {"$set": update_data}
        )
        
        logger.info(f"Vonage webhook: {message_id} -> {mapped_status}")
        
        return {"status": "ok", "message_id": message_id, "new_status": mapped_status}
        
    except Exception as e:
        logger.error(f"Vonage webhook error: {e}")
        capture_exception(e, {"webhook": "vonage"})
        raise HTTPException(status_code=500, detail=str(e))


@webhook_router.post("/tigo/delivery")
@limiter.limit("1000/minute")
async def tigo_delivery_webhook(request: Request):
    """
    Tigo/Mixx By Yas Delivery Receipt Webhook
    
    For SMPP: Delivery reports come via SMPP protocol (handled in tigo_provider.py)
    For HTTP API: Configure callback URL in Tigo portal
    """
    try:
        body = await request.body()
        
        import json
        try:
            data = json.loads(body.decode())
        except:
            import urllib.parse
            data = dict(urllib.parse.parse_qsl(body.decode()))
        
        message_id = data.get("message_id") or data.get("messageId") or data.get("id")
        status = data.get("status", "").lower()
        
        if not message_id:
            return {"status": "ignored", "reason": "no message_id"}
        
        # Map Tigo status (varies by implementation)
        status_map = {
            "delivrd": "delivered",
            "delivered": "delivered",
            "sent": "sent",
            "acceptd": "sent",
            "accepted": "sent",
            "expired": "failed",
            "deleted": "failed",
            "undeliv": "failed",
            "undelivered": "failed",
            "rejectd": "failed",
            "rejected": "failed",
            "unknown": "unknown",
        }
        
        mapped_status = status_map.get(status, status)
        
        db = await get_db()
        update_data = {
            "status": mapped_status,
            "delivery_status_updated_at": datetime.utcnow(),
            "provider_status": status,
        }
        
        if mapped_status == "delivered":
            update_data["delivered_at"] = datetime.utcnow()
        
        await db.unitxt_message_logs.update_one(
            {"$or": [
                {"external_id": message_id},
                {"message_id": message_id}
            ]},
            {"$set": update_data}
        )
        
        logger.info(f"Tigo webhook: {message_id} -> {mapped_status}")
        
        return {"status": "ok", "message_id": message_id, "new_status": mapped_status}
        
    except Exception as e:
        logger.error(f"Tigo webhook error: {e}")
        capture_exception(e, {"webhook": "tigo"})
        raise HTTPException(status_code=500, detail=str(e))


@webhook_router.get("/health")
async def webhook_health():
    """Health check for webhook endpoints"""
    return {
        "status": "ok",
        "webhooks": {
            "twilio": "/api/webhooks/twilio/delivery",
            "africastalking": "/api/webhooks/africastalking/delivery",
            "vonage": "/api/webhooks/vonage/delivery",
            "tigo": "/api/webhooks/tigo/delivery",
        },
        "timestamp": datetime.utcnow().isoformat()
    }


# =============================================================================
# WEBHOOK URL GENERATOR
# =============================================================================

def get_webhook_urls(base_url: str = None) -> Dict[str, str]:
    """
    Generate webhook URLs for all providers.
    
    Args:
        base_url: Your public API URL (e.g., https://api.yourdomain.com)
    
    Returns:
        Dict of provider webhook URLs to configure in each dashboard
    """
    base = base_url or os.environ.get("API_BASE_URL", "https://your-api.com")
    
    return {
        "twilio": {
            "delivery_webhook": f"{base}/api/webhooks/twilio/delivery",
            "instructions": "Twilio Console > Phone Numbers > Configure > Messaging > Webhook URL",
        },
        "africastalking": {
            "delivery_webhook": f"{base}/api/webhooks/africastalking/delivery",
            "instructions": "AT Dashboard > SMS > Delivery Reports > Callback URL",
        },
        "vonage": {
            "delivery_webhook": f"{base}/api/webhooks/vonage/delivery",
            "instructions": "Vonage Dashboard > Numbers > Your Number > Webhook URLs",
        },
        "tigo": {
            "delivery_webhook": f"{base}/api/webhooks/tigo/delivery",
            "instructions": "Contact Tigo support to configure callback URL",
        },
    }


# =============================================================================
# MONITORING UTILITIES
# =============================================================================

async def get_system_health() -> Dict[str, Any]:
    """Get system health metrics for monitoring"""
    import redis
    
    health = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {}
    }
    
    # Check MongoDB
    try:
        db = await get_db()
        await db.command("ping")
        health["services"]["mongodb"] = {"status": "up"}
    except Exception as e:
        health["services"]["mongodb"] = {"status": "down", "error": str(e)}
        health["status"] = "degraded"
    
    # Check Redis
    try:
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        r = redis.from_url(redis_url)
        r.ping()
        health["services"]["redis"] = {"status": "up"}
    except Exception as e:
        health["services"]["redis"] = {"status": "down", "error": str(e)}
        health["status"] = "degraded"
    
    # Check Celery
    try:
        from celery_app import celery_app
        inspect = celery_app.control.inspect()
        active = inspect.active()
        if active:
            health["services"]["celery"] = {
                "status": "up",
                "workers": len(active)
            }
        else:
            health["services"]["celery"] = {"status": "no_workers"}
            health["status"] = "degraded"
    except Exception as e:
        health["services"]["celery"] = {"status": "down", "error": str(e)}
        health["status"] = "degraded"
    
    return health


# =============================================================================
# RATE LIMIT DECORATORS FOR SPECIFIC ENDPOINTS
# =============================================================================

def rate_limit_auth(func):
    """Rate limit decorator for auth endpoints (5/minute)"""
    return limiter.limit("5/minute")(func)

def rate_limit_sms_send(func):
    """Rate limit decorator for SMS sending (60/minute)"""
    return limiter.limit("60/minute")(func)

def rate_limit_campaign_send(func):
    """Rate limit decorator for campaign sending (10/minute)"""
    return limiter.limit("10/minute")(func)

def rate_limit_api_read(func):
    """Rate limit decorator for read operations (100/minute)"""
    return limiter.limit("100/minute")(func)

def rate_limit_api_write(func):
    """Rate limit decorator for write operations (30/minute)"""
    return limiter.limit("30/minute")(func)
