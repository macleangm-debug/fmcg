# FMCG Application - Product Requirements Document

## Original Problem Statement
Set up and preview the FMCG application from GitHub repository (`https://github.com/macleangm-debug/fmcg`) and integrate UniTxt Bulk SMS with Tigo Tanzania using SMPP protocol. Later expanded to include advertisement carousel integration and comprehensive dashboard UI redesign to match user reference design. Most recently, standardize all product pages (SSO Soko app suite) to use a unified `WebSidebarLayout` component for consistent UI - white/light backgrounds with themed headers and accent colors.

## Architecture
- **Frontend**: React Native Expo (running as web via `expo start --web`)
- **Backend**: Python FastAPI
- **Database**: MongoDB
- **Branch**: `conflict_050226_1426` (contains latest code)

## What's Been Implemented

### February 28, 2026 (Latest Session) - DASHBOARD & NEW SALE UI/UX IMPROVEMENTS ✅
- ✅ **P0 COMPLETED: Dashboard Quick Actions** - Added Quick Actions section with New Sale, Add Product, New Customer buttons
- ✅ **P0 COMPLETED: Dashboard Recent Activity Feed** - Shows timeline of recent orders with timestamps
- ✅ **P0 COMPLETED: Dashboard Top Selling Products** - Shows top 5 products with revenue and sales count
- ✅ **P0 COMPLETED: Enhanced Low Stock Alert** - Shows low stock products with CTA to link Inventory (disappears when linked)
- ✅ **P0 COMPLETED: New Sale Customer-First Flow** - Products only appear AFTER customer is selected (no walk-ins)
- ✅ **P0 COMPLETED: Customer Selection Modal** - Phone search with country code (+255), Add New Customer option
- ✅ **P0 COMPLETED: Browse Products & Scan Barcode** - Buttons appear after customer is selected
- ✅ **P0 COMPLETED: Ecosystem Upsell Banner** - Dynamic carousel showing unsubscribed SSO Soko products (UniTxt, Expenses, Loyalty)
- ✅ **P0 COMPLETED: Reusable CustomerSelectionModal Component** - Minimal fields (Name + Phone), progressive profiling support
- ✅ **New Dashboard Components Created**:
  - `QuickActions.tsx` - 3-button row for common tasks
  - `TodaySummaryCard.tsx` - Today vs yesterday comparison with goal progress
  - `LowStockAlert.tsx` - Enhanced alert with inventory CTA
  - `RecentActivityFeed.tsx` - Timeline of recent activities
  - `TopSellingProducts.tsx` - Period toggle (today/week/month) with product rankings
  - `EcosystemUpsellBanner.tsx` - Cross-sell carousel for unsubscribed products
  - `CustomerSelectionModal.tsx` - Reusable customer search/add modal
- ✅ **Testing Agent Validation** - iteration_10.json (70% pass - blocked by sales_staff permissions, admin flow works)
- ✅ **P0 COMPLETED: UI Unification** - All 7 product pages now use the shared `WebSidebarLayout` component
- ✅ **Layout Migration**:
  - Updated `/app/frontend/app/unitxt/_layout.tsx` - Now uses WebSidebarLayout (was UnitxtSidebarLayout)
  - Updated `/app/frontend/app/inventory/_layout.tsx` - Now uses WebSidebarLayout (was InventorySidebarLayout)
  - Updated `/app/frontend/app/invoicing/_layout.tsx` - Now uses WebSidebarLayout (was InvoiceSidebarLayout)
  - Updated `/app/frontend/app/kwikpay/_layout.tsx` - Now uses WebSidebarLayout (was KwikPaySidebarLayout)
  - `/app/frontend/app/expenses/_layout.tsx` - Already using WebSidebarLayout
  - `/app/frontend/app/loyalty/_layout.tsx` - Already using WebSidebarLayout
