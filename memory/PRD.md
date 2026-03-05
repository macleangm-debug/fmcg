# FMCG Application - Product Requirements Document

## Original Problem Statement
Set up and preview the FMCG application from GitHub repository (`https://github.com/macleangm-debug/fmcg`) and integrate UniTxt Bulk SMS with Tigo Tanzania using SMPP protocol. Later expanded to include advertisement carousel integration and comprehensive dashboard UI redesign to match user reference design. Most recently, standardize all product pages (SSO Soko app suite) to use a unified `WebSidebarLayout` component for consistent UI - white/light backgrounds with themed headers and accent colors.

## Architecture
- **Frontend**: React Native Expo (running as web via `expo start --web`)
- **Backend**: Python FastAPI
- **Database**: MongoDB
- **Branch**: `conflict_050226_1426` (contains latest code)

## What's Been Implemented

### March 2, 2026 (Session 5) - JUST-IN-TIME PROMPTS COMPLETE ✅
- ✅ **JIT Contextual Prompts Feature (COMPLETED)** - Implemented "Just-in-Time" contextual prompts to guide users through settings
  - Created reusable `JustInTimePrompts.tsx` component with modal overlay, icon, title, description, primary/secondary buttons, and skip link
  - Added `useJustInTimePrompt()` hook for managing prompt state
  - Implemented AsyncStorage tracking with `jit_prompts_shown` key to remember shown prompts
  - Three prompt types configured:
    - `first_sale_complete` - Triggers after completing first sale (suggests receipt printer setup)
    - `offline_detected` - Triggers when going offline without offline mode enabled
    - `first_product_add` - Triggers after adding first product (suggests SKU format setup)
  - Integrated into cart.tsx (offline_detected, first_sale_complete)
  - Integrated into admin/products.tsx (first_product_add)
  - Integrated into mobile products.tsx (first_product_add)
- ✅ **Quick Export Dropdown (COMPLETED Mar 2, 2026)** - Added dropdown arrow on Export button for one-click PDF/CSV downloads without modal
  - Split Export button into main action + dropdown toggle
  - "Quick Export" dropdown with Download PDF, Download Excel (CSV), and "Export with Preview..." options
  - PDF opens print dialog, CSV downloads directly
  - Maintains existing Export modal for preview functionality
- ✅ **Responsive Modal Pattern (COMPLETED Mar 2, 2026)** - Implemented mobile-first modal behavior
  - Mobile (phones): Bottom sheet that slides up from the bottom with drag handle
  - Desktop/Tablet: Centered modal (standard behavior)
  - Created reusable `ResponsiveModal.tsx` component at `/app/frontend/src/components/common/`
  - Created `useResponsiveModal.ts` hook at `/app/frontend/src/hooks/`
  - Updated key modals to use responsive pattern:
    - `WebModal.tsx` - Core modal component used for Add Product, Add Category, Add Staff, etc.
    - `ExportReportModal.tsx` - Reports export modal
    - `ConfirmationModal.tsx` - All confirmation dialogs (delete, warning, etc.)
    - `CustomerSelectionModal.tsx` - Customer selection in checkout flow
  - Animation support with spring animation for smooth slide-up effect
  - Safe area padding for mobile devices
- ✅ **Testing Verified** - iteration_19.json (100% frontend pass rate)

### March 2, 2026 (Session 4) - E2E ORDER FLOW & OFFLINE INTEGRATION ✅
- ✅ **E2E Order Flow Tested** - Full order flow from login to checkout verified (iteration_18.json)
  - Admin login shows correct "ADMIN" role
  - Customer selection and creation works
  - Product browser loads and caching works
  - Order creation successful (ORD-000011)
- ✅ **Enhanced Offline Mode Integration**:
  - Products now cached in IndexedDB when loaded online
  - Products loaded from cache when offline
  - Orders queued in both legacy offlineStore AND new OfflineDB for redundancy
  - Automatic cache refresh on product load
- ✅ **Backend Refactoring Assessment** - Noted that routes already partially modularized in /app/backend/routes/
  - Full refactoring deferred due to risk/complexity

