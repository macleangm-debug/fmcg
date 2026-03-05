"""
UniTxt SMS Microservice
Standalone service for Tigo SMPP connectivity
Deploy this on the VPN server (41.220.143.37)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import logging
import smpplib
import smpplib.client
import smpplib.gsm
import smpplib.consts
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="UniTxt SMS Microservice",
    description="Tigo SMPP Gateway for Bulk SMS",
    version="1.0.0"
)

# CORS - Allow main backend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tigo SMPP Configuration
TIGO_CONFIG = {
    "host": os.getenv("TIGO_SMPP_HOST", "smpp01.tigo.co.tz"),
    "port": int(os.getenv("TIGO_SMPP_PORT", "10501")),
    "system_id": os.getenv("TIGO_SYSTEM_ID", "datavision"),
    "password": os.getenv("TIGO_PASSWORD", "dat@vis"),
    "sender_id": os.getenv("TIGO_SENDER_ID", "UNITXT"),
    "sandbox": os.getenv("TIGO_SANDBOX", "false").lower() == "true"
}

# Request/Response Models
class SMSRequest(BaseModel):
    phone_number: str
    message: str
    sender_id: Optional[str] = None

class BulkSMSRequest(BaseModel):
    phone_numbers: List[str]
    message: str
    sender_id: Optional[str] = None

class SMSResponse(BaseModel):
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None
    timestamp: str

class BulkSMSResponse(BaseModel):
    total: int
    successful: int
    failed: int
    results: List[SMSResponse]


def send_sms_via_smpp(phone: str, message: str, sender_id: str) -> SMSResponse:
    """Send SMS via Tigo SMPP"""
    timestamp = datetime.utcnow().isoformat()
    
    # Sandbox mode - simulate success
    if TIGO_CONFIG["sandbox"]:
        logger.info(f"[SANDBOX] Would send to {phone}: {message}")
        return SMSResponse(
            success=True,
            message_id=f"SANDBOX-{datetime.utcnow().timestamp()}",
            timestamp=timestamp
        )
    
    try:
        # Connect to SMPP server
        client = smpplib.client.Client(TIGO_CONFIG["host"], TIGO_CONFIG["port"])
        client.connect()
        
        # Bind as transmitter
        client.bind_transmitter(
            system_id=TIGO_CONFIG["system_id"],
            password=TIGO_CONFIG["password"]
        )
        
        # Prepare message
        parts, encoding_flag, msg_type_flag = smpplib.gsm.make_parts(message)
        
        # Send each part
        message_ids = []
        for part in parts:
            pdu = client.send_message(
                source_addr_ton=smpplib.consts.SMPP_TON_ALNUM,
                source_addr_npi=smpplib.consts.SMPP_NPI_UNK,
                source_addr=sender_id,
                dest_addr_ton=smpplib.consts.SMPP_TON_INTL,
                dest_addr_npi=smpplib.consts.SMPP_NPI_ISDN,
                destination_addr=phone,
                short_message=part,
                data_coding=encoding_flag,
                esm_class=msg_type_flag,
                registered_delivery=True
            )
            message_ids.append(pdu.message_id)
        
        # Unbind and disconnect
        client.unbind()
        client.disconnect()
        
        logger.info(f"SMS sent to {phone}, message_id: {message_ids[0]}")
        
        return SMSResponse(
            success=True,
            message_id=message_ids[0] if message_ids else None,
            timestamp=timestamp
        )
        
    except Exception as e:
        logger.error(f"SMPP Error: {str(e)}")
        return SMSResponse(
            success=False,
            error=str(e),
            timestamp=timestamp
        )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "UniTxt SMS Microservice",
        "tigo_host": TIGO_CONFIG["host"],
        "sandbox_mode": TIGO_CONFIG["sandbox"]
    }


@app.post("/send", response_model=SMSResponse)
async def send_sms(request: SMSRequest):
    """Send single SMS via Tigo SMPP"""
    sender_id = request.sender_id or TIGO_CONFIG["sender_id"]
    
    # Clean phone number
    phone = request.phone_number.strip()
    if not phone.startswith("+"):
        phone = f"+{phone}"
    
    result = send_sms_via_smpp(phone, request.message, sender_id)
    
    if not result.success:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result


@app.post("/send-bulk", response_model=BulkSMSResponse)
async def send_bulk_sms(request: BulkSMSRequest):
    """Send bulk SMS via Tigo SMPP"""
    sender_id = request.sender_id or TIGO_CONFIG["sender_id"]
    
    results = []
    successful = 0
    failed = 0
    
    for phone in request.phone_numbers:
        # Clean phone number
        clean_phone = phone.strip()
        if not clean_phone.startswith("+"):
            clean_phone = f"+{clean_phone}"
        
        result = send_sms_via_smpp(clean_phone, request.message, sender_id)
        results.append(result)
        
        if result.success:
            successful += 1
        else:
            failed += 1
    
    return BulkSMSResponse(
        total=len(request.phone_numbers),
        successful=successful,
        failed=failed,
        results=results
    )


@app.get("/test-connection")
async def test_tigo_connection():
    """Test connectivity to Tigo SMPP server"""
    import socket
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((TIGO_CONFIG["host"], TIGO_CONFIG["port"]))
        sock.close()
        
        if result == 0:
            return {
                "connected": True,
                "host": TIGO_CONFIG["host"],
                "port": TIGO_CONFIG["port"],
                "message": "Successfully connected to Tigo SMPP server"
            }
        else:
            return {
                "connected": False,
                "host": TIGO_CONFIG["host"],
                "port": TIGO_CONFIG["port"],
                "message": f"Connection failed with error code: {result}"
            }
    except Exception as e:
        return {
            "connected": False,
            "host": TIGO_CONFIG["host"],
            "port": TIGO_CONFIG["port"],
            "message": f"Connection error: {str(e)}"
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
