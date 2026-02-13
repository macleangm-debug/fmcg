"""
Social OAuth Provider Integration

This module adds support for signing in with external OAuth providers:
- Google OAuth 2.0
- Microsoft Azure AD
- Apple Sign In (future)

These allow users to sign into Software Galaxy using their existing accounts.
"""

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import secrets
import httpx
import jwt
import os
import logging
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

# ============== CONFIGURATION ==============

# Google OAuth Configuration
GOOGLE_CONFIG = {
    "client_id": os.environ.get("GOOGLE_CLIENT_ID", ""),
    "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET", ""),
    "auth_uri": "https://accounts.google.com/o/oauth2/v2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "userinfo_uri": "https://openidconnect.googleapis.com/v1/userinfo",
    "revoke_uri": "https://oauth2.googleapis.com/revoke",
    "scopes": ["openid", "email", "profile"],
}

# Microsoft OAuth Configuration
MICROSOFT_CONFIG = {
    "client_id": os.environ.get("MICROSOFT_CLIENT_ID", ""),
    "client_secret": os.environ.get("MICROSOFT_CLIENT_SECRET", ""),
    "auth_uri": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    "token_uri": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    "userinfo_uri": "https://graph.microsoft.com/v1.0/me",
    "scopes": ["openid", "email", "profile", "User.Read"],
}


# ============== MODELS ==============

class SocialLoginInitRequest(BaseModel):
    """Request to initiate social login"""
    provider: str  # google, microsoft, apple
    redirect_uri: str
    state: Optional[str] = None


class SocialLoginCallbackRequest(BaseModel):
    """OAuth callback data"""
    provider: str
    code: str
    state: Optional[str] = None


class SocialUserInfo(BaseModel):
    """User information from social provider"""
    provider: str
    provider_user_id: str
    email: str
    email_verified: bool = False
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    picture: Optional[str] = None
    locale: Optional[str] = None


class SocialProviderStatus(BaseModel):
    """Status of a social login provider"""
    provider: str
    enabled: bool
    configured: bool
    connected: bool = False
    connected_email: Optional[str] = None


# ============== ROUTER ==============

social_router = APIRouter(prefix="/social", tags=["Social Login"])


