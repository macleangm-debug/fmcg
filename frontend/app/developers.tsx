import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';

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
  textSubtle: '#5A5A6E',
  success: '#10B981',
  warning: '#F59E0B',
  lightBg: '#F8FAFC',
};

// APIs organized by PRODUCT
const PRODUCT_APIS = [
  {
    id: 'retailpro',
    name: 'RetailPro',
    tagline: 'Point of Sale & Retail Management',
    icon: 'storefront-outline',
    color: '#3B82F6',
    baseUrl: '/api/retail',
    endpoints: [
      { method: 'GET', path: '/products', description: 'List all products' },
      { method: 'POST', path: '/products', description: 'Create new product' },
      { method: 'GET', path: '/products/{id}', description: 'Get product details' },
      { method: 'PUT', path: '/products/{id}', description: 'Update product' },
      { method: 'DELETE', path: '/products/{id}', description: 'Delete product' },
      { method: 'GET', path: '/sales', description: 'List sales transactions' },
      { method: 'POST', path: '/sales', description: 'Create sale transaction' },
      { method: 'GET', path: '/sales/{id}', description: 'Get sale details' },
      { method: 'GET', path: '/customers', description: 'List customers' },
      { method: 'POST', path: '/customers', description: 'Create customer' },
      { method: 'GET', path: '/analytics/dashboard', description: 'Dashboard metrics' },
      { method: 'GET', path: '/analytics/sales', description: 'Sales analytics' },
    ],
  },
  {
    id: 'kwikpay',
    name: 'KwikPay',
    tagline: 'Payment Processing & Mobile Money',
    icon: 'card-outline',
    color: '#00D4FF',
    baseUrl: '/api/kwikpay',
    endpoints: [
      { method: 'POST', path: '/payments/initiate', description: 'Initiate payment' },
      { method: 'GET', path: '/payments/{id}', description: 'Get payment status' },
      { method: 'POST', path: '/payments/{id}/confirm', description: 'Confirm payment' },
      { method: 'POST', path: '/payments/{id}/refund', description: 'Refund payment' },
      { method: 'GET', path: '/mobile-money/providers', description: 'List MM providers' },
      { method: 'POST', path: '/mobile-money/send', description: 'Send via mobile money' },
      { method: 'GET', path: '/payouts', description: 'List payouts' },
      { method: 'POST', path: '/payouts', description: 'Create payout' },
      { method: 'GET', path: '/transactions', description: 'Transaction history' },
      { method: 'POST', path: '/webhooks', description: 'Register webhook' },
    ],
  },
  {
    id: 'invoicing',
    name: 'Invoicing',
    tagline: 'Professional Invoice Management',
    icon: 'document-text-outline',
    color: '#8B5CF6',
    baseUrl: '/api/invoices',
    endpoints: [
      { method: 'GET', path: '/', description: 'List all invoices' },
      { method: 'POST', path: '/', description: 'Create invoice' },
      { method: 'GET', path: '/{id}', description: 'Get invoice details' },
      { method: 'PUT', path: '/{id}', description: 'Update invoice' },
      { method: 'DELETE', path: '/{id}', description: 'Delete invoice' },
      { method: 'POST', path: '/{id}/send', description: 'Send invoice to client' },
      { method: 'POST', path: '/{id}/remind', description: 'Send payment reminder' },
      { method: 'GET', path: '/{id}/pdf', description: 'Download PDF' },
      { method: 'POST', path: '/{id}/payments', description: 'Record payment' },
      { method: 'GET', path: '/templates', description: 'List templates' },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory',
    tagline: 'Stock & Warehouse Management',
    icon: 'cube-outline',
    color: '#10B981',
    baseUrl: '/api/inventory',
    endpoints: [
      { method: 'GET', path: '/items', description: 'List inventory items' },
      { method: 'POST', path: '/items', description: 'Create inventory item' },
      { method: 'GET', path: '/items/{id}', description: 'Get item details' },
      { method: 'PUT', path: '/items/{id}', description: 'Update item' },
      { method: 'POST', path: '/items/{id}/adjust', description: 'Adjust stock' },
      { method: 'GET', path: '/movements', description: 'Stock movements' },
      { method: 'POST', path: '/movements', description: 'Record movement' },
      { method: 'GET', path: '/locations', description: 'List locations' },
      { method: 'GET', path: '/alerts', description: 'Low stock alerts' },
      { method: 'GET', path: '/reports/valuation', description: 'Stock valuation' },
    ],
  },
  {
    id: 'unitxt',
    name: 'UniTxt',
    tagline: 'Bulk SMS & Messaging',
    icon: 'chatbubbles-outline',
    color: '#F59E0B',
    baseUrl: '/api/unitxt',
    endpoints: [
      { method: 'POST', path: '/messages/send', description: 'Send SMS' },
      { method: 'POST', path: '/messages/bulk', description: 'Send bulk SMS' },
      { method: 'GET', path: '/messages/{id}', description: 'Get message status' },
      { method: 'GET', path: '/messages', description: 'List sent messages' },
      { method: 'GET', path: '/contacts', description: 'List contacts' },
      { method: 'POST', path: '/contacts', description: 'Create contact' },
      { method: 'GET', path: '/groups', description: 'List contact groups' },
      { method: 'POST', path: '/groups', description: 'Create group' },
      { method: 'GET', path: '/campaigns', description: 'List campaigns' },
      { method: 'POST', path: '/campaigns', description: 'Create campaign' },
    ],
  },
  {
    id: 'loyalty',
    name: 'Loyalty',
    tagline: 'Customer Rewards & Points',
    icon: 'heart-outline',
    color: '#EC4899',
    baseUrl: '/api/loyalty',
    endpoints: [
      { method: 'GET', path: '/members', description: 'List loyalty members' },
      { method: 'POST', path: '/members', description: 'Enroll member' },
      { method: 'GET', path: '/members/{id}', description: 'Get member details' },
      { method: 'GET', path: '/members/{id}/points', description: 'Get points balance' },
      { method: 'POST', path: '/points/earn', description: 'Award points' },
      { method: 'POST', path: '/points/redeem', description: 'Redeem points' },
      { method: 'GET', path: '/rewards', description: 'List rewards' },
      { method: 'POST', path: '/rewards', description: 'Create reward' },
      { method: 'GET', path: '/tiers', description: 'List tier levels' },
      { method: 'GET', path: '/analytics', description: 'Loyalty analytics' },
    ],
  },
];

// Platform APIs (Auth, SSO, etc.)
const PLATFORM_APIS = [
  {
    category: 'Authentication & SSO',
    icon: 'shield-checkmark',
    color: '#6366F1',
    endpoints: [
      { method: 'GET', path: '/api/sso/.well-known/openid-configuration', description: 'OIDC Discovery' },
      { method: 'GET', path: '/api/sso/.well-known/jwks.json', description: 'JSON Web Key Set' },
      { method: 'GET', path: '/api/sso/oauth/authorize', description: 'Authorization endpoint' },
      { method: 'POST', path: '/api/sso/oauth/token', description: 'Token exchange' },
      { method: 'GET', path: '/api/sso/oauth/userinfo', description: 'User information' },
      { method: 'POST', path: '/api/sso/oauth/revoke', description: 'Revoke token' },
    ],
  },
  {
    category: 'Soko Ecosystem',
    icon: 'planet',
    color: '#00D4FF',
    endpoints: [
      { method: 'GET', path: '/api/galaxy/apps', description: 'List available apps' },
      { method: 'GET', path: '/api/galaxy/user/access', description: 'User app access' },
      { method: 'POST', path: '/api/galaxy/link', description: 'Link ecosystem product' },
      { method: 'GET', path: '/api/galaxy/linked-products', description: 'Linked products' },
      { method: 'POST', path: '/api/subscription/start-trial', description: 'Start app trial' },
    ],
  },
  {
    category: 'Webhooks & Events',
    icon: 'flash',
    color: '#EF4444',
    endpoints: [
      { method: 'GET', path: '/api/developer/webhooks/events', description: 'List event types' },
      { method: 'POST', path: '/api/developer/webhooks', description: 'Create webhook' },
      { method: 'GET', path: '/api/developer/webhooks', description: 'List webhooks' },
      { method: 'DELETE', path: '/api/developer/webhooks/{id}', description: 'Delete webhook' },
      { method: 'POST', path: '/api/developer/webhooks/{id}/test', description: 'Test webhook' },
    ],
  },
];

const CODE_EXAMPLES = {
  retailpro: `// Create a new sale in RetailPro
const response = await fetch('https://api.softwaregalaxy.com/api/retail/sales', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customer_id: 'cust_123',
    items: [
      { product_id: 'prod_456', quantity: 2, price: 29.99 }
    ],
    payment_method: 'card',
    location_id: 'loc_001'
  })
});

const sale = await response.json();
console.log('Sale ID:', sale.id);`,

  kwikpay: `// Initiate a payment with KwikPay
const response = await fetch('https://api.softwaregalaxy.com/api/kwikpay/payments/initiate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 5000,
    currency: 'KES',
    method: 'mobile_money',
    provider: 'mpesa',
    phone: '+254712345678',
    reference: 'ORDER-12345',
    callback_url: 'https://yourapp.com/webhook'
  })
});

const payment = await response.json();
// Redirect user or show payment instructions`,

  invoicing: `// Create and send an invoice
const response = await fetch('https://api.softwaregalaxy.com/api/invoices', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    client_email: 'client@example.com',
    client_name: 'Acme Corp',
    due_date: '2025-03-15',
    items: [
      { description: 'Consulting Services', quantity: 10, rate: 150 }
    ],
    notes: 'Thank you for your business!',
    send_immediately: true
  })
});

const invoice = await response.json();
console.log('Invoice #:', invoice.invoice_number);`,
};

export default function DevelopersPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [activeProduct, setActiveProduct] = useState<string | null>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState('retailpro');

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedEndpoint(text);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return '#10B981';
      case 'POST': return '#3B82F6';
      case 'PUT': return '#F59E0B';
      case 'DELETE': return '#EF4444';
      default: return THEME.textMuted;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <TouchableOpacity style={styles.logo} onPress={() => router.push('/landing')}>
            <Image 
              source={require('../assets/images/software-galaxy-logo.png')}
              style={{ width: 140, height: 38, resizeMode: 'contain' }}
            />
          </TouchableOpacity>
          
          {!isMobile && (
            <View style={styles.navLinks}>
              <TouchableOpacity onPress={() => router.push('/landing')}>
                <Text style={styles.navLink}>Home</Text>
              </TouchableOpacity>
              <Text style={[styles.navLink, styles.navLinkActive]}>Developers</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.ctaBtn}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.ctaBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <LinearGradient
          colors={[THEME.darker, THEME.dark]}
          style={styles.hero}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Ionicons name="code-slash" size={16} color={THEME.primary} />
              <Text style={styles.heroBadgeText}>DEVELOPER PORTAL</Text>
            </View>
            <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
              Build on the{'\n'}Soko Ecosystem
            </Text>
            <Text style={[styles.heroSubtitle, isMobile && styles.heroSubtitleMobile]}>
              Integrate with our suite of business tools using RESTful APIs.{'\n'}
              Connect RetailPro, KwikPay, Invoicing, and more into your applications.
            </Text>
            
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>6</Text>
                <Text style={styles.heroStatLabel}>Product APIs</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>REST</Text>
                <Text style={styles.heroStatLabel}>API Format</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>OAuth 2.0</Text>
                <Text style={styles.heroStatLabel}>Authentication</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Product APIs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionBadge}>PRODUCT APIs</Text>
            <Text style={styles.sectionTitle}>APIs by Product</Text>
            <Text style={styles.sectionSubtitle}>
              Each product in the Soko ecosystem has its own set of APIs
            </Text>
          </View>
          
          <View style={[styles.productGrid, isMobile && styles.productGridMobile]}>
            {PRODUCT_APIS.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.productApiCard,
                  activeProduct === product.id && styles.productApiCardActive,
                  isMobile && styles.productApiCardMobile,
                ]}
                onPress={() => setActiveProduct(activeProduct === product.id ? null : product.id)}
              >
                <View style={styles.productApiHeader}>
                  <View style={[styles.productApiIcon, { backgroundColor: `${product.color}20` }]}>
                    <Ionicons name={product.icon as any} size={24} color={product.color} />
                  </View>
                  <View style={styles.productApiInfo}>
                    <Text style={styles.productApiName}>{product.name}</Text>
                    <Text style={styles.productApiTagline}>{product.tagline}</Text>
                  </View>
                  <Ionicons 
                    name={activeProduct === product.id ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color={THEME.textMuted} 
                  />
                </View>
                
                <View style={styles.productApiBase}>
                  <Text style={styles.productApiBaseLabel}>Base URL:</Text>
                  <Text style={[styles.productApiBaseUrl, { color: product.color }]}>
                    {product.baseUrl}
                  </Text>
                </View>
                
                {activeProduct === product.id && (
                  <View style={styles.endpointsList}>
                    {product.endpoints.map((endpoint, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.endpointRow}
                        onPress={() => copyToClipboard(`${product.baseUrl}${endpoint.path}`)}
                      >
                        <View style={[styles.methodBadge, { backgroundColor: `${getMethodColor(endpoint.method)}20` }]}>
                          <Text style={[styles.methodText, { color: getMethodColor(endpoint.method) }]}>
                            {endpoint.method}
                          </Text>
                        </View>
                        <Text style={styles.endpointPath}>{endpoint.path}</Text>
                        <Text style={styles.endpointDesc}>{endpoint.description}</Text>
                        <Ionicons 
                          name={copiedEndpoint === `${product.baseUrl}${endpoint.path}` ? 'checkmark' : 'copy-outline'} 
                          size={14} 
                          color={THEME.textMuted} 
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Platform APIs */}
        <View style={[styles.section, styles.sectionDark]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionBadge, { backgroundColor: `${THEME.secondary}20`, color: THEME.secondary }]}>
              PLATFORM APIs
            </Text>
            <Text style={[styles.sectionTitle, { color: THEME.text }]}>Authentication & Platform</Text>
            <Text style={[styles.sectionSubtitle, { color: THEME.textMuted }]}>
              Core platform APIs for authentication, SSO, and ecosystem management
            </Text>
          </View>
          
          {PLATFORM_APIS.map((category, idx) => (
            <View key={idx} style={styles.platformCategory}>
              <View style={styles.platformCategoryHeader}>
                <View style={[styles.platformCategoryIcon, { backgroundColor: `${category.color}20` }]}>
                  <Ionicons name={category.icon as any} size={20} color={category.color} />
                </View>
                <Text style={styles.platformCategoryTitle}>{category.category}</Text>
              </View>
              
              <View style={styles.platformEndpoints}>
                {category.endpoints.map((endpoint, eIdx) => (
                  <TouchableOpacity
                    key={eIdx}
                    style={styles.platformEndpointRow}
                    onPress={() => copyToClipboard(endpoint.path)}
                  >
                    <View style={[styles.methodBadge, { backgroundColor: `${getMethodColor(endpoint.method)}20` }]}>
                      <Text style={[styles.methodText, { color: getMethodColor(endpoint.method) }]}>
                        {endpoint.method}
                      </Text>
                    </View>
                    <Text style={styles.platformEndpointPath}>{endpoint.path}</Text>
                    <Text style={styles.platformEndpointDesc}>{endpoint.description}</Text>
                    <Ionicons 
                      name={copiedEndpoint === endpoint.path ? 'checkmark' : 'copy-outline'} 
                      size={14} 
                      color={THEME.textMuted} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Code Examples */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionBadge}>CODE EXAMPLES</Text>
            <Text style={styles.sectionTitle}>Quick Start</Text>
            <Text style={styles.sectionSubtitle}>
              Sample code to integrate each product
            </Text>
          </View>
          
          {/* Code Tabs */}
          <View style={styles.codeTabs}>
            {[
              { id: 'retailpro', name: 'RetailPro', color: '#3B82F6' },
              { id: 'kwikpay', name: 'KwikPay', color: '#00D4FF' },
              { id: 'invoicing', name: 'Invoicing', color: '#8B5CF6' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.codeTab,
                  activeCodeTab === tab.id && [styles.codeTabActive, { borderBottomColor: tab.color }],
                ]}
                onPress={() => setActiveCodeTab(tab.id)}
              >
                <Text style={[
                  styles.codeTabText,
                  activeCodeTab === tab.id && { color: tab.color },
                ]}>
                  {tab.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.codeBlock}>
            <View style={styles.codeHeader}>
              <View style={styles.codeControls}>
                <View style={[styles.codeControl, { backgroundColor: '#FF5F57' }]} />
                <View style={[styles.codeControl, { backgroundColor: '#FEBC2E' }]} />
                <View style={[styles.codeControl, { backgroundColor: '#28C840' }]} />
              </View>
              <Text style={styles.codeTitle}>JavaScript</Text>
              <TouchableOpacity onPress={() => copyToClipboard(CODE_EXAMPLES[activeCodeTab as keyof typeof CODE_EXAMPLES])}>
                <Ionicons name="copy-outline" size={18} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={styles.codeText}>
                {CODE_EXAMPLES[activeCodeTab as keyof typeof CODE_EXAMPLES]}
              </Text>
            </ScrollView>
          </View>
        </View>

        {/* Soko Ecosystem Section */}
        <View style={[styles.section, styles.sectionDark]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sokoLogo}>
              <LinearGradient
                colors={[THEME.primary, THEME.secondary]}
                style={styles.sokoLogoGradient}
              >
                <Ionicons name="planet" size={32} color={THEME.text} />
              </LinearGradient>
            </View>
            <Text style={[styles.sectionTitle, { color: THEME.text, marginTop: 20 }]}>
              The Soko Ecosystem
            </Text>
            <Text style={[styles.sectionSubtitle, { color: THEME.textMuted, maxWidth: 600 }]}>
              Soko is our unified business platform where all products work together seamlessly.
              Build once, integrate everywhere.
            </Text>
          </View>
          
          <View style={[styles.ecosystemGrid, isMobile && styles.ecosystemGridMobile]}>
            <View style={styles.ecosystemCard}>
              <Ionicons name="git-network-outline" size={32} color={THEME.primary} />
              <Text style={styles.ecosystemCardTitle}>Unified Data</Text>
              <Text style={styles.ecosystemCardDesc}>
                Customer, product, and transaction data flows seamlessly between all connected apps
              </Text>
            </View>
            <View style={styles.ecosystemCard}>
              <Ionicons name="key-outline" size={32} color={THEME.primary} />
              <Text style={styles.ecosystemCardTitle}>Single Sign-On</Text>
              <Text style={styles.ecosystemCardDesc}>
                One authentication for all products. Users sign in once, access everything
              </Text>
            </View>
            <View style={styles.ecosystemCard}>
              <Ionicons name="sync-outline" size={32} color={THEME.primary} />
              <Text style={styles.ecosystemCardTitle}>Real-time Sync</Text>
              <Text style={styles.ecosystemCardDesc}>
                Changes in one app reflect instantly across the ecosystem via webhooks
              </Text>
            </View>
          </View>
          
          <View style={styles.ecosystemDiagram}>
            <Text style={styles.diagramTitle}>How Apps Connect</Text>
            <View style={styles.diagramContent}>
              <View style={styles.diagramCenter}>
                <LinearGradient
                  colors={[THEME.primary, THEME.secondary]}
                  style={styles.diagramCenterGradient}
                >
                  <Text style={styles.diagramCenterText}>SOKO</Text>
                  <Text style={styles.diagramCenterSubtext}>Platform</Text>
                </LinearGradient>
              </View>
              <View style={styles.diagramApps}>
                {PRODUCT_APIS.slice(0, 6).map((product, idx) => (
                  <View key={product.id} style={[styles.diagramApp, { borderColor: product.color }]}>
                    <Ionicons name={product.icon as any} size={16} color={product.color} />
                    <Text style={[styles.diagramAppName, { color: product.color }]}>{product.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* CTA */}
        <LinearGradient
          colors={[THEME.primary, THEME.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaSection}
        >
          <Text style={styles.ctaTitle}>Ready to Build?</Text>
          <Text style={styles.ctaSubtitle}>
            Contact us to get your API credentials and start integrating
          </Text>
          <TouchableOpacity style={styles.ctaButton}>
            <Ionicons name="mail" size={20} color={THEME.primary} />
            <Text style={styles.ctaButtonText}>Contact Developer Support</Text>
          </TouchableOpacity>
        </LinearGradient>

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
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 16,
    backgroundColor: THEME.text,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerMobile: {
    paddingHorizontal: 20,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: THEME.textMuted,
    letterSpacing: 2,
  },
  logoName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.dark,
    marginTop: -2,
  },
  navLinks: {
    flexDirection: 'row',
    gap: 32,
  },
  navLink: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.textSubtle,
  },
  navLinkActive: {
    color: THEME.primary,
    fontWeight: '600',
  },
  ctaBtn: {
    backgroundColor: THEME.dark,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  ctaBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  // Hero
  hero: {
    paddingVertical: 80,
    paddingHorizontal: 48,
  },
  heroContent: {
    maxWidth: 800,
    alignSelf: 'center',
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${THEME.primary}20`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.primary,
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 52,
    fontWeight: '800',
    color: THEME.text,
    textAlign: 'center',
    lineHeight: 60,
  },
  heroTitleMobile: {
    fontSize: 36,
    lineHeight: 44,
  },
  heroSubtitle: {
    fontSize: 18,
    color: THEME.textMuted,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 28,
  },
  heroSubtitleMobile: {
    fontSize: 16,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 24,
    marginTop: 48,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  heroStatItem: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  heroStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.primary,
  },
  heroStatLabel: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 4,
  },
  heroStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: THEME.border,
  },
  // Sections
  section: {
    paddingHorizontal: 48,
    paddingVertical: 80,
  },
  sectionDark: {
    backgroundColor: THEME.dark,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
    backgroundColor: `${THEME.primary}15`,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    letterSpacing: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: THEME.dark,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 16,
    color: THEME.textSubtle,
    textAlign: 'center',
    marginTop: 12,
  },
  // Product APIs
  productGrid: {
    gap: 16,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  productGridMobile: {
    maxWidth: '100%',
  },
  productApiCard: {
    backgroundColor: THEME.text,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productApiCardActive: {
    borderColor: THEME.primary,
    borderWidth: 2,
  },
  productApiCardMobile: {
    padding: 20,
  },
  productApiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productApiIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  productApiInfo: {
    flex: 1,
  },
  productApiName: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.dark,
  },
  productApiTagline: {
    fontSize: 13,
    color: THEME.textMuted,
    marginTop: 2,
  },
  productApiBase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  productApiBaseLabel: {
    fontSize: 12,
    color: THEME.textSubtle,
  },
  productApiBaseUrl: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  endpointsList: {
    marginTop: 20,
    gap: 8,
  },
  endpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.lightBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 10,
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 46,
    alignItems: 'center',
  },
  methodText: {
    fontSize: 10,
    fontWeight: '700',
  },
  endpointPath: {
    flex: 1,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: THEME.dark,
  },
  endpointDesc: {
    fontSize: 11,
    color: THEME.textSubtle,
    maxWidth: 150,
  },
  // Platform APIs
  platformCategory: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  platformCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  platformCategoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  platformCategoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
  },
  platformEndpoints: {
    gap: 8,
  },
  platformEndpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.darker,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 10,
  },
  platformEndpointPath: {
    flex: 1,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: THEME.text,
  },
  platformEndpointDesc: {
    fontSize: 11,
    color: THEME.textMuted,
    maxWidth: 140,
  },
  // Code Examples
  codeTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 24,
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  codeTab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  codeTabActive: {
    borderBottomWidth: 2,
  },
  codeTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.textSubtle,
  },
  codeBlock: {
    backgroundColor: THEME.dark,
    borderRadius: 16,
    overflow: 'hidden',
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: THEME.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  codeControls: {
    flexDirection: 'row',
    gap: 8,
  },
  codeControl: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  codeTitle: {
    fontSize: 13,
    color: THEME.textMuted,
  },
  codeText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: THEME.text,
    padding: 20,
    lineHeight: 22,
  },
  // Ecosystem
  sokoLogo: {
    marginBottom: 0,
  },
  sokoLogoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ecosystemGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 48,
  },
  ecosystemGridMobile: {
    flexDirection: 'column',
  },
  ecosystemCard: {
    width: 280,
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  ecosystemCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
    marginTop: 16,
    marginBottom: 8,
  },
  ecosystemCardDesc: {
    fontSize: 14,
    color: THEME.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  ecosystemDiagram: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 32,
    maxWidth: 600,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  diagramTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  diagramContent: {
    alignItems: 'center',
  },
  diagramCenter: {
    marginBottom: 24,
  },
  diagramCenterGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagramCenterText: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.dark,
  },
  diagramCenterSubtext: {
    fontSize: 10,
    color: THEME.dark,
    opacity: 0.7,
  },
  diagramApps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  diagramApp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: THEME.darker,
  },
  diagramAppName: {
    fontSize: 12,
    fontWeight: '600',
  },
  // CTA
  ctaSection: {
    paddingVertical: 80,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: THEME.dark,
    marginBottom: 12,
  },
  ctaSubtitle: {
    fontSize: 16,
    color: THEME.dark,
    opacity: 0.8,
    marginBottom: 32,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.dark,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 12,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  // Footer
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
    backgroundColor: THEME.darker,
  },
  footerText: {
    fontSize: 13,
    color: THEME.textSubtle,
  },
});
