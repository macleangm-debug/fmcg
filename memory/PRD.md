# FMCG Application - Product Requirements Document

## Original Problem Statement
Set up and preview the FMCG application from GitHub repository (`https://github.com/macleangm-debug/fmcg`) and integrate UniTxt Bulk SMS with Tigo Tanzania using SMPP protocol. Later expanded to include advertisement carousel integration and UI improvements.

## Architecture
- **Frontend**: React Native Expo (running as web via `expo start --web`)
- **Backend**: Python FastAPI
- **Database**: MongoDB
- **Branch**: `conflict_050226_1426` (contains latest code)

## What's Been Implemented

### February 15, 2026 (Current Session) - Icon Fix Implementation
- ✅ **FIXED: Web Icon Rendering Issue** - Created unified Icon component using `lucide-react`
- ✅ Created `/app/frontend/src/components/Icon.tsx` - Cross-platform icon wrapper
- ✅ Updated `WebSidebarLayout.tsx` to use new Icon component
- ✅ Updated `dashboard.tsx` stat cards and quick actions with Icon component
- ✅ Updated `login.tsx` form icons with Icon component
- ✅ All sidebar icons now render correctly (Dashboard, New Sale, Orders, Customers, Products, etc.)
- ✅ All stat card icons working (Sales, Orders, Customers, Products)
- ✅ Login form icons working (Email, Password, Eye toggle, Arrow)

### February 15, 2026 - Advertisement Carousel Integration
- ✅ Successfully integrated AdvertCarousel component into dashboard
- ✅ Carousel displays on both web and mobile dashboards
- ✅ Auto-rotation every 5 seconds between 4 adverts
- ✅ Navigation dots visible and functional
- ✅ CTA buttons navigate to linked pages
- ✅ API endpoint `/api/adverts/public` working with multi-language support
- ✅ Testing agent validation: 100% pass rate
- ⚠️ Language Selector integration attempted but caused bundler issues

### February 15, 2026 - Advertisement Backend System
- ✅ Created `/app/backend/routes/adverts.py` - Full advertisement management API
- ✅ Created `/app/frontend/src/components/AdvertCarousel.tsx` - Reusable sliding advert component
- ✅ Created `/app/frontend/src/store/languageStore.ts` - Multi-language support (EN, SW, FR, AR, PT)
- ✅ Created `/app/frontend/src/store/advertStore.ts` - Advert state management
- ✅ Created `/app/frontend/src/components/LanguageSelector.tsx` - Language dropdown component
- ✅ Deployment script created at `/app/deploy.sh`

### February 13, 2026 - Tigo SMPP Integration
- ✅ Created `/app/backend/services/tigo_smpp_service.py` - Full SMPP client service
- ✅ Added Tigo SMPP API endpoints to `/app/backend/routes/unitxt.py`
- ✅ Fixed scrolling issue on product pages

---

## Icon System

### New Icon Component
The app now uses a unified `Icon` component that:
- Uses `lucide-react` on web (works reliably)
- Falls back to `Ionicons` on native mobile (where they work)
- Maps Ionicons names to equivalent Lucide icons

**Usage:**
```tsx
import Icon from '../../src/components/Icon';
<Icon name="cart-outline" size={24} color="#2563EB" />
```

**Key Files:**
- `/app/frontend/src/components/Icon.tsx` - Unified icon component

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

### Supported Languages
- English (en), Swahili (sw), French (fr), Arabic (ar) - RTL, Portuguese (pt)

---

## Key Files
- `/app/frontend/src/components/Icon.tsx` - Unified icon component (NEW)
- `/app/frontend/src/components/WebSidebarLayout.tsx` - Sidebar with fixed icons
- `/app/backend/routes/adverts.py` - Advertisement management API
- `/app/frontend/src/components/AdvertCarousel.tsx` - Sliding advert carousel
- `/app/frontend/src/components/LanguageSelector.tsx` - Language dropdown (created but not integrated)
- `/app/frontend/src/store/languageStore.ts` - Multi-language translations
- `/app/frontend/app/(tabs)/dashboard.tsx` - Dashboard with carousel integration
- `/app/frontend/app/(auth)/login.tsx` - Login page with fixed icons
- `/app/deploy.sh` - One-click deployment script

---

## P0 - Completed
- [x] Tigo SMPP integration (sandbox mode working)
- [x] Advertisement backend API
- [x] Multi-language support (5 languages)
- [x] AdvertCarousel component
- [x] Carousel integration into dashboard
- [x] **Web icon rendering fix (COMPLETED)**

## P1 - In Progress / Next
- [ ] Language Selector integration (blocked - causes bundler error with import.meta)
- [ ] Dynamic sidebar theming per product color
- [ ] Continue expanding Icon component to more components

## P2 - Upcoming
- [ ] Deploy to VPN-connected server
- [ ] Test live SMS sending

## P3 - Future Tasks
- [ ] UniTxt admin dashboard for SMS campaigns
- [ ] Production build for Expo web
- [ ] SMS analytics dashboard

---

## Known Issues
1. **Language Selector Bundler Error**: Importing `useLanguageStore` or `LanguageSelector` into the dashboard causes "Cannot use 'import.meta' outside a module" bundler error. Requires Metro bundler configuration fix.
2. ~~**Icon Font Loading (Pre-existing)**: Ionicons appear as empty boxes on web.~~ **FIXED** - Using lucide-react via Icon component

---

## Testing Credentials
- **Admin User**: admin@fmcg.com / Admin@2025
- **Demo User**: demo@fmcg.com / Demo@2025
- **Preview URL**: https://multi-product-hub-3.preview.emergentagent.com

---

## Test Reports
- `/app/test_reports/iteration_2.json` - Latest carousel feature test results (100% pass)
