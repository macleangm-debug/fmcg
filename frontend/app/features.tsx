import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const isWeb = Platform.OS === 'web';

const THEME = {
  primary: '#00D4FF',
  secondary: '#7B61FF',
  dark: '#0A0A0F',
  darker: '#050508',
  card: '#12121A',
  border: '#2A2A35',
  text: '#FFFFFF',
  textMuted: '#8B8B9E',
  success: '#00C48C',
  lightBg: '#F8FAFC',
};

// Interactive feature demos for each product - EXPANDED with 8+ features per product
const PRODUCT_FEATURES = [
  {
    id: 'retail-pro',
    name: 'RetailPro',
    tagline: 'Complete POS System',
    color: '#3B82F6',
    icon: 'storefront-outline',
    features: [
      {
        id: 'pos',
        title: 'Smart Point of Sale',
        description: 'Process sales in seconds with barcode scanning, multiple payment methods, and instant receipts.',
        icon: 'cart-outline',
        demo: {
          steps: ['Scan product', 'Add to cart', 'Apply discount', 'Process payment', 'Print receipt'],
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
          steps: ['Add customer', 'View history', 'Apply loyalty', 'Send promo'],
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
          steps: ['Complete sale', 'Choose format', 'Send/Print', 'Track opens'],
          metrics: ['Bluetooth printing', 'Digital receipts', 'Custom branding'],
        },
        integrations: ['Epson', 'Star Micronics', 'WhatsApp'],
      },
      {
        id: 'promotions',
        title: 'Promotions & Discounts',
        description: 'Create flash sales, BOGO deals, tiered discounts, and time-limited offers with ease.',
        icon: 'pricetag-outline',
        demo: {
          steps: ['Create promotion', 'Set conditions', 'Schedule timing', 'Track results'],
          metrics: ['Auto-apply', 'Time-based', 'Customer targeting'],
        },
        integrations: ['SMS Marketing', 'Email', 'Social Media'],
      },
      {
        id: 'staff',
        title: 'Staff Management',
        description: 'Track employee performance, manage shifts, set permissions, and calculate commissions.',
        icon: 'people-circle-outline',
        demo: {
          steps: ['Add employee', 'Set role', 'Track sales', 'View performance'],
          metrics: ['Role permissions', 'Sales tracking', 'Commission calc'],
        },
        integrations: ['Payroll', 'HR Systems', 'Time Tracking'],
      },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory',
    tagline: 'Stock Management',
    color: '#10B981',
    icon: 'cube-outline',
    features: [
      {
        id: 'tracking',
        title: 'Real-time Tracking',
        description: 'Monitor stock levels across warehouses with instant visibility.',
        icon: 'layers-outline',
        demo: {
          steps: ['Scan incoming', 'Update levels', 'Track movements', 'Audit stock'],
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
        description: 'Move inventory between locations with full tracking and documentation.',
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
          metrics: ['20+ reports', 'Scheduled emails', 'PDF/Excel export'],
        },
        integrations: ['QuickBooks', 'Xero', 'Google Sheets'],
      },
      {
        id: 'suppliers',
        title: 'Supplier Management',
        description: 'Manage vendor relationships, track lead times, and automate POs.',
        icon: 'people-circle-outline',
        demo: {
          steps: ['Add supplier', 'Set lead time', 'Create PO', 'Track delivery'],
          metrics: ['Vendor portal', 'Auto-PO', 'Performance tracking'],
        },
        integrations: ['Alibaba', 'TradeGecko', 'Ordoro'],
      },
      {
        id: 'batch',
        title: 'Batch & Expiry Tracking',
        description: 'Track batch numbers, expiry dates, and implement FIFO/FEFO management.',
        icon: 'calendar-outline',
        demo: {
          steps: ['Assign batch', 'Set expiry date', 'Track aging', 'Auto-alert'],
          metrics: ['FIFO/FEFO', 'Expiry alerts', 'Batch recall'],
        },
        integrations: ['FDA Compliance', 'Pharma Systems', 'Food Safety'],
      },
      {
        id: 'counting',
        title: 'Cycle Counting',
        description: 'Streamlined stock takes with mobile counting and variance analysis.',
        icon: 'calculator-outline',
        demo: {
          steps: ['Schedule count', 'Assign team', 'Count stock', 'Review variance'],
          metrics: ['Mobile counting', 'Auto-variance', 'History tracking'],
        },
        integrations: ['ERP Systems', 'Accounting', 'Audit Tools'],
      },
    ],
  },
  {
    id: 'invoicing',
    name: 'Invoicing',
    tagline: 'Professional Billing',
    color: '#8B5CF6',
    icon: 'document-text-outline',
    features: [
      {
        id: 'create',
        title: 'Beautiful Invoices',
        description: 'Create professional invoices with your branding in seconds.',
        icon: 'create-outline',
        demo: {
          steps: ['Select template', 'Add items', 'Customize', 'Send'],
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
        description: 'Set up automatic recurring invoices for subscriptions and retainers.',
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
        id: 'expenses',
        title: 'Expense Tracking',
        description: 'Track expenses and add them to invoices for client billing.',
        icon: 'wallet-outline',
        demo: {
          steps: ['Snap receipt', 'Categorize', 'Assign to client', 'Add to invoice'],
          metrics: ['Receipt OCR', 'Auto-categorize', 'Billable hours'],
        },
        integrations: ['Expensify', 'Receipt Bank', 'Hubdoc'],
      },
      {
        id: 'time-tracking',
        title: 'Time Tracking',
        description: 'Track billable hours and automatically add them to client invoices.',
        icon: 'time-outline',
        demo: {
          steps: ['Start timer', 'Log hours', 'Add to invoice', 'Bill client'],
          metrics: ['Timer app', 'Hourly rates', 'Project tracking'],
        },
        integrations: ['Toggl', 'Harvest', 'Clockify'],
      },
      {
        id: 'client-portal',
        title: 'Client Portal',
        description: 'Give clients a portal to view invoices, pay, and download receipts.',
        icon: 'laptop-outline',
        demo: {
          steps: ['Invite client', 'Client logs in', 'View history', 'Pay online'],
          metrics: ['Self-service', 'Payment history', 'Document access'],
        },
        integrations: ['Custom domain', 'Branding', 'SSO'],
      },
    ],
  },
  {
    id: 'bulk-sms',
    name: 'UniTxt',
    tagline: 'Bulk Messaging',
    color: '#F59E0B',
    icon: 'chatbubbles-outline',
    features: [
      {
        id: 'send',
        title: 'Mass Messaging',
        description: 'Send thousands of SMS in seconds with 99.5% delivery rate.',
        icon: 'send-outline',
        demo: {
          steps: ['Import contacts', 'Compose message', 'Schedule', 'Track delivery'],
          metrics: ['99.5% delivery', '50K/batch', '<3s delivery'],
        },
        integrations: ['Twilio', 'Africa\'s Talking', 'Tigo'],
      },
      {
        id: 'personalize',
        title: 'Personalization',
        description: 'Personalize each message with customer names and data.',
        icon: 'person-outline',
        demo: {
          steps: ['Add merge fields', 'Preview', 'Test send', 'Launch'],
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
          steps: ['View dashboard', 'Filter campaigns', 'Export data', 'Compare'],
          metrics: ['Real-time', 'Detailed reports', 'Export CSV'],
        },
        integrations: ['Google Sheets', 'Tableau', 'Power BI'],
      },
      {
        id: 'scheduling',
        title: 'Campaign Scheduling',
        description: 'Schedule messages for optimal delivery times across timezones.',
        icon: 'calendar-outline',
        demo: {
          steps: ['Set date/time', 'Choose timezone', 'Preview schedule', 'Confirm'],
          metrics: ['Timezone aware', 'Recurring campaigns', 'Optimal timing'],
        },
        integrations: ['Google Calendar', 'Outlook', 'Calendly'],
      },
      {
        id: 'contacts',
        title: 'Contact Management',
        description: 'Organize contacts into groups and segments for targeted messaging.',
        icon: 'people-outline',
        demo: {
          steps: ['Import CSV', 'Create groups', 'Add tags', 'Build segments'],
          metrics: ['Unlimited contacts', 'Smart segments', 'Opt-out management'],
        },
        integrations: ['Mailchimp', 'ActiveCampaign', 'Constant Contact'],
      },
      {
        id: 'api',
        title: 'Developer API',
        description: 'RESTful API for sending SMS from your own applications.',
        icon: 'code-slash-outline',
        demo: {
          steps: ['Get API key', 'Read docs', 'Test sandbox', 'Go live'],
          metrics: ['REST API', 'Webhooks', 'SDKs available'],
        },
        integrations: ['Node.js', 'Python', 'PHP', 'Java'],
      },
      {
        id: 'templates',
        title: 'Message Templates',
        description: 'Save and reuse message templates for faster campaign creation.',
        icon: 'document-text-outline',
        demo: {
          steps: ['Create template', 'Add variables', 'Save', 'Reuse anytime'],
          metrics: ['Variable support', 'Categories', 'Version history'],
        },
        integrations: ['Campaign Manager', 'CRM', 'Marketing Tools'],
      },
      {
        id: 'sender-id',
        title: 'Custom Sender ID',
        description: 'Send messages with your business name as the sender ID.',
        icon: 'business-outline',
        demo: {
          steps: ['Register ID', 'Get approved', 'Start sending', 'Brand recognition'],
          metrics: ['Brand awareness', 'Trust building', 'Recognition'],
        },
        integrations: ['Carrier approved', 'Multi-country', 'Compliance'],
      },
    ],
  },
  {
    id: 'loyalty',
    name: 'Loyalty',
    tagline: 'Rewards Program',
    color: '#EC4899',
    icon: 'heart-outline',
    features: [
      {
        id: 'points',
        title: 'Points System',
        description: 'Customers earn points on every purchase, redeemable for rewards.',
        icon: 'star-outline',
        demo: {
          steps: ['Customer buys', 'Points added', 'Reach threshold', 'Redeem reward'],
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
          steps: ['Set tiers', 'Define benefits', 'Auto-upgrade', 'Celebrate'],
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
      {
        id: 'gamification',
        title: 'Gamification',
        description: 'Add challenges, badges, and streaks to boost engagement.',
        icon: 'trophy-outline',
        demo: {
          steps: ['Create challenge', 'Set rewards', 'Customers compete', 'Award badges'],
          metrics: ['Challenges', 'Badges', 'Leaderboards'],
        },
        integrations: ['Mobile App', 'Push Notifications', 'Social'],
      },
      {
        id: 'membership',
        title: 'Paid Memberships',
        description: 'Create premium membership programs with exclusive perks.',
        icon: 'card-outline',
        demo: {
          steps: ['Create membership', 'Set pricing', 'Add benefits', 'Collect payments'],
          metrics: ['Recurring revenue', 'Exclusive access', 'Member perks'],
        },
        integrations: ['Stripe', 'PayPal', 'Mobile Money'],
      },
    ],
  },
  {
    id: 'kwikpay',
    name: 'KwikPay',
    tagline: 'Payment Processing',
    color: '#00D4FF',
    icon: 'card-outline',
    features: [
      {
        id: 'accept',
        title: 'Accept Payments',
        description: 'Cards, mobile money, bank transfers - all in one platform.',
        icon: 'wallet-outline',
        demo: {
          steps: ['Customer pays', 'Choose method', 'Verify', 'Complete'],
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
        id: 'reporting',
        title: 'Financial Reporting',
        description: 'Detailed transaction reports, settlements, and reconciliation.',
        icon: 'document-text-outline',
        demo: {
          steps: ['View transactions', 'Filter/Search', 'Export', 'Reconcile'],
          metrics: ['Real-time', 'Auto-reconcile', 'Tax reports'],
        },
        integrations: ['QuickBooks', 'Xero', 'Sage'],
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
      {
        id: 'multi-currency',
        title: 'Multi-Currency',
        description: 'Accept payments in 150+ currencies with auto-conversion.',
        icon: 'globe-outline',
        demo: {
          steps: ['Set currencies', 'Customer pays', 'Auto-convert', 'Settle'],
          metrics: ['150+ currencies', 'Live rates', 'Local methods'],
        },
        integrations: ['Forex providers', 'Banks', 'Crypto'],
      },
    ],
  },
  {
    id: 'accounting',
    name: 'Accounting',
    tagline: 'Business Accounting',
    color: '#06B6D4',
    icon: 'calculator-outline',
    features: [
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
          steps: ['Connect bank', 'Import transactions', 'Match', 'Reconcile'],
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
          steps: ['Track VAT', 'Generate reports', 'Export', 'File'],
          metrics: ['VAT tracking', 'Tax reports', 'Audit ready'],
        },
        integrations: ['TurboTax', 'H&R Block', 'Local tax authorities'],
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
      {
        id: 'invoices',
        title: 'Accounts Receivable',
        description: 'Track outstanding invoices and aging reports.',
        icon: 'receipt-outline',
        demo: {
          steps: ['View receivables', 'Track aging', 'Send reminders', 'Collect'],
          metrics: ['Aging reports', 'Payment tracking', 'Auto-reminders'],
        },
        integrations: ['Invoicing', 'Payment Gateway', 'CRM'],
      },
      {
        id: 'payables',
        title: 'Accounts Payable',
        description: 'Manage bills, vendor payments, and cash flow.',
        icon: 'wallet-outline',
        demo: {
          steps: ['Enter bill', 'Schedule payment', 'Approve', 'Pay'],
          metrics: ['Bill tracking', 'Approval workflows', 'Payment scheduling'],
        },
        integrations: ['Bill.com', 'Melio', 'Bank transfers'],
      },
    ],
  },
  {
    id: 'crm',
    name: 'CRM',
    tagline: 'Sales Management',
    color: '#6366F1',
    icon: 'people-outline',
    features: [
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
          steps: ['Add deal', 'Move through stages', 'Track value', 'Close'],
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
        integrations: ['Salesforce', 'HubSpot', 'Pipedrive'],
      },
      {
        id: 'mobile-crm',
        title: 'Mobile CRM',
        description: 'Full CRM access on your phone with offline mode.',
        icon: 'phone-portrait-outline',
        demo: {
          steps: ['Open app', 'View deals', 'Log call', 'Update status'],
          metrics: ['Offline mode', 'Push notifications', 'Voice notes'],
        },
        integrations: ['iOS', 'Android', 'Apple Watch'],
      },
      {
        id: 'territories',
        title: 'Territory Management',
        description: 'Define sales territories and assign leads automatically.',
        icon: 'map-outline',
        demo: {
          steps: ['Define territory', 'Set rules', 'Auto-assign', 'Track performance'],
          metrics: ['Geo-based', 'Account-based', 'Round-robin'],
        },
        integrations: ['Google Maps', 'Routing', 'Calendar'],
      },
    ],
  },
  {
    id: 'expenses',
    name: 'Expenses',
    tagline: 'Expense Management',
    color: '#EF4444',
    icon: 'receipt-outline',
    features: [
      {
        id: 'capture',
        title: 'Receipt Capture',
        description: 'Snap photos of receipts and auto-extract all details.',
        icon: 'camera-outline',
        demo: {
          steps: ['Take photo', 'AI extracts data', 'Review', 'Submit'],
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
          steps: ['Submit expense', 'Routes to manager', 'Approve/Reject', 'Notify'],
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
      {
        id: 'per-diem',
        title: 'Per Diem Management',
        description: 'Configure per diem rates by location and employee level.',
        icon: 'cash-outline',
        demo: {
          steps: ['Set rates', 'Employee travels', 'Auto-calculate', 'Approve'],
          metrics: ['Location-based', 'GSA rates', 'Auto-compliance'],
        },
        integrations: ['Travel booking', 'HR systems', 'Payroll'],
      },
      {
        id: 'policy',
        title: 'Policy Enforcement',
        description: 'Automatically enforce spending policies and flag violations.',
        icon: 'shield-outline',
        demo: {
          steps: ['Define policy', 'Submit expense', 'Auto-check', 'Flag violations'],
          metrics: ['Custom policies', 'Auto-enforcement', 'Exception handling'],
        },
        integrations: ['Compliance', 'Audit trails', 'Reporting'],
      },
    ],
  },
];

export default function FeaturesPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const [selectedProduct, setSelectedProduct] = useState(PRODUCT_FEATURES[0].id);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [demoStep, setDemoStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentProduct = PRODUCT_FEATURES.find(p => p.id === selectedProduct);

  // Auto-advance demo steps
  useEffect(() => {
    if (activeFeature) {
      const interval = setInterval(() => {
        setDemoStep(prev => {
          const feature = currentProduct?.features.find(f => f.id === activeFeature);
          const maxSteps = feature?.demo.steps.length || 4;
          return (prev + 1) % maxSteps;
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [activeFeature, currentProduct]);

  const handleFeatureClick = (featureId: string) => {
    if (activeFeature === featureId) {
      setActiveFeature(null);
    } else {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.5, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      setActiveFeature(featureId);
      setDemoStep(0);
    }
  };

  const webStyles = isWeb ? `
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .feature-card { transition: all 0.3s ease; }
    .feature-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
    .product-tab { transition: all 0.2s ease; flex-shrink: 0; }
    .product-tab:hover { background: rgba(0,0,0,0.05); }
    .demo-step { animation: slideUp 0.3s ease forwards; }
    .cta-btn { transition: all 0.2s ease; }
    .cta-btn:hover { transform: scale(1.05); }
    .product-tabs-scroll { 
      display: flex !important; 
      flex-wrap: nowrap !important; 
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .product-tabs-scroll::-webkit-scrollbar { display: none; }
  ` : '';

  return (
    <SafeAreaView style={styles.container}>
      {isWeb && <style dangerouslySetInnerHTML={{ __html: webStyles }} />}
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={[THEME.dark, THEME.darker]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/landing')}>
              <Ionicons name="arrow-back" size={20} color={THEME.text} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            
            <View style={styles.headerBadge}>
              <Ionicons name="sparkles" size={14} color={THEME.primary} />
              <Text style={styles.headerBadgeText}>INTERACTIVE DEMOS</Text>
            </View>
            
            <Text style={styles.headerTitle}>Explore Our Features</Text>
            <Text style={styles.headerSubtitle}>
              Click on any feature to see it in action. No signup required.
            </Text>
          </View>
        </LinearGradient>

        {/* Product Tabs - Centered and Aligned */}
        <View style={styles.productTabsContainer}>
          <View style={styles.productTabsInner} className="product-tabs-scroll">
            {PRODUCT_FEATURES.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.productTab,
                  selectedProduct === product.id && [styles.productTabActive, { borderColor: product.color, backgroundColor: `${product.color}10` }],
                ]}
                onPress={() => {
                  setSelectedProduct(product.id);
                  setActiveFeature(null);
                }}
                className="product-tab"
              >
                <View style={[
                  styles.productTabIcon, 
                  { backgroundColor: selectedProduct === product.id ? `${product.color}20` : '#F3F4F6' }
                ]}>
                  <Ionicons name={product.icon as any} size={16} color={selectedProduct === product.id ? product.color : THEME.textMuted} />
                </View>
                <Text style={[
                  styles.productTabName,
                  selectedProduct === product.id && { color: product.color, fontWeight: '700' },
                ]}>{product.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Features Grid */}
        {currentProduct && (
          <View style={styles.featuresSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.productBadge, { backgroundColor: `${currentProduct.color}15` }]}>
                <Ionicons name={currentProduct.icon as any} size={20} color={currentProduct.color} />
                <Text style={[styles.productBadgeText, { color: currentProduct.color }]}>{currentProduct.name}</Text>
              </View>
              <Text style={styles.sectionTitle}>{currentProduct.name} Features</Text>
              <Text style={styles.sectionSubtitle}>{currentProduct.tagline} • {currentProduct.features.length} features</Text>
            </View>

            <View style={[
              styles.featuresGrid, 
              isMobile && styles.featuresGridMobile,
              isTablet && styles.featuresGridTablet
            ]}>
              {currentProduct.features.map((feature, index) => {
                const isActive = activeFeature === feature.id;
                
                return (
                  <Animated.View
                    key={feature.id}
                    style={[
                      styles.featureCard,
                      isMobile && styles.featureCardMobile,
                      isActive && [styles.featureCardActive, { borderColor: currentProduct.color }],
                      { opacity: fadeAnim },
                    ]}
                    className="feature-card"
                  >
                    <TouchableOpacity
                      style={styles.featureCardInner}
                      onPress={() => handleFeatureClick(feature.id)}
                      data-testid={`feature-${feature.id}`}
                    >
                      {/* Feature Header */}
                      <View style={styles.featureHeader}>
                        <View style={[styles.featureIcon, { backgroundColor: `${currentProduct.color}15` }]}>
                          <Ionicons name={feature.icon as any} size={24} color={currentProduct.color} />
                        </View>
                        <View style={styles.featureHeaderText}>
                          <Text style={styles.featureTitle}>{feature.title}</Text>
                          <Text style={styles.featureDesc} numberOfLines={isActive ? undefined : 2}>{feature.description}</Text>
                        </View>
                        <Ionicons 
                          name={isActive ? 'chevron-up' : 'chevron-down'} 
                          size={20} 
                          color={THEME.textMuted} 
                        />
                      </View>

                      {/* Expanded Demo Section */}
                      {isActive && (
                        <View style={styles.demoSection} className="demo-step">
                          {/* Demo Steps */}
                          <View style={styles.demoSteps}>
                            <Text style={styles.demoLabel}>HOW IT WORKS</Text>
                            {feature.demo.steps.map((step, stepIndex) => (
                              <View 
                                key={stepIndex} 
                                style={[
                                  styles.demoStepItem,
                                  stepIndex === demoStep && [styles.demoStepActive, { backgroundColor: `${currentProduct.color}10` }],
                                ]}
                              >
                                <View style={[
                                  styles.demoStepNumber,
                                  stepIndex === demoStep && { backgroundColor: currentProduct.color },
                                  stepIndex < demoStep && { backgroundColor: THEME.success },
                                ]}>
                                  {stepIndex < demoStep ? (
                                    <Ionicons name="checkmark" size={12} color={THEME.text} />
                                  ) : (
                                    <Text style={styles.demoStepNumberText}>{stepIndex + 1}</Text>
                                  )}
                                </View>
                                <Text style={[
                                  styles.demoStepText,
                                  stepIndex === demoStep && { color: currentProduct.color, fontWeight: '600' },
                                ]}>{step}</Text>
                              </View>
                            ))}
                          </View>

                          {/* Metrics */}
                          <View style={styles.demoMetrics}>
                            {feature.demo.metrics.map((metric, i) => (
                              <View key={i} style={styles.metricBadge}>
                                <Ionicons name="checkmark-circle" size={14} color={THEME.success} />
                                <Text style={styles.metricText}>{metric}</Text>
                              </View>
                            ))}
                          </View>

                          {/* Integrations */}
                          <View style={styles.integrationsSection}>
                            <Text style={styles.integrationsLabel}>INTEGRATES WITH</Text>
                            <View style={styles.integrationsList}>
                              {feature.integrations.map((integration, i) => (
                                <View key={i} style={styles.integrationBadge}>
                                  <Text style={styles.integrationText}>{integration}</Text>
                                </View>
                              ))}
                            </View>
                          </View>

                          {/* CTA */}
                          <TouchableOpacity
                            style={[styles.demoCTA, { backgroundColor: currentProduct.color }]}
                            onPress={() => router.push(`/products/${currentProduct.id}` as any)}
                            className="cta-btn"
                          >
                            <Text style={styles.demoCTAText}>Try {feature.title}</Text>
                            <Ionicons name="arrow-forward" size={16} color={THEME.text} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            {/* Bottom CTA */}
            <View style={styles.bottomCTA}>
              <LinearGradient
                colors={[currentProduct.color, `${currentProduct.color}CC`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bottomCTAGradient}
              >
                <View style={styles.bottomCTAContent}>
                  <Text style={styles.bottomCTATitle}>Ready to get started with {currentProduct.name}?</Text>
                  <Text style={styles.bottomCTASubtitle}>
                    Start your 14-day free trial. No credit card required.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.bottomCTABtn}
                  onPress={() => router.push(`/products/${currentProduct.id}` as any)}
                >
                  <Text style={[styles.bottomCTABtnText, { color: currentProduct.color }]}>
                    Start Free Trial
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={currentProduct.color} />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        )}

        {/* API Section Preview */}
        <View style={styles.apiSection}>
          <View style={styles.apiContent}>
            <View style={[styles.apiBadge, { backgroundColor: `${THEME.secondary}20` }]}>
              <Ionicons name="code-slash" size={14} color={THEME.secondary} />
              <Text style={[styles.apiBadgeText, { color: THEME.secondary }]}>DEVELOPER API</Text>
            </View>
            <Text style={styles.apiTitle}>Build Custom Integrations</Text>
            <Text style={styles.apiSubtitle}>
              RESTful APIs, webhooks, OAuth 2.0, and SDKs for seamless integration with your existing systems.
            </Text>
            <View style={styles.apiFeatures}>
              <View style={styles.apiFeatureItem}>
                <Ionicons name="key-outline" size={20} color={THEME.primary} />
                <Text style={styles.apiFeatureText}>OAuth 2.0</Text>
              </View>
              <View style={styles.apiFeatureItem}>
                <Ionicons name="git-branch-outline" size={20} color={THEME.primary} />
                <Text style={styles.apiFeatureText}>Webhooks</Text>
              </View>
              <View style={styles.apiFeatureItem}>
                <Ionicons name="cube-outline" size={20} color={THEME.primary} />
                <Text style={styles.apiFeatureText}>SDKs</Text>
              </View>
              <View style={styles.apiFeatureItem}>
                <Ionicons name="document-text-outline" size={20} color={THEME.primary} />
                <Text style={styles.apiFeatureText}>Full Docs</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.apiBtn}
              onPress={() => router.push('/developers')}
            >
              <Text style={styles.apiBtnText}>View API Documentation</Text>
              <Ionicons name="arrow-forward" size={18} color={THEME.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Software Galaxy. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.lightBg,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  headerContent: {
    maxWidth: 800,
    marginHorizontal: 'auto',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 24,
    gap: 6,
  },
  backText: {
    color: THEME.textMuted,
    fontSize: 14,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${THEME.primary}20`,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  headerBadgeText: {
    color: THEME.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 18,
    color: THEME.textMuted,
    textAlign: 'center',
    maxWidth: 500,
  },
  // Product Tabs - Centered and properly aligned
  productTabsContainer: {
    backgroundColor: THEME.text,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  productTabsInner: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 6,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    overflowX: 'auto',
  },
  productTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F9FAFB',
    gap: 6,
    minWidth: 'auto',
  },
  productTabActive: {
    borderWidth: 2,
  },
  productTabIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productTabName: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.dark,
  },
  featuresSection: {
    padding: 32,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  sectionHeader: {
    marginBottom: 32,
    alignItems: 'center',
  },
  productBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 8,
    marginBottom: 12,
  },
  productBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: THEME.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 16,
    color: THEME.textMuted,
    textAlign: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  featuresGridMobile: {
    flexDirection: 'column',
  },
  featuresGridTablet: {
    gap: 16,
  },
  featureCard: {
    width: '31%',
    minWidth: 320,
    backgroundColor: THEME.text,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  featureCardMobile: {
    width: '100%',
    minWidth: 'auto',
  },
  featureCardActive: {
    borderWidth: 2,
  },
  featureCardInner: {
    padding: 20,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureHeaderText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.dark,
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 14,
    color: THEME.textMuted,
    lineHeight: 20,
  },
  demoSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  demoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  demoSteps: {
    marginBottom: 20,
  },
  demoStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
    gap: 12,
  },
  demoStepActive: {
    // Handled inline
  },
  demoStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoStepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textMuted,
  },
  demoStepText: {
    fontSize: 14,
    color: THEME.dark,
  },
  demoMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8FFF5',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.success,
  },
  integrationsSection: {
    marginBottom: 20,
  },
  integrationsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  integrationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  integrationBadge: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  integrationText: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.dark,
  },
  demoCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  demoCTAText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },
  bottomCTA: {
    marginTop: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  bottomCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 32,
    flexWrap: 'wrap',
    gap: 20,
  },
  bottomCTAContent: {
    flex: 1,
    minWidth: 280,
  },
  bottomCTATitle: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 6,
  },
  bottomCTASubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  bottomCTABtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.text,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  bottomCTABtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  apiSection: {
    backgroundColor: THEME.dark,
    padding: 48,
    marginTop: 40,
  },
  apiContent: {
    maxWidth: 800,
    marginHorizontal: 'auto',
    alignItems: 'center',
  },
  apiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  apiBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  apiTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  apiSubtitle: {
    fontSize: 16,
    color: THEME.textMuted,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 500,
  },
  apiFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 28,
  },
  apiFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  apiFeatureText: {
    fontSize: 14,
    color: THEME.text,
    fontWeight: '500',
  },
  apiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  apiBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: THEME.textMuted,
  },
});