- ✅ **Deprecated Files Removed**:
  - Deleted `/app/frontend/src/components/UnitxtSidebarLayout.tsx`
  - Deleted `/app/frontend/src/components/InventorySidebarLayout.tsx`
  - Deleted `/app/frontend/src/components/InvoiceSidebarLayout.tsx`
  - Deleted `/app/frontend/src/components/KwikPaySidebarLayout.tsx`
- ✅ **Testing Agent Validation** - 100% frontend pass rate (iteration_7.json)
- ✅ **All 7 Products Themed**:
  - RetailPro (Dark Green #1B4332 / #0F2D21)
  - Inventory (Blue #1E40AF / #1E3A8A)
  - Invoicing (Indigo #4F46E5 / #3730A3)
  - KwikPay (Emerald #047857 / #065F46)
  - UniTxt (Amber #D97706 / #B45309)
  - Expenses (Red #DC2626 / #B91C1C)
  - Loyalty (Pink #DB2777 / #BE185D)
- ✅ **White Text Contrast** - All text on colored backgrounds uses white (#FFFFFF) for readability
- ✅ **Dynamic Theme Detection** - `getProductTheme()` function detects product from URL segments
- ✅ **Testing Agent Validation** - 100% frontend pass rate (iteration_6.json)

### February 16, 2026 (Earlier) - UNIVERSAL DASHBOARD LAYOUT
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
### Dashboard Components (NEW - Feb 28, 2026)
- `/app/frontend/src/components/dashboard/QuickActions.tsx` - Quick action buttons
- `/app/frontend/src/components/dashboard/TodaySummaryCard.tsx` - Today's performance card
- `/app/frontend/src/components/dashboard/LowStockAlert.tsx` - Enhanced low stock alert with inventory CTA
- `/app/frontend/src/components/dashboard/RecentActivityFeed.tsx` - Activity timeline
- `/app/frontend/src/components/dashboard/TopSellingProducts.tsx` - Top products with period toggle
- `/app/frontend/src/components/dashboard/EcosystemUpsellBanner.tsx` - Cross-sell carousel for SSO Soko products
- `/app/frontend/src/components/CustomerSelectionModal.tsx` - Reusable customer search/add modal (Name + Phone only)

### Dashboard Components (EXISTING)
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
- `/app/frontend/app/(tabs)/cart.tsx` - New Sale page with customer-first flow
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
- [x] **FULL-BLEED THEMING (COMPLETED)** - Theme color covers entire sidebar, header, and dashboard background for all 7 products
- [x] **RETAILPRO COMPREHENSIVE TESTING (COMPLETED Feb 17, 2026)** - Backend APIs 100% pass, Frontend 95% pass, 9 test orders created, pytest suite at `/app/backend/tests/test_retailpro_apis.py`
- [x] **PRODUCT-SPECIFIC CAROUSEL CONTENT (COMPLETED Feb 17, 2026)** - 16 adverts seeded with product-specific content for all 7 products, auto-fetch from API with theme color override
- [x] **DASHBOARD UI/UX IMPROVEMENTS (COMPLETED Feb 28, 2026)** - Quick Actions, Recent Activity, Top Selling Products, Enhanced Low Stock Alert
- [x] **NEW SALE CUSTOMER-FIRST FLOW (COMPLETED Feb 28, 2026)** - No walk-ins, mandatory customer selection before browsing products

### P1 - In Progress
- [ ] **Product Switcher Bug** - 9-dot grid click not triggering "Start Free Trial" modal for unsubscribed apps
- [ ] **Tigo SMS Testing** - User deferred ("We will test later"), requires VPN access
- [ ] Language Selector integration (blocked - `import.meta` bundler error)
- [ ] UniTxt admin dashboard for SMS campaigns

### P2 - Future/Backlog
- [ ] Deploy to VPN-connected server
- [ ] Test live SMS sending
- [ ] Fix sales_staff/front_desk roles customer permissions

### P3 - Future/Backlog
- [ ] Production build for Expo web
- [ ] Refactor backend routes into separate files
- [ ] Refactor 4,890-line dashboard.tsx into smaller components

---

## Known Issues
1. **Language Selector Bundler Error**: Importing `useLanguageStore` causes "Cannot use 'import.meta' outside a module" - requires metro.config.js investigation
2. **Minor - `/api/locations` API**: Returns 400 error in console - non-critical
3. **Minor - subscriptionApi.getCurrent**: Console error "is not a function" - non-critical
4. **TransactionList Mock Data**: Component uses hardcoded mock data for demonstration
5. **Pre-existing**: Console warning about deprecated shadow style props
6. **Pre-existing**: Some sidebar icons may appear as empty boxes (font loading issue)

---

## Testing Credentials
- **Admin User**: admin@fmcg.com / Admin@2025
- **Demo User**: demo@fmcg.com / Demo@2025
- **Preview URL**: https://retailpro-new-sale.preview.emergentagent.com

---

## Test Reports
- `/app/test_reports/iteration_10.json` - **Dashboard & New Sale UI/UX Testing (Feb 28, 2026)** - Quick Actions, Recent Activity, Customer-First flow verified (admin works, sales_staff blocked by permissions)
- `/app/test_reports/iteration_9.json` - **Product-Specific Carousel Testing** - 16 adverts seeded for all 7 products
- `/app/test_reports/iteration_8.json` - **RetailPro Comprehensive Testing (100% backend, 95% frontend pass)** - Auth, Products, Categories, Customers, Orders, Dashboard all verified
- `/app/test_reports/iteration_7.json` - **UI Standardization tests (100% pass)** - All 7 products verified with WebSidebarLayout
- `/app/test_reports/iteration_6.json` - Full-bleed product theming tests (100% pass)
- `/app/test_reports/iteration_5.json` - Multi-product dashboard tests (100% pass)
- `/app/test_reports/iteration_4.json` - Full dashboard redesign tests (100% pass)
- `/app/test_reports/iteration_3.json` - Green theme redesign tests (100% pass)
- `/app/test_reports/iteration_2.json` - Carousel feature tests (100% pass)

---

## Product Theme Configuration (PRODUCT_THEMES in WebSidebarLayout.tsx)
| Product | Primary | primaryDark (sidebar/bg) | primaryLight | Status |
|---------|---------|--------------------------|--------------|--------|
| RetailPro | #1B4332 | #0F2D21 | #D8F3DC | ✅ Full-bleed |
| Inventory | #1E40AF | #1E3A8A | #DBEAFE | ✅ Full-bleed |
| Invoicing | #4F46E5 | #3730A3 | #E0E7FF | ✅ Full-bleed |
| KwikPay | #047857 | #065F46 | #D1FAE5 | ✅ Full-bleed |
| UniTxt | #D97706 | #B45309 | #FEF3C7 | ✅ Full-bleed |
| Expenses | #DC2626 | #B91C1C | #FEE2E2 | ✅ Full-bleed |
| Loyalty | #DB2777 | #BE185D | #FCE7F3 | ✅ Full-bleed |

---

## Updated Files (February 16, 2026 - Full-Bleed Theming)
- `/app/frontend/src/components/WebSidebarLayout.tsx` - **UPDATED**: Added PRODUCT_THEMES config, getProductTheme() function, dynamic sidebar/header/content theming
- `/app/frontend/src/components/dashboard/ProductDashboard.tsx` - **UPDATED**: Full-bleed background with glass-morphism cards, white text for contrast
- `/app/frontend/app/expenses/index.tsx` - Uses ProductDashboard with red theme
- `/app/frontend/app/loyalty/index.tsx` - Uses ProductDashboard with pink theme
- `/app/frontend/app/unitxt/index.tsx` - Uses ProductDashboard with amber theme
- `/app/frontend/app/loyalty/index.tsx` - Uses ProductDashboard with pink theme
- `/app/frontend/app/unitxt/index.tsx` - Uses ProductDashboard with amber theme
- `/app/frontend/src/components/dashboard/index.ts` - Exports ProductDashboard
