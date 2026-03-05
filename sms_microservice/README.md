# UniTxt SMS Microservice

Lightweight SMS service for Tigo SMPP connectivity.
Deploy this on the VPN server (41.220.143.37).

## Quick Setup

```bash
# 1. Copy this folder to VPN server
scp -r ./sms_microservice joseph@41.220.143.37:/home/joseph/
# Password: joseph@2025

# 2. SSH into VPN server
ssh joseph@41.220.143.37

# 3. Setup
cd /home/joseph/sms_microservice
pip3 install -r requirements.txt

# 4. Start service
python3 main.py
# Or with uvicorn:
uvicorn main:app --host 0.0.0.0 --port 8002
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/test-connection` | GET | Test Tigo SMPP connectivity |
| `/send` | POST | Send single SMS |
| `/send-bulk` | POST | Send bulk SMS |

## Test SMS

```bash
# Test connection
curl http://localhost:8002/test-connection

# Send single SMS
curl -X POST http://localhost:8002/send \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+255712345678", "message": "Hello from UniTxt"}'

# Send bulk SMS
curl -X POST http://localhost:8002/send-bulk \
  -H "Content-Type: application/json" \
  -d '{
    "phone_numbers": ["+255712345678", "+255713456789"],
    "message": "Bulk message from UniTxt"
  }'
```

## Main Backend Integration

Update your main backend to call this microservice for SMS:

```python
import httpx

SMS_SERVICE_URL = "http://41.220.143.37:8002"

async def send_sms(phone: str, message: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SMS_SERVICE_URL}/send",
            json={"phone_number": phone, "message": message}
        )
        return response.json()
```
