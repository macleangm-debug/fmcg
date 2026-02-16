# FMCG Application - Product Requirements Document

## Original Problem Statement
Set up and preview the FMCG application from GitHub repository (`https://github.com/macleangm-debug/fmcg`) and integrate UniTxt Bulk SMS with Tigo Tanzania using SMPP protocol. Later expanded to include advertisement carousel integration and comprehensive dashboard UI redesign to match user reference design. Most recently, apply the new dashboard layout across ALL products in the SSO Soko app suite.

## Architecture
- **Frontend**: React Native Expo (running as web via `expo start --web`)
- **Backend**: Python FastAPI
- **Database**: MongoDB
- **Branch**: `conflict_050226_1426` (contains latest code)

## What's Been Implemented

### February 16, 2026 (Current Session) - UNIVERSAL DASHBOARD LAYOUT
- ✅ **ProductDashboard Component** - Reusable, theme-configurable dashboard
- ✅ **Applied to 4 Products**:
  - RetailPro (Dark Green #1B4332) - Original implementation
  - Expenses (Red #EF4444) - NEW themed dashboard
  - Loyalty (Pink #EC4899) - NEW themed dashboard  
  - UniTxt (Amber #F59E0B) - NEW themed dashboard
- ✅ **Product-Specific Themes** - Each product has unique colors from PRODUCT_THEMES
- ✅ **Consistent UI/UX** - Same layout pattern across all updated products:
  - Update card with revenue stats
  - Net Income + Total Return cards
  - 4-stat row with custom labels per product
  - Transaction list, Revenue chart, Sales Report
  - Total View Performance, Promotional card
- ✅ **Testing Agent Validation** - 100% frontend pass rate

### February 15, 2026 - COMPLETE DASHBOARD REDESIGN
- ✅ **Full Dashboard UI Overhaul** - Matching user's reference screenshot 1:1
- ✅ **New Dashboard Components Created**:
  - `TotalViewPerformance.tsx` - Donut chart with 565K total, percentages (16%, 23%, 68%)
  - `TransactionList.tsx` - 7-item list with icons, dates, order IDs, status badges
  - `RevenueChart.tsx` - $193,000 with bar chart (Income vs Expenses)
  - `SalesReport.tsx` - Horizontal bar chart (Product Launched: 233, Ongoing: 23, Sold: 482)
  - `PromotionalCard.tsx` - Green gradient CTA card with "Update to Siohioma+" button
- ✅ **3-Column Dashboard Layout**:
  - Left: Transaction list
  - Middle: Revenue chart + Sales Report
  - Right: Total View Performance + Promotional Card
- ✅ **Date Range Picker** - Shows "January 2024 - May 2024"
- ✅ **Testing Agent Validation** - 100% frontend pass rate

### February 15, 2026 - GREEN THEME REDESIGN (Phase 1)
- ✅ **Dark Green Sidebar** (#1B4332) with updated navigation styling
- ✅ **Update Card** - Shows "Sales revenue increased 40% in 1 week" with mini bar chart
- ✅ **Net Income Card** - With +35% green trend badge
- ✅ **Total Return Card** - With -24% red trend badge ($32,000.00)
- ✅ **Updated Stat Cards** - Green-themed icons for Sales, Orders, Customers, Products
- ✅ **Green Carousel Banners** - Updated advert colors to match theme

### February 15, 2026 - Icon Fix Implementation
- ✅ **FIXED: Web Icon Rendering Issue** - Created unified Icon component using `lucide-react`
- ✅ Created `/app/frontend/src/components/Icon.tsx` - Cross-platform icon wrapper
- ✅ Updated WebSidebarLayout, dashboard, login pages with Icon component

### Earlier Sessions
- ✅ Advertisement Carousel Integration
- ✅ Tigo SMPP Integration (sandbox mode)
- ✅ Multi-language support (5 languages)

---

## Green Theme Color Palette
| Element | Color Code | Description |
|---------|------------|-------------|
| Sidebar Background | #1B4332 | Dark forest green |
| Primary Green | #40916C | Medium green |
| Light Green | #95D5B2 | Accent/text on dark |
| Accent/Warning | #E9A319 | Gold/amber accent |
| Card Backgrounds | #D8F3DC, #B7E4C7 | Light green tints |
| Success Trend | #10B981 | Green for positive |
| Error Trend | #DC2626 | Red for negative |

---

## Key Files
### Dashboard Components (NEW)
- `/app/frontend/src/components/dashboard/TotalViewPerformance.tsx`
- `/app/frontend/src/components/dashboard/TransactionList.tsx`
- `/app/frontend/src/components/dashboard/RevenueChart.tsx`
- `/app/frontend/src/components/dashboard/SalesReport.tsx`
- `/app/frontend/src/components/dashboard/PromotionalCard.tsx`
- `/app/frontend/src/components/dashboard/index.ts`

### Core Files
- `/app/frontend/src/components/Icon.tsx` - Unified icon component (lucide-react)
- `/app/frontend/src/components/WebSidebarLayout.tsx` - Dark green sidebar
- `/app/frontend/app/(tabs)/dashboard.tsx` - Main dashboard with WebDashboard component (line 931)
- `/app/frontend/app/(auth)/login.tsx` - Login page

---

## Priority Tasks

### P0 - Completed ✅
- [x] Tigo SMPP integration (sandbox mode working)
- [x] Advertisement backend API
- [x] Multi-language support (5 languages)
- [x] AdvertCarousel component
- [x] Carousel integration into dashboard
- [x] Web icon rendering fix
- [x] **GREEN THEME REDESIGN (COMPLETED)**
- [x] **FULL DASHBOARD REDESIGN (COMPLETED)** - All components matching reference
- [x] **MULTI-PRODUCT DASHBOARD (4/7 COMPLETE)** - RetailPro, Expenses, Loyalty, UniTxt

### P1 - In Progress
- [ ] **Apply ProductDashboard to remaining products**: Inventory, Invoicing, KwikPay
  - These have complex existing layouts with custom charts and functionality
  - May require careful integration to preserve existing features
- [ ] Language Selector integration (blocked - `import.meta` bundler error)

### P2 - Upcoming
- [ ] Deploy to VPN-connected server
- [ ] Test live SMS sending
- [ ] UniTxt admin dashboard for SMS campaigns

### P3 - Future/Backlog
- [ ] Production build for Expo web
- [ ] Refactor backend routes into separate files

---

## Known Issues
1. **Language Selector Bundler Error**: Importing `useLanguageStore` causes "Cannot use 'import.meta' outside a module" - requires metro.config.js investigation
2. **Pre-existing**: Console warning about deprecated shadow style props
3. **Pre-existing**: Some sidebar icons may appear as empty boxes (font loading issue)

---

## Testing Credentials
- **Admin User**: admin@fmcg.com / Admin@2025
- **Demo User**: demo@fmcg.com / Demo@2025
- **Preview URL**: https://unified-layout-sync.preview.emergentagent.com

---

## Test Reports
- `/app/test_reports/iteration_4.json` - Full dashboard redesign tests (100% pass)
- `/app/test_reports/iteration_3.json` - Green theme redesign tests (100% pass)
- `/app/test_reports/iteration_2.json` - Carousel feature tests (100% pass)