### March 2, 2026 (Session 3) - SKU CONNECTION & SESSION FIX ✅
- ✅ **Verified Bulk Import SKU Connection** - Already connected to backend via `businessSettingsApi.get()` (fetches sku_format, sku_prefix, sku_digits)
- ✅ **Added /api/auth/me Endpoint** - New backend endpoint to refresh user data from database
  - Returns current user with fresh role, email, name from DB
  - Used by authStore.loadUser() to validate session on app load
- ✅ **Fixed Session Persistence Issue** - authStore.loadUser() now calls /api/auth/me to validate token and refresh user data
  - Previously used stale cached data which could show wrong role
  - Now validates token and fetches fresh user data from backend
- ✅ **Fixed Role Display** - WebSidebarLayout now shows actual role from user object
  - Changed from `user?.role || 'sales_staff'` to `user?.role || 'guest'`
  - Display shows empty string while loading instead of defaulting to SALES_STAFF
  - User header now correctly shows "ADMIN" for admin@fmcg.com

### March 2, 2026 (Session 2) - BUG FIXES & WIZARD IMPROVEMENTS ✅
- ✅ **Fixed Offline Toggle Error** - Changed from `setOfflineModeEnabled(value)` to `updateSettings({ enabled: value })` to match offlineStore API
- ✅ **Fixed Pending Transactions Display** - Changed from `pendingTransactions` to `pendingOperations` to match store structure
- ✅ **Improved Setup Wizard** - Wizard now stays visible as a floating guide banner when user clicks "Set Up Now"
  - Green banner shows "Step X of 3: [Step Name]" with guidance text
  - "Next Step" button to progress through setup steps
  - X button to dismiss the guide
  - User can complete settings while seeing the guide

### March 2, 2026 - REPORTS PAGE REDESIGN & SETTINGS SIMPLIFICATION ✅
- ✅ **REPORTS PAGE IMPROVEMENTS**:
  - Prominent date range badge with green background (`#D8F3DC`)
  - Dynamic date calculation per period (Today shows single date, Week/Month/Quarter/Year show ranges)
  - Tab-specific content for each report type:
    - **Overview**: KPIs, Revenue Trend chart, Payment Methods pie, Top Products
    - **Products**: Items Sold, Categories, Top Sellers, Category Performance bars
    - **Staff**: Staff count, Orders, Revenue, Staff Leaderboard with rankings
    - **Customers**: New customers, Order metrics, Customer Insights cards
    - **Payments**: Payment totals, Distribution pie chart, Payment Details breakdown
  - Export button text dynamically changes per tab ("Export Products", "Export Staff", etc.)
- ✅ **SETTINGS PAGE SIMPLIFICATION**:
  - **Wizard-style onboarding** for first-time users (4 steps with progress dots)
  - **Visual card-based layout** for Essential Settings (Business Profile, Currency & Tax, Receipts, Staff)
  - **Progressive disclosure** with collapsible "Advanced Settings" section
  - **View mode toggle** in top right (Simple ↔ Advanced)
  - Setup progress card (0/3 completion indicator)
  - "Need Help?" section with Contact Support button
- ✅ **Testing Agent Validation** - iteration_16.json (100% frontend pass)

### March 1, 2026 (Session 2) - REPORTS INTERACTIVITY & OFFLINE MODE ✅
- ✅ **P0 COMPLETED: Import.meta Error Fix** - Fixed "Cannot use import.meta outside a module" error
  - Updated `/app/frontend/metro.config.js` with `config.resolver.unstable_enablePackageExports = false`
  - This allows dexie and other ESM packages to work correctly in Expo Web
- ✅ **P0 COMPLETED: Reports Page Interactivity** - All filters and tabs now work
  - Period filters (Today, Week, Month, Quarter, Year, Custom) are clickable and trigger data refresh
  - Report tabs (Overview, Products, Staff, Customers, Payments) switch views
  - Fixed `useEffect` dependency to properly trigger `fetchReports` on filter change
