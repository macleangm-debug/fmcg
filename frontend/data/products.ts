// Product Data - Extracted from products/[id].tsx for better maintainability
// All 9 products: RetailPro, Inventory, Invoicing, UniTxt, Loyalty, KwikPay, Accounting, CRM, Expenses

export interface ProductMobileFirst {
  headline: string;
  subheadline: string;
  features: Array<{ icon: string; text: string }>;
}

export interface ProductFeature {
  icon: string;
  title: string;
  description: string;
  highlights: string[];
}

export interface ProductCaseStudy {
  company: string;
  logo: string;
  industry: string;
  location: string;
  quote: string;
  author: string;
  role: string;
  metrics: Array<{ value: string; label: string }>;
}

export interface InteractiveFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  demo: {
    steps: string[];
    metrics: string[];
  };
  integrations: string[];
}

export interface ProductData {
  id: string;
  name: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  color: string;
  gradientColors: [string, string];
  dashboardRoute: string;
  comingSoon: boolean;
  demoVideoId?: string;
  mobileFirst: ProductMobileFirst;
  stats: Array<{ value: string; label: string }>;
  features: ProductFeature[];
  interactiveFeatures?: InteractiveFeature[];
  demoScreens: Array<{ title: string; description: string }>;
  useCases: Array<{ title: string; description: string; icon: string }>;
  caseStudies: ProductCaseStudy[];
  demoSteps: Array<{ title: string; action: string; result: string }>;
  pricing: Array<{
    name: string;
    price: string;
    period: string;
    features: string[];
    highlighted?: boolean;
  }>;
}

