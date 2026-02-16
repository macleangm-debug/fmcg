# RetailPro UI Interface Code Reference

This document provides the key code structure for the RetailPro dashboard UI that can be reused across other products.

## Key Files

### 1. WebSidebarLayout.tsx (`/app/frontend/src/components/WebSidebarLayout.tsx`)
This is the main layout wrapper that provides:
- **Themed Header Bar** - Product-specific color based on route
- **White Sidebar** - With themed accent colors for active items
- **Light Main Content Area** - #F5F5F0 background

**Key Theme Configuration:**
```tsx
const PRODUCT_THEMES: Record<string, { 
  primary: string; 
  primaryDark: string; 
  primaryLight: string;
  name: string;
}> = {
  dashboard: { primary: '#1B4332', primaryDark: '#0F2D21', primaryLight: '#D8F3DC', name: 'RetailPro' },
  unitxt: { primary: '#D97706', primaryDark: '#B45309', primaryLight: '#FEF3C7', name: 'UniTxt' },
  expenses: { primary: '#DC2626', primaryDark: '#B91C1C', primaryLight: '#FEE2E2', name: 'Expenses' },
  loyalty: { primary: '#DB2777', primaryDark: '#BE185D', primaryLight: '#FCE7F3', name: 'Loyalty' },
  inventory: { primary: '#1E40AF', primaryDark: '#1E3A8A', primaryLight: '#DBEAFE', name: 'Inventory' },
  invoicing: { primary: '#4F46E5', primaryDark: '#3730A3', primaryLight: '#E0E7FF', name: 'Invoicing' },
  kwikpay: { primary: '#047857', primaryDark: '#065F46', primaryLight: '#D1FAE5', name: 'KwikPay' },
};
```

**Sidebar Colors (Light sidebar with themed accents):**
```tsx
const dynamicSidebarBg = '#FFFFFF';
const dynamicSidebarText = '#6B7280';
const dynamicSidebarActiveText = productTheme.primary;
const dynamicSidebarActiveBg = productTheme.primaryLight;
const dynamicHeaderBg = productTheme.primary;
```

### 2. ProductDashboard.tsx (`/app/frontend/src/components/dashboard/ProductDashboard.tsx`)
Reusable dashboard component that accepts:
- `productId` - Determines theme colors
- `statsRow` - Metric cards configuration
- `adverts` - Carousel banner content
- Custom props for all dashboard sections

**Theme-Colored Elements:**
1. Hero card (`updateCard`) - Uses `theme.primary` background
2. Referral banner - Uses `theme.primary` background  
3. Action buttons - Uses `theme.primary` background
4. Charts - Uses `theme.primary` and `theme.primaryLight` colors
5. Active sidebar items - Uses `theme.primaryLight` background with `theme.primary` text

**Light-Background Elements:**
1. Page header - White (#FFFFFF)
2. Main content - Light (#F5F5F0)
3. Metric cards - White with border
4. Stat cards - White with themed icon backgrounds

### 3. Dashboard Components

**RevenueChart.tsx** - Bar chart with theme colors
```tsx
interface RevenueChartProps {
  themeColor?: string;       // Primary color for bars
  themeColorLight?: string;  // Light color for secondary bars
}
```

**TotalViewPerformance.tsx** - Pie chart with theme colors
```tsx
interface TotalViewPerformanceProps {
  themeColor?: string;
  themeColorLight?: string;
}
```

**TransactionList.tsx** - Transaction list with themed icons
**SalesReport.tsx** - Sales report with themed elements
**PromotionalCard.tsx** - Promo card with theme color

### 4. AdvertCarousel.tsx (`/app/frontend/src/components/AdvertCarousel.tsx`)
Carousel component for banners. Uses `background_color` from advert config.

**Default Adverts (from ProductDashboard):**
```tsx
const defaultAdverts: Advert[] = [
  {
    id: 'refer-earn',
    title: 'Refer & Earn $10',
    description: 'Invite friends and earn $10 credit!',
    background_color: theme.primary,  // Uses theme color
    text_color: '#FFFFFF',
  },
];
```

## How to Reuse

### Option 1: Use WebSidebarLayout + ProductDashboard
Create a layout file for your product:
```tsx
// app/yourproduct/_layout.tsx
import WebSidebarLayout from '../../src/components/WebSidebarLayout';

export default function YourProductLayout() {
  return (
    <WebSidebarLayout>
      <Slot />
    </WebSidebarLayout>
  );
}
```

Then use ProductDashboard in your index:
```tsx
// app/yourproduct/index.tsx
import ProductDashboard from '../../src/components/dashboard/ProductDashboard';

export default function YourProductDashboard() {
  return (
    <ProductDashboard
      productId="yourproduct"
      title="Dashboard"
      onNewAction={() => {}}
      newActionLabel="+ New Action"
      statsRow={[
        { label: 'Metric 1', value: '123', icon: 'cube', iconBg: '#D1FAE5', iconColor: '#10B981' },
      ]}
    />
  );
}
```

### Option 2: Copy the Theme Configuration
Add your product to PRODUCT_THEMES in both files:
```tsx
yourproduct: { 
  primary: '#YOUR_COLOR', 
  primaryDark: '#DARKER_SHADE', 
  primaryLight: '#LIGHTER_SHADE', 
  name: 'YourProduct' 
},
```

## Color Scheme Summary

| Element | Color |
|---------|-------|
| Header Bar | `theme.primary` |
| Sidebar Background | `#FFFFFF` |
| Sidebar Text | `#6B7280` |
| Sidebar Active Background | `theme.primaryLight` |
| Sidebar Active Text | `theme.primary` |
| Main Content Background | `#F5F5F0` |
| Cards Background | `#FFFFFF` |
| Card Borders | `#E5E7EB` |
| Hero Card | `theme.primary` |
| Referral Banner | `theme.primary` |
| Action Buttons | `theme.primary` |
| Chart Primary Color | `theme.primary` |
| Chart Secondary Color | `theme.primaryLight` |