- ✅ **P0 COMPLETED: Settings Page Crash Fixes** - Fixed null safety issues
  - Fixed `useLocalSearchParams` crash with optional chaining
  - Fixed `useOfflineStore.getState().pendingTransactions.length` crash with null safety
- ✅ **P0 COMPLETED: Offline Mode Foundation** - Created offline mode services
  - `/app/frontend/src/services/OfflineDB.ts` - IndexedDB wrapper using Dexie for offline data storage
  - `/app/frontend/src/services/SyncService.ts` - Service for syncing offline mutations when back online
  - `/app/frontend/src/components/common/OfflineStatusIndicator.tsx` - Visual indicator for offline status
  - `/app/frontend/src/components/admin/settings/OfflineSettings.tsx` - Admin settings panel for offline mode
- ✅ **P0 COMPLETED: Offline Checkout Payment Restrictions** - Smart offline payment logic
  - Cash payments ALLOWED offline (creates order with OFF- prefix, syncs when online)
  - Card/Mobile Money/Credit payments BLOCKED offline (require internet for verification)
  - Yellow warning banner when offline: "You're offline. Only Cash payments are available."
  - Payment buttons show disabled state with "Offline" label and cloud-offline badge
  - handleCheckout validates payment method before proceeding offline
- ✅ **Settings POS Tab Shows Offline Mode** - Sync Status shows "Online • 0 pending orders"
- ✅ **Testing Agent Validation** - iteration_14.json, iteration_15.json (code review verified)

### March 1, 2026 - BULK IMPORT ENHANCEMENT & PRODUCT SWITCHER FIX ✅
- ✅ **P0 COMPLETED: Bulk Import on Products Page** - Green "Bulk Import" button added to Admin Products page
- ✅ **P0 COMPLETED: Excel File Support** - BulkProductImportModal supports .xlsx, .xls, and .csv file uploads
- ✅ **P0 COMPLETED: Download Excel Template** - Button to download a template file for bulk imports
- ✅ **P0 COMPLETED: Add Manually Tab** - Row-based product entry with validation
  - Fields: Product Name, SKU/Barcode, Price, Stock Qty, Category dropdown
  - "Add Another Product" button for multiple rows
  - Validation indicators per row
- ✅ **P1 COMPLETED: Product Switcher Bug Fix** - 9-dot Soko launcher now correctly opens "Start Free Trial" modal
  - Fixed pointer events interception issue with nested Pressable components
  - Updated to use TouchableOpacity with stopPropagation for app items
  - Trial modal shows app features, "Maybe Later" and "Start Free Trial" buttons
- ✅ **P1 COMPLETED: TransactionList Live Data** - Dashboard "Recent Orders" now shows real order data
  - Displays product names with "+X more" for multi-item orders
  - Shows real order dates, order numbers, and completion status
  - "View All Orders" button links to orders page
  - Empty state with helpful message when no orders exist
- ✅ **REPORTS PAGE FULL REDESIGN (Zoho-style)** - Complete analytics hierarchy overhaul
  - KPIs at top with % change indicators
  - Full-width Revenue Trend chart
  - Side-by-side Payment Methods (donut) + Top Products
  - Side-by-side Staff Performance + Category Performance (progress bars)
  - Business Insights summary section
  - Report tabs: Overview, Products, Staff, Customers, Payments
  - Reused ExportReportModal with PDF/Excel preview
- ✅ **SELECT CUSTOMER EMPTY STATE FIX** - Cleaner design matching EmptyState component
- ✅ **BULK IMPORT SKU FORMAT MODAL** - "Format" button opens configuration
  - Auto-generate, Custom Prefix, Manual entry options
  - Loads settings from business settings API
- ✅ **BULK IMPORT DROPDOWN Z-INDEX FIX** - Category dropdown displays correctly
- ✅ **Minor Fix: subscriptionApi.getCurrent** - Fixed API call to use correct method name (getStatus)
- ✅ **Testing Agent Validation** - iteration_12.json (85% frontend pass)

