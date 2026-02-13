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

### Tigo SMPP Configuration
```
Host: smpp01.tigo.co.tz
Port: 10501
Username: datavision
Password: dat@vis
Sender ID: UNITXT
Status: SANDBOX MODE (set TIGO_SANDBOX=false for production)
```

**Important**: The SMPP connection requires VPN connectivity to Tigo's gateway (41.222.182.6). The code is complete and ready - deploy to a VPN-connected server and set `TIGO_SANDBOX=false` to go live.

## Key Files
- `/app/backend/services/tigo_smpp_service.py` - Tigo SMPP service
- `/app/backend/routes/unitxt.py` - UniTxt SMS routes including Tigo integration
- `/app/backend/.env` - Tigo credentials
- `/app/frontend/app/products/[id].tsx` - Product pages with scrolling fix

## P0 - Completed
- [x] Tigo SMPP integration (sandbox mode working)
- [x] Single SMS sending via Tigo
- [x] Bulk SMS sending with personalization ({{name}} placeholder)
- [x] Batch status tracking
- [x] Product page scrolling fix

## P1 - In Progress/Known Issues
- [ ] Frontend occasionally runs out of memory (mitigated with NODE_OPTIONS)
- [ ] Deploy to VPN-connected server for live Tigo connection

## P2 - Future Tasks
- [ ] UniTxt admin dashboard for managing SMS campaigns
- [ ] Full production build for Expo web (`expo export:web`)
- [ ] Delivery report handling (webhooks)

## Testing Credentials
- **API Test User**: admin@test.com / admin123
- **Preview URL**: https://fmcg-preview-sms.preview.emergentagent.com

## API Endpoints
- `GET /api/health` - Health check
- `POST /api/auth/login` - User login
- `POST /api/unitxt/tigo/send` - Send single SMS
- `POST /api/unitxt/tigo/bulk-send` - Send bulk SMS
- `GET /api/unitxt/tigo/batch/{id}` - Get batch status
- `GET /api/unitxt/tigo/status` - Tigo service status