// Enhanced Product Data with Demo Screens
const PRODUCTS: Record<string, any> = {
  'retail-pro': {
    id: 'retail_pro',
    name: 'RetailPro',
    tagline: 'Complete Retail Management Solution',
    heroTitle: 'Transform Your Retail Operations',
    heroSubtitle: 'All-in-one platform to manage sales, inventory, customers, and analytics with powerful insights that drive growth.',
    color: '#3B82F6',
    gradientColors: ['#3B82F6', '#2563EB'],
    dashboardRoute: '/(tabs)/dashboard',
    comingSoon: false,
    demoVideoId: 'dQw4w9WgXcQ',
    mobileFirst: {
      headline: 'Your Phone Is Your POS',
      subheadline: 'No cash registers. No expensive hardware. Just your smartphone.',
      features: [
        { icon: 'phone-portrait-outline', text: 'Works on any smartphone' },
        { icon: 'wifi-outline', text: 'Works offline, syncs when connected' },
        { icon: 'card-outline', text: 'Accept all payment methods' },
        { icon: 'print-outline', text: 'Print receipts via Bluetooth' },
      ]
    },
    stats: [
      { value: '15K+', label: 'Active Stores' },
      { value: '98%', label: 'Customer Satisfaction' },
      { value: '40%', label: 'Average Sales Increase' },
    ],
    features: [
      {
        icon: 'cart-outline',
        title: 'Smart Point of Sale',
        description: 'Lightning-fast checkout with support for multiple payment methods, barcode scanning, and real-time inventory updates.',
        highlights: ['Quick checkout', 'Multiple payments', 'Barcode scanning', 'Offline mode'],
      },
      {
        icon: 'cube-outline',
        title: 'Inventory Management',
        description: 'Real-time stock tracking across all locations with automated low-stock alerts and purchase order management.',
        highlights: ['Real-time tracking', 'Low stock alerts', 'Auto reorder', 'Batch updates'],
      },
      {
        icon: 'people-outline',
        title: 'Customer Insights',
        description: 'Build lasting relationships with customer profiles, purchase history, and personalized marketing tools.',
        highlights: ['Customer profiles', 'Purchase history', 'Segmentation', 'Loyalty points'],
      },
      {
        icon: 'analytics-outline',
        title: 'Advanced Analytics',
        description: 'Make data-driven decisions with comprehensive dashboards, sales reports, and predictive insights.',
        highlights: ['Sales dashboard', 'Trend analysis', 'Forecasting', 'Custom reports'],
      },
      {
        icon: 'business-outline',
        title: 'Multi-Location Support',
        description: 'Manage multiple stores from a single dashboard with centralized inventory and unified reporting.',
        highlights: ['Central dashboard', 'Stock transfer', 'Location reports', 'Staff management'],
      },
      {
        icon: 'phone-portrait-outline',
        title: 'Mobile Ready',
        description: 'Access your business from anywhere with our mobile app. Process sales, check inventory, and view reports on the go.',
        highlights: ['iOS & Android', 'Offline sync', 'Push notifications', 'Mobile reports'],
      },
    ],
    interactiveFeatures: [
      {
        id: 'pos',
        title: 'Smart Point of Sale',
        description: 'Process sales in seconds with barcode scanning, multiple payment methods, and instant receipts.',
        icon: 'cart-outline',
        demo: {
          steps: ['Scan product barcode', 'Add to cart', 'Apply discount code', 'Process payment', 'Print receipt'],
          metrics: ['3s avg checkout', '99.9% uptime', 'Works offline'],
        },
        integrations: ['Square', 'Stripe', 'PayPal', 'M-Pesa'],
      },
      {
        id: 'inventory',
        title: 'Real-time Inventory',
        description: 'Track stock across all locations. Get alerts before you run out.',
        icon: 'cube-outline',
        demo: {
          steps: ['View stock levels', 'Set reorder points', 'Transfer stock', 'Generate reports'],
          metrics: ['Multi-location', 'Low stock alerts', 'Batch updates'],
        },
        integrations: ['Shopify', 'WooCommerce', 'QuickBooks'],
      },
      {
        id: 'customers',
        title: 'Customer Intelligence',
        description: 'Build customer profiles, track purchase history, and run loyalty programs.',
        icon: 'people-outline',
        demo: {
          steps: ['Add customer', 'View history', 'Apply loyalty points', 'Send promotion'],
          metrics: ['360° view', 'Purchase history', 'Segmentation'],
        },
        integrations: ['Mailchimp', 'HubSpot', 'Salesforce'],
      },
      {
        id: 'analytics',
        title: 'Business Analytics',
        description: 'Real-time dashboards with sales trends, top products, and revenue forecasts.',
        icon: 'analytics-outline',
        demo: {
          steps: ['View dashboard', 'Filter by date', 'Export report', 'Set goals'],
          metrics: ['Live updates', 'Custom reports', 'Forecasting'],
        },
        integrations: ['Google Analytics', 'Mixpanel', 'Segment'],
      },
      {
        id: 'multi-store',
        title: 'Multi-Store Management',
        description: 'Manage multiple locations from one dashboard with centralized control.',
        icon: 'business-outline',
        demo: {
          steps: ['Add location', 'Assign staff', 'Set permissions', 'View reports'],
          metrics: ['Unlimited stores', 'Role-based access', 'Centralized data'],
        },
        integrations: ['Slack', 'Teams', 'Google Workspace'],
      },
      {
        id: 'receipts',
        title: 'Smart Receipts',
        description: 'Print thermal receipts via Bluetooth or send digital receipts via SMS/Email.',
        icon: 'receipt-outline',
        demo: {
          steps: ['Complete sale', 'Choose format', 'Send/Print', 'Track delivery'],
          metrics: ['Bluetooth printing', 'Digital receipts', 'Custom branding'],
        },
        integrations: ['Epson', 'Star Micronics', 'WhatsApp'],
      },
    ],
    demoScreens: [
      { title: 'Dashboard Overview', description: 'Real-time sales and inventory insights' },
      { title: 'Point of Sale', description: 'Quick and intuitive checkout process' },
      { title: 'Inventory Management', description: 'Track stock levels across locations' },
      { title: 'Customer Analytics', description: 'Understand your customer behavior' },
    ],
    useCases: [
      { title: 'Retail Stores', description: 'Clothing, electronics, and general retail', icon: 'shirt-outline' },
      { title: 'Supermarkets', description: 'High-volume transactions efficiently', icon: 'cart-outline' },
      { title: 'Salons & Spas', description: 'Appointments, services, and product sales', icon: 'cut-outline' },
      { title: 'Massage Parlours', description: 'Service bookings and membership tracking', icon: 'body-outline' },
      { title: 'Restaurants & Cafes', description: 'Table management and quick service', icon: 'restaurant-outline' },
      { title: 'Pharmacies', description: 'Regulated inventory with compliance', icon: 'medkit-outline' },
      { title: 'Chain Stores', description: 'Multi-location management', icon: 'business-outline' },
      { title: 'Fitness Centers', description: 'Memberships and class bookings', icon: 'fitness-outline' },
      { title: 'Auto Services', description: 'Car wash, repairs, and parts', icon: 'car-outline' },
    ],
    caseStudies: [
      {
        company: 'MegaMart Kenya',
        logo: 'storefront',
        industry: 'Supermarket Chain',
        location: 'Nairobi, Kenya',
        quote: 'RetailPro transformed how we operate 15 stores. Real-time inventory visibility reduced stockouts by 40%.',
        author: 'James Mwangi',
        role: 'CEO',
        metrics: [
          { value: '40%', label: 'Less Stockouts' },
          { value: '25%', label: 'Sales Increase' },
          { value: '15', label: 'Stores Connected' },
        ],
      },
      {
        company: 'TechZone Electronics',
        logo: 'hardware-chip',
        industry: 'Electronics Retail',
        location: 'Lagos, Nigeria',
        quote: 'The analytics dashboard gives us insights we never had before. We now make data-driven decisions daily.',
        author: 'Chidi Okonkwo',
        role: 'Operations Director',
        metrics: [
          { value: '60%', label: 'Faster Checkout' },
          { value: '$2M+', label: 'Revenue Tracked' },
          { value: '8', label: 'Locations' },
        ],
      },
      {
        company: 'Fashion Forward',
        logo: 'shirt',
        industry: 'Fashion Retail',
        location: 'Johannesburg, SA',
        quote: 'Customer loyalty features helped us build stronger relationships. Repeat purchases are up significantly.',
        author: 'Thandi Nkosi',
        role: 'Store Manager',
        metrics: [
          { value: '35%', label: 'More Repeat Customers' },
          { value: '50K+', label: 'Loyalty Members' },
          { value: '12', label: 'Boutiques' },
        ],
      },
    ],
    demoSteps: [
      { title: 'Quick Sale', action: 'Scan or search products', result: 'Items added to cart instantly' },
      { title: 'Apply Discount', action: 'Select customer loyalty tier', result: '15% discount applied automatically' },
      { title: 'Process Payment', action: 'Choose payment method', result: 'Transaction completed in 3 seconds' },
      { title: 'Update Inventory', action: 'Stock levels sync', result: 'All locations updated in real-time' },
    ],
    pricing: [
      { name: 'Starter', price: 'Free', period: '14 days', features: ['100 products', '1 user', 'Basic POS', 'Email support'] },
      { name: 'Business', price: '$29', period: '/month', features: ['Unlimited products', '5 users', 'Full analytics', 'Priority support'], highlighted: true },
      { name: 'Enterprise', price: '$99', period: '/month', features: ['Everything in Business', 'Unlimited users', 'API access', 'Dedicated support'] },
    ],
  },
  'inventory': {
    id: 'inventory',
    name: 'Inventory',
    tagline: 'Smart Stock Management',
    heroTitle: 'Never Run Out of Stock Again',
    heroSubtitle: 'Powerful inventory tracking with real-time alerts, comprehensive reporting, and seamless integration capabilities.',
    color: '#10B981',
    gradientColors: ['#10B981', '#059669'],
    dashboardRoute: '/inventory',
    comingSoon: false,
    demoVideoId: 'dQw4w9WgXcQ',
    mobileFirst: {
      headline: 'Your Phone Is Your Scanner',
      subheadline: 'No barcode scanners needed. Your camera does it all.',
      features: [
        { icon: 'camera-outline', text: 'Scan barcodes with your camera' },
        { icon: 'cloud-offline-outline', text: 'Count stock offline' },
        { icon: 'notifications-outline', text: 'Instant low-stock alerts' },
        { icon: 'sync-outline', text: 'Real-time multi-location sync' },
      ]
    },
    stats: [
      { value: '8K+', label: 'Warehouses' },
      { value: '35%', label: 'Less Stockouts' },
      { value: '2M+', label: 'Items Tracked' },
    ],
    features: [
      {
        icon: 'layers-outline',
        title: 'Real-time Tracking',
        description: 'Monitor stock levels across all locations in real-time with instant visibility into inventory movements.',
        highlights: ['Live updates', 'Multi-location', 'Movement history', 'Stock valuation'],
      },
      {
        icon: 'notifications-outline',
        title: 'Smart Alerts',
        description: 'Automated notifications when stock reaches minimum levels with intelligent reorder suggestions.',
        highlights: ['Low stock alerts', 'Reorder points', 'Email/SMS alerts', 'Custom thresholds'],
      },
      {
        icon: 'barcode-outline',
        title: 'Barcode & QR Support',
        description: 'Quick stock updates with barcode and QR code scanning. Print labels directly from the system.',
        highlights: ['Barcode scanning', 'QR support', 'Label printing', 'Batch scanning'],
      },
      {
        icon: 'time-outline',
        title: 'Movement History',
        description: 'Complete audit trail of all stock movements with detailed timestamps and user tracking.',
        highlights: ['Full audit trail', 'User tracking', 'Movement types', 'Export logs'],
      },
      {
        icon: 'people-outline',
        title: 'Supplier Management',
        description: 'Manage vendor relationships, track purchase orders, and automate procurement workflows.',
        highlights: ['Vendor profiles', 'Purchase orders', 'Lead times', 'Performance tracking'],
      },
      {
        icon: 'cloud-upload-outline',
        title: 'Bulk Operations',
        description: 'Import and export inventory data in bulk. Support for CSV, Excel, and API integrations.',
        highlights: ['CSV import', 'Excel export', 'API sync', 'Scheduled imports'],
      },
    ],
    interactiveFeatures: [
      {
        id: 'tracking',
        title: 'Real-time Tracking',
        description: 'Monitor stock levels across warehouses with instant visibility.',
        icon: 'layers-outline',
        demo: {
          steps: ['Scan incoming stock', 'Update levels', 'Track movements', 'Audit inventory'],
          metrics: ['Real-time sync', 'Multi-warehouse', 'Audit trail'],
        },
        integrations: ['SAP', 'Oracle', 'NetSuite'],
      },
      {
        id: 'alerts',
        title: 'Smart Alerts',
        description: 'Automated notifications when stock reaches minimum levels.',
        icon: 'notifications-outline',
        demo: {
          steps: ['Set threshold', 'Get alert', 'Auto reorder', 'Track delivery'],
          metrics: ['Custom rules', 'SMS/Email', 'Auto-reorder'],
        },
        integrations: ['Slack', 'Teams', 'WhatsApp'],
      },
      {
        id: 'barcode',
        title: 'Barcode & QR Scanning',
        description: 'Scan barcodes with your phone camera. Print labels instantly.',
        icon: 'barcode-outline',
        demo: {
          steps: ['Open scanner', 'Scan code', 'Update stock', 'Print label'],
          metrics: ['Phone camera', 'Bulk scan', 'Label printing'],
        },
        integrations: ['Zebra', 'DYMO', 'Brother'],
      },
      {
        id: 'transfers',
        title: 'Stock Transfers',
        description: 'Move inventory between locations with full tracking.',
        icon: 'swap-horizontal-outline',
        demo: {
          steps: ['Select items', 'Choose destination', 'Generate slip', 'Confirm receipt'],
          metrics: ['Inter-warehouse', 'Transit tracking', 'Auto-update'],
        },
        integrations: ['ShipStation', 'Shippo', 'EasyPost'],
      },
      {
        id: 'reports',
        title: 'Inventory Reports',
        description: 'Comprehensive reports on stock value, turnover, and aging.',
        icon: 'document-text-outline',
        demo: {
          steps: ['Select report type', 'Set parameters', 'Generate', 'Export'],
          metrics: ['20+ reports', 'Scheduled emails', 'PDF/Excel'],
        },
        integrations: ['QuickBooks', 'Xero', 'Google Sheets'],
      },
      {
        id: 'suppliers',
        title: 'Supplier Management',
        description: 'Manage vendor relationships and automate purchase orders.',
        icon: 'people-circle-outline',
        demo: {
          steps: ['Add supplier', 'Set lead time', 'Create PO', 'Track delivery'],
          metrics: ['Vendor portal', 'Auto-PO', 'Performance tracking'],
        },
        integrations: ['Alibaba', 'TradeGecko', 'Ordoro'],
      },
    ],
    demoScreens: [
      { title: 'Stock Dashboard', description: 'Overview of all inventory levels' },
      { title: 'Product Catalog', description: 'Manage your product database' },
      { title: 'Stock Movements', description: 'Track all inventory changes' },
      { title: 'Reports & Analytics', description: 'Detailed inventory insights' },
    ],
    useCases: [
      { title: 'Warehouses', description: 'Manage large-scale inventory operations', icon: 'home-outline' },
      { title: 'E-commerce', description: 'Sync inventory across sales channels', icon: 'globe-outline' },
      { title: 'Manufacturing', description: 'Track raw materials and finished goods', icon: 'construct-outline' },
      { title: 'Distribution', description: 'Multi-warehouse fulfillment', icon: 'git-branch-outline' },
      { title: 'Food & Beverage', description: 'Expiry tracking and FIFO', icon: 'restaurant-outline' },
      { title: 'Healthcare', description: 'Medical supply tracking', icon: 'fitness-outline' },
    ],
    caseStudies: [
      {
        company: 'QuickShip Logistics',
        logo: 'airplane',
        industry: 'Distribution',
        location: 'Accra, Ghana',
        quote: 'Real-time stock visibility across 5 warehouses eliminated our overselling problem completely.',
        author: 'Kwame Asante',
        role: 'Logistics Manager',
        metrics: [
          { value: '99.5%', label: 'Order Accuracy' },
          { value: '5', label: 'Warehouses' },
          { value: '50K+', label: 'SKUs Managed' },
        ],
      },
      {
        company: 'FreshMart Foods',
        logo: 'leaf',
        industry: 'Food Distribution',
        location: 'Kampala, Uganda',
        quote: 'The expiry tracking feature reduced our waste by 60%. The ROI was immediate.',
        author: 'Grace Nakamya',
        role: 'Operations Head',
        metrics: [
          { value: '60%', label: 'Less Waste' },
          { value: '3', label: 'Cold Stores' },
          { value: '200+', label: 'Products' },
        ],
      },
    ],
    demoSteps: [
      { title: 'Receive Stock', action: 'Scan incoming shipment', result: 'Inventory updated instantly' },
      { title: 'Check Levels', action: 'View dashboard', result: 'See all locations at once' },
      { title: 'Get Alerts', action: 'Low stock detected', result: 'Auto-reorder triggered' },
      { title: 'Transfer Stock', action: 'Move between locations', result: 'Both locations updated' },
    ],
    pricing: [
      { name: 'Starter', price: 'Free', period: '14 days', features: ['500 items', '1 location', 'Basic alerts', 'Email support'] },
      { name: 'Business', price: '$19', period: '/month', features: ['Unlimited items', '5 locations', 'Advanced reports', 'Priority support'], highlighted: true },
      { name: 'Enterprise', price: '$59', period: '/month', features: ['Everything in Business', 'Unlimited locations', 'API access', 'Custom integrations'] },
    ],
  },
  'invoicing': {
    id: 'invoicing',
    name: 'Invoicing',
    tagline: 'Professional Invoicing Made Simple',
    heroTitle: 'Get Paid Faster, Effortlessly',
    heroSubtitle: 'Create beautiful invoices in seconds, automate reminders, and track payments with powerful financial tools.',
    color: '#8B5CF6',
    gradientColors: ['#8B5CF6', '#7C3AED'],
    dashboardRoute: '/invoicing',
    comingSoon: false,
    demoVideoId: 'dQw4w9WgXcQ',
    mobileFirst: {
      headline: 'Invoice From Your Phone',
      subheadline: 'Create professional invoices in 30 seconds. No laptop required.',
      features: [
        { icon: 'document-text-outline', text: 'Beautiful invoice templates' },
        { icon: 'share-outline', text: 'Send via WhatsApp or Email' },
        { icon: 'card-outline', text: 'Accept mobile payments' },
        { icon: 'notifications-outline', text: 'Auto payment reminders' },
      ]
    },
    stats: [
      { value: '40%', label: 'Faster Payments' },
      { value: '5M+', label: 'Invoices Sent' },
      { value: '$500M+', label: 'Processed' },
    ],
    features: [
      {
        icon: 'create-outline',
        title: 'Beautiful Templates',
        description: 'Professional invoice templates with your branding. Customize colors, fonts, and layouts to match your brand.',
        highlights: ['Custom branding', 'Multiple templates', 'PDF export', 'Logo upload'],
      },
      {
        icon: 'alarm-outline',
        title: 'Auto Reminders',
        description: 'Automated payment reminders at configurable intervals. Reduce late payments without manual follow-up.',
        highlights: ['Smart scheduling', 'Custom messages', 'Escalation rules', 'Payment tracking'],
      },
      {
        icon: 'card-outline',
        title: 'Online Payments',
        description: 'Let clients pay invoices online with credit cards or bank transfers. Integrated payment gateway.',
        highlights: ['Card payments', 'Bank transfer', 'Payment links', 'Partial payments'],
      },
      {
        icon: 'globe-outline',
        title: 'Multi-Currency',
        description: 'Send invoices in any currency with automatic exchange rate conversion. Perfect for international business.',
        highlights: ['150+ currencies', 'Auto conversion', 'Local formatting', 'Multi-language'],
      },
      {
        icon: 'laptop-outline',
        title: 'Client Portal',
        description: 'Give clients access to view and pay invoices online. Track invoice views and download receipts.',
        highlights: ['Invoice viewing', 'Online payments', 'Receipt download', 'Message thread'],
      },
      {
        icon: 'analytics-outline',
        title: 'Financial Reports',
        description: 'Track revenue, outstanding payments, and cash flow with comprehensive financial dashboards.',
        highlights: ['Revenue reports', 'Aging reports', 'Tax summaries', 'Cash flow'],
      },
    ],
    interactiveFeatures: [
      {
        id: 'create',
        title: 'Beautiful Invoices',
        description: 'Create professional invoices with your branding in seconds.',
        icon: 'create-outline',
        demo: {
          steps: ['Select template', 'Add line items', 'Customize branding', 'Send invoice'],
          metrics: ['Custom branding', '20+ templates', 'Multi-currency'],
        },
        integrations: ['Xero', 'QuickBooks', 'FreshBooks'],
      },
      {
        id: 'payments',
        title: 'Online Payments',
        description: 'Let clients pay invoices online with cards or mobile money.',
        icon: 'card-outline',
        demo: {
          steps: ['Send invoice', 'Client clicks link', 'Selects payment', 'You get paid'],
          metrics: ['1-click pay', 'Auto receipts', 'Partial payments'],
        },
        integrations: ['Stripe', 'PayPal', 'M-Pesa', 'Flutterwave'],
      },
      {
        id: 'reminders',
        title: 'Auto Reminders',
        description: 'Automated payment reminders reduce late payments by 40%.',
        icon: 'alarm-outline',
        demo: {
          steps: ['Set schedule', 'Customize message', 'Auto-send', 'Track opens'],
          metrics: ['40% faster', 'Custom schedules', 'Escalation'],
        },
        integrations: ['Gmail', 'Outlook', 'SendGrid'],
      },
      {
        id: 'recurring',
        title: 'Recurring Invoices',
        description: 'Set up automatic recurring invoices for subscriptions.',
        icon: 'repeat-outline',
        demo: {
          steps: ['Create template', 'Set frequency', 'Auto-generate', 'Auto-send'],
          metrics: ['Weekly/Monthly', 'Auto-charge', 'Prorations'],
        },
        integrations: ['Stripe Billing', 'Chargebee', 'Recurly'],
      },
      {
        id: 'quotes',
        title: 'Quotes & Estimates',
        description: 'Send professional quotes that convert to invoices with one click.',
        icon: 'pricetag-outline',
        demo: {
          steps: ['Create quote', 'Send to client', 'Client approves', 'Convert to invoice'],
          metrics: ['E-signatures', 'Version tracking', '1-click convert'],
        },
        integrations: ['DocuSign', 'HelloSign', 'PandaDoc'],
      },
      {
        id: 'client-portal',
        title: 'Client Portal',
        description: 'Give clients a portal to view invoices and download receipts.',
        icon: 'laptop-outline',
        demo: {
          steps: ['Invite client', 'Client logs in', 'View history', 'Pay online'],
          metrics: ['Self-service', 'Payment history', 'Document access'],
        },
        integrations: ['Custom domain', 'SSO', 'Branding'],
      },
    ],
    demoScreens: [
      { title: 'Invoice Dashboard', description: 'Track all invoices at a glance' },
      { title: 'Create Invoice', description: 'Beautiful, branded invoices' },
      { title: 'Payment Tracking', description: 'Monitor payment status' },
      { title: 'Client Management', description: 'Organize your client database' },
    ],
    useCases: [
      { title: 'Freelancers', description: 'Professional invoices for independent work', icon: 'person-outline' },
      { title: 'Agencies', description: 'Project-based billing and retainers', icon: 'people-outline' },
      { title: 'Consultants', description: 'Hourly and fixed-fee billing', icon: 'briefcase-outline' },
      { title: 'Law Firms', description: 'Time tracking and legal billing', icon: 'scale-outline' },
      { title: 'Medical Practices', description: 'Patient billing and insurance', icon: 'medkit-outline' },
      { title: 'Construction', description: 'Progress billing and estimates', icon: 'construct-outline' },
      { title: 'Creative Studios', description: 'Design and media billing', icon: 'color-palette-outline' },
      { title: 'IT Services', description: 'Managed services billing', icon: 'server-outline' },
    ],
    caseStudies: [
      {
        company: 'DigitalCraft Agency',
        logo: 'color-palette',
        industry: 'Creative Agency',
        location: 'Cape Town, SA',
        quote: 'Our collection rate improved by 45% after implementing automated reminders. Clients love the professional look.',
        author: 'Nomsa Dlamini',
        role: 'Finance Director',
        metrics: [
          { value: '45%', label: 'Better Collection' },
          { value: '3 days', label: 'Avg Payment Time' },
          { value: '500+', label: 'Clients Billed' },
        ],
      },
      {
        company: 'LegalEase Associates',
        logo: 'scale',
        industry: 'Law Firm',
        location: 'Nairobi, Kenya',
        quote: 'Time tracking integration made billing so much easier. We bill 30% more hours now that nothing slips through.',
        author: 'Peter Kimani',
        role: 'Managing Partner',
        metrics: [
          { value: '30%', label: 'More Billable Hours' },
          { value: '$1.2M', label: 'Annual Billing' },
          { value: '15', label: 'Lawyers' },
        ],
      },
    ],
    demoSteps: [
      { title: 'Create Invoice', action: 'Select template and client', result: 'Professional invoice generated' },
      { title: 'Add Items', action: 'Add services or products', result: 'Totals calculated automatically' },
      { title: 'Send to Client', action: 'Click send button', result: 'Invoice delivered via email' },
      { title: 'Get Paid', action: 'Client clicks pay link', result: 'Payment received instantly' },
    ],
    pricing: [
      { name: 'Starter', price: 'Free', period: '14 days', features: ['10 invoices/mo', '1 user', 'Basic templates', 'Email support'] },
      { name: 'Business', price: '$15', period: '/month', features: ['Unlimited invoices', '5 users', 'Custom branding', 'Auto reminders'], highlighted: true },
      { name: 'Enterprise', price: '$49', period: '/month', features: ['Everything in Business', 'White label', 'API access', 'Priority support'] },
    ],
  },
  'bulk-sms': {
    id: 'bulk_sms',
    name: 'UniTxt',
    tagline: 'Mass Communication Made Easy',
    heroTitle: 'Reach Thousands Instantly',
    heroSubtitle: 'Powerful bulk messaging platform for marketing campaigns, notifications, and customer engagement.',
    color: '#F59E0B',
    gradientColors: ['#F59E0B', '#D97706'],
    dashboardRoute: '/unitxt',
    comingSoon: false,
    demoVideoId: 'dQw4w9WgXcQ',
    mobileFirst: {
      headline: 'Bulk SMS From Your Palm',
      subheadline: 'No computer? No problem. Send 10,000 messages from your phone.',
      features: [
        { icon: 'chatbubbles-outline', text: 'Send to thousands instantly' },
        { icon: 'people-outline', text: 'Manage contacts on mobile' },
        { icon: 'bar-chart-outline', text: 'Track delivery in real-time' },
        { icon: 'time-outline', text: 'Schedule campaigns anywhere' },
      ]
    },
    stats: [
      { value: '99.5%', label: 'Delivery Rate' },
      { value: '50M+', label: 'Messages Sent' },
      { value: '< 3s', label: 'Avg Delivery' },
    ],
    features: [
      {
        icon: 'send-outline',
        title: 'Bulk Messaging',
        description: 'Send thousands of messages in seconds with high-speed delivery and real-time status tracking.',
        highlights: ['High throughput', 'Priority routing', 'Scheduled sends', 'Templates'],
      },
      {
        icon: 'people-outline',
        title: 'Contact Management',
        description: 'Organize contacts into groups, import from CSV, and segment audiences for targeted campaigns.',
        highlights: ['Contact groups', 'CSV import', 'Segmentation', 'Opt-out management'],
      },
      {
        icon: 'calendar-outline',
        title: 'Campaign Scheduling',
        description: 'Schedule messages for optimal delivery times. Set up recurring campaigns and automated workflows.',
        highlights: ['Date/time scheduling', 'Timezone support', 'Recurring campaigns', 'Drip sequences'],
      },
      {
        icon: 'checkmark-done-outline',
        title: 'Delivery Reports',
        description: 'Real-time delivery status for every message. Track sent, delivered, and failed messages.',
        highlights: ['Live tracking', 'Delivery receipts', 'Failure reasons', 'Export reports'],
      },
      {
        icon: 'person-outline',
        title: 'Personalization',
        description: 'Personalize messages with customer data. Dynamic fields for names, orders, and custom data.',
        highlights: ['Merge fields', 'Custom variables', 'Dynamic content', 'A/B testing'],
      },
      {
        icon: 'code-slash-outline',
        title: 'Developer API',
        description: 'RESTful API for seamless integration. SDKs for popular languages and webhook support.',
        highlights: ['REST API', 'Webhooks', 'SDKs', 'Documentation'],
      },
    ],
    interactiveFeatures: [
      {
        id: 'send',
        title: 'Mass Messaging',
        description: 'Send thousands of SMS in seconds with 99.5% delivery rate.',
        icon: 'send-outline',
        demo: {
          steps: ['Import contacts', 'Compose message', 'Schedule send', 'Track delivery'],
          metrics: ['99.5% delivery', '50K/batch', '<3s delivery'],
        },
        integrations: ['Twilio', "Africa's Talking", 'Tigo'],
      },
      {
        id: 'personalize',
        title: 'Personalization',
        description: 'Personalize each message with customer names and data.',
        icon: 'person-outline',
        demo: {
          steps: ['Add merge fields', 'Preview message', 'Test send', 'Launch campaign'],
          metrics: ['Merge fields', 'A/B testing', 'Templates'],
        },
        integrations: ['Salesforce', 'HubSpot', 'Zoho'],
      },
      {
        id: 'analytics',
        title: 'Delivery Analytics',
        description: 'Real-time delivery reports for every message.',
        icon: 'bar-chart-outline',
        demo: {
          steps: ['View dashboard', 'Filter campaigns', 'Export data', 'Compare results'],
          metrics: ['Real-time', 'Detailed reports', 'Export CSV'],
        },
        integrations: ['Google Sheets', 'Tableau', 'Power BI'],
      },
      {
        id: 'scheduling',
        title: 'Campaign Scheduling',
        description: 'Schedule messages for optimal delivery times.',
        icon: 'calendar-outline',
        demo: {
          steps: ['Set date/time', 'Choose timezone', 'Preview schedule', 'Confirm'],
          metrics: ['Timezone aware', 'Recurring', 'Optimal timing'],
        },
        integrations: ['Google Calendar', 'Outlook', 'Calendly'],
      },
      {
        id: 'contacts',
        title: 'Contact Management',
        description: 'Organize contacts into groups for targeted messaging.',
        icon: 'people-outline',
        demo: {
          steps: ['Import CSV', 'Create groups', 'Add tags', 'Build segments'],
          metrics: ['Unlimited contacts', 'Smart segments', 'Opt-out'],
        },
        integrations: ['Mailchimp', 'ActiveCampaign', 'Constant Contact'],
      },
      {
        id: 'api',
        title: 'Developer API',
        description: 'RESTful API for sending SMS from your applications.',
        icon: 'code-slash-outline',
        demo: {
          steps: ['Get API key', 'Read docs', 'Test sandbox', 'Go live'],
          metrics: ['REST API', 'Webhooks', 'SDKs available'],
        },
        integrations: ['Node.js', 'Python', 'PHP', 'Java'],
      },
    ],
    demoScreens: [
      { title: 'Campaign Dashboard', description: 'Overview of all campaigns' },
      { title: 'Compose Message', description: 'Create and personalize messages' },
      { title: 'Contact Groups', description: 'Manage your audience' },
      { title: 'Analytics', description: 'Track campaign performance' },
    ],
    useCases: [
      { title: 'Marketing Campaigns', description: 'Promotional offers and flash sales', icon: 'megaphone-outline' },
      { title: 'Order Notifications', description: 'Shipping and delivery updates', icon: 'cube-outline' },
      { title: 'Appointment Reminders', description: 'Reduce no-shows by 80%', icon: 'calendar-outline' },
      { title: 'Payment Reminders', description: 'Invoice and due date alerts', icon: 'cash-outline' },
      { title: 'OTP & Verification', description: 'Secure login codes', icon: 'shield-checkmark-outline' },
      { title: 'Event Invitations', description: 'RSVPs and event updates', icon: 'ticket-outline' },
      { title: 'Customer Surveys', description: 'Feedback collection via SMS', icon: 'chatbox-outline' },
      { title: 'Emergency Alerts', description: 'Critical notifications', icon: 'alert-circle-outline' },
    ],
    caseStudies: [
      {
        company: 'ShopRite Express',
        logo: 'cart',
        industry: 'Retail Chain',
        location: 'Accra, Ghana',
        quote: 'Our flash sale campaigns now reach 100K customers in seconds. Response rates tripled compared to email.',
        author: 'Kofi Mensah',
        role: 'Marketing Manager',
        metrics: [
          { value: '100K', label: 'Messages/Campaign' },
          { value: '35%', label: 'Response Rate' },
          { value: '3x', label: 'ROI vs Email' },
        ],
      },
      {
        company: 'MediCare Clinics',
        logo: 'medical',
        industry: 'Healthcare',
        location: 'Dar es Salaam, TZ',
        quote: 'Appointment reminders reduced our no-show rate from 25% to just 5%. The ROI was immediate.',
        author: 'Dr. Amina Hassan',
        role: 'Operations Director',
        metrics: [
          { value: '80%', label: 'Fewer No-Shows' },
          { value: '10K', label: 'Monthly Reminders' },
          { value: '12', label: 'Clinic Locations' },
        ],
      },
    ],
    demoSteps: [
      { title: 'Import Contacts', action: 'Upload CSV or connect CRM', result: 'Contacts organized into groups' },
      { title: 'Compose Message', action: 'Write and personalize', result: 'Preview with merge fields' },
      { title: 'Schedule & Send', action: 'Set delivery time', result: 'Campaign queued for delivery' },
      { title: 'Track Results', action: 'Monitor dashboard', result: 'Real-time delivery stats' },
    ],
    pricing: [
      { name: 'Pay-as-you-go', price: '$0.02', period: '/SMS', features: ['No monthly fees', 'Basic dashboard', 'Email support', 'API access'] },
      { name: 'Business', price: '$0.015', period: '/SMS', features: ['Volume discounts', 'Priority delivery', 'Advanced analytics', 'Priority support'], highlighted: true },
      { name: 'Enterprise', price: 'Custom', period: 'pricing', features: ['Best rates', 'Dedicated line', 'SLA guarantee', 'Account manager'] },
    ],
  },
  'loyalty': {
    id: 'loyalty',
    name: 'Loyalty',
    tagline: 'Customer Retention & Rewards',
    heroTitle: 'Keep Customers Coming Back',
    heroSubtitle: 'Build lasting relationships with points, rewards, and loyalty programs that increase customer lifetime value.',
    color: '#EC4899',
    gradientColors: ['#EC4899', '#DB2777'],
    dashboardRoute: '/loyalty',
    comingSoon: false,
    demoVideoId: 'dQw4w9WgXcQ',
    mobileFirst: {
      headline: 'Loyalty Without The Hardware',
      subheadline: 'No card readers needed. Scan, earn, redeem - all on your phone.',
      features: [
        { icon: 'qr-code-outline', text: 'QR code check-ins' },
        { icon: 'gift-outline', text: 'Instant reward redemption' },
        { icon: 'trending-up-outline', text: 'Track customer visits' },
        { icon: 'megaphone-outline', text: 'Push promo notifications' },
      ]
    },
    stats: [
      { value: '25%', label: 'Repeat Purchase Increase' },
      { value: '1M+', label: 'Rewards Redeemed' },
      { value: '3K+', label: 'Programs Active' },
    ],
    features: [
      {
        icon: 'star-outline',
        title: 'Points System',
        description: 'Flexible points program where customers earn rewards for purchases, referrals, and engagement.',
        highlights: ['Earn rules', 'Point multipliers', 'Bonus events', 'Expiration rules'],
      },
      {
        icon: 'ribbon-outline',
        title: 'Reward Tiers',
        description: 'Create VIP tiers with exclusive benefits. Motivate customers to reach higher levels.',
        highlights: ['Multiple tiers', 'Tier benefits', 'Auto-upgrade', 'Tier badges'],
      },
      {
        icon: 'gift-outline',
        title: 'Reward Catalog',
        description: 'Set up a catalog of rewards from discounts to free products and exclusive experiences.',
        highlights: ['Custom rewards', 'Discount codes', 'Free products', 'Experiences'],
      },
      {
        icon: 'people-outline',
        title: 'Referral Program',
        description: 'Turn customers into advocates with referral bonuses. Track referrals and reward both parties.',
        highlights: ['Referral links', 'Dual rewards', 'Tracking', 'Viral campaigns'],
      },
      {
        icon: 'calendar-outline',
        title: 'Birthday Rewards',
        description: 'Automated birthday rewards to delight customers on their special day.',
        highlights: ['Auto-send', 'Custom offers', 'Reminder emails', 'Birthday month'],
      },
      {
        icon: 'analytics-outline',
        title: 'Retention Analytics',
        description: 'Track customer retention, lifetime value, and program ROI with detailed analytics.',
        highlights: ['Retention rate', 'LTV tracking', 'Program ROI', 'Segment analysis'],
      },
    ],
    interactiveFeatures: [
      {
        id: 'points',
        title: 'Points System',
        description: 'Customers earn points on every purchase, redeemable for rewards.',
        icon: 'star-outline',
        demo: {
          steps: ['Customer makes purchase', 'Points auto-added', 'Reach threshold', 'Redeem reward'],
          metrics: ['Auto-earn', 'Multipliers', 'Expiry rules'],
        },
        integrations: ['RetailPro', 'Shopify', 'Square'],
      },
      {
        id: 'tiers',
        title: 'VIP Tiers',
        description: 'Create Bronze, Silver, Gold tiers with exclusive benefits.',
        icon: 'ribbon-outline',
        demo: {
          steps: ['Set tiers', 'Define benefits', 'Auto-upgrade', 'Celebrate milestone'],
          metrics: ['Unlimited tiers', 'Auto-upgrade', 'Tier badges'],
        },
        integrations: ['Mailchimp', 'Klaviyo', 'Braze'],
      },
      {
        id: 'referrals',
        title: 'Referral Program',
        description: 'Turn customers into advocates with referral rewards.',
        icon: 'share-social-outline',
        demo: {
          steps: ['Share link', 'Friend signs up', 'Both rewarded', 'Track referrals'],
          metrics: ['Dual rewards', 'Viral loops', 'Tracking'],
        },
        integrations: ['Facebook', 'Twitter', 'WhatsApp'],
      },
      {
        id: 'rewards',
        title: 'Reward Catalog',
        description: 'Create a catalog of rewards from discounts to free products.',
        icon: 'gift-outline',
        demo: {
          steps: ['Add rewards', 'Set point cost', 'Customer browses', 'Redeem'],
          metrics: ['Custom rewards', 'Digital codes', 'Partner rewards'],
        },
        integrations: ['Amazon', 'Gift cards', 'Local partners'],
      },
      {
        id: 'birthday',
        title: 'Birthday Rewards',
        description: 'Automated birthday rewards to delight customers.',
        icon: 'balloon-outline',
        demo: {
          steps: ['Collect DOB', 'Set reward', 'Auto-send', 'Track redemption'],
          metrics: ['Auto-send', 'Custom offers', 'Birthday month'],
        },
        integrations: ['SMS', 'Email', 'Push notifications'],
      },
      {
        id: 'analytics',
        title: 'Loyalty Analytics',
        description: 'Track retention, lifetime value, and program ROI.',
        icon: 'trending-up-outline',
        demo: {
          steps: ['View metrics', 'Segment customers', 'Track ROI', 'Optimize'],
          metrics: ['LTV tracking', 'Cohort analysis', 'ROI reports'],
        },
        integrations: ['Google Analytics', 'Mixpanel', 'Amplitude'],
      },
    ],
    demoScreens: [
      { title: 'Program Dashboard', description: 'Overview of loyalty metrics' },
      { title: 'Member Management', description: 'Manage loyalty members' },
      { title: 'Rewards Setup', description: 'Configure rewards catalog' },
      { title: 'Analytics', description: 'Track program performance' },
    ],
    useCases: [
      { title: 'Retail Stores', description: 'Points-per-purchase programs', icon: 'storefront-outline' },
      { title: 'Coffee Shops', description: 'Buy 10, get 1 free programs', icon: 'cafe-outline' },
      { title: 'Restaurants', description: 'Dining rewards and VIP perks', icon: 'restaurant-outline' },
      { title: 'Salons & Spas', description: 'Service loyalty and referrals', icon: 'cut-outline' },
      { title: 'Fitness Centers', description: 'Membership rewards', icon: 'fitness-outline' },
      { title: 'Hotels', description: 'Guest loyalty tiers', icon: 'bed-outline' },
      { title: 'E-commerce', description: 'Online shopping rewards', icon: 'cart-outline' },
      { title: 'Gas Stations', description: 'Fuel rewards programs', icon: 'car-outline' },
    ],
    caseStudies: [
      {
        company: 'Java House',
        logo: 'cafe',
        industry: 'Coffee Chain',
        location: 'Nairobi, Kenya',
        quote: 'Our loyalty program increased repeat visits by 40%. Customers love collecting stars for free drinks.',
        author: 'Sarah Wanjiku',
        role: 'Head of Marketing',
        metrics: [
          { value: '40%', label: 'More Repeat Visits' },
          { value: '85K', label: 'Active Members' },
          { value: '25', label: 'Locations' },
        ],
      },
      {
        company: 'GlamourBox Salons',
        logo: 'sparkles',
        industry: 'Beauty Services',
        location: 'Lagos, Nigeria',
        quote: 'The referral program brought 30% of our new clients. Our best customers are now our best marketers.',
        author: 'Chioma Eze',
        role: 'Founder & CEO',
        metrics: [
          { value: '30%', label: 'Clients from Referrals' },
          { value: '2x', label: 'Customer LTV' },
          { value: '8', label: 'Salon Branches' },
        ],
      },
    ],
    demoSteps: [
      { title: 'Customer Signs Up', action: 'Quick registration at checkout', result: 'Member profile created' },
      { title: 'Earn Points', action: 'Complete purchase', result: 'Points added automatically' },
      { title: 'Reach Tier', action: 'Accumulate points', result: 'Unlock VIP benefits' },
      { title: 'Redeem Rewards', action: 'Choose from catalog', result: 'Enjoy free products or discounts' },
    ],
    pricing: [
      { name: 'Starter', price: 'Free', period: '14 days', features: ['500 members', 'Basic rewards', 'Email support', 'Points system'] },
      { name: 'Business', price: '$19', period: '/month', features: ['Unlimited members', 'Tier system', 'Referrals', 'Analytics'], highlighted: true },
      { name: 'Enterprise', price: '$49', period: '/month', features: ['Everything in Business', 'API access', 'White label', 'Custom integrations'] },
    ],
  },
  'kwikpay': {
    id: 'kwikpay',
    name: 'KwikPay',
    tagline: 'Unified Payment Processing',
    heroTitle: 'Accept Payments Your Way',
    heroSubtitle: 'Secure, unified payment solution supporting cards, mobile money, and bank transfers with competitive rates.',
    color: '#00D4FF',
    gradientColors: ['#00D4FF', '#0096C7'],
    dashboardRoute: '/kwikpay',
    comingSoon: true,
    mobileFirst: {
      headline: 'Your Phone Is Your Card Machine',
      subheadline: 'No POS terminal needed. Accept all payments on your smartphone.',
      features: [
        { icon: 'card-outline', text: 'Tap-to-pay NFC support' },
        { icon: 'phone-portrait-outline', text: 'Mobile money integration' },
        { icon: 'qr-code-outline', text: 'QR code payments' },
        { icon: 'shield-checkmark-outline', text: 'Bank-grade security' },
      ]
    },
    stats: [
      { value: '99.9%', label: 'Uptime' },
      { value: '< 1s', label: 'Processing Time' },
      { value: '$0', label: 'Setup Fee' },
    ],
    features: [
      {
        icon: 'card-outline',
        title: 'Card Payments',
        description: 'Accept Visa, Mastercard, and local cards with industry-leading security and fraud protection.',
        highlights: ['All major cards', '3D Secure', 'Fraud detection', 'PCI compliant'],
      },
      {
        icon: 'phone-portrait-outline',
        title: 'Mobile Money',
        description: 'M-Pesa, Airtel Money, and other mobile wallets for customers who prefer mobile payments.',
        highlights: ['M-Pesa', 'Airtel Money', 'Tigo Pesa', 'Other wallets'],
      },
      {
        icon: 'wallet-outline',
        title: 'Payouts',
        description: 'Send money to customers, vendors, and partners with bulk payout capabilities.',
        highlights: ['Bank transfers', 'Mobile payouts', 'Bulk payments', 'Scheduled payouts'],
      },
      {
        icon: 'link-outline',
        title: 'Payment Links',
        description: 'Generate payment links to collect money via SMS, email, or social media without a website.',
        highlights: ['Custom links', 'QR codes', 'Expiry dates', 'Tracking'],
      },
      {
        icon: 'sync-outline',
        title: 'Recurring Billing',
        description: 'Set up subscriptions and recurring payments with automatic retries and dunning.',
        highlights: ['Subscriptions', 'Auto-retry', 'Dunning', 'Prorations'],
      },
      {
        icon: 'code-slash-outline',
        title: 'Developer API',
        description: 'RESTful APIs with comprehensive documentation, SDKs, and sandbox for testing.',
        highlights: ['REST API', 'Webhooks', 'SDKs', 'Sandbox'],
      },
    ],
    interactiveFeatures: [
      {
        id: 'accept',
        title: 'Accept Payments',
        description: 'Cards, mobile money, bank transfers - all in one platform.',
        icon: 'wallet-outline',
        demo: {
          steps: ['Customer initiates payment', 'Choose method', 'Verify', 'Complete'],
          metrics: ['All methods', '<1s processing', 'PCI compliant'],
        },
        integrations: ['Visa', 'Mastercard', 'M-Pesa', 'Airtel Money'],
      },
      {
        id: 'payouts',
        title: 'Fast Payouts',
        description: 'Send money to vendors, staff, or customers instantly.',
        icon: 'cash-outline',
        demo: {
          steps: ['Enter recipient', 'Set amount', 'Confirm', 'Instant transfer'],
          metrics: ['Instant', 'Bulk payouts', 'Scheduled'],
        },
        integrations: ['Banks', 'Mobile wallets', 'PayPal'],
      },
      {
        id: 'links',
        title: 'Payment Links',
        description: 'Generate payment links to collect money via SMS or WhatsApp.',
        icon: 'link-outline',
        demo: {
          steps: ['Create link', 'Share via SMS', 'Customer pays', 'You receive'],
          metrics: ['No website needed', 'QR codes', 'Expiry dates'],
        },
        integrations: ['WhatsApp', 'SMS', 'Email'],
      },
      {
        id: 'recurring',
        title: 'Recurring Payments',
        description: 'Set up subscriptions with automatic billing and retry logic.',
        icon: 'repeat-outline',
        demo: {
          steps: ['Create plan', 'Customer subscribes', 'Auto-charge', 'Manage'],
          metrics: ['Subscriptions', 'Smart retry', 'Dunning'],
        },
        integrations: ['Stripe', 'GoCardless', 'Chargebee'],
      },
      {
        id: 'checkout',
        title: 'Hosted Checkout',
        description: 'Beautiful, conversion-optimized checkout pages.',
        icon: 'storefront-outline',
        demo: {
          steps: ['Create checkout', 'Customize', 'Share link', 'Accept payments'],
          metrics: ['No-code', 'Mobile optimized', 'Custom branding'],
        },
        integrations: ['Shopify', 'WooCommerce', 'WordPress'],
      },
      {
        id: 'fraud',
        title: 'Fraud Protection',
        description: 'AI-powered fraud detection to protect your business.',
        icon: 'shield-checkmark-outline',
        demo: {
          steps: ['Transaction analyzed', 'Risk score assigned', 'Auto-block/Allow', 'Review'],
          metrics: ['99.9% accuracy', 'Real-time', 'Custom rules'],
        },
        integrations: ['3D Secure', 'Address verification', 'Device fingerprint'],
      },
    ],
    demoScreens: [
      { title: 'Payment Dashboard', description: 'Track all transactions' },
      { title: 'Checkout', description: 'Seamless payment experience' },
      { title: 'Payouts', description: 'Manage disbursements' },
      { title: 'Developer Console', description: 'API keys and webhooks' },
    ],
    useCases: [
      { title: 'E-commerce', description: 'Online store checkout', icon: 'cart-outline' },
      { title: 'Marketplaces', description: 'Split payments to vendors', icon: 'grid-outline' },
      { title: 'SaaS Platforms', description: 'Subscription billing', icon: 'cloud-outline' },
      { title: 'Food Delivery', description: 'Order payments and tips', icon: 'fast-food-outline' },
      { title: 'Ride Sharing', description: 'Driver payouts', icon: 'car-outline' },
      { title: 'Freelance Platforms', description: 'Escrow and milestones', icon: 'briefcase-outline' },
      { title: 'Schools', description: 'Fee collection', icon: 'school-outline' },
      { title: 'Utilities', description: 'Bill payments', icon: 'flash-outline' },
    ],
    caseStudies: [
      {
        company: 'Jumia Foods',
        logo: 'fast-food',
        industry: 'Food Delivery',
        location: 'Lagos, Nigeria',
        quote: 'KwikPay handles 50K daily transactions seamlessly. Mobile money integration was a game-changer for us.',
        author: 'Oluwaseun Adeyemi',
        role: 'Head of Payments',
        metrics: [
          { value: '50K', label: 'Daily Transactions' },
          { value: '99.9%', label: 'Uptime' },
          { value: '< 2s', label: 'Processing Time' },
        ],
      },
      {
        company: 'TutorAfrica',
        logo: 'school',
        industry: 'EdTech',
        location: 'Kampala, Uganda',
        quote: 'Parents can now pay school fees via mobile money. Collections improved by 60% in the first term.',
        author: 'Grace Nakimera',
        role: 'Finance Director',
        metrics: [
          { value: '60%', label: 'Better Collections' },
          { value: '200+', label: 'Schools' },
          { value: '$5M+', label: 'Processed Monthly' },
        ],
      },
    ],
    demoSteps: [
      { title: 'Customer Checkouts', action: 'Select payment method', result: 'M-Pesa, card, or bank' },
      { title: 'Secure Payment', action: 'Enter details', result: '3D Secure verification' },
      { title: 'Instant Confirmation', action: 'Payment processes', result: 'Receipt generated' },
      { title: 'Settlement', action: 'Funds transfer', result: 'Money in your account' },
    ],
    pricing: [
      { name: 'Standard', price: '2.9%', period: '+ $0.30', features: ['All payment methods', 'Instant settlements', 'Basic dashboard', 'Email support'] },
      { name: 'Business', price: '1.5%', period: '+ $0.25', features: ['Volume discounts', 'Priority support', 'Advanced analytics', 'Custom checkout'], highlighted: true },
      { name: 'Enterprise', price: 'Custom', period: 'pricing', features: ['Best rates', 'Dedicated support', 'SLA guarantee', 'Custom integrations'] },
    ],
  },
  'accounting': {
    id: 'accounting',
    name: 'Accounting',
    tagline: 'Simplified Business Accounting',
    heroTitle: 'Financial Clarity, Made Simple',
    heroSubtitle: 'Manage your finances with ease. Track expenses, generate reports, and stay tax-ready all year round.',
    color: '#06B6D4',
    gradientColors: ['#06B6D4', '#0891B2'],
    dashboardRoute: '/accounting',
    comingSoon: true,
    mobileFirst: {
      headline: 'Accounting In Your Pocket',
      subheadline: 'Snap receipts, track expenses, generate reports - no desktop needed.',
      features: [
        { icon: 'camera-outline', text: 'Snap & store receipts' },
        { icon: 'calculator-outline', text: 'Auto expense categorization' },
        { icon: 'document-text-outline', text: 'Generate reports on-the-go' },
        { icon: 'cloud-outline', text: 'Real-time sync across devices' },
      ]
    },
    stats: [
      { value: '10hrs', label: 'Saved Monthly' },
      { value: '99%', label: 'Accuracy' },
      { value: '5K+', label: 'Businesses' },
    ],
    features: [
      {
        icon: 'wallet-outline',
        title: 'Expense Tracking',
        description: 'Track and categorize all business expenses with receipt capture and automatic categorization.',
        highlights: ['Receipt capture', 'Auto-categorize', 'Expense rules', 'Mobile upload'],
      },
      {
        icon: 'git-compare-outline',
        title: 'Bank Reconciliation',
        description: 'Connect bank accounts for automatic transaction import and one-click reconciliation.',
        highlights: ['Bank feeds', 'Auto-match', 'Rule-based', 'Multi-bank'],
      },
      {
        icon: 'document-text-outline',
        title: 'Financial Reports',
        description: 'Generate P&L statements, balance sheets, and cash flow reports with a single click.',
        highlights: ['P&L', 'Balance sheet', 'Cash flow', 'Custom reports'],
      },
      {
        icon: 'calculator-outline',
        title: 'Tax Preparation',
        description: 'Stay tax-ready with automated tax calculations, reports, and export for your accountant.',
        highlights: ['Tax reports', 'VAT tracking', 'Export files', 'Audit trail'],
      },
      {
        icon: 'globe-outline',
        title: 'Multi-Currency',
        description: 'Handle transactions in any currency with automatic exchange rate conversion.',
        highlights: ['150+ currencies', 'Auto-rates', 'Gain/loss tracking', 'Consolidation'],
      },
      {
        icon: 'trending-up-outline',
        title: 'Budgeting',
        description: 'Set budgets, track performance, and get alerts when spending exceeds thresholds.',
        highlights: ['Budget setup', 'Variance tracking', 'Alerts', 'Forecasting'],
      },
    ],
    interactiveFeatures: [
      {
        id: 'bookkeeping',
        title: 'Easy Bookkeeping',
        description: 'Simple double-entry bookkeeping anyone can use.',
        icon: 'book-outline',
        demo: {
          steps: ['Record transaction', 'Auto-categorize', 'Review', 'Close period'],
          metrics: ['Auto-categorize', 'Bank rules', 'Simple UI'],
        },
        integrations: ['Banks', 'Credit cards', 'PayPal'],
      },
      {
        id: 'reconciliation',
        title: 'Bank Reconciliation',
        description: 'Connect bank accounts and reconcile transactions automatically.',
        icon: 'git-compare-outline',
        demo: {
          steps: ['Connect bank', 'Import transactions', 'Match entries', 'Reconcile'],
          metrics: ['Auto-import', 'Smart matching', 'Multi-bank'],
        },
        integrations: ['Plaid', 'Yodlee', 'MX'],
      },
      {
        id: 'reports',
        title: 'Financial Reports',
        description: 'P&L, Balance Sheet, Cash Flow with one click.',
        icon: 'pie-chart-outline',
        demo: {
          steps: ['Select report', 'Set date range', 'Generate', 'Export'],
          metrics: ['P&L', 'Balance Sheet', 'Cash Flow'],
        },
        integrations: ['Google Sheets', 'Excel', 'Tableau'],
      },
      {
        id: 'tax',
        title: 'Tax Preparation',
        description: 'Stay tax-ready with automated tax reports and VAT tracking.',
        icon: 'document-text-outline',
        demo: {
          steps: ['Track VAT', 'Generate reports', 'Export', 'File returns'],
          metrics: ['VAT tracking', 'Tax reports', 'Audit ready'],
        },
        integrations: ['TurboTax', 'H&R Block', 'Local authorities'],
      },
      {
        id: 'multicurrency',
        title: 'Multi-Currency',
        description: 'Handle transactions in any currency with auto conversion.',
        icon: 'globe-outline',
        demo: {
          steps: ['Add currency', 'Record transaction', 'Auto-convert', 'Report'],
          metrics: ['150+ currencies', 'Auto rates', 'Gain/Loss'],
        },
        integrations: ['XE', 'Open Exchange', 'Wise'],
      },
      {
        id: 'budgets',
        title: 'Budgeting',
        description: 'Set budgets and track performance against goals.',
        icon: 'trending-up-outline',
        demo: {
          steps: ['Create budget', 'Allocate funds', 'Track spending', 'Get alerts'],
          metrics: ['Dept budgets', 'Variance tracking', 'Forecasting'],
        },
        integrations: ['Adaptive Insights', 'Planful', 'Vena'],
      },
    ],
    demoScreens: [
      { title: 'Dashboard', description: 'Financial overview at a glance' },
      { title: 'Transactions', description: 'Track all income and expenses' },
      { title: 'Reports', description: 'Generate financial statements' },
      { title: 'Tax Center', description: 'Stay tax-ready' },
    ],
    useCases: [
      { title: 'Small Business', description: 'Simple bookkeeping', icon: 'business-outline' },
      { title: 'Freelancers', description: 'Track income and expenses', icon: 'person-outline' },
      { title: 'Startups', description: 'Financial visibility', icon: 'rocket-outline' },
      { title: 'Retail Stores', description: 'Sales and expense tracking', icon: 'storefront-outline' },
      { title: 'Professional Services', description: 'Client billing and expenses', icon: 'briefcase-outline' },
      { title: 'Non-Profits', description: 'Grant and donor accounting', icon: 'heart-outline' },
      { title: 'Property Management', description: 'Rental income tracking', icon: 'home-outline' },
      { title: 'Import/Export', description: 'Multi-currency transactions', icon: 'globe-outline' },
    ],
    caseStudies: [
      {
        company: 'Mama Mboga Collective',
        logo: 'leaf',
        industry: 'Agricultural Cooperative',
        location: 'Mombasa, Kenya',
        quote: 'Finally, bookkeeping we can understand! We track 200 farmer payments monthly without an accountant.',
        author: 'Fatuma Hassan',
        role: 'Cooperative Manager',
        metrics: [
          { value: '200+', label: 'Members Tracked' },
          { value: '10hrs', label: 'Saved Weekly' },
          { value: 'KES 2M', label: 'Monthly Turnover' },
        ],
      },
      {
        company: 'TechStart Ventures',
        logo: 'rocket',
        industry: 'Startup Accelerator',
        location: 'Lagos, Nigeria',
        quote: 'Investor reporting used to take days. Now we generate financial statements in minutes for all 15 portfolio companies.',
        author: 'Emeka Obi',
        role: 'CFO',
        metrics: [
          { value: '15', label: 'Companies Managed' },
          { value: '85%', label: 'Faster Reporting' },
          { value: '$5M+', label: 'Assets Tracked' },
        ],
      },
    ],
    demoSteps: [
      { title: 'Connect Bank', action: 'Link your bank account', result: 'Transactions imported automatically' },
      { title: 'Categorize', action: 'AI suggests categories', result: 'Expenses organized instantly' },
      { title: 'Reconcile', action: 'Match transactions', result: 'Books balanced with one click' },
      { title: 'Generate Reports', action: 'Select report type', result: 'P&L and balance sheet ready' },
    ],
    pricing: [
      { name: 'Starter', price: 'Free', period: '14 days', features: ['Basic bookkeeping', '1 user', 'Standard reports', 'Email support'] },
      { name: 'Business', price: '$25', period: '/month', features: ['Full accounting', '5 users', 'Tax reports', 'Bank feeds'], highlighted: true },
      { name: 'Enterprise', price: '$79', period: '/month', features: ['Everything in Business', 'Unlimited users', 'API access', 'Accountant access'] },
    ],
  },
  'crm': {
    id: 'crm',
    name: 'CRM',
    tagline: 'Customer Relationship Management',
    heroTitle: 'Build Stronger Relationships',
    heroSubtitle: 'Track leads, manage pipelines, and close more deals with intelligent sales automation.',
    color: '#6366F1',
    gradientColors: ['#6366F1', '#4F46E5'],
    dashboardRoute: '/crm',
    comingSoon: true,
    mobileFirst: {
      headline: 'Your Sales Office In Your Pocket',
      subheadline: 'Follow up, close deals, track pipeline - all from your phone.',
      features: [
        { icon: 'call-outline', text: 'One-tap client calls' },
        { icon: 'mail-outline', text: 'Quick follow-up emails' },
        { icon: 'location-outline', text: 'Check-in at meetings' },
        { icon: 'notifications-outline', text: 'Never miss a follow-up' },
      ]
    },
    stats: [
      { value: '30%', label: 'More Deals Closed' },
      { value: '2x', label: 'Sales Productivity' },
      { value: '50%', label: 'Less Admin Time' },
    ],
    features: [
      {
        icon: 'person-add-outline',
        title: 'Lead Management',
        description: 'Capture, score, and nurture leads from multiple sources with automated follow-ups.',
        highlights: ['Lead capture', 'Lead scoring', 'Auto-assign', 'Nurture workflows'],
      },
      {
        icon: 'funnel-outline',
        title: 'Sales Pipeline',
        description: 'Visual pipeline management with drag-and-drop stages and deal tracking.',
        highlights: ['Multiple pipelines', 'Stage management', 'Deal tracking', 'Forecasting'],
      },
      {
        icon: 'people-outline',
        title: 'Contact Database',
        description: 'Centralized contact database with full interaction history and relationship mapping.',
        highlights: ['Contact profiles', 'Interaction history', 'Companies', 'Relationships'],
      },
      {
        icon: 'flash-outline',
        title: 'Sales Automation',
        description: 'Automate repetitive tasks with workflows, email sequences, and task creation.',
        highlights: ['Workflows', 'Email sequences', 'Auto-tasks', 'Triggers'],
      },
      {
        icon: 'mail-outline',
        title: 'Email Integration',
        description: 'Two-way email sync with templates, tracking, and personalized sequences.',
        highlights: ['Email sync', 'Templates', 'Open tracking', 'Click tracking'],
      },
      {
        icon: 'analytics-outline',
        title: 'Sales Analytics',
        description: 'Track team performance, pipeline health, and revenue forecasts with detailed dashboards.',
        highlights: ['Performance', 'Pipeline reports', 'Forecasts', 'Leaderboards'],
      },
    ],
    interactiveFeatures: [
      {
        id: 'leads',
        title: 'Lead Management',
        description: 'Capture, score, and nurture leads from multiple sources.',
        icon: 'person-add-outline',
        demo: {
          steps: ['Capture lead', 'Score automatically', 'Assign to rep', 'Nurture'],
          metrics: ['Auto-capture', 'Lead scoring', 'Assignment rules'],
        },
        integrations: ['LinkedIn', 'Facebook Ads', 'Google Ads'],
      },
      {
        id: 'pipeline',
        title: 'Sales Pipeline',
        description: 'Visual pipeline with drag-and-drop deal management.',
        icon: 'funnel-outline',
        demo: {
          steps: ['Add deal', 'Move through stages', 'Track value', 'Close won'],
          metrics: ['Visual pipeline', 'Forecasting', 'Win rates'],
        },
        integrations: ['Slack', 'Teams', 'Zapier'],
      },
      {
        id: 'contacts',
        title: 'Contact Database',
        description: 'Centralized contacts with full interaction history.',
        icon: 'people-circle-outline',
        demo: {
          steps: ['Add contact', 'Log interactions', 'View timeline', 'Set tasks'],
          metrics: ['360° view', 'Activity timeline', 'Relationship mapping'],
        },
        integrations: ['Gmail', 'Outlook', 'LinkedIn'],
      },
      {
        id: 'email',
        title: 'Email Integration',
        description: 'Two-way email sync with templates and tracking.',
        icon: 'mail-outline',
        demo: {
          steps: ['Connect email', 'Send from CRM', 'Track opens', 'Auto-log'],
          metrics: ['Open tracking', 'Click tracking', 'Templates'],
        },
        integrations: ['Gmail', 'Outlook', 'SendGrid'],
      },
      {
        id: 'automation',
        title: 'Sales Automation',
        description: 'Automate follow-ups, task creation, and deal updates.',
        icon: 'flash-outline',
        demo: {
          steps: ['Set trigger', 'Define action', 'Test workflow', 'Activate'],
          metrics: ['Workflows', 'Email sequences', 'Task automation'],
        },
        integrations: ['Zapier', 'Make', 'n8n'],
      },
      {
        id: 'reporting',
        title: 'Sales Reporting',
        description: 'Track team performance, pipeline health, and forecasts.',
        icon: 'analytics-outline',
        demo: {
          steps: ['View dashboard', 'Filter data', 'Drill down', 'Export'],
          metrics: ['Team leaderboards', 'Forecasting', 'Custom reports'],
        },
        integrations: ['Google Sheets', 'Excel', 'Tableau'],
      },
    ],
    demoScreens: [
      { title: 'Pipeline View', description: 'Visual deal management' },
      { title: 'Contact Profile', description: 'Complete customer view' },
      { title: 'Activities', description: 'Track all interactions' },
      { title: 'Reports', description: 'Sales analytics' },
    ],
    useCases: [
      { title: 'Sales Teams', description: 'Streamline the sales process', icon: 'trending-up-outline' },
      { title: 'Account Management', description: 'Manage customer relationships', icon: 'people-outline' },
      { title: 'Business Development', description: 'Track partnerships and deals', icon: 'handshake-outline' },
      { title: 'Real Estate', description: 'Property listings and client tracking', icon: 'home-outline' },
      { title: 'Insurance Agents', description: 'Policy renewals and leads', icon: 'shield-outline' },
      { title: 'Event Planners', description: 'Client and vendor management', icon: 'calendar-outline' },
      { title: 'Recruitment', description: 'Candidate pipeline tracking', icon: 'person-add-outline' },
      { title: 'Financial Services', description: 'Client portfolios and advisory', icon: 'wallet-outline' },
    ],
    caseStudies: [
      {
        company: 'SafeHands Insurance',
        logo: 'shield',
        industry: 'Insurance Brokerage',
        location: 'Accra, Ghana',
        quote: 'We track 5,000+ policy renewals seamlessly. Automated reminders increased our renewal rate by 35%.',
        author: 'Kofi Mensah',
        role: 'Sales Director',
        metrics: [
          { value: '35%', label: 'Higher Renewals' },
          { value: '5,000+', label: 'Policies Tracked' },
          { value: '25', label: 'Sales Agents' },
        ],
      },
      {
        company: 'PropFinder Realty',
        logo: 'home',
        industry: 'Real Estate',
        location: 'Dar es Salaam, TZ',
        quote: 'From lead to closing, every interaction is tracked. Our agents close 40% more deals with better follow-up.',
        author: 'Amina Mwanga',
        role: 'Managing Broker',
        metrics: [
          { value: '40%', label: 'More Closings' },
          { value: '$12M', label: 'Properties Sold' },
          { value: '3', label: 'Office Locations' },
        ],
      },
    ],
    demoSteps: [
      { title: 'Add Lead', action: 'Capture from any source', result: 'Lead auto-assigned to rep' },
      { title: 'Nurture', action: 'Send automated emails', result: 'Lead engagement tracked' },
      { title: 'Move Pipeline', action: 'Drag to next stage', result: 'Team notified of progress' },
      { title: 'Close Deal', action: 'Mark as won', result: 'Revenue updated, celebration!' },
    ],
    pricing: [
      { name: 'Starter', price: 'Free', period: '14 days', features: ['500 contacts', '1 pipeline', 'Basic reports', 'Email support'] },
      { name: 'Business', price: '$19', period: '/month', features: ['Unlimited contacts', '5 pipelines', 'Automation', 'Email integration'], highlighted: true },
      { name: 'Enterprise', price: '$59', period: '/month', features: ['Everything in Business', 'Advanced automation', 'API access', 'Custom fields'] },
    ],
  },
  'expenses': {
    id: 'expenses',
    name: 'Expenses',
    tagline: 'Smart Expense Tracking',
    heroTitle: 'Expense Management, Simplified',
    heroSubtitle: 'Track, categorize, and manage business expenses with receipt scanning and approval workflows.',
    color: '#EF4444',
    gradientColors: ['#EF4444', '#DC2626'],
    dashboardRoute: '/expenses',
    comingSoon: true,
    mobileFirst: {
      headline: 'Expense Reports In Seconds',
      subheadline: 'Snap receipt → Auto-categorize → Submit. Done.',
      features: [
        { icon: 'camera-outline', text: 'Instant receipt capture' },
        { icon: 'flash-outline', text: 'AI auto-categorization' },
        { icon: 'send-outline', text: 'One-tap submission' },
        { icon: 'cash-outline', text: 'Fast reimbursement' },
      ]
    },
    stats: [
      { value: '90%', label: 'Less Manual Entry' },
      { value: '5min', label: 'Report Creation' },
      { value: '100%', label: 'Receipt Compliance' },
    ],
    features: [
      {
        icon: 'camera-outline',
        title: 'Receipt Scanning',
        description: 'Snap photos of receipts and let AI extract all the details automatically.',
        highlights: ['OCR extraction', 'Auto-fill', 'Receipt storage', 'Multi-receipt'],
      },
      {
        icon: 'pricetags-outline',
        title: 'Smart Categories',
        description: 'Automatic expense categorization with custom rules and merchant mapping.',
        highlights: ['Auto-categorize', 'Custom categories', 'Merchant rules', 'Split expenses'],
      },
      {
        icon: 'car-outline',
        title: 'Mileage Tracking',
        description: 'Log business trips with GPS tracking or manual entry and automatic rate calculations.',
        highlights: ['GPS tracking', 'Manual entry', 'Rate lookup', 'Trip history'],
      },
      {
        icon: 'checkmark-circle-outline',
        title: 'Approval Workflows',
        description: 'Multi-level approval workflows with automatic routing and delegation.',
        highlights: ['Custom workflows', 'Auto-routing', 'Delegation', 'Notifications'],
      },
      {
        icon: 'document-text-outline',
        title: 'Expense Reports',
        description: 'Generate detailed expense reports with one click. Export to PDF or integrate with accounting.',
        highlights: ['One-click reports', 'PDF export', 'Accounting sync', 'Custom templates'],
      },
      {
        icon: 'pie-chart-outline',
        title: 'Budget Alerts',
        description: 'Set spending budgets and receive alerts when expenses approach or exceed limits.',
        highlights: ['Budget limits', 'Alerts', 'Trend analysis', 'Forecasting'],
      },
    ],
    interactiveFeatures: [
      {
        id: 'capture',
        title: 'Receipt Capture',
        description: 'Snap photos of receipts and auto-extract all details.',
        icon: 'camera-outline',
        demo: {
          steps: ['Take photo', 'AI extracts data', 'Review details', 'Submit'],
          metrics: ['OCR extraction', '98% accuracy', 'Multi-currency'],
        },
        integrations: ['iOS', 'Android', 'Web upload'],
      },
      {
        id: 'categories',
        title: 'Smart Categories',
        description: 'Auto-categorize expenses with custom rules.',
        icon: 'pricetags-outline',
        demo: {
          steps: ['Submit expense', 'AI categorizes', 'Learn from corrections', 'Apply rules'],
          metrics: ['Auto-categorize', 'Custom categories', 'Merchant rules'],
        },
        integrations: ['QuickBooks', 'Xero', 'Sage'],
      },
      {
        id: 'approval',
        title: 'Approval Workflows',
        description: 'Multi-level approvals with custom routing rules.',
        icon: 'checkmark-circle-outline',
        demo: {
          steps: ['Submit expense', 'Routes to manager', 'Approve/Reject', 'Notify employee'],
          metrics: ['Multi-level', 'Custom rules', 'Delegation'],
        },
        integrations: ['Slack', 'Teams', 'Email'],
      },
      {
        id: 'mileage',
        title: 'Mileage Tracking',
        description: 'Log trips with GPS or manual entry, auto-calculate costs.',
        icon: 'car-outline',
        demo: {
          steps: ['Start trip', 'GPS tracks route', 'End trip', 'Auto-calculate'],
          metrics: ['GPS tracking', 'IRS rates', 'Trip history'],
        },
        integrations: ['Google Maps', 'Waze', 'Fleet management'],
      },
      {
        id: 'reports',
        title: 'Expense Reports',
        description: 'Generate detailed expense reports with one click.',
        icon: 'document-text-outline',
        demo: {
          steps: ['Select expenses', 'Group by project', 'Generate report', 'Submit'],
          metrics: ['One-click', 'PDF/Excel', 'Custom templates'],
        },
        integrations: ['Concur', 'Expensify', 'Ramp'],
      },
      {
        id: 'cards',
        title: 'Corporate Cards',
        description: 'Issue virtual and physical cards with spend controls.',
        icon: 'card-outline',
        demo: {
          steps: ['Issue card', 'Set limits', 'Employee spends', 'Auto-reconcile'],
          metrics: ['Virtual cards', 'Spend limits', 'Real-time controls'],
        },
        integrations: ['Visa', 'Mastercard', 'Plaid'],
      },
    ],
    demoScreens: [
      { title: 'Expense Dashboard', description: 'Overview of all expenses' },
      { title: 'Add Expense', description: 'Quick expense entry' },
      { title: 'Receipt Capture', description: 'Scan and extract' },
      { title: 'Reports', description: 'Generate expense reports' },
    ],
    useCases: [
      { title: 'Business Travel', description: 'Track travel expenses', icon: 'airplane-outline' },
      { title: 'Remote Teams', description: 'Manage distributed expenses', icon: 'globe-outline' },
      { title: 'Contractors', description: 'Reimbursement tracking', icon: 'construct-outline' },
      { title: 'Sales Teams', description: 'Client entertainment and fuel', icon: 'car-outline' },
      { title: 'Field Workers', description: 'Per diem and allowances', icon: 'walk-outline' },
      { title: 'Consultants', description: 'Project-based expense tracking', icon: 'briefcase-outline' },
      { title: 'NGOs', description: 'Grant expense compliance', icon: 'heart-outline' },
      { title: 'Events', description: 'Conference and venue costs', icon: 'ticket-outline' },
    ],
    caseStudies: [
      {
        company: 'BuildRight Construction',
        logo: 'construct',
        industry: 'Construction',
        location: 'Johannesburg, SA',
        quote: 'Managing expenses for 50 field workers was chaos. Now receipts are captured on-site and approved same day.',
        author: 'Sipho Ndlovu',
        role: 'Finance Manager',
        metrics: [
          { value: '50', label: 'Field Workers' },
          { value: '3 days', label: 'Faster Reimbursement' },
          { value: '100%', label: 'Receipt Compliance' },
        ],
      },
      {
        company: 'GlobalAid Foundation',
        logo: 'heart',
        industry: 'Non-Profit',
        location: 'Nairobi, Kenya',
        quote: 'Donor compliance requires detailed expense tracking. We passed every audit since implementing Expenses.',
        author: 'Mary Wanjiku',
        role: 'Program Director',
        metrics: [
          { value: '100%', label: 'Audit Pass Rate' },
          { value: '$3M', label: 'Grants Managed' },
          { value: '8', label: 'Country Programs' },
        ],
      },
    ],
    demoSteps: [
      { title: 'Snap Receipt', action: 'Take photo of receipt', result: 'AI extracts all details' },
      { title: 'Auto-Categorize', action: 'System suggests category', result: 'Expense coded correctly' },
      { title: 'Submit', action: 'Add to expense report', result: 'Sent for approval' },
      { title: 'Get Reimbursed', action: 'Manager approves', result: 'Funds transferred to account' },
    ],
    pricing: [
      { name: 'Starter', price: 'Free', period: '14 days', features: ['50 expenses/mo', '1 user', 'Basic reports', 'Email support'] },
      { name: 'Business', price: '$15', period: '/month', features: ['Unlimited expenses', '10 users', 'Approval workflows', 'Integrations'], highlighted: true },
      { name: 'Enterprise', price: '$49', period: '/month', features: ['Everything in Business', 'Unlimited users', 'API access', 'Custom workflows'] },
    ],
  },
};

export default PRODUCTS;
