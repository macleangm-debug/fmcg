import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProductUpsell {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: string[];
  buttonText: string;
  buttonColor: string;
}

const ALL_PRODUCTS: ProductUpsell[] = [
  {
    id: 'unitxt',
    name: 'UniTxt',
    tagline: 'Reach your customers instantly',
    description: 'Send promotional messages, alerts, and notifications to thousands of customers at once.',
    icon: 'chatbubbles-outline',
    gradient: ['#FEF3C7', '#FDE68A'],
    buttonText: 'Start SMS Campaigns',
    buttonColor: '#D97706',
  },
  {
    id: 'inventory',
    name: 'Inventory',
    tagline: 'Never run out of stock',
    description: 'Track stock levels, get low-stock alerts, and manage your warehouse efficiently.',
    icon: 'cube-outline',
    gradient: ['#DBEAFE', '#BFDBFE'],
    buttonText: 'Manage Stock',
    buttonColor: '#2563EB',
  },
  {
    id: 'invoicing',
    name: 'Invoicing',
    tagline: 'Professional invoices in seconds',
    description: 'Create, send, and track invoices. Get paid faster with automated reminders.',
    icon: 'document-text-outline',
    gradient: ['#E0E7FF', '#C7D2FE'],
    buttonText: 'Create Invoices',
    buttonColor: '#4F46E5',
  },
  {
    id: 'kwikpay',
    name: 'KwikPay',
    tagline: 'Accept payments anywhere',
    description: 'Mobile money, cards, and bank transfers. All payments in one place.',
    icon: 'wallet-outline',
    gradient: ['#D1FAE5', '#A7F3D0'],
    buttonText: 'Setup Payments',
    buttonColor: '#059669',
  },
  {
    id: 'expenses',
    name: 'Expenses',
    tagline: 'Track every shilling',
    description: 'Monitor business expenses, categorize spending, and optimize your budget.',
    icon: 'receipt-outline',
    gradient: ['#FEE2E2', '#FECACA'],
    buttonText: 'Track Expenses',
    buttonColor: '#DC2626',
  },
  {
    id: 'loyalty',
    name: 'Loyalty',
    tagline: 'Reward your best customers',
    description: 'Build customer loyalty with points, rewards, and special offers.',
    icon: 'gift-outline',
    gradient: ['#FCE7F3', '#FBCFE8'],
    buttonText: 'Start Rewards',
    buttonColor: '#DB2777',
  },
];

interface EcosystemUpsellBannerProps {
  subscribedProducts: string[];
  currentProduct: string;
  onStartTrial: (productId: string) => void;
}

const EcosystemUpsellBanner: React.FC<EcosystemUpsellBannerProps> = ({
  subscribedProducts,
  currentProduct,
  onStartTrial,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { width } = Dimensions.get('window');
  const cardWidth = Math.min(width * 0.85, 340);
  
  const unsubscribedProducts = ALL_PRODUCTS.filter(
    p => !subscribedProducts.includes(p.id) && p.id !== currentProduct
  );

  useEffect(() => {
    if (unsubscribedProducts.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % unsubscribedProducts.length;
        scrollViewRef.current?.scrollTo({ x: next * (cardWidth + 12), animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [unsubscribedProducts.length, cardWidth]);

  if (unsubscribedProducts.length === 0) return null;

  const handleScroll = (event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollX / (cardWidth + 12));
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Grow Your Business</Text>
        <View style={styles.dotContainer}>
          {unsubscribedProducts.map((_, index) => (
            <View key={index} style={[styles.dot, activeIndex === index && styles.dotActive]} />
          ))}
        </View>
      </View>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={cardWidth + 12}
        contentContainerStyle={styles.scrollContent}
      >
        {unsubscribedProducts.map((product) => (
          <View key={product.id} style={[styles.card, { width: cardWidth, backgroundColor: product.gradient[0] }]}>
            <View style={[styles.decorCircle, { backgroundColor: product.gradient[1] }]} />
            <View style={[styles.decorDiamond, { backgroundColor: product.buttonColor }]} />
            <View style={styles.iconContainer}>
              <Ionicons name={product.icon} size={24} color={product.buttonColor} />
            </View>
            <Text style={styles.cardTitle}>{product.tagline}</Text>
            <Text style={styles.cardDescription}>{product.description}</Text>
            <TouchableOpacity style={[styles.ctaButton, { backgroundColor: product.buttonColor }]} onPress={() => onStartTrial(product.id)} activeOpacity={0.85}>
              <Text style={styles.ctaButtonText}>{product.buttonText}</Text>
            </TouchableOpacity>
            <View style={[styles.productBadge, { backgroundColor: product.buttonColor + '20' }]}>
              <Text style={[styles.productBadgeText, { color: product.buttonColor }]}>{product.name}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  dotContainer: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
  dotActive: { backgroundColor: '#3B82F6', width: 18 },
  scrollContent: { paddingRight: 16 },
  card: { borderRadius: 16, padding: 20, marginRight: 12, minHeight: 200, position: 'relative', overflow: 'hidden' },
  decorCircle: { position: 'absolute', width: 120, height: 120, borderRadius: 60, top: -30, right: -30, opacity: 0.5 },
  decorDiamond: { position: 'absolute', width: 20, height: 20, top: 20, right: 60, transform: [{ rotate: '45deg' }], opacity: 0.8 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8, maxWidth: '80%' },
  cardDescription: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 16, maxWidth: '90%' },
  ctaButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, alignSelf: 'flex-start' },
  ctaButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  productBadge: { position: 'absolute', top: 16, right: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  productBadgeText: { fontSize: 11, fontWeight: '600' },
});

export default EcosystemUpsellBanner;
