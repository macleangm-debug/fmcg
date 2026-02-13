# Software Galaxy - FMCG/Retail Management System

## Original Problem Statement
Pull code from https://github.com/macleangm-debug/fmcg and preview it to allow user to work on it.

## Project Overview
Software Galaxy is a comprehensive multi-tenant retail/FMCG management system featuring:
- **Frontend**: Expo React Native with web support (expo-router)
- **Backend**: FastAPI Python with MongoDB
- **Authentication**: JWT-based auth with Google OAuth support

## Architecture
```
/app/
├── backend/           # FastAPI Python backend
│   └── server.py      # Main API (3900+ lines)
├── frontend/          # Expo React Native app
│   ├── app/           # Expo Router pages
│   │   ├── (auth)/    # Login, Register
│   │   ├── (tabs)/    # Dashboard, Products, Orders, Customers, Cart
│   │   ├── admin/     # Settings, Staff, Reports, Stock, Promotions
│   │   └── galaxy/    # Product switching, home
│   └── src/           # Shared components, stores, API client
└── test_reports/      # Test results
```

## Core Features Implemented
- Multi-tenant business registration and management
- User authentication (email + Google OAuth)
- Role-based access control (Superadmin, Admin, Manager, Sales Staff, Finance)
- Product & Category management with variants
- Customer management
- Order processing with multiple payment methods
- Inventory/Stock management with movement tracking
- Expenses tracking
- Promotions/Campaigns
- Dashboard with analytics
- Reports generation

## User Personas
1. **Business Admin**: Full control over business, staff, products, settings
2. **Manager**: Product, stock, and staff management
3. **Sales Staff**: POS operations, order creation
4. **Finance**: Access to reports and expenses

## Tech Stack
- Frontend: Expo SDK 54, React Native Web, Zustand (state), Axios
- Backend: FastAPI, Motor (async MongoDB), PyJWT, bcrypt
- Database: MongoDB

## URLs
- Frontend: https://fmcg-preview-sms.preview.emergentagent.com
- API: https://fmcg-preview-sms.preview.emergentagent.com/api

## Test Credentials
- Superadmin: superadmin@retail.com / SuperAdmin123!
- Test User: test@example.com / testpass123

## What's Been Implemented (Feb 13, 2026)
- [x] Cloned repository from GitHub
- [x] Configured Expo web on port 3000
- [x] Backend running on port 8001
- [x] MongoDB connected
- [x] Added /api/health endpoint
- [x] Landing page loads with product suite display
- [x] Login/Registration flow working
- [x] All backend APIs functional

## Prioritized Backlog
### P0 (Critical)
- None currently

### P1 (High)
- Investigate intermittent frontend loading delays (Expo bundling)
- Update deprecated React Native shadow* props to boxShadow

### P2 (Medium)
- Add more comprehensive error handling
- Implement password reset flow
- Add email notifications

## Next Steps
1. User can now work on feature additions or bug fixes
2. Potential areas: Reports visualization, Export functionality, Email integrations
