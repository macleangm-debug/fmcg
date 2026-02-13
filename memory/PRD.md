# FMCG Application - Product Requirements Document

## Original Problem Statement
Set up and preview the FMCG application from GitHub repository (`https://github.com/macleangm-debug/fmcg`) and integrate UniTxt Bulk SMS with Tigo Tanzania using SMPP protocol.

## Architecture
- **Frontend**: React Native Expo (running as web via `expo start --web`)
- **Backend**: Python FastAPI
- **Database**: MongoDB
- **Branch**: `conflict_050226_1426` (contains latest code)

## What's Been Implemented

### February 13, 2026 - Tigo SMPP Integration
- ✅ Created `/app/backend/services/tigo_smpp_service.py` - Full SMPP client service
- ✅ Added Tigo SMPP API endpoints to `/app/backend/routes/unitxt.py`:
  - `POST /api/unitxt/tigo/send` - Send single SMS
  - `POST /api/unitxt/tigo/bulk-send` - Send bulk SMS with personalization
  - `GET /api/unitxt/tigo/batch/{batch_id}` - Check bulk SMS batch status
  - `GET /api/unitxt/tigo/status` - Check Tigo service status
- ✅ Added Tigo credentials to backend `.env`
- ✅ Fixed scrolling issue on product pages
- ✅ All backend APIs tested and working (sandbox mode)

### February 13, 2026 - Delivery Report Webhooks
- ✅ `POST /api/unitxt/webhook/delivery` - HTTP webhook for Tigo delivery reports
- ✅ `POST /api/unitxt/webhook/delivery/raw` - Alternative endpoint for unknown payload formats
- ✅ `GET /api/unitxt/message/{message_id}/status` - Get delivery status for specific message
- ✅ `GET /api/unitxt/delivery-reports` - Get recent delivery reports
- ✅ `GET /api/unitxt/webhook/test` - Test webhook accessibility
- ✅ SMPP delivery receipt handling (via `deliver_sm` PDUs)

---

## Tigo SMPP Configuration
```
Host: smpp01.tigo.co.tz
Port: 10501
Username: datavision
Password: dat@vis
Sender ID: UNITXT
Status: SANDBOX MODE (set TIGO_SANDBOX=false for production)
```

**VPN Requirement**: The SMPP connection requires VPN connectivity to Tigo's gateway (41.222.182.6).

---

## Deployment Instructions

### Step 1: Get the Code
**Option A - GitHub (Private repo supported):**
```bash
# Using Personal Access Token
git clone https://YOUR_TOKEN@github.com/macleangm-debug/fmcg.git

# Or using SSH key
git clone git@github.com:macleangm-debug/fmcg.git
```

### Step 2: Install Dependencies
```bash
cd fmcg/backend
pip install -r requirements.txt
```

### Step 3: Configure for Production
Edit `/backend/.env`:
```
TIGO_SANDBOX=false
```

### Step 4: Configure Tigo Webhook
In your Tigo account, set delivery report URL to:
```
https://yourdomain.com/api/unitxt/webhook/delivery
```

### Step 5: Run the Server
```bash
python -m uvicorn server:app --host 0.0.0.0 --port 8001
```

---

## Key Files
- `/app/backend/services/tigo_smpp_service.py` - Tigo SMPP service
- `/app/backend/routes/unitxt.py` - UniTxt SMS routes including Tigo integration & webhooks
- `/app/backend/.env` - Tigo credentials
- `/app/frontend/app/products/[id].tsx` - Product pages with scrolling fix

## API Endpoints Summary

### SMS Sending
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/unitxt/tigo/send` | POST | Send single SMS |
| `/api/unitxt/tigo/bulk-send` | POST | Send bulk SMS |
| `/api/unitxt/tigo/batch/{id}` | GET | Get batch status |
| `/api/unitxt/tigo/status` | GET | Service status |

### Delivery Reports
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/unitxt/webhook/delivery` | POST | Receive Tigo callbacks |
| `/api/unitxt/webhook/delivery/raw` | POST | Raw payload handler |
| `/api/unitxt/message/{id}/status` | GET | Get message status |
| `/api/unitxt/delivery-reports` | GET | List recent reports |
| `/api/unitxt/webhook/test` | GET | Test webhook URL |

---

## P0 - Completed
- [x] Tigo SMPP integration (sandbox mode working)
- [x] Single SMS sending via Tigo
- [x] Bulk SMS sending with personalization ({{name}} placeholder)
- [x] Batch status tracking
- [x] Delivery report webhooks (HTTP)
- [x] SMPP delivery receipt handling
- [x] Product page scrolling fix

## P1 - Next Steps
- [ ] Deploy to VPN-connected server
- [ ] Set TIGO_SANDBOX=false and test live
- [ ] Configure webhook URL in Tigo account

## P2 - Future Tasks
- [ ] UniTxt admin dashboard for managing SMS campaigns
- [ ] Full production build for Expo web (`expo export:web`)
- [ ] SMS analytics dashboard

## Testing Credentials
- **API Test User**: admin@test.com / admin123
- **Preview URL**: https://unitxt-bulk-sms.preview.emergentagent.com