def create_social_routes(db, jwt_secret: str, base_url: str):
    """
    Factory function to create social login routes.
    
    Usage:
        from social_oauth import create_social_routes, social_router
        social_routes = create_social_routes(db, JWT_SECRET, BASE_URL)
        api_router.include_router(social_router)
    """
    
    @social_router.get("/providers")
    async def list_providers():
        """
        List available social login providers and their status.
        """
        providers = []
        
        # Google
        providers.append({
            "provider": "google",
            "name": "Google",
            "icon": "logo-google",
            "color": "#4285F4",
            "enabled": bool(GOOGLE_CONFIG["client_id"]),
            "configured": bool(GOOGLE_CONFIG["client_id"] and GOOGLE_CONFIG["client_secret"]),
        })
        
        # Microsoft
        providers.append({
            "provider": "microsoft",
            "name": "Microsoft",
            "icon": "logo-microsoft",
            "color": "#00A4EF",
            "enabled": bool(MICROSOFT_CONFIG["client_id"]),
            "configured": bool(MICROSOFT_CONFIG["client_id"] and MICROSOFT_CONFIG["client_secret"]),
        })
        
        # Apple (future)
        providers.append({
            "provider": "apple",
            "name": "Apple",
            "icon": "logo-apple",
            "color": "#000000",
            "enabled": False,
            "configured": False,
            "coming_soon": True,
        })
        
        return {"providers": providers}
    
    
    @social_router.get("/auth/{provider}")
    async def initiate_social_login(
        provider: str,
        redirect_uri: str,
        state: Optional[str] = None,
    ):
        """
        Initiate OAuth flow with a social provider.
        
        Redirects the user to the provider's login page.
        """
        if provider == "google":
            if not GOOGLE_CONFIG["client_id"]:
                raise HTTPException(status_code=400, detail="Google OAuth not configured")
            
            # Generate state for CSRF protection
            oauth_state = state or secrets.token_urlsafe(32)
            
            # Store state in database for validation
            await db.oauth_states.insert_one({
                "state": oauth_state,
                "provider": "google",
                "redirect_uri": redirect_uri,
                "created_at": datetime.utcnow(),
                "expires_at": datetime.utcnow() + timedelta(minutes=10)
            })
            
            # Build authorization URL
            params = {
                "client_id": GOOGLE_CONFIG["client_id"],
                "redirect_uri": f"{base_url}/api/social/callback/google",
                "response_type": "code",
                "scope": " ".join(GOOGLE_CONFIG["scopes"]),
                "state": oauth_state,
                "access_type": "offline",
                "prompt": "consent",
            }
            
            auth_url = f"{GOOGLE_CONFIG['auth_uri']}?{urlencode(params)}"
            return RedirectResponse(auth_url)
        
        elif provider == "microsoft":
            if not MICROSOFT_CONFIG["client_id"]:
                raise HTTPException(status_code=400, detail="Microsoft OAuth not configured")
            
            oauth_state = state or secrets.token_urlsafe(32)
            
            await db.oauth_states.insert_one({
                "state": oauth_state,
                "provider": "microsoft",
                "redirect_uri": redirect_uri,
                "created_at": datetime.utcnow(),
                "expires_at": datetime.utcnow() + timedelta(minutes=10)
            })
            
            params = {
                "client_id": MICROSOFT_CONFIG["client_id"],
                "redirect_uri": f"{base_url}/api/social/callback/microsoft",
                "response_type": "code",
                "scope": " ".join(MICROSOFT_CONFIG["scopes"]),
                "state": oauth_state,
                "response_mode": "query",
            }
            
            auth_url = f"{MICROSOFT_CONFIG['auth_uri']}?{urlencode(params)}"
            return RedirectResponse(auth_url)
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
    
    
    @social_router.get("/callback/{provider}")
    async def social_login_callback(
        request: Request,
        response: Response,
        provider: str,
        code: Optional[str] = None,
        state: Optional[str] = None,
        error: Optional[str] = None,
        error_description: Optional[str] = None,
    ):
        """
        OAuth callback handler.
        
        After user authenticates with the provider, they're redirected here.
        We exchange the code for tokens and create/link the user account.
        """
        # Handle errors from provider
        if error:
            logger.error(f"OAuth error from {provider}: {error} - {error_description}")
            return RedirectResponse(f"/login?error={error}&message={error_description}")
        
        if not code:
            raise HTTPException(status_code=400, detail="No authorization code provided")
        
        # Validate state
        state_record = await db.oauth_states.find_one({
            "state": state,
            "provider": provider,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not state_record:
            raise HTTPException(status_code=400, detail="Invalid or expired state")
        
        # Delete used state
        await db.oauth_states.delete_one({"_id": state_record["_id"]})
        
        original_redirect_uri = state_record.get("redirect_uri", "/")
        
        try:
            # Exchange code for tokens
            if provider == "google":
                user_info = await _handle_google_callback(code, base_url)
            elif provider == "microsoft":
                user_info = await _handle_microsoft_callback(code, base_url)
            else:
                raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
            
            # Find or create user
            user = await _find_or_create_user(db, user_info)
            
            # Create session token
            session_token = secrets.token_urlsafe(64)
            access_token = jwt.encode({
                "sub": str(user["_id"]),
                "email": user["email"],
                "exp": datetime.utcnow() + timedelta(hours=24),
                "iat": datetime.utcnow(),
            }, jwt_secret, algorithm="HS256")
            
            # Store session
            await db.sessions.insert_one({
                "user_id": str(user["_id"]),
                "session_token": session_token,
                "provider": provider,
                "created_at": datetime.utcnow(),
                "expires_at": datetime.utcnow() + timedelta(days=30),
                "is_active": True
            })
            
            # Set cookie and redirect
            response = RedirectResponse(f"/login/callback?token={access_token}&provider={provider}")
            response.set_cookie(
                key="galaxy_session",
                value=session_token,
                httponly=True,
                secure=True,
                samesite="lax",
                max_age=30 * 24 * 60 * 60
            )
            
            logger.info(f"User {user['email']} logged in via {provider}")
            return response
            
        except Exception as e:
            logger.error(f"Social login error: {e}")
            return RedirectResponse(f"/login?error=social_login_failed&message={str(e)}")
    
    
    async def _handle_google_callback(code: str, base_url: str) -> SocialUserInfo:
        """Exchange Google auth code for tokens and get user info"""
        async with httpx.AsyncClient() as client:
            # Exchange code for tokens
            token_response = await client.post(
                GOOGLE_CONFIG["token_uri"],
                data={
                    "client_id": GOOGLE_CONFIG["client_id"],
                    "client_secret": GOOGLE_CONFIG["client_secret"],
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": f"{base_url}/api/social/callback/google",
                }
            )
            
            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Failed to exchange code: {token_response.text}"
                )
            
            tokens = token_response.json()
            access_token = tokens["access_token"]
            
            # Get user info
            userinfo_response = await client.get(
                GOOGLE_CONFIG["userinfo_uri"],
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if userinfo_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to get user info")
            
            user_data = userinfo_response.json()
            
            return SocialUserInfo(
                provider="google",
                provider_user_id=user_data["sub"],
                email=user_data["email"],
                email_verified=user_data.get("email_verified", False),
                name=user_data.get("name"),
                first_name=user_data.get("given_name"),
                last_name=user_data.get("family_name"),
                picture=user_data.get("picture"),
                locale=user_data.get("locale"),
            )
    
    
    async def _handle_microsoft_callback(code: str, base_url: str) -> SocialUserInfo:
        """Exchange Microsoft auth code for tokens and get user info"""
        async with httpx.AsyncClient() as client:
            # Exchange code for tokens
            token_response = await client.post(
                MICROSOFT_CONFIG["token_uri"],
                data={
                    "client_id": MICROSOFT_CONFIG["client_id"],
                    "client_secret": MICROSOFT_CONFIG["client_secret"],
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": f"{base_url}/api/social/callback/microsoft",
                    "scope": " ".join(MICROSOFT_CONFIG["scopes"]),
                }
            )
            
            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to exchange code: {token_response.text}"
                )
            
            tokens = token_response.json()
            access_token = tokens["access_token"]
            
            # Get user info from Microsoft Graph
            userinfo_response = await client.get(
                MICROSOFT_CONFIG["userinfo_uri"],
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if userinfo_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to get user info")
            
            user_data = userinfo_response.json()
            
            return SocialUserInfo(
                provider="microsoft",
                provider_user_id=user_data["id"],
                email=user_data.get("mail") or user_data.get("userPrincipalName", ""),
                email_verified=True,  # Microsoft accounts are verified
                name=user_data.get("displayName"),
                first_name=user_data.get("givenName"),
                last_name=user_data.get("surname"),
                picture=None,  # Would need additional Graph API call
            )
    
    
    async def _find_or_create_user(db, user_info: SocialUserInfo) -> dict:
        """Find existing user or create new one from social login"""
        from bson import ObjectId
        
        # First, try to find by social provider link
        social_link = await db.social_accounts.find_one({
            "provider": user_info.provider,
            "provider_user_id": user_info.provider_user_id
        })
        
        if social_link:
            # User exists with this social account
            user = await db.users.find_one({"_id": ObjectId(social_link["user_id"])})
            if user:
                return user
        
        # Try to find by email
        user = await db.users.find_one({"email": user_info.email})
        
        if user:
            # Link this social account to existing user
            await db.social_accounts.insert_one({
                "user_id": str(user["_id"]),
                "provider": user_info.provider,
                "provider_user_id": user_info.provider_user_id,
                "email": user_info.email,
                "name": user_info.name,
                "picture": user_info.picture,
                "connected_at": datetime.utcnow()
            })
            
            # Update user's email verification if verified by provider
            if user_info.email_verified and not user.get("email_verified"):
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"email_verified": True}}
                )
            
            return user
        
        # Create new user
        new_user = {
            "email": user_info.email,
            "email_verified": user_info.email_verified,
            "full_name": user_info.name or f"{user_info.first_name or ''} {user_info.last_name or ''}".strip(),
            "first_name": user_info.first_name,
            "last_name": user_info.last_name,
            "avatar_url": user_info.picture,
            "role": "user",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "created_via": f"social:{user_info.provider}",
            "hashed_password": None,  # No password for social-only users
        }
        
        result = await db.users.insert_one(new_user)
        new_user["_id"] = result.inserted_id
        
        # Link social account
        await db.social_accounts.insert_one({
            "user_id": str(result.inserted_id),
            "provider": user_info.provider,
            "provider_user_id": user_info.provider_user_id,
            "email": user_info.email,
            "name": user_info.name,
            "picture": user_info.picture,
            "connected_at": datetime.utcnow()
        })
        
        logger.info(f"Created new user via {user_info.provider}: {user_info.email}")
        return new_user
    
    
    @social_router.get("/accounts")
    async def get_connected_accounts(request: Request):
        """
        Get social accounts connected to the current user.
        """
        # Get user from session/token
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authentication required")
        
        try:
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
            user_id = payload.get("sub")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        accounts = await db.social_accounts.find({"user_id": user_id}).to_list(None)
        
        return {
            "accounts": [
                {
                    "provider": acc["provider"],
                    "email": acc.get("email"),
                    "name": acc.get("name"),
                    "picture": acc.get("picture"),
                    "connected_at": acc.get("connected_at"),
                }
                for acc in accounts
            ]
        }
    
    
    @social_router.delete("/accounts/{provider}")
    async def disconnect_social_account(request: Request, provider: str):
        """
        Disconnect a social account from the current user.
        """
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authentication required")
        
        try:
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
            user_id = payload.get("sub")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check if user has a password (can't disconnect all social if no password)
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        social_accounts = await db.social_accounts.count_documents({"user_id": user_id})
        
        if not user.get("hashed_password") and social_accounts <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot disconnect your only login method. Set a password first."
            )
        
        result = await db.social_accounts.delete_one({
            "user_id": user_id,
            "provider": provider
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Social account not found")
        
        return {"status": "disconnected", "provider": provider}
    
    
    return social_router


# Import ObjectId for user queries
from bson import ObjectId
