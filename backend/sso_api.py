"""
Software Galaxy SSO - OAuth 2.0 + OpenID Connect Implementation

This module implements a complete SSO solution similar to Google Workspace or Zoho,
allowing multiple apps to authenticate through a centralized identity provider.

Standards Implemented:
- OAuth 2.0 (RFC 6749)
- OpenID Connect 1.0
- JWT (RFC 7519)
- PKCE (RFC 7636) for enhanced security

Architecture:
┌─────────────────────────────────────────────────────────────────┐
│                    Software Galaxy SSO                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   RetailPro │  │  Inventory  │  │  Third-Party Apps       │  │
│  │   (App)     │  │  (App)      │  │  (External Partners)    │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          │                                       │
│                          ▼                                       │
│              ┌───────────────────────┐                          │
│              │   Authorization       │                          │
│              │   Server (This API)   │                          │
│              │   - /oauth/authorize  │                          │
│              │   - /oauth/token      │                          │
│              │   - /oauth/userinfo   │                          │
│              │   - /.well-known/oidc │                          │
│              └───────────┬───────────┘                          │
│                          │                                       │
│                          ▼                                       │
│              ┌───────────────────────┐                          │
│              │   User Database       │                          │
│              │   (Single Identity)   │                          │
│              └───────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Response, Query, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import secrets
import hashlib
import base64
import jwt
import uuid
import json
import logging
from urllib.parse import urlencode, parse_qs, urlparse

logger = logging.getLogger(__name__)

# ============== CONFIGURATION ==============
SSO_CONFIG = {
    "issuer": "https://sso.softwaregalaxy.com",  # Will be replaced with actual domain
    "authorization_endpoint": "/api/sso/oauth/authorize",
    "token_endpoint": "/api/sso/oauth/token",
    "userinfo_endpoint": "/api/sso/oauth/userinfo",
    "jwks_uri": "/api/sso/.well-known/jwks.json",
    "revocation_endpoint": "/api/sso/oauth/revoke",
    "introspection_endpoint": "/api/sso/oauth/introspect",
    "end_session_endpoint": "/api/sso/oauth/logout",
    "registration_endpoint": "/api/sso/oauth/register",
    
    # Supported features
    "scopes_supported": ["openid", "profile", "email", "apps", "offline_access"],
    "response_types_supported": ["code", "token", "id_token", "code token", "code id_token", "token id_token", "code token id_token"],
    "grant_types_supported": ["authorization_code", "refresh_token", "client_credentials"],
    "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post", "none"],
    "code_challenge_methods_supported": ["S256", "plain"],
    
    # Token lifetimes
    "access_token_lifetime": 3600,  # 1 hour
    "refresh_token_lifetime": 2592000,  # 30 days
    "authorization_code_lifetime": 600,  # 10 minutes
    "id_token_lifetime": 3600,  # 1 hour
}


# ============== ENUMS ==============
class GrantType(str, Enum):
    AUTHORIZATION_CODE = "authorization_code"
    REFRESH_TOKEN = "refresh_token"
    CLIENT_CREDENTIALS = "client_credentials"


class ResponseType(str, Enum):
    CODE = "code"
    TOKEN = "token"
    ID_TOKEN = "id_token"


class AppType(str, Enum):
    FIRST_PARTY = "first_party"  # Your own apps (RetailPro, Inventory, etc.)
    THIRD_PARTY = "third_party"  # External partner apps
    PUBLIC = "public"  # Mobile/SPA apps (no client secret)


class AppStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING_REVIEW = "pending_review"
    SUSPENDED = "suspended"


# ============== MODELS ==============

class OAuthApp(BaseModel):
    """Registered OAuth Application (Client)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    client_secret: Optional[str] = None  # None for public clients
    client_secret_hash: Optional[str] = None
    
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    
    app_type: AppType = AppType.THIRD_PARTY
    status: AppStatus = AppStatus.PENDING_REVIEW
    
    # OAuth settings
    redirect_uris: List[str] = []
    allowed_scopes: List[str] = ["openid", "profile", "email"]
    allowed_grant_types: List[str] = ["authorization_code", "refresh_token"]
    
    # App category for marketplace
    category: Optional[str] = None  # e.g., "productivity", "analytics", "marketing"
    
    # Developer/Owner info
    developer_name: str
    developer_email: str
    developer_website: Optional[str] = None
    business_id: Optional[str] = None  # If owned by a business on the platform
    
    # Rate limiting
    rate_limit_per_minute: int = 60
    rate_limit_per_day: int = 10000
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None


class AuthorizationCode(BaseModel):
    """OAuth Authorization Code"""
    code: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    client_id: str
    user_id: str
    redirect_uri: str
    scope: str
    code_challenge: Optional[str] = None
    code_challenge_method: Optional[str] = None
    nonce: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(seconds=600))
    used: bool = False


class OAuthToken(BaseModel):
    """OAuth Access/Refresh Token"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    token_type: str = "Bearer"
    access_token: str
    refresh_token: Optional[str] = None
    id_token: Optional[str] = None
    
    client_id: str
    user_id: str
    scope: str
    
    access_token_expires_at: datetime
    refresh_token_expires_at: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    revoked: bool = False
    revoked_at: Optional[datetime] = None


class UserConsent(BaseModel):
    """User's consent for app access"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    client_id: str
    app_name: str
    scopes: List[str]
    granted_at: datetime = Field(default_factory=datetime.utcnow)
    revoked: bool = False
    revoked_at: Optional[datetime] = None


