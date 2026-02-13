import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  TextInput,
  Animated,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import ProductSwitcher from '../../src/components/ProductSwitcher';

const isWeb = Platform.OS === 'web';

// Theme
const THEME = {
  primary: '#00D4FF',
  secondary: '#7B61FF',
  dark: '#0A0A0F',
  darker: '#050508',
  card: '#12121A',
  border: '#2A2A35',
  text: '#FFFFFF',
  textMuted: '#8B8B9E',
};

// All Products Data
const ALL_PRODUCTS = [
  {
    id: 'retail-pro',
    name: 'RetailPro',
    tagline: 'Complete POS System',
    icon: 'storefront-outline',
    color: '#3B82F6',
    category: 'Sales & Operations',
    keywords: ['pos', 'point of sale', 'retail', 'sales', 'checkout', 'store'],
    route: '/products/retail-pro',
  },
  {
    id: 'inventory',
    name: 'Inventory',
    tagline: 'Stock Management',
    icon: 'cube-outline',
    color: '#10B981',
    category: 'Sales & Operations',
    keywords: ['stock', 'warehouse', 'tracking', 'inventory', 'products'],
    route: '/products/inventory',
  },
  {
    id: 'invoicing',
    name: 'Invoicing',
    tagline: 'Professional Billing',
    icon: 'document-text-outline',
    color: '#8B5CF6',
    category: 'Finance',
    keywords: ['invoice', 'billing', 'quotes', 'payments', 'accounts'],
    route: '/products/invoicing',
  },
  {
    id: 'bulk-sms',
    name: 'UniTxt',
    tagline: 'Bulk Messaging',
    icon: 'chatbubbles-outline',
    color: '#F59E0B',
    category: 'Marketing',
    keywords: ['sms', 'messaging', 'bulk', 'campaigns', 'text', 'unitxt'],
    route: '/products/bulk-sms',
  },
  {
    id: 'loyalty',
    name: 'Loyalty',
    tagline: 'Rewards Program',
    icon: 'heart-outline',
    color: '#EC4899',
    category: 'Marketing',
    keywords: ['loyalty', 'rewards', 'points', 'customers', 'retention'],
    route: '/products/loyalty',
    comingSoon: true,
  },
  {
    id: 'kwikpay',
    name: 'KwikPay',
    tagline: 'Payment Processing',
    icon: 'card-outline',
    color: '#00D4FF',
    category: 'Finance',
    keywords: ['payments', 'cards', 'mobile money', 'mpesa', 'transactions'],
    route: '/products/kwikpay',
  },
  {
    id: 'accounting',
    name: 'Accounting',
    tagline: 'Business Accounting',
    icon: 'calculator-outline',
    color: '#06B6D4',
    category: 'Finance',
    keywords: ['accounting', 'bookkeeping', 'tax', 'finance', 'reports'],
    route: '/products/accounting',
    comingSoon: true,
  },
  {
    id: 'crm',
    name: 'CRM',
    tagline: 'Sales Management',
    icon: 'people-outline',
    color: '#6366F1',
    category: 'Sales & Operations',
    keywords: ['crm', 'leads', 'sales', 'pipeline', 'customers', 'deals'],
    route: '/products/crm',
    comingSoon: true,
  },
  {
    id: 'expenses',
    name: 'Expenses',
    tagline: 'Expense Management',
    icon: 'receipt-outline',
    color: '#EF4444',
    category: 'Finance',
    keywords: ['expenses', 'receipts', 'tracking', 'reimbursement', 'costs'],
    route: '/products/expenses',
    comingSoon: true,
  },
];

// Group products by category
const PRODUCT_CATEGORIES = {
  'Sales & Operations': ALL_PRODUCTS.filter(p => p.category === 'Sales & Operations'),
  'Finance': ALL_PRODUCTS.filter(p => p.category === 'Finance'),
  'Marketing': ALL_PRODUCTS.filter(p => p.category === 'Marketing'),
};

// Quick Links for Search
const QUICK_LINKS = [
  { name: 'Features', route: '/features', icon: 'grid-outline' },
  { name: 'Pricing', route: '/pricing', icon: 'pricetag-outline' },
  { name: 'Developers', route: '/developers', icon: 'code-slash-outline' },
  { name: 'Compare Products', route: '/features', icon: 'git-compare-outline' },
];

