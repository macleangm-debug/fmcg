"""
EcoBank Payment Gateway Integration
Real API integration for EcoBank Unified API
"""
import os
import hashlib
import logging
import httpx
from datetime import datetime
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# EcoBank Configuration from environment
ECOBANK_CONFIG = {
    "base_url": "https://developer.ecobank.com/corporateapi",
    "user_id": os.environ.get("ECOBANK_USER_ID"),
    "password": os.environ.get("ECOBANK_PASSWORD"),
    "lab_key": os.environ.get("ECOBANK_LAB_KEY"),
    "sandbox": os.environ.get("ECOBANK_SANDBOX", "true").lower() == "true",
    "affiliate_codes": {
        "TZ": "ETZ",  # Tanzania
        "KE": "EKE",  # Kenya
        "UG": "EUG",  # Uganda
        "RW": "ERW",  # Rwanda
        "GH": "EGH",  # Ghana
        "NG": "ENG",  # Nigeria
    }
}

# Cache for access token
_token_cache = {
    "token": None,
    "expires_at": None
}


def generate_secure_hash(payload: str) -> str:
    """
    Generate SHA-512 secure hash for EcoBank API
    Hash = SHA512(payload + lab_key)
    """
    lab_key = ECOBANK_CONFIG["lab_key"]
    if not lab_key:
        raise ValueError("ECOBANK_LAB_KEY not configured")
    
    data = payload + lab_key
    hash_bytes = data.encode('utf-8')
    hash_digest = hashlib.sha512(hash_bytes).hexdigest()
    return hash_digest


async def get_access_token() -> str:
    """
    Get EcoBank access token (with caching)
    Token expires in ~2 hours, we refresh every 1.5 hours
    """
    global _token_cache
    
    # Check cache
    if _token_cache["token"] and _token_cache["expires_at"]:
        if datetime.utcnow() < _token_cache["expires_at"]:
            return _token_cache["token"]
    
    # Request new token
    user_id = ECOBANK_CONFIG["user_id"]
    password = ECOBANK_CONFIG["password"]
    
    if not user_id or not password:
        raise ValueError("ECOBANK_USER_ID and ECOBANK_PASSWORD must be configured")
    
    url = f"{ECOBANK_CONFIG['base_url']}/user/token"
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            json={"userId": user_id, "password": password},
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Origin": "developer.ecobank.com"
            }
        )
        
        if response.status_code != 200:
            logger.error(f"EcoBank token request failed: {response.text}")
            raise Exception(f"Failed to get EcoBank token: {response.status_code}")
        
        data = response.json()
        token = data.get("token")
        
        if not token:
            raise Exception("No token in EcoBank response")
        
        # Cache token (expires in ~2 hours, refresh at 1.5 hours)
        from datetime import timedelta
        _token_cache["token"] = token
        _token_cache["expires_at"] = datetime.utcnow() + timedelta(hours=1, minutes=30)
        
        logger.info("EcoBank access token obtained successfully")
        return token


async def initiate_card_payment(
    amount: float,
    currency: str,
    order_info: str,
    return_url: str,
    access_code: str,
    merchant_id: str,
    secure_secret: str
) -> Dict[str, Any]:
    """
    Initiate card payment through EcoBank gateway
    Returns signature and redirect URL for card payment page
    """
    token = await get_access_token()
    
    # Generate request ID
    import secrets
    request_id = f"{int(datetime.utcnow().timestamp())}{secrets.token_hex(3)}"
    
    # Build payload for secure hash
    payload_values = f"{request_id}2310{amount}{currency}en_AU{order_info}{return_url}"
    secure_hash = generate_secure_hash(payload_values)
    
    url = f"{ECOBANK_CONFIG['base_url']}/merchant/Signature"
    
    request_body = {
        "paymentDetails": {
            "requestId": request_id,
            "productCode": "2310",
            "amount": str(amount),
            "currency": currency,
            "locale": "en_AU",
            "orderInfo": order_info,
            "returnUrl": return_url
        },
        "merchantDetails": {
            "accessCode": access_code,
            "merchantID": merchant_id,
            "secureSecret": secure_secret
        },
        "secureHash": secure_hash
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            json=request_body,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Origin": "developer.ecobank.com"
            }
        )
        
        data = response.json()
        logger.info(f"EcoBank card payment response: {data}")
        
        return {
            "success": data.get("response_code") == 200,
            "request_id": request_id,
            "response": data
        }


async def generate_dynamic_qr(
    terminal_id: str,
    transaction_id: str,
    amount: float,
    currency: str,
    customer_name: str,
    customer_phone: str,
    customer_email: str,
    description: str,
    affiliate_code: str = "ETZ"
) -> Dict[str, Any]:
    """
    Generate dynamic QR code for EcobankPay
    Returns QR code base64 and QR string
    """
    token = await get_access_token()
    
    # Build payload for secure hash (all field values concatenated)
    payload_values = (
        f"{terminal_id}{transaction_id}{amount}0P{currency}QR"
        f"{customer_name[:20]}{customer_phone}{customer_email}"
        f"{description[:50]}{affiliate_code}"
    )
    secure_hash = generate_secure_hash(payload_values)
    
    url = f"{ECOBANK_CONFIG['base_url']}/merchant/qr"
    
    request_body = {
        "ec_terminal_id": terminal_id,
        "ec_transaction_id": transaction_id,
        "ec_amount": amount,
        "ec_charges": "0",
        "ec_fees_type": "P",
        "ec_ccy": currency,
        "ec_payment_method": "QR",
        "ec_customer_id": customer_phone,
        "ec_customer_name": customer_name,
        "ec_mobile_no": customer_phone,
        "ec_email": customer_email,
        "ec_payment_description": description,
        "ec_product_code": transaction_id,
        "ec_product_name": description[:30],
        "ec_transaction_date": datetime.utcnow().strftime("%Y%m%d"),
        "ec_affiliate": affiliate_code,
        "ec_country_code": affiliate_code[-2:],
        "secure_hash": secure_hash
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            json=request_body,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Origin": "developer.ecobank.com"
            }
        )
        
        data = response.json()
        logger.info(f"EcoBank QR payment response: {data}")
        
        content = data.get("response_content", {})
        
        return {
            "success": data.get("response_code") == 200,
            "qr_code_base64": content.get("dynamicQRBase64"),
            "qr_string": content.get("dynamicQR"),
            "response": data
        }