class SSOSession(BaseModel):
    """SSO Session for cross-app authentication"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_token: str = Field(default_factory=lambda: secrets.token_urlsafe(64))
    user_id: str
    
    # Active sessions across apps
    active_apps: List[str] = []  # List of client_ids
    
    # Session metadata
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_id: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(days=30))
    
    is_active: bool = True


# ============== REQUEST/RESPONSE MODELS ==============

class AppRegistrationRequest(BaseModel):
    """Request to register a new OAuth app"""
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    redirect_uris: List[str] = Field(..., min_items=1)
    icon_url: Optional[str] = None
    
    app_type: AppType = AppType.THIRD_PARTY
    category: Optional[str] = None
    
    requested_scopes: List[str] = ["openid", "profile", "email"]
    
    developer_name: str
    developer_email: EmailStr
    developer_website: Optional[str] = None


class AppRegistrationResponse(BaseModel):
    """Response after registering an OAuth app"""
    client_id: str
    client_secret: Optional[str] = None  # Only returned once!
    name: str
    app_type: AppType
    status: AppStatus
    redirect_uris: List[str]
    allowed_scopes: List[str]
    message: str


class TokenRequest(BaseModel):
    """OAuth Token Request"""
    grant_type: GrantType
    code: Optional[str] = None
    redirect_uri: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    refresh_token: Optional[str] = None
    scope: Optional[str] = None
    code_verifier: Optional[str] = None


class TokenResponse(BaseModel):
    """OAuth Token Response"""
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    id_token: Optional[str] = None
    scope: str


class UserInfoResponse(BaseModel):
    """OpenID Connect UserInfo Response"""
    sub: str  # User ID
    name: Optional[str] = None
    given_name: Optional[str] = None
    family_name: Optional[str] = None
    email: Optional[str] = None
    email_verified: Optional[bool] = None
    picture: Optional[str] = None
    
    # Custom claims for Software Galaxy
    galaxy_user_id: Optional[str] = None
    businesses: Optional[List[Dict[str, Any]]] = None
    apps_access: Optional[List[str]] = None
    role: Optional[str] = None


class AuthorizeRequest(BaseModel):
    """OAuth Authorization Request"""
    response_type: str
    client_id: str
    redirect_uri: str
    scope: str = "openid"
    state: Optional[str] = None
    nonce: Optional[str] = None
    code_challenge: Optional[str] = None
    code_challenge_method: Optional[str] = None
    prompt: Optional[str] = None  # none, login, consent


class ConsentRequest(BaseModel):
    """User consent submission"""
    authorize: bool
    client_id: str
    scope: str
    redirect_uri: str
    state: Optional[str] = None
    nonce: Optional[str] = None
    code_challenge: Optional[str] = None
    code_challenge_method: Optional[str] = None


class AppListResponse(BaseModel):
    """List of available/connected apps"""
    apps: List[Dict[str, Any]]
    total: int


class ConnectedAppResponse(BaseModel):
    """User's connected app with consent info"""
    client_id: str
    app_name: str
    description: Optional[str]
    icon_url: Optional[str]
    scopes: List[str]
    connected_at: datetime
    last_used: Optional[datetime]


# ============== HELPER FUNCTIONS ==============

def generate_pkce_code_challenge(code_verifier: str, method: str = "S256") -> str:
    """Generate PKCE code challenge from verifier"""
    if method == "S256":
        digest = hashlib.sha256(code_verifier.encode()).digest()
        return base64.urlsafe_b64encode(digest).rstrip(b'=').decode()
    return code_verifier  # plain method


def verify_pkce_code_challenge(code_verifier: str, code_challenge: str, method: str = "S256") -> bool:
    """Verify PKCE code challenge"""
    expected = generate_pkce_code_challenge(code_verifier, method)
    return secrets.compare_digest(expected, code_challenge)


def hash_client_secret(secret: str) -> str:
    """Hash client secret for storage"""
    return hashlib.sha256(secret.encode()).hexdigest()


def generate_id_token(user: dict, client_id: str, nonce: Optional[str], secret: str, issuer: str) -> str:
    """Generate OpenID Connect ID Token"""
    now = datetime.utcnow()
    
    payload = {
        "iss": issuer,
        "sub": str(user.get("_id")),
        "aud": client_id,
        "exp": now + timedelta(hours=1),
        "iat": now,
        "auth_time": int(now.timestamp()),
        
        # Standard claims
        "name": user.get("full_name"),
        "email": user.get("email"),
        "email_verified": user.get("email_verified", False),
    }
    
    if nonce:
        payload["nonce"] = nonce
    
    return jwt.encode(payload, secret, algorithm="HS256")


def generate_access_token(user_id: str, client_id: str, scope: str, secret: str, expires_in: int = 3600) -> str:
    """Generate OAuth Access Token (JWT)"""
    now = datetime.utcnow()
    
    payload = {
        "sub": user_id,
        "client_id": client_id,
        "scope": scope,
        "exp": now + timedelta(seconds=expires_in),
        "iat": now,
        "jti": str(uuid.uuid4()),  # JWT ID for revocation
        "type": "access_token"
    }
    
    return jwt.encode(payload, secret, algorithm="HS256")


def generate_refresh_token() -> str:
    """Generate opaque refresh token"""
    return secrets.token_urlsafe(64)


# ============== SSO API ROUTER ==============

