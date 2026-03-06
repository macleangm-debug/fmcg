#!/bin/bash
# ==============================================
# ONE-CLICK SMS MICROSERVICE DEPLOYMENT
# Run this script on the VPN server (41.220.143.37)
# ==============================================

echo ""
echo "========================================"
echo "  UniTxt SMS Microservice Installer"
echo "========================================"
echo ""

# Check if running on VPN server
if [[ $(hostname -I | awk '{print $1}') != "41.220.143.37" ]]; then
    echo "Warning: This script should be run on the VPN server (41.220.143.37)"
    echo "Current IP: $(hostname -I | awk '{print $1}')"
    read -p "Continue anyway? (y/n): " confirm
    if [[ $confirm != "y" ]]; then
        exit 1
    fi
fi

# Create directory
SMS_DIR="/home/joseph/sms_microservice"
mkdir -p $SMS_DIR
cd $SMS_DIR

# Create main.py
echo "Creating main.py..."
cat > main.py << 'MAINPY'
"""UniTxt SMS Microservice - Tigo SMPP Gateway"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import logging
import socket
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="UniTxt SMS Microservice", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tigo SMPP Configuration
TIGO = {
    "host": os.getenv("TIGO_SMPP_HOST", "41.222.182.102"),
    "port": int(os.getenv("TIGO_SMPP_PORT", "10501")),
    "system_id": os.getenv("TIGO_SYSTEM_ID", "datavision"),
    "password": os.getenv("TIGO_PASSWORD", ""),
    "sender_id": os.getenv("TIGO_SENDER_ID", "UNITXT"),
    "sandbox": os.getenv("TIGO_SANDBOX", "true").lower() == "true"
}

class SMSRequest(BaseModel):
    phone_number: str
    message: str
    sender_id: Optional[str] = None

class BulkSMSRequest(BaseModel):
    phone_numbers: List[str]
    message: str
    sender_id: Optional[str] = None

def send_sms(phone: str, message: str, sender_id: str) -> dict:
    timestamp = datetime.utcnow().isoformat()
    
    if TIGO["sandbox"]:
        logger.info(f"[SANDBOX] Send to {phone}: {message}")
        return {"success": True, "message_id": f"SANDBOX-{datetime.utcnow().timestamp()}", "timestamp": timestamp, "sandbox": True}
    
    try:
        import smpplib, smpplib.client, smpplib.gsm, smpplib.consts
        
        client = smpplib.client.Client(TIGO["host"], TIGO["port"])
        client.connect()
        client.bind_transmitter(system_id=TIGO["system_id"], password=TIGO["password"])
        
        parts, enc, msg_type = smpplib.gsm.make_parts(message)
        msg_ids = []
        for part in parts:
            pdu = client.send_message(
                source_addr_ton=smpplib.consts.SMPP_TON_ALNUM,
                source_addr_npi=smpplib.consts.SMPP_NPI_UNK,
                source_addr=sender_id,
                dest_addr_ton=smpplib.consts.SMPP_TON_INTL,
                dest_addr_npi=smpplib.consts.SMPP_NPI_ISDN,
                destination_addr=phone,
                short_message=part,
                data_coding=enc,
                esm_class=msg_type,
                registered_delivery=True
            )
            msg_ids.append(pdu.message_id)
        
        client.unbind()
        client.disconnect()
        logger.info(f"SMS sent to {phone}: {msg_ids[0]}")
        return {"success": True, "message_id": msg_ids[0], "timestamp": timestamp}
    except Exception as e:
        logger.error(f"SMPP Error: {e}")
        return {"success": False, "error": str(e), "timestamp": timestamp}

@app.get("/")
async def root():
    return {"service": "UniTxt SMS", "status": "running", "port": 8002}

@app.get("/health")
async def health():
    return {"status": "healthy", "tigo_host": TIGO["host"], "sandbox": TIGO["sandbox"]}

@app.post("/send")
@app.post("/api/sms/send")
async def send_single(request: SMSRequest):
    phone = request.phone_number.strip()
    if not phone.startswith("+"): phone = f"+{phone}"
    result = send_sms(phone, request.message, request.sender_id or TIGO["sender_id"])
    if not result.get("success"): raise HTTPException(500, result.get("error"))
    return result

@app.post("/send-bulk")
async def send_bulk(request: BulkSMSRequest):
    results, ok, fail = [], 0, 0
    for p in request.phone_numbers:
        phone = p.strip()
        if not phone.startswith("+"): phone = f"+{phone}"
        r = send_sms(phone, request.message, request.sender_id or TIGO["sender_id"])
        results.append(r)
        if r.get("success"): ok += 1
        else: fail += 1
    return {"total": len(request.phone_numbers), "successful": ok, "failed": fail, "results": results}

@app.get("/test-connection")
async def test_conn():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(10)
        r = s.connect_ex((TIGO["host"], TIGO["port"]))
        s.close()
        connected = r == 0
        return {"connected": connected, "host": TIGO["host"], "port": TIGO["port"], 
                "message": "Connected to Tigo SMPP" if connected else f"Failed: code {r}"}
    except Exception as e:
        return {"connected": False, "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
MAINPY

# Create requirements.txt
echo "Creating requirements.txt..."
cat > requirements.txt << 'REQUIREMENTS'
fastapi==0.104.1
uvicorn==0.24.0
smpplib==2.2.3
pydantic==2.5.0
REQUIREMENTS

# Install dependencies
echo ""
echo "Installing Python dependencies..."
pip3 install -r requirements.txt

# Create systemd service
echo ""
echo "Creating systemd service..."
sudo tee /etc/systemd/system/unitxt-sms.service > /dev/null << 'SERVICE'
[Unit]
Description=UniTxt SMS Microservice
After=network.target

[Service]
Type=simple
User=joseph
WorkingDirectory=/home/joseph/sms_microservice
ExecStart=/usr/bin/python3 /home/joseph/sms_microservice/main.py
Restart=always
RestartSec=10
Environment="TIGO_SANDBOX=true"

[Install]
WantedBy=multi-user.target
SERVICE

# Enable and start
echo "Starting service..."
sudo systemctl daemon-reload
sudo systemctl enable unitxt-sms
sudo systemctl restart unitxt-sms

# Wait and check
sleep 3
echo ""
echo "========================================"
echo "  SERVICE STATUS"
echo "========================================"
sudo systemctl status unitxt-sms --no-pager -l

echo ""
echo "========================================"
echo "  TESTING ENDPOINTS"
echo "========================================"

echo ""
echo "1. Health Check:"
curl -s http://localhost:8002/health | python3 -m json.tool 2>/dev/null || echo "Failed"

echo ""
echo "2. Test Tigo Connection:"
curl -s http://localhost:8002/test-connection | python3 -m json.tool 2>/dev/null || echo "Failed"

echo ""
echo "3. Send Test SMS (Sandbox):"
curl -s -X POST http://localhost:8002/send \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+255712345678", "message": "Test from UniTxt"}' | python3 -m json.tool 2>/dev/null || echo "Failed"

echo ""
echo "========================================"
echo "  DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "SMS Service URL: http://41.220.143.37:8002"
echo ""
echo "Available Endpoints:"
echo "  GET  /health          - Health check"
echo "  GET  /test-connection - Test Tigo connectivity"
echo "  POST /send            - Send single SMS"
echo "  POST /send-bulk       - Send bulk SMS"
echo ""
echo "To disable sandbox mode (send real SMS):"
echo "  1. Edit /etc/systemd/system/unitxt-sms.service"
echo "  2. Change TIGO_SANDBOX=true to TIGO_SANDBOX=false"
echo "  3. Run: sudo systemctl daemon-reload && sudo systemctl restart unitxt-sms"
echo ""