### February 28, 2026 (Session 2) - PROGRESSIVE PROFILING & BULK IMPORT ✅
- ✅ **P0 COMPLETED: Complete Profile Prompt** - Modal appears during checkout for customers without email
  - Shows "Complete Customer Profile?" with email input field
  - "Skip for Now" button continues checkout without email
  - "Save & Continue" button updates customer profile with email before checkout
  - Benefits banner explains value of adding email (digital receipts, promotions)
- ✅ **P0 COMPLETED: Bulk Product Import API** - Backend endpoint `/api/products/bulk`
  - Accepts array of products for batch creation
  - Auto-generates SKU if not provided (format: SKU-YYMMDD-XXXX)
  - Returns success/failed counts and created IDs
  - Requires admin/manager role
- ✅ **P0 COMPLETED: Customer GET/UPDATE Endpoints**
  - `GET /api/customers/{id}` - Fetch single customer by ID
  - `PUT /api/customers/{id}` - Update customer details (for progressive profiling)
- ✅ **P0 COMPLETED: Bulk Import UI Button** - Green "Bulk Import" button on New Sale page
- ✅ **NEW: BulkProductImportModal Component** - Created at `/app/frontend/src/components/products/BulkProductImportModal.tsx`
  - "Add Manually" tab with row-based product entry
  - "Import CSV" tab with paste area and template download
  - Category dropdown for each product row
  - Validation and error display
  - **FIXED**: Modal now renders correctly on React Native Web (was missing from correct return branch)
- ✅ **CLEAN EMPTY STATES**: Updated Products pages to hide search/stats when empty
  - Admin products page (`/admin/products`) - clean empty state
  - Inventory products page (`/inventory/products`) - clean empty state
  - Shows humorous "Your inventory's looking a bit... empty" message
  - Hides search bar, stats row, and category tabs when no products exist
- ✅ **Testing Agent Validation** - iteration_11.json (100% backend pass rate)

### February 28, 2026 (Session 1) - DASHBOARD & NEW SALE UI/UX IMPROVEMENTS ✅
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
- [x] **COMPLETE PROFILE PROMPT (COMPLETED Feb 28, 2026)** - Modal during checkout for customers without email, Skip/Save options
- [x] **BULK IMPORT API (COMPLETED Feb 28, 2026)** - POST /api/products/bulk endpoint with auto-SKU generation
- [x] **CUSTOMER API ENDPOINTS (COMPLETED Feb 28, 2026)** - GET/PUT /api/customers/{id} for progressive profiling
- [x] **BULK IMPORT UI ENHANCED (COMPLETED Mar 1, 2026)** - Modal accessible from Products page, supports Excel (.xlsx, .xls) and CSV upload, Download Template, Add Manually with row-based entry
- [x] **PRODUCT SWITCHER FIX (COMPLETED Mar 1, 2026)** - Fixed pointer events interception issue in Soko launcher - clicking unsubscribed apps now opens "Start Free Trial" modal correctly
- [x] **REPORTS PAGE INTERACTIVITY (COMPLETED Mar 1, 2026)** - Period filters and tabs now trigger data refresh, fixed useEffect dependencies
- [x] **IMPORT.META ERROR FIX (COMPLETED Mar 1, 2026)** - Fixed metro.config.js to disable package exports, resolves ESM/CJS conflicts
- [x] **SETTINGS PAGE CRASH FIX (COMPLETED Mar 1, 2026)** - Fixed null safety issues with useLocalSearchParams and useOfflineStore
- [x] **OFFLINE MODE FOUNDATION (COMPLETED Mar 1, 2026)** - Created OfflineDB, SyncService, OfflineStatusIndicator, OfflineSettings components
- [x] **OFFLINE CHECKOUT PAYMENT RESTRICTIONS (COMPLETED Mar 1, 2026)** - Cash-only offline, Card/Mobile require internet
- [x] **JUST-IN-TIME CONTEXTUAL PROMPTS (COMPLETED Mar 2, 2026)** - Reusable JIT prompt system with AsyncStorage tracking, integrated into cart and products pages