// Web Mega Menu Overlay - Using native HTML elements for web
interface MegaMenuOverlayProps {
  children: React.ReactNode;
  onClose: () => void;
}

function MegaMenuOverlay({ children, onClose }: MegaMenuOverlayProps) {
  useEffect(() => {
    if (!isWeb) return;
    
    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isWeb) return null;

  // Use native div elements for web to avoid React Native for Web's styling conflicts
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
      }}
      data-testid="mega-menu-overlay"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          cursor: 'pointer',
        }}
        data-testid="mega-menu-backdrop"
      />
      
      {/* Menu Container */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          backgroundColor: '#12121A',
          borderRadius: 12,
          border: '1px solid #2A2A35',
          boxShadow: '0 16px 32px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
        data-testid="mega-menu-container"
      >
        {children}
      </div>
    </div>
  );
}

interface MarketingNavProps {
  transparent?: boolean;
  currentProduct?: string;
}

export default function MarketingNav({ transparent = false, currentProduct }: MarketingNavProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  const { isAuthenticated, user } = useAuthStore();
  
  // State
  const [showProductsMenu, setShowProductsMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof ALL_PRODUCTS>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Refs
  const searchInputRef = useRef<TextInput>(null);
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    if (!isWeb) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowProductsMenu(false);
        setSearchQuery('');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const results = ALL_PRODUCTS.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.tagline.toLowerCase().includes(query) ||
      product.keywords.some(kw => kw.includes(query))
    );
    
    setSearchResults(results);
  }, [searchQuery]);
  
  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [showSearch]);
  
  // Handle menu hover (desktop)
  const handleMenuEnter = () => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }
    setShowProductsMenu(true);
  };
  
  const handleMenuLeave = () => {
    menuTimeoutRef.current = setTimeout(() => {
      setShowProductsMenu(false);
    }, 150);
  };
  
  // Navigate to product
  const navigateToProduct = (route: string) => {
    setShowProductsMenu(false);
    setShowSearch(false);
    setSearchQuery('');
    router.push(route as any);
  };
  
  // CSS for animations
  const webStyles = isWeb ? `
    .mega-menu-enter { animation: slideDown 0.2s ease forwards; }
    @keyframes slideDown { 
      from { opacity: 0; transform: translateY(-10px); } 
      to { opacity: 1; transform: translateY(0); } 
    }
    .search-enter { animation: fadeIn 0.15s ease forwards; }
    @keyframes fadeIn { 
      from { opacity: 0; } 
      to { opacity: 1; } 
    }
    .product-item:hover { background: rgba(255,255,255,0.05); }
    .nav-link:hover { color: #00D4FF; }
    .search-result:hover { background: rgba(0,212,255,0.1); }
  ` : '';
  
  return (
    <>
      {isWeb && <style dangerouslySetInnerHTML={{ __html: webStyles }} />}
      
      <View style={[styles.nav, transparent && styles.navTransparent, isMobile && styles.navMobile]}>
        {/* Logo - with light container for dark background */}
        <TouchableOpacity 
          style={[styles.logo, styles.logoContainer]} 
          onPress={() => router.push('/landing')}
        >
          <Image 
            source={require('../../assets/images/software-galaxy-logo.png')}
            style={{ width: 130, height: 34, resizeMode: 'contain' }}
          />
        </TouchableOpacity>
        
        {/* Desktop Navigation */}
        {!isMobile && (
          <View style={styles.navCenter}>
            {/* Products Dropdown */}
            <Pressable 
              style={styles.navItem}
              onPress={() => setShowProductsMenu(true)}
              onMouseEnter={handleMenuEnter}
              onMouseLeave={handleMenuLeave}
            >
              <View style={styles.navLinkWrapper}>
                <Text style={[styles.navLink, showProductsMenu && styles.navLinkActive]} className="nav-link">
                  Products
                </Text>
                <Ionicons 
                  name={showProductsMenu ? 'chevron-up' : 'chevron-down'} 
                  size={14} 
                  color={showProductsMenu ? THEME.primary : THEME.textMuted} 
                />
              </View>
            </Pressable>
            
            {/* Other Nav Links */}
            <TouchableOpacity onPress={() => router.push('/features')}>
              <Text style={styles.navLink} className="nav-link">Features</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/developers')}>
              <Text style={styles.navLink} className="nav-link">Developers</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Right Actions */}
        <View style={styles.navActions}>
          {/* Search Button */}
          <TouchableOpacity 
            style={styles.searchBtn}
            onPress={() => setShowSearch(!showSearch)}
            data-testid="search-btn"
          >
            <Ionicons name="search" size={20} color={THEME.textMuted} />
          </TouchableOpacity>
          
          {isAuthenticated ? (
            <>
              <ProductSwitcher currentProductId="home" />
              <View style={styles.userBadge}>
                <Text style={styles.userInitial}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            </>
          ) : (
            <>
              {!isMobile && (
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.ctaBtn}
                onPress={() => router.push('/(auth)/register')}
              >
                <Text style={styles.ctaBtnText}>{isMobile ? 'Start' : 'Start Free Trial'}</Text>
              </TouchableOpacity>
            </>
          )}
          
          {/* Mobile Menu Toggle */}
          {isMobile && (
            <TouchableOpacity 
              style={styles.mobileMenuBtn}
              onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Ionicons name={mobileMenuOpen ? 'close' : 'menu'} size={24} color={THEME.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Search Overlay */}
      {showSearch && (
        <View style={styles.searchOverlay} className="search-enter">
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color={THEME.textMuted} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search products, features..."
                placeholderTextColor={THEME.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); }}>
                <Ionicons name="close-circle" size={20} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>
            
            {/* Search Results */}
            {searchQuery.trim() !== '' && (
              <View style={styles.searchResults}>
                {searchResults.length > 0 ? (
                  <>
                    <Text style={styles.searchResultsLabel}>Products</Text>
                    {searchResults.map(product => (
                      <TouchableOpacity
                        key={product.id}
                        style={styles.searchResultItem}
                        onPress={() => navigateToProduct(product.route)}
                        className="search-result"
                      >
                        <View style={[styles.searchResultIcon, { backgroundColor: `${product.color}20` }]}>
                          <Ionicons name={product.icon as any} size={18} color={product.color} />
                        </View>
                        <View style={styles.searchResultText}>
                          <Text style={styles.searchResultName}>{product.name}</Text>
                          <Text style={styles.searchResultTagline}>{product.tagline}</Text>
                        </View>
                        {product.comingSoon && (
                          <View style={styles.comingSoonBadge}>
                            <Text style={styles.comingSoonText}>Soon</Text>
                          </View>
                        )}
                        <Ionicons name="arrow-forward" size={16} color={THEME.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </>
                ) : (
                  <View style={styles.noResults}>
                    <Ionicons name="search-outline" size={32} color={THEME.textMuted} />
                    <Text style={styles.noResultsText}>No products found for "{searchQuery}"</Text>
                    <TouchableOpacity onPress={() => navigateToProduct('/features')}>
                      <Text style={styles.noResultsLink}>Browse all products →</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            
            {/* Default Quick Links when no search */}
            {searchQuery.trim() === '' && (
              <View style={styles.quickLinks}>
                <Text style={styles.quickLinksLabel}>Quick Access</Text>
                <View style={styles.quickLinksGrid}>
                  {ALL_PRODUCTS.slice(0, 6).map(product => (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.quickLinkItem}
                      onPress={() => navigateToProduct(product.route)}
                    >
                      <View style={[styles.quickLinkIcon, { backgroundColor: `${product.color}15` }]}>
                        <Ionicons name={product.icon as any} size={20} color={product.color} />
                      </View>
                      <Text style={styles.quickLinkName}>{product.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
          
          {/* Click outside to close */}
          <TouchableOpacity 
            style={styles.searchBackdrop} 
            onPress={() => { setShowSearch(false); setSearchQuery(''); }}
            activeOpacity={1}
          />
        </View>
      )}
      
      {/* Mobile Menu */}
      {isMobile && mobileMenuOpen && (
        <View style={styles.mobileMenu}>
          <Text style={styles.mobileMenuLabel}>Products</Text>
          {ALL_PRODUCTS.map(product => (
            <TouchableOpacity
              key={product.id}
              style={styles.mobileMenuItem}
              onPress={() => { setMobileMenuOpen(false); navigateToProduct(product.route); }}
            >
              <View style={[styles.mobileMenuIcon, { backgroundColor: `${product.color}20` }]}>
                <Ionicons name={product.icon as any} size={18} color={product.color} />
              </View>
              <Text style={styles.mobileMenuItemText}>{product.name}</Text>
              {product.comingSoon && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Soon</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          
          <View style={styles.mobileMenuDivider} />
          
          <TouchableOpacity
            style={styles.mobileMenuItem}
            onPress={() => { setMobileMenuOpen(false); router.push('/features'); }}
          >
            <View style={styles.mobileMenuIcon}>
              <Ionicons name="grid-outline" size={18} color={THEME.textMuted} />
            </View>
            <Text style={styles.mobileMenuItemText}>Features</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mobileMenuItem}
            onPress={() => { setMobileMenuOpen(false); router.push('/developers'); }}
          >
            <View style={styles.mobileMenuIcon}>
              <Ionicons name="code-slash-outline" size={18} color={THEME.textMuted} />
            </View>
            <Text style={styles.mobileMenuItemText}>Developers</Text>
          </TouchableOpacity>
          
          {!isAuthenticated && (
            <>
              <View style={styles.mobileMenuDivider} />
              <TouchableOpacity
                style={styles.mobileMenuItem}
                onPress={() => { setMobileMenuOpen(false); router.push('/(auth)/login'); }}
              >
                <View style={styles.mobileMenuIcon}>
                  <Ionicons name="log-in-outline" size={18} color={THEME.textMuted} />
                </View>
                <Text style={styles.mobileMenuItemText}>Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
      
      {/* Desktop Mega Menu - Rendered with web-specific fixed positioning */}
      {!isMobile && showProductsMenu && isWeb && (
        <MegaMenuOverlay onClose={() => setShowProductsMenu(false)}>
          <View 
            style={styles.megaMenuInner}
            onMouseEnter={handleMenuEnter}
            onMouseLeave={handleMenuLeave}
          >
            {/* Product Categories */}
            <View style={styles.megaMenuMain}>
              {Object.entries(PRODUCT_CATEGORIES).map(([category, products]) => (
                <View key={category} style={styles.megaMenuCategory}>
                  <Text style={styles.megaMenuCategoryTitle}>{category}</Text>
                  {products.map(product => (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.megaMenuItem}
                      onPress={() => navigateToProduct(product.route)}
                      data-testid={`mega-menu-product-${product.id}`}
                    >
                      <View style={[styles.megaMenuIcon, { backgroundColor: `${product.color}20` }]}>
                        <Ionicons name={product.icon as any} size={16} color={product.color} />
                      </View>
                      <View style={styles.megaMenuItemText}>
                        <View style={styles.megaMenuItemHeader}>
                          <Text style={styles.megaMenuItemName}>{product.name}</Text>
                          {product.comingSoon && (
                            <View style={styles.comingSoonBadge}>
                              <Text style={styles.comingSoonText}>Soon</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.megaMenuItemTagline}>{product.tagline}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
            
            {/* Quick Links Sidebar */}
            <View style={styles.megaMenuSidebar}>
              <Text style={styles.megaMenuSidebarTitle}>Quick Links</Text>
              <TouchableOpacity 
                style={styles.megaMenuSidebarLink}
                onPress={() => navigateToProduct('/features')}
                data-testid="mega-menu-compare-products"
              >
                <Ionicons name="apps-outline" size={14} color={THEME.textMuted} />
                <Text style={styles.megaMenuSidebarLinkText}>Compare All Products</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.megaMenuSidebarLink}
                onPress={() => navigateToProduct('/developers')}
                data-testid="mega-menu-api-docs"
              >
                <Ionicons name="code-slash-outline" size={14} color={THEME.textMuted} />
                <Text style={styles.megaMenuSidebarLinkText}>API Documentation</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.megaMenuSidebarLink}
                onPress={() => navigateToProduct('/landing#pricing')}
                data-testid="mega-menu-pricing"
              >
                <Ionicons name="pricetag-outline" size={14} color={THEME.textMuted} />
                <Text style={styles.megaMenuSidebarLinkText}>Pricing Plans</Text>
              </TouchableOpacity>
              
              {/* CTA in Sidebar */}
              <View style={styles.megaMenuCTA}>
                <Text style={styles.megaMenuCTATitle}>Not sure where to start?</Text>
                <TouchableOpacity 
                  style={styles.megaMenuCTAButton}
                  onPress={() => navigateToProduct('/features')}
                  data-testid="mega-menu-explore-features"
                >
                  <Text style={styles.megaMenuCTAButtonText}>Explore Features</Text>
                  <Ionicons name="arrow-forward" size={12} color={THEME.dark} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </MegaMenuOverlay>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: THEME.dark,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    zIndex: 9999,
    position: 'relative',
  },
  navTransparent: {
    backgroundColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  navMobile: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
  },
  logoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: THEME.textMuted,
    letterSpacing: 2,
  },
  logoName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: 1,
  },
  navCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  navItem: {
    position: 'relative',
    zIndex: 10000,
  },
  navLinkWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navLink: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.textMuted,
    transition: 'color 0.2s ease',
  },
  navLinkActive: {
    color: THEME.primary,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: THEME.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.textMuted,
    marginRight: 8,
  },
  ctaBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  ctaBtnText: {
    color: THEME.dark,
    fontWeight: '600',
    fontSize: 14,
  },
  userBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitial: {
    color: THEME.text,
    fontWeight: '700',
    fontSize: 14,
  },
  mobileMenuBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Mega Menu
  megaMenuOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
  },
  megaMenuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  megaMenu: {
    position: 'fixed',
    top: 65,
    left: '50%',
    marginLeft: -360,
    width: 720,
    backgroundColor: THEME.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
    overflow: 'visible',
    zIndex: 9999,
  },
  megaMenuInner: {
    flexDirection: 'row',
  },
  megaMenuMain: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
    gap: 16,
  },
  megaMenuCategory: {
    flex: 1,
  },
  megaMenuCategoryTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  megaMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 6,
    borderRadius: 8,
    marginBottom: 2,
  },
  megaMenuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  megaMenuItemText: {
    flex: 1,
  },
  megaMenuItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  megaMenuItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.text,
  },
  megaMenuItemTagline: {
    fontSize: 10,
    color: THEME.textMuted,
    marginTop: 1,
  },
  comingSoonBadge: {
    backgroundColor: THEME.secondary + '30',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  comingSoonText: {
    fontSize: 8,
    fontWeight: '700',
    color: THEME.secondary,
    textTransform: 'uppercase',
  },
  megaMenuSidebar: {
    width: 180,
    backgroundColor: THEME.darker,
    padding: 14,
    borderLeftWidth: 1,
    borderLeftColor: THEME.border,
  },
  megaMenuSidebarTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  megaMenuSidebarLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  megaMenuSidebarLinkText: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  megaMenuCTA: {
    marginTop: 12,
    padding: 12,
    backgroundColor: THEME.card,
    borderRadius: 10,
  },
  megaMenuCTATitle: {
    fontSize: 10,
    color: THEME.textMuted,
    marginBottom: 8,
  },
  megaMenuCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: THEME.primary,
    paddingVertical: 8,
    borderRadius: 6,
  },
  megaMenuCTAButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.dark,
  },
  
  // Search Overlay
  searchOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20000,
  },
  searchBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 20001,
  },
  searchContainer: {
    position: 'fixed',
    top: 100,
    left: '50%',
    transform: [{ translateX: -300 }],
    width: 600,
    backgroundColor: THEME.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
    zIndex: 20002,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: THEME.text,
    outlineStyle: 'none',
  },
  searchResults: {
    padding: 12,
    maxHeight: 400,
  },
  searchResultsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
  },
  searchResultIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultText: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  searchResultTagline: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  noResults: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  noResultsText: {
    fontSize: 14,
    color: THEME.textMuted,
  },
  noResultsLink: {
    fontSize: 14,
    color: THEME.primary,
    fontWeight: '600',
  },
  quickLinks: {
    padding: 16,
  },
  quickLinksLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickLinkItem: {
    alignItems: 'center',
    gap: 8,
    width: 80,
    padding: 12,
    borderRadius: 12,
    backgroundColor: THEME.darker,
  },
  quickLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkName: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.text,
    textAlign: 'center',
  },
  
  // Mobile Menu
  mobileMenu: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    backgroundColor: THEME.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    padding: 16,
    zIndex: 999,
  },
  mobileMenuLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 8,
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
  },
  mobileMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: THEME.darker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileMenuItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: THEME.text,
  },
  mobileMenuDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 12,
  },
});