sso_router = APIRouter(prefix="/sso", tags=["SSO - OAuth 2.0 / OpenID Connect"])
security = HTTPBearer(auto_error=False)


def create_sso_routes(db, jwt_secret: str, base_url: str):
    """
    Factory function to create SSO routes with database and config injection.
    
    Usage in main server.py:
        from sso_api import create_sso_routes, sso_router
        sso_routes = create_sso_routes(db, JWT_SECRET, BASE_URL)
        api_router.include_router(sso_router)
    """
    
    # Update issuer with actual base URL
    SSO_CONFIG["issuer"] = base_url
    
    # ============== DISCOVERY ENDPOINTS ==============
    
    @sso_router.get("/.well-known/openid-configuration")
    async def openid_configuration():
        """
        OpenID Connect Discovery Document
        
        This endpoint returns the OpenID Provider Configuration,
        allowing clients to discover all SSO endpoints and capabilities.
        """
        return {
            "issuer": SSO_CONFIG["issuer"],
            "authorization_endpoint": f"{base_url}{SSO_CONFIG['authorization_endpoint']}",
            "token_endpoint": f"{base_url}{SSO_CONFIG['token_endpoint']}",
            "userinfo_endpoint": f"{base_url}{SSO_CONFIG['userinfo_endpoint']}",
            "jwks_uri": f"{base_url}{SSO_CONFIG['jwks_uri']}",
            "revocation_endpoint": f"{base_url}{SSO_CONFIG['revocation_endpoint']}",
            "introspection_endpoint": f"{base_url}{SSO_CONFIG['introspection_endpoint']}",
            "end_session_endpoint": f"{base_url}{SSO_CONFIG['end_session_endpoint']}",
            "registration_endpoint": f"{base_url}{SSO_CONFIG['registration_endpoint']}",
            
            "scopes_supported": SSO_CONFIG["scopes_supported"],
            "response_types_supported": SSO_CONFIG["response_types_supported"],
            "grant_types_supported": SSO_CONFIG["grant_types_supported"],
            "token_endpoint_auth_methods_supported": SSO_CONFIG["token_endpoint_auth_methods_supported"],
            "code_challenge_methods_supported": SSO_CONFIG["code_challenge_methods_supported"],
            
            "subject_types_supported": ["public"],
            "id_token_signing_alg_values_supported": ["HS256", "RS256"],
            "claims_supported": [
                "sub", "name", "given_name", "family_name", "email", 
                "email_verified", "picture", "locale", "updated_at"
            ]
        }
    
    
    @sso_router.get("/.well-known/jwks.json")
    async def jwks():
        """
        JSON Web Key Set (JWKS)
        
        Returns the public keys used to verify JWT signatures.
        For production, use RSA keys; this example uses HS256.
        """
        # Note: In production, generate and expose RSA public keys
        return {
            "keys": [
                {
                    "kty": "oct",
                    "kid": "galaxy-sso-key-1",
                    "use": "sig",
                    "alg": "HS256"
                }
            ]
        }
    
    
    # ============== APP REGISTRATION ==============
    
    @sso_router.post("/oauth/register", response_model=AppRegistrationResponse)
    async def register_app(
        request: AppRegistrationRequest,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """
        Dynamic Client Registration (RFC 7591)
        
        Register a new OAuth application to integrate with Software Galaxy SSO.
        
        For first-party apps (your own apps): Auto-approved
        For third-party apps: Requires review
        """
        # Verify the requesting user has permission
        if not credentials:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        try:
            payload = jwt.decode(credentials.credentials, jwt_secret, algorithms=["HS256"])
            user_id = payload.get("sub")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user to check permissions
        user = await db.users.find_one({"_id": user_id if isinstance(user_id, str) else ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Generate client credentials
        client_id = secrets.token_urlsafe(32)
        client_secret = secrets.token_urlsafe(48) if request.app_type != AppType.PUBLIC else None
        
        # Determine initial status
        if request.app_type == AppType.FIRST_PARTY and user.get("role") in ["superadmin", "admin"]:
            status = AppStatus.ACTIVE
        else:
            status = AppStatus.PENDING_REVIEW
        
        # Create app record
        app_data = {
            "client_id": client_id,
            "client_secret_hash": hash_client_secret(client_secret) if client_secret else None,
            "name": request.name,
            "description": request.description,
            "icon_url": request.icon_url,
            "app_type": request.app_type,
            "status": status,
            "redirect_uris": request.redirect_uris,
            "allowed_scopes": request.requested_scopes,
            "allowed_grant_types": ["authorization_code", "refresh_token"],
            "category": request.category,
            "developer_name": request.developer_name,
            "developer_email": request.developer_email,
            "developer_website": request.developer_website,
            "created_by": str(user["_id"]),
            "business_id": user.get("current_business_id"),
            "rate_limit_per_minute": 60,
            "rate_limit_per_day": 10000,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        if status == AppStatus.ACTIVE:
            app_data["approved_at"] = datetime.utcnow()
            app_data["approved_by"] = "auto"
        
        await db.oauth_apps.insert_one(app_data)
        
        logger.info(f"New OAuth app registered: {request.name} (client_id: {client_id})")
        
        return AppRegistrationResponse(
            client_id=client_id,
            client_secret=client_secret,  # Only returned once!
            name=request.name,
            app_type=request.app_type,
            status=status,
            redirect_uris=request.redirect_uris,
            allowed_scopes=request.requested_scopes,
            message="App registered successfully. Save your client_secret - it won't be shown again!" if client_secret else "App registered successfully."
        )
    
    
    # ============== AUTHORIZATION ENDPOINT ==============
    
    @sso_router.get("/oauth/authorize")
    async def authorize(
        request: Request,
        response_type: str = Query(...),
        client_id: str = Query(...),
        redirect_uri: str = Query(...),
        scope: str = Query("openid"),
        state: Optional[str] = Query(None),
        nonce: Optional[str] = Query(None),
        code_challenge: Optional[str] = Query(None),
        code_challenge_method: Optional[str] = Query(None),
        prompt: Optional[str] = Query(None)
    ):
        """
        OAuth 2.0 Authorization Endpoint
        
        This is where users are redirected to authenticate and authorize apps.
        
        Flow:
        1. App redirects user here
        2. User logs in (if not already)
        3. User consents to requested permissions
        4. User is redirected back with authorization code
        """
        # Validate client
        app = await db.oauth_apps.find_one({
            "client_id": client_id,
            "status": "active"
        })
        
        if not app:
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_client", "error_description": "Unknown or inactive client"}
            )
        
        # Validate redirect URI
        if redirect_uri not in app.get("redirect_uris", []):
            return JSONResponse(
                status_code=400,
                content={"error": "invalid_redirect_uri", "error_description": "Redirect URI not registered"}
            )
        
        # Validate response type
        if response_type not in ["code", "token", "id_token"]:
            error_params = urlencode({"error": "unsupported_response_type", "state": state or ""})
            return RedirectResponse(f"{redirect_uri}?{error_params}")
        
        # Validate requested scopes
        requested_scopes = scope.split()
        allowed_scopes = app.get("allowed_scopes", [])
        for s in requested_scopes:
            if s not in allowed_scopes and s not in ["openid", "profile", "email"]:
                error_params = urlencode({"error": "invalid_scope", "state": state or ""})
                return RedirectResponse(f"{redirect_uri}?{error_params}")
        
        # Check if user is authenticated (via SSO session cookie)
        sso_session_token = request.cookies.get("galaxy_sso_session")
        user = None
        
        if sso_session_token:
            session = await db.sso_sessions.find_one({
                "session_token": sso_session_token,
                "is_active": True,
                "expires_at": {"$gt": datetime.utcnow()}
            })
            if session:
                user = await db.users.find_one({"_id": ObjectId(session["user_id"])})
        
        # If not authenticated or prompt=login, redirect to login
        if not user or prompt == "login":
            # Store authorization request in session for after login
            auth_request_id = secrets.token_urlsafe(32)
            await db.pending_auth_requests.insert_one({
                "request_id": auth_request_id,
                "response_type": response_type,
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "scope": scope,
                "state": state,
                "nonce": nonce,
                "code_challenge": code_challenge,
                "code_challenge_method": code_challenge_method,
                "created_at": datetime.utcnow(),
                "expires_at": datetime.utcnow() + timedelta(minutes=10)
            })
            
            # Redirect to login page with auth request ID
            login_url = f"/login?sso_request={auth_request_id}"
            return RedirectResponse(login_url)
        
        # Check if user has already consented to this app with these scopes
        existing_consent = await db.user_consents.find_one({
            "user_id": str(user["_id"]),
            "client_id": client_id,
            "revoked": False
        })
        
        # If already consented and prompt != consent, skip consent screen
        if existing_consent and prompt != "consent":
            existing_scopes = set(existing_consent.get("scopes", []))
            requested_scopes_set = set(requested_scopes)
            
            if requested_scopes_set.issubset(existing_scopes):
                # Generate authorization code directly
                return await _generate_auth_code_response(
                    db, user, client_id, redirect_uri, scope, state, 
                    nonce, code_challenge, code_challenge_method
                )
        
        # Show consent screen
        consent_request_id = secrets.token_urlsafe(32)
        await db.pending_consent_requests.insert_one({
            "request_id": consent_request_id,
            "user_id": str(user["_id"]),
            "client_id": client_id,
            "app_name": app.get("name"),
            "app_icon": app.get("icon_url"),
            "redirect_uri": redirect_uri,
            "scope": scope,
            "state": state,
            "nonce": nonce,
            "code_challenge": code_challenge,
            "code_challenge_method": code_challenge_method,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=10)
        })
        
        # Redirect to consent page
        consent_url = f"/consent?request={consent_request_id}"
        return RedirectResponse(consent_url)
    
    
    async def _generate_auth_code_response(
        db, user, client_id, redirect_uri, scope, state, 
        nonce, code_challenge, code_challenge_method
    ):
        """Helper to generate authorization code and redirect"""
        code = secrets.token_urlsafe(32)
        
        # Store authorization code
        await db.authorization_codes.insert_one({
            "code": code,
            "client_id": client_id,
            "user_id": str(user["_id"]),
            "redirect_uri": redirect_uri,
            "scope": scope,
            "nonce": nonce,
            "code_challenge": code_challenge,
            "code_challenge_method": code_challenge_method,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(seconds=600),
            "used": False
        })
        
        # Build redirect URL with code
        params = {"code": code}
        if state:
            params["state"] = state
        
        redirect_url = f"{redirect_uri}?{urlencode(params)}"
        return RedirectResponse(redirect_url)
    
    
    @sso_router.post("/oauth/authorize/consent")
    async def submit_consent(
        request: Request,
        consent: ConsentRequest
    ):
        """
        Process user's consent decision
        """
        # Get pending consent request
        pending = await db.pending_consent_requests.find_one({
            "client_id": consent.client_id,
            "redirect_uri": consent.redirect_uri,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not pending:
            raise HTTPException(status_code=400, detail="Consent request expired or invalid")
        
        user_id = pending["user_id"]
        
        if not consent.authorize:
            # User denied access
            error_params = urlencode({
                "error": "access_denied",
                "error_description": "User denied access",
                "state": consent.state or ""
            })
            return RedirectResponse(f"{consent.redirect_uri}?{error_params}")
        
        # Store consent
        await db.user_consents.update_one(
            {"user_id": user_id, "client_id": consent.client_id},
            {
                "$set": {
                    "scopes": consent.scope.split(),
                    "app_name": pending.get("app_name"),
                    "granted_at": datetime.utcnow(),
                    "revoked": False
                }
            },
            upsert=True
        )
        
        # Get user
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        
        # Generate authorization code
        return await _generate_auth_code_response(
            db, user, consent.client_id, consent.redirect_uri, 
            consent.scope, consent.state, consent.nonce,
            consent.code_challenge, consent.code_challenge_method
        )
    
    
    # ============== TOKEN ENDPOINT ==============
    
    @sso_router.post("/oauth/token", response_model=TokenResponse)
    async def token(
        request: Request,
        grant_type: str = Form(...),
        code: Optional[str] = Form(None),
        redirect_uri: Optional[str] = Form(None),
        client_id: Optional[str] = Form(None),
        client_secret: Optional[str] = Form(None),
        refresh_token: Optional[str] = Form(None),
        scope: Optional[str] = Form(None),
        code_verifier: Optional[str] = Form(None)
    ):
        """
        OAuth 2.0 Token Endpoint
        
        Exchange authorization code for tokens, or refresh tokens.
        
        Supported grant types:
        - authorization_code: Exchange code for tokens
        - refresh_token: Get new access token using refresh token
        - client_credentials: Machine-to-machine authentication
        """
        # Handle client authentication
        # Check Authorization header for Basic auth
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Basic "):
            import base64
            decoded = base64.b64decode(auth_header[6:]).decode()
            client_id, client_secret = decoded.split(":", 1)
        
        if not client_id:
            raise HTTPException(status_code=400, detail="client_id required")
        
        # Validate client
        app = await db.oauth_apps.find_one({
            "client_id": client_id,
            "status": "active"
        })
        
        if not app:
            raise HTTPException(status_code=401, detail="Invalid client")
        
        # Verify client secret (if required)
        if app.get("client_secret_hash") and client_secret:
            if hash_client_secret(client_secret) != app["client_secret_hash"]:
                raise HTTPException(status_code=401, detail="Invalid client credentials")
        
        # Handle grant types
        if grant_type == "authorization_code":
            return await _handle_authorization_code_grant(
                db, app, code, redirect_uri, code_verifier, jwt_secret
            )
        elif grant_type == "refresh_token":
            return await _handle_refresh_token_grant(
                db, app, refresh_token, scope, jwt_secret
            )
        elif grant_type == "client_credentials":
            return await _handle_client_credentials_grant(
                db, app, scope, jwt_secret
            )
        else:
            raise HTTPException(status_code=400, detail="unsupported_grant_type")
    
    
    async def _handle_authorization_code_grant(db, app, code, redirect_uri, code_verifier, jwt_secret):
        """Handle authorization_code grant type"""
        if not code:
            raise HTTPException(status_code=400, detail="code required")
        
        # Find and validate authorization code
        auth_code = await db.authorization_codes.find_one({
            "code": code,
            "client_id": app["client_id"],
            "used": False,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not auth_code:
            raise HTTPException(status_code=400, detail="Invalid or expired authorization code")
        
        # Validate redirect URI
        if redirect_uri and redirect_uri != auth_code["redirect_uri"]:
            raise HTTPException(status_code=400, detail="redirect_uri mismatch")
        
        # Validate PKCE if used
        if auth_code.get("code_challenge"):
            if not code_verifier:
                raise HTTPException(status_code=400, detail="code_verifier required")
            
            if not verify_pkce_code_challenge(
                code_verifier, 
                auth_code["code_challenge"],
                auth_code.get("code_challenge_method", "S256")
            ):
                raise HTTPException(status_code=400, detail="Invalid code_verifier")
        
        # Mark code as used
        await db.authorization_codes.update_one(
            {"_id": auth_code["_id"]},
            {"$set": {"used": True}}
        )
        
        # Get user
        user = await db.users.find_one({"_id": ObjectId(auth_code["user_id"])})
        if not user:
            raise HTTPException(status_code=400, detail="User not found")
        
        # Generate tokens
        access_token = generate_access_token(
            str(user["_id"]), 
            app["client_id"], 
            auth_code["scope"],
            jwt_secret,
            SSO_CONFIG["access_token_lifetime"]
        )
        
        refresh_token_value = generate_refresh_token()
        
        id_token = None
        if "openid" in auth_code["scope"]:
            id_token = generate_id_token(
                user, 
                app["client_id"], 
                auth_code.get("nonce"),
                jwt_secret,
                SSO_CONFIG["issuer"]
            )
        
        # Store tokens
        now = datetime.utcnow()
        await db.oauth_tokens.insert_one({
            "access_token_hash": hashlib.sha256(access_token.encode()).hexdigest(),
            "refresh_token": refresh_token_value,
            "client_id": app["client_id"],
            "user_id": str(user["_id"]),
            "scope": auth_code["scope"],
            "access_token_expires_at": now + timedelta(seconds=SSO_CONFIG["access_token_lifetime"]),
            "refresh_token_expires_at": now + timedelta(seconds=SSO_CONFIG["refresh_token_lifetime"]),
            "created_at": now,
            "revoked": False
        })
        
        return TokenResponse(
            access_token=access_token,
            token_type="Bearer",
            expires_in=SSO_CONFIG["access_token_lifetime"],
            refresh_token=refresh_token_value,
            id_token=id_token,
            scope=auth_code["scope"]
        )
    
    
    async def _handle_refresh_token_grant(db, app, refresh_token, scope, jwt_secret):
        """Handle refresh_token grant type"""
        if not refresh_token:
            raise HTTPException(status_code=400, detail="refresh_token required")
        
        # Find token record
        token_record = await db.oauth_tokens.find_one({
            "refresh_token": refresh_token,
            "client_id": app["client_id"],
            "revoked": False,
            "refresh_token_expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not token_record:
            raise HTTPException(status_code=400, detail="Invalid or expired refresh token")
        
        # Get user
        user = await db.users.find_one({"_id": ObjectId(token_record["user_id"])})
        if not user:
            raise HTTPException(status_code=400, detail="User not found")
        
        # Determine scope (use original if not specified)
        final_scope = scope if scope else token_record["scope"]
        
        # Generate new access token
        access_token = generate_access_token(
            str(user["_id"]),
            app["client_id"],
            final_scope,
            jwt_secret,
            SSO_CONFIG["access_token_lifetime"]
        )
        
        # Optionally rotate refresh token
        new_refresh_token = generate_refresh_token()
        
        now = datetime.utcnow()
        await db.oauth_tokens.update_one(
            {"_id": token_record["_id"]},
            {
                "$set": {
                    "access_token_hash": hashlib.sha256(access_token.encode()).hexdigest(),
                    "refresh_token": new_refresh_token,
                    "access_token_expires_at": now + timedelta(seconds=SSO_CONFIG["access_token_lifetime"]),
                    "refresh_token_expires_at": now + timedelta(seconds=SSO_CONFIG["refresh_token_lifetime"]),
                    "scope": final_scope
                }
            }
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="Bearer",
            expires_in=SSO_CONFIG["access_token_lifetime"],
            refresh_token=new_refresh_token,
            scope=final_scope
        )
    
    
    async def _handle_client_credentials_grant(db, app, scope, jwt_secret):
        """Handle client_credentials grant type (machine-to-machine)"""
        if app.get("app_type") != "first_party":
            raise HTTPException(
                status_code=400, 
                detail="client_credentials grant only available for first-party apps"
            )
        
        final_scope = scope if scope else "api"
        
        access_token = generate_access_token(
            f"client:{app['client_id']}",
            app["client_id"],
            final_scope,
            jwt_secret,
            SSO_CONFIG["access_token_lifetime"]
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="Bearer",
            expires_in=SSO_CONFIG["access_token_lifetime"],
            scope=final_scope
        )
    
    
    # ============== USERINFO ENDPOINT ==============
    
    @sso_router.get("/oauth/userinfo", response_model=UserInfoResponse)
    @sso_router.post("/oauth/userinfo", response_model=UserInfoResponse)
    async def userinfo(
        request: Request,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """
        OpenID Connect UserInfo Endpoint
        
        Returns claims about the authenticated user.
        Requires a valid access token.
        """
        if not credentials:
            raise HTTPException(status_code=401, detail="Access token required")
        
        try:
            payload = jwt.decode(credentials.credentials, jwt_secret, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = payload.get("sub")
        scope = payload.get("scope", "")
        
        # Get user
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Build response based on scope
        response = UserInfoResponse(sub=str(user["_id"]))
        
        if "profile" in scope or "openid" in scope:
            response.name = user.get("full_name")
            response.given_name = user.get("first_name")
            response.family_name = user.get("last_name")
            response.picture = user.get("avatar_url")
        
        if "email" in scope:
            response.email = user.get("email")
            response.email_verified = user.get("email_verified", False)
        
        if "apps" in scope:
            # Get user's app access
            businesses = await db.user_businesses.find({"user_id": str(user["_id"])}).to_list(None)
            response.businesses = [
                {"id": str(b["business_id"]), "role": b.get("role")}
                for b in businesses
            ]
            
            # Get subscribed apps
            subscriptions = await db.subscriptions.find({
                "business_id": {"$in": [b["business_id"] for b in businesses]},
                "status": "active"
            }).to_list(None)
            
            apps = set()
            for sub in subscriptions:
                apps.update(sub.get("apps", []))
            response.apps_access = list(apps)
        
        response.galaxy_user_id = str(user["_id"])
        response.role = user.get("role")
        
        return response
    
    
    # ============== TOKEN MANAGEMENT ==============
    
    @sso_router.post("/oauth/revoke")
    async def revoke_token(
        request: Request,
        token: str = Form(...),
        token_type_hint: Optional[str] = Form(None),
        client_id: Optional[str] = Form(None),
        client_secret: Optional[str] = Form(None)
    ):
        """
        OAuth 2.0 Token Revocation (RFC 7009)
        
        Revoke an access token or refresh token.
        """
        # Authenticate client
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Basic "):
            import base64
            decoded = base64.b64decode(auth_header[6:]).decode()
            client_id, client_secret = decoded.split(":", 1)
        
        if client_id:
            app = await db.oauth_apps.find_one({"client_id": client_id})
            if app and app.get("client_secret_hash"):
                if not client_secret or hash_client_secret(client_secret) != app["client_secret_hash"]:
                    raise HTTPException(status_code=401, detail="Invalid client credentials")
        
        # Try to revoke as refresh token
        result = await db.oauth_tokens.update_one(
            {"refresh_token": token, "revoked": False},
            {"$set": {"revoked": True, "revoked_at": datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            # Try as access token hash
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            await db.oauth_tokens.update_one(
                {"access_token_hash": token_hash, "revoked": False},
                {"$set": {"revoked": True, "revoked_at": datetime.utcnow()}}
            )
        
        # Always return 200 OK per RFC 7009
        return {"status": "ok"}
    
    
    @sso_router.post("/oauth/introspect")
    async def introspect_token(
        request: Request,
        token: str = Form(...),
        token_type_hint: Optional[str] = Form(None),
        client_id: Optional[str] = Form(None),
        client_secret: Optional[str] = Form(None)
    ):
        """
        OAuth 2.0 Token Introspection (RFC 7662)
        
        Validate and get information about a token.
        """
        # Authenticate client (required for introspection)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Basic "):
            import base64
            decoded = base64.b64decode(auth_header[6:]).decode()
            client_id, client_secret = decoded.split(":", 1)
        
        if not client_id:
            raise HTTPException(status_code=401, detail="Client authentication required")
        
        app = await db.oauth_apps.find_one({"client_id": client_id, "status": "active"})
        if not app:
            raise HTTPException(status_code=401, detail="Invalid client")
        
        if app.get("client_secret_hash"):
            if not client_secret or hash_client_secret(client_secret) != app["client_secret_hash"]:
                raise HTTPException(status_code=401, detail="Invalid client credentials")
        
        # Try to decode as JWT
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
            
            # Check if revoked
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            token_record = await db.oauth_tokens.find_one({
                "access_token_hash": token_hash,
                "revoked": True
            })
            
            if token_record:
                return {"active": False}
            
            return {
                "active": True,
                "scope": payload.get("scope"),
                "client_id": payload.get("client_id"),
                "sub": payload.get("sub"),
                "exp": payload.get("exp"),
                "iat": payload.get("iat"),
                "token_type": "Bearer"
            }
        except jwt.ExpiredSignatureError:
            return {"active": False}
        except jwt.InvalidTokenError:
            # Try as refresh token
            token_record = await db.oauth_tokens.find_one({
                "refresh_token": token,
                "revoked": False,
                "refresh_token_expires_at": {"$gt": datetime.utcnow()}
            })
            
            if token_record:
                return {
                    "active": True,
                    "scope": token_record.get("scope"),
                    "client_id": token_record.get("client_id"),
                    "sub": token_record.get("user_id"),
                    "token_type": "refresh_token"
                }
            
            return {"active": False}
    
    
    # ============== SESSION MANAGEMENT ==============
    
    @sso_router.post("/oauth/logout")
    async def logout(
        request: Request,
        response: Response,
        id_token_hint: Optional[str] = Form(None),
        post_logout_redirect_uri: Optional[str] = Form(None),
        state: Optional[str] = Form(None)
    ):
        """
        OpenID Connect End Session Endpoint
        
        Log out user from SSO (single logout across all apps).
        """
        # Get SSO session
        sso_session_token = request.cookies.get("galaxy_sso_session")
        
        if sso_session_token:
            # Mark session as inactive
            session = await db.sso_sessions.find_one_and_update(
                {"session_token": sso_session_token},
                {"$set": {"is_active": False}}
            )
            
            if session:
                # Revoke all tokens for this user from this session
                await db.oauth_tokens.update_many(
                    {"user_id": session["user_id"]},
                    {"$set": {"revoked": True, "revoked_at": datetime.utcnow()}}
                )
        
        # Clear SSO cookie
        response.delete_cookie("galaxy_sso_session")
        
        # Redirect to post-logout URI or home
        if post_logout_redirect_uri:
            redirect_url = post_logout_redirect_uri
            if state:
                redirect_url += f"?state={state}"
            return RedirectResponse(redirect_url)
        
        return {"status": "logged_out"}
    
    
    @sso_router.post("/session/create")
    async def create_sso_session(
        request: Request,
        response: Response,
        user_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """
        Create a new SSO session after successful login.
        Called internally after authentication.
        """
        # Verify this is an internal call
        if not credentials:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        try:
            payload = jwt.decode(credentials.credentials, jwt_secret, algorithms=["HS256"])
            if payload.get("type") != "internal":
                raise HTTPException(status_code=403, detail="Internal use only")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Create SSO session
        session_token = secrets.token_urlsafe(64)
        
        await db.sso_sessions.insert_one({
            "session_token": session_token,
            "user_id": user_id,
            "active_apps": [],
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
            "created_at": datetime.utcnow(),
            "last_activity": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=30),
            "is_active": True
        })
        
        # Set SSO cookie
        response.set_cookie(
            key="galaxy_sso_session",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=30 * 24 * 60 * 60  # 30 days
        )
        
        return {"status": "session_created", "session_id": session_token[:8] + "..."}
    
    
    # ============== CONNECTED APPS MANAGEMENT ==============
    
    @sso_router.get("/apps/connected")
    async def get_connected_apps(
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """
        Get all apps the user has connected (given consent to).
        """
        if not credentials:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        try:
            payload = jwt.decode(credentials.credentials, jwt_secret, algorithms=["HS256"])
            user_id = payload.get("sub")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user's consents
        consents = await db.user_consents.find({
            "user_id": user_id,
            "revoked": False
        }).to_list(None)
        
        connected_apps = []
        for consent in consents:
            app = await db.oauth_apps.find_one({"client_id": consent["client_id"]})
            if app:
                connected_apps.append({
                    "client_id": consent["client_id"],
                    "app_name": app.get("name"),
                    "description": app.get("description"),
                    "icon_url": app.get("icon_url"),
                    "scopes": consent.get("scopes", []),
                    "connected_at": consent.get("granted_at"),
                    "app_type": app.get("app_type")
                })
        
        return {"apps": connected_apps, "total": len(connected_apps)}
    
    
    @sso_router.delete("/apps/connected/{client_id}")
    async def disconnect_app(
        client_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """
        Disconnect an app (revoke consent and tokens).
        """
        if not credentials:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        try:
            payload = jwt.decode(credentials.credentials, jwt_secret, algorithms=["HS256"])
            user_id = payload.get("sub")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Revoke consent
        await db.user_consents.update_one(
            {"user_id": user_id, "client_id": client_id},
            {"$set": {"revoked": True, "revoked_at": datetime.utcnow()}}
        )
        
        # Revoke all tokens
        await db.oauth_tokens.update_many(
            {"user_id": user_id, "client_id": client_id},
            {"$set": {"revoked": True, "revoked_at": datetime.utcnow()}}
        )
        
        return {"status": "disconnected", "client_id": client_id}
    
    
    # ============== APP MARKETPLACE ==============
    
    @sso_router.get("/apps/available")
    async def get_available_apps(
        category: Optional[str] = Query(None),
        search: Optional[str] = Query(None),
        skip: int = Query(0, ge=0),
        limit: int = Query(20, ge=1, le=100)
    ):
        """
        Get available apps in the Software Galaxy marketplace.
        """
        query = {"status": "active"}
        
        if category:
            query["category"] = category
        
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        total = await db.oauth_apps.count_documents(query)
        apps = await db.oauth_apps.find(
            query,
            {
                "client_id": 1,
                "name": 1,
                "description": 1,
                "icon_url": 1,
                "category": 1,
                "app_type": 1,
                "developer_name": 1,
                "developer_website": 1
            }
        ).skip(skip).limit(limit).to_list(None)
        
        return {
            "apps": apps,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    
    
    # ============== ADMIN ENDPOINTS ==============
    
    @sso_router.get("/admin/apps")
    async def admin_list_apps(
        status: Optional[str] = Query(None),
        skip: int = Query(0, ge=0),
        limit: int = Query(20, ge=1, le=100),
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """
        Admin endpoint to list all registered apps.
        """
        if not credentials:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        try:
            payload = jwt.decode(credentials.credentials, jwt_secret, algorithms=["HS256"])
            user_id = payload.get("sub")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check admin role
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user.get("role") not in ["superadmin", "admin"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        query = {}
        if status:
            query["status"] = status
        
        total = await db.oauth_apps.count_documents(query)
        apps = await db.oauth_apps.find(query).skip(skip).limit(limit).to_list(None)
        
        # Remove sensitive data
        for app in apps:
            app.pop("client_secret_hash", None)
            app["_id"] = str(app["_id"])
        
        return {"apps": apps, "total": total}
    
    
    @sso_router.post("/admin/apps/{client_id}/approve")
    async def admin_approve_app(
        client_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """
        Admin endpoint to approve a pending app.
        """
        if not credentials:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        try:
            payload = jwt.decode(credentials.credentials, jwt_secret, algorithms=["HS256"])
            user_id = payload.get("sub")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user.get("role") not in ["superadmin", "admin"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        result = await db.oauth_apps.update_one(
            {"client_id": client_id, "status": "pending_review"},
            {
                "$set": {
                    "status": "active",
                    "approved_at": datetime.utcnow(),
                    "approved_by": str(user["_id"])
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="App not found or already approved")
        
        return {"status": "approved", "client_id": client_id}
    
    
    @sso_router.post("/admin/apps/{client_id}/suspend")
    async def admin_suspend_app(
        client_id: str,
        reason: str = Form(...),
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """
        Admin endpoint to suspend an app.
        """
        if not credentials:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        try:
            payload = jwt.decode(credentials.credentials, jwt_secret, algorithms=["HS256"])
            user_id = payload.get("sub")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user or user.get("role") not in ["superadmin", "admin"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        result = await db.oauth_apps.update_one(
            {"client_id": client_id},
            {
                "$set": {
                    "status": "suspended",
                    "suspended_at": datetime.utcnow(),
                    "suspended_by": str(user["_id"]),
                    "suspension_reason": reason
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="App not found")
        
        # Revoke all tokens for this app
        await db.oauth_tokens.update_many(
            {"client_id": client_id},
            {"$set": {"revoked": True, "revoked_at": datetime.utcnow()}}
        )
        
        return {"status": "suspended", "client_id": client_id}
    
    
    return sso_router


# Export for use in main server
from bson import ObjectId