### P1 - Upcoming Tasks
- [x] **Test Full Wizard Flow E2E (COMPLETED Mar 2, 2026)** - Tested all 4 steps: Welcome -> Business Info -> Currency -> Complete
- [x] **Apply Responsive Modal to Remaining Modals (COMPLETED Mar 2, 2026)** - Updated SimpleSettingsView wizard
- [ ] **Tigo SMS Testing** - User deferred ("We will test later"), requires VPN access
- [ ] UniTxt admin dashboard for SMS campaigns

### P2 - Backlog Tasks
- [ ] **Backend server.py Refactoring** - 22,000+ lines with 357 inline routes. Should move routes to /routes directory. High risk, requires careful planning.
- [ ] **LanguageSelector Component** - Not currently used in app (no imports found). Issue may be resolved.
- [ ] Refactor oversized cart.tsx and dashboard.tsx

### P2 - Future/Backlog
- [ ] Fix LanguageSelector component crash (import.meta related - separate from main fix)
- [ ] Deploy to VPN-connected server
- [ ] Test live SMS sending
- [ ] Fix sales_staff/front_desk roles customer permissions

### P3 - Future/Backlog
- [ ] Production build for Expo web
- [ ] Refactor backend routes into separate files
- [ ] Refactor 4,890-line dashboard.tsx into smaller components

---

## Known Issues
1. **LanguageSelector Component**: May still cause issues in certain contexts - needs separate investigation
2. **Minor - `/api/locations` API**: Returns 400 error in console - non-critical
3. **Pre-existing**: Console warning about deprecated shadow style props
4. **Pre-existing**: Some sidebar icons may appear as empty boxes (font loading issue)

---

## Testing Credentials
- **Admin User**: admin@fmcg.com / Admin@2025
- **Demo User**: demo@fmcg.com / Demo@2025
- **Preview URL**: https://retailpro-ux.preview.emergentagent.com

---

## Test Reports
- `/app/test_reports/iteration_20.json` - **Responsive Modal Pattern (Mar 2, 2026)** - Verified desktop centered modals and mobile bottom sheets (100% frontend pass)
- `/app/test_reports/iteration_19.json` - **JIT Contextual Prompts (Mar 2, 2026)** - Just-in-Time prompts feature verified (100% frontend pass), component structure, AsyncStorage tracking, integration in cart.tsx and admin/products.tsx
- `/app/test_reports/iteration_18.json` - **E2E Order Flow Test (Mar 2, 2026)** - Full order creation flow verified with admin role fix (100% backend, 95% frontend pass, Order ORD-000011 created)
- `/app/test_reports/iteration_17.json` - **SKU Connection & Session Fix (Mar 2, 2026)** - Backend /api/auth/me returns correct role, wizard flow tested (100% backend, 85% frontend pass)
- `/app/test_reports/iteration_16.json` - **Reports Redesign & Settings Simplification (Mar 2, 2026)** - All tab-specific content, date range badge, wizard, card-based settings verified (100% frontend pass) (Cash allowed, Card/Mobile blocked offline)
- `/app/test_reports/iteration_14.json` - **Reports Interactivity & Offline Mode (Mar 1, 2026)** - Import.meta fix, Reports page filters/tabs, Settings POS offline mode all verified (100% backend, 100% frontend pass)
- `/app/test_reports/iteration_13.json` - **Pre-fix testing (Mar 1, 2026)** - Backend 100% pass, Frontend blocked by import.meta error (now fixed)
- `/app/test_reports/iteration_12.json` - **Bulk Import & Product Switcher Testing (Mar 1, 2026)** - Bulk Import button on Products page, Excel/CSV upload, Product Switcher trial modal all verified (85% frontend pass)
- `/app/test_reports/iteration_11.json` - **Progressive Profiling & Bulk Import Testing (Feb 28, 2026)** - Complete Profile modal, Bulk Import API, Customer GET/UPDATE all verified (100% backend pass)
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
