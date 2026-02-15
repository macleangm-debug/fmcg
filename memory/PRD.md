# FMCG Application - Product Requirements Document

## Original Problem Statement
Set up and preview the FMCG application from GitHub repository (`https://github.com/macleangm-debug/fmcg`) and integrate UniTxt Bulk SMS with Tigo Tanzania using SMPP protocol. Later expanded to include advertisement carousel integration and UI improvements.

## Architecture
- **Frontend**: React Native Expo (running as web via `expo start --web`)
- **Backend**: Python FastAPI
- **Database**: MongoDB
- **Branch**: `conflict_050226_1426` (contains latest code)

## What's Been Implemented

### February 15, 2026 (Current Session) - Advertisement Carousel Integration
- ✅ Successfully integrated AdvertCarousel component into dashboard
- ✅ Carousel displays on both web and mobile dashboards
- ✅ Auto-rotation every 5 seconds between 4 adverts
- ✅ Navigation dots visible and functional
- ✅ CTA buttons navigate to linked pages
- ✅ API endpoint `/api/adverts/public` working with multi-language support
- ✅ Testing agent validation: 100% pass rate

### February 15, 2026 - Advertisement Backend System
- ✅ Created `/app/backend/routes/adverts.py` - Full advertisement management API
- ✅ Created `/app/frontend/src/components/AdvertCarousel.tsx` - Reusable sliding advert component
- ✅ Created `/app/frontend/src/store/languageStore.ts` - Multi-language support (EN, SW, FR, AR, PT)
- ✅ Created `/app/frontend/src/store/advertStore.ts` - Advert state management
- ✅ Deployment script created at `/app/deploy.sh`

### February 13, 2026 - Tigo SMPP Integration
- ✅ Created `/app/backend/services/tigo_smpp_service.py` - Full SMPP client service
- ✅ Added Tigo SMPP API endpoints to `/app/backend/routes/unitxt.py`
- ✅ Fixed scrolling issue on product pages

### February 13, 2026 - Delivery Report Webhooks
- ✅ HTTP webhook endpoints for Tigo delivery reports
- ✅ SMPP delivery receipt handling

---

## Advertisement System

### Backend API Endpoints
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/adverts/public` | GET | No | Get active adverts (with language param) |
| `/api/adverts/` | GET | Yes | Get all adverts (admin) |
| `/api/adverts/{id}` | GET | Yes | Get single advert |
| `/api/adverts/` | POST | Admin | Create new advert |
| `/api/adverts/{id}` | PUT | Admin | Update advert |
| `/api/adverts/{id}` | DELETE | Admin | Delete advert |
| `/api/adverts/seed` | POST | Admin | Seed sample adverts |
| `/api/adverts/languages/available` | GET | No | Get supported languages |

### Supported Languages
- English (en)
- Swahili (sw)
- French (fr)
- Arabic (ar) - RTL support
- Portuguese (pt)

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

**VPN Requirement**: The SMPP connection requires VPN connectivity to Tigo's gateway.

---

## Key Files
- `/app/backend/routes/adverts.py` - Advertisement management API
- `/app/backend/services/tigo_smpp_service.py` - Tigo SMPP service
- `/app/backend/routes/unitxt.py` - UniTxt SMS routes
- `/app/frontend/src/components/AdvertCarousel.tsx` - Sliding advert carousel
- `/app/frontend/src/store/languageStore.ts` - Multi-language translations
- `/app/frontend/app/(tabs)/dashboard.tsx` - Dashboard with carousel integration
- `/app/frontend/app/_layout.tsx` - Root layout with font loading
- `/app/deploy.sh` - One-click deployment script

---

## P0 - Completed
- [x] Tigo SMPP integration (sandbox mode working)
- [x] Single & Bulk SMS sending via Tigo
- [x] Delivery report webhooks (HTTP & SMPP)
- [x] Product page scrolling fix
- [x] Deployment script for user's server
- [x] Advertisement backend API
- [x] Multi-language support (5 languages)
- [x] AdvertCarousel component
- [x] **Carousel integration into dashboard (COMPLETED)**

## P1 - In Progress / Next
- [ ] Fix icon rendering on web (pre-existing issue - Ionicons font not loading)
- [ ] Sidebar theming per product color
- [ ] Admin UI for managing adverts

## P2 - Upcoming
- [ ] Deploy to VPN-connected server
- [ ] Test live SMS sending
- [ ] Verify deployment scripts work on user server

## P3 - Future Tasks
- [ ] UniTxt admin dashboard for SMS campaigns
- [ ] Production build for Expo web
- [ ] SMS analytics dashboard

---

## Known Issues
1. **Icon Font Loading (Pre-existing)**: Ionicons appear as empty boxes on web. Multiple fixes attempted (useFonts, Font.loadAsync, asset path). Requires deep investigation into Metro bundler configuration.
2. **API Issues (Pre-existing)**:
   - `/api/locations` returns 400 Bad Request
   - `subscriptionApi.getCurrent` function missing

---

## Testing Credentials
- **Admin User**: admin@fmcg.com / Admin@2025
- **Demo User**: demo@fmcg.com / Demo@2025
- **Preview URL**: https://advert-feature.preview.emergentagent.com

---

## Test Reports
- `/app/test_reports/iteration_2.json` - Latest carousel feature test results (100% pass)
- `/app/backend/tests/test_adverts.py` - Automated adverts API tests