async def create_merchant_qr_terminal(
    merchant_name: str,
    account_number: str,
    terminal_name: str,
    mobile_number: str,
    email: str,
    area: str,
    city: str,
    affiliate_code: str = "ETZ",
    mcc: str = "5411",  # Default: Grocery Stores
    dynamic_qr: bool = True,
    callback_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a new merchant QR terminal for EcobankPay
    Returns terminal ID and secret key for future QR operations
    """
    token = await get_access_token()
    
    import secrets
    request_id = f"KWK{secrets.token_hex(6).upper()}"
    request_token = ECOBANK_CONFIG["lab_key"]  # In sandbox, use lab_key as request token
    
    # Build payload for secure hash
    payload_values = (
        f"{request_id}{affiliate_code}{request_token}ECOBANK_QR_APIKAZANCREATE_MERCHANT"
        f"{merchant_name[:30]}{account_number}{terminal_name[:30]}{mobile_number}"
        f"{email}{area}{city}{mcc}{'Y' if dynamic_qr else 'N'}"
    )
    secure_hash = generate_secure_hash(payload_values)
    
    url = f"{ECOBANK_CONFIG['base_url']}/merchant/createqr"
    
    request_body = {
        "headerRequest": {
            "requestId": request_id,
            "affiliateCode": affiliate_code,
            "requestToken": request_token,
            "sourceCode": "ECOBANK_QR_API",
            "sourceChannelId": "KWIKPAY",
            "requestType": "CREATE_MERCHANT"
        },
        "merchantAddress": area,
        "merchantName": merchant_name,
        "accountNumber": account_number,
        "terminalName": terminal_name,
        "mobileNumber": mobile_number,
        "email": email,
        "area": area,
        "city": city,
        "referralCode": "KWIKPAY",
        "mcc": mcc,
        "dynamicQr": "Y" if dynamic_qr else "N",
        "callBackUrl": callback_url or "",
        "secure_hash": secure_hash
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            json=request_body,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Origin": "developer.ecobank.com"
            }
        )
        
        data = response.json()
        logger.info(f"EcoBank create merchant QR response: {data}")
        
        content = data.get("response_content", {})
        
        return {
            "success": data.get("response_code") == 200,
            "terminal_id": content.get("terminalId"),
            "merchant_code": content.get("merchantCode"),
            "secret_key": content.get("secretKey"),
            "qr_code_base64": content.get("qrCodeBase64"),
            "response": data
        }


async def check_transaction_status(
    client_id: str,
    request_id: str
) -> Dict[str, Any]:
    """
    Check status of a transaction
    """
    token = await get_access_token()
    
    payload_values = f"{client_id}{request_id}"
    secure_hash = generate_secure_hash(payload_values)
    
    url = f"{ECOBANK_CONFIG['base_url']}/merchant/txns/status"
    
    request_body = {
        "clientId": client_id,
        "requestId": request_id,
        "secureHash": secure_hash
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            json=request_body,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Origin": "developer.ecobank.com"
            }
        )
        
        data = response.json()
        logger.info(f"EcoBank transaction status response: {data}")
        
        return {
            "success": data.get("response_code") == 200,
            "content": data.get("response_content", []),
            "response": data
        }


async def get_account_balance(
    account_number: str,
    affiliate_code: str = "ETZ",
    client_id: str = "KWIKPAY"
) -> Dict[str, Any]:
    """
    Get account balance from EcoBank
    """
    token = await get_access_token()
    
    import secrets
    request_id = f"{secrets.token_hex(6)}"
    
    payload_values = f"{request_id}{affiliate_code}{account_number}{client_id}KWIKPAY"
    secure_hash = generate_secure_hash(payload_values)
    
    url = f"{ECOBANK_CONFIG['base_url']}/merchant/accountbalance"
    
    request_body = {
        "requestId": request_id,
        "affiliateCode": affiliate_code,
        "accountNo": account_number,
        "clientId": client_id,
        "companyName": "KWIKPAY",
        "secureHash": secure_hash
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            json=request_body,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Origin": "developer.ecobank.com"
            }
        )
        
        data = response.json()
        logger.info(f"EcoBank account balance response: {data}")
        
        return {
            "success": data.get("response_code") == 200,
            "content": data.get("response_content", {}),
            "response": data
        }


# Helper function to test connection
async def test_connection() -> Dict[str, Any]:
    """
    Test EcoBank API connection by getting a token
    """
    try:
        token = await get_access_token()
        return {
            "success": True,
            "message": "EcoBank connection successful",
            "token_preview": token[:50] + "...",
            "sandbox": ECOBANK_CONFIG["sandbox"]
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "sandbox": ECOBANK_CONFIG["sandbox"]
        }
