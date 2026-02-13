import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { LinearGradient } from 'expo-linear-gradient';

type TabType = 'guide' | 'faq' | 'videos';
type UserRole = 'admin' | 'manager' | 'sales_staff';

interface GuideSection {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  content: string[];
  roles: UserRole[];
  color: string;
  gradient: string[];
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  roles: UserRole[];
  category: string;
}

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  url: string;
  roles: UserRole[];
}

// Guide content based on roles
const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Your business at a glance',
    icon: 'grid-outline',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#A78BFA'],
    content: [
      "📊 View today's sales, orders, and revenue instantly",
      "👥 Track customer growth and engagement",
      "📦 Monitor inventory levels and low stock alerts",
      "📈 Switch between Overview, Inventory & Customer tabs",
      "🔔 Get notified when products need restocking",
    ],
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'pos',
    title: 'Point of Sale',
    description: 'Process sales quickly',
    icon: 'cart-outline',
    color: '#10B981',
    gradient: ['#10B981', '#34D399'],
    content: [
      "🔍 Search or browse products in the catalog",
      "👆 Tap any product to add it to cart",
      "📏 Select variants like size or color if available",
      "➕ Adjust quantities with + and - buttons",
      "💳 Choose payment method: Cash, Card, or Mobile",
      "✅ Tap 'Complete Sale' to finish transaction",
    ],
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'products',
    title: 'Products',
    description: 'Manage your catalog',
    icon: 'cube-outline',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#FBBF24'],
    content: [
      "➕ Create new products with name, SKU & price",
      "🏷️ Organize products into categories",
      "📊 Set stock quantities and low stock thresholds",
      "🎨 Add variants (Size: S/M/L, Color: Red/Blue)",
      "✏️ Edit or delete products anytime",
    ],
    roles: ['admin', 'manager'],
  },
  {
    id: 'inventory',
    title: 'Stock Control',
    description: 'Never run out of stock',
    icon: 'layers-outline',
    color: '#EF4444',
    gradient: ['#EF4444', '#F87171'],
    content: [
      "📦 View total products and stock levels",
      "⚠️ See items that need immediate attention",
      "📥 Record new stock arrivals easily",
      "📝 Track adjustments for damages or returns",
      "📜 View complete movement history",
    ],
    roles: ['admin', 'manager'],
  },
  {
    id: 'customers',
    title: 'Customers',
    description: 'Build relationships',
    icon: 'people-outline',
    color: '#06B6D4',
    gradient: ['#06B6D4', '#22D3EE'],
    content: [
      "👤 Add customers with name, phone & email",
      "📊 View purchase history and spending",
      "🛒 Track order count per customer",
      "⚡ Quick-add customers during checkout",
      "🎯 Use data for targeted promotions",
    ],
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'orders',
    title: 'Orders',
    description: 'Track all transactions',
    icon: 'receipt-outline',
    color: '#2563EB',
    gradient: ['#2563EB', '#3B82F6'],
    content: [
      "📅 Filter orders by date range",
      "🔍 Search by order number or customer",
      "🧾 View detailed receipts with items",
      "💰 See payment breakdown and totals",
      "👤 Track which staff processed each sale",
    ],
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'staff',
    title: 'Team',
    description: 'Manage your staff',
    icon: 'person-outline',
    color: '#EC4899',
    gradient: ['#EC4899', '#F472B6'],
    content: [
      "👑 Admin: Full access to everything",
      "📋 Manager: Most features except some settings",
      "🛒 Sales Staff: POS and order access only",
      "➕ Invite new team members easily",
      "🔒 Deactivate accounts securely",
    ],
    roles: ['admin'],
  },
];

// FAQ content
const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq1',
    question: 'How do I process a refund?',
    answer: 'Currently, process refunds manually by adjusting stock quantities and recording an expense. A dedicated refund feature is coming soon!',
    roles: ['admin', 'manager', 'sales_staff'],
    category: 'Sales',
  },
  {
    id: 'faq2',
    question: 'Can I use the app offline?',
    answer: 'You can view cached data offline, but transactions need internet to sync. We recommend a stable connection for the best experience.',
    roles: ['admin', 'manager', 'sales_staff'],
    category: 'General',
  },
  {
    id: 'faq3',
    question: 'How do I add product variants?',
    answer: 'When creating a product, enable "Has Variants" and add options like Size (S, M, L) or Color (Red, Blue). Each combination is tracked separately.',
    roles: ['admin', 'manager'],
    category: 'Products',
  },
  {
    id: 'faq4',
    question: "Why can't I see some menu options?",
    answer: 'Menu visibility is based on your role. Admins see everything, Managers see most options, and Sales Staff see only what they need for daily tasks.',
    roles: ['admin', 'manager', 'sales_staff'],
    category: 'Access',
  },
  {
    id: 'faq5',
    question: 'How do low stock alerts work?',
    answer: 'Set a "Low Stock Threshold" for each product. When stock drops to this level, you\'ll see alerts on the dashboard and in stock management.',
    roles: ['admin', 'manager'],
    category: 'Inventory',
  },
  {
    id: 'faq6',
    question: 'Can multiple staff use the app at once?',
    answer: 'Absolutely! Multiple users can be logged in on different devices simultaneously. All data syncs in real-time across all devices.',
    roles: ['admin', 'manager', 'sales_staff'],
    category: 'General',
  },
];

// Video tutorials
const VIDEO_TUTORIALS: VideoTutorial[] = [
  {
    id: 'vid1',
    title: 'Getting Started',
    description: 'Complete app walkthrough for beginners',
    duration: '5:30',
    icon: 'rocket-outline',
    color: '#8B5CF6',
    url: 'https://www.youtube.com/watch?v=demo1',
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'vid2',
    title: 'Your First Sale',
    description: 'Process transactions like a pro',
    duration: '3:45',
    icon: 'cart-outline',
    color: '#10B981',
    url: 'https://www.youtube.com/watch?v=demo2',
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'vid3',
    title: 'Product Management',
    description: 'Add, edit and organize your catalog',
    duration: '7:20',
    icon: 'cube-outline',
    color: '#F59E0B',
    url: 'https://www.youtube.com/watch?v=demo3',
    roles: ['admin', 'manager'],
  },
  {
    id: 'vid4',
    title: 'Inventory Mastery',
    description: 'Keep your stock levels perfect',
    duration: '6:15',
    icon: 'layers-outline',
    color: '#EF4444',
    url: 'https://www.youtube.com/watch?v=demo4',
    roles: ['admin', 'manager'],
  },
  {
    id: 'vid5',
    title: 'Team Setup',
    description: 'Add staff and manage permissions',
    duration: '4:00',
    icon: 'people-outline',
    color: '#EC4899',
    url: 'https://www.youtube.com/watch?v=demo5',
    roles: ['admin'],
  },
  {
    id: 'vid6',
    title: 'Reports & Analytics',
    description: 'Understand your business data',
    duration: '5:45',
    icon: 'bar-chart-outline',
    color: '#2563EB',
    url: 'https://www.youtube.com/watch?v=demo6',
    roles: ['admin', 'manager'],
  },
];

export default function HelpPage() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const router = useRouter();
  const { user } = useAuthStore();
  const userRole = (user?.role || 'sales_staff') as UserRole;
  
  const [activeTab, setActiveTab] = useState<TabType>('guide');
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const filteredGuides = GUIDE_SECTIONS.filter(g => g.roles.includes(userRole));
  const filteredFaqs = FAQ_ITEMS.filter(f => f.roles.includes(userRole));
  const filteredVideos = VIDEO_TUTORIALS.filter(v => v.roles.includes(userRole));

  const handleVideoPress = (video: VideoTutorial) => {
    Linking.openURL(video.url);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={['#2563EB', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Help Center</Text>
            <Text style={styles.headerSubtitle}>Everything you need to know</Text>
          </View>
          
          <View style={styles.headerIcon}>
            <Ionicons name="help-buoy" size={48} color="rgba(255,255,255,0.3)" />
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'guide' && styles.activeTab]}
        onPress={() => setActiveTab('guide')}
      >
        <View style={[styles.tabIconBg, activeTab === 'guide' && styles.activeTabIconBg]}>
          <Ionicons 
            name="book" 
            size={18} 
            color={activeTab === 'guide' ? '#FFFFFF' : '#6B7280'} 
          />
        </View>
        <Text style={[styles.tabText, activeTab === 'guide' && styles.activeTabText]}>
          Guides
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'faq' && styles.activeTab]}
        onPress={() => setActiveTab('faq')}
      >
        <View style={[styles.tabIconBg, activeTab === 'faq' && styles.activeTabIconBg]}>
          <Ionicons 
            name="chatbubble-ellipses" 
            size={18} 
            color={activeTab === 'faq' ? '#FFFFFF' : '#6B7280'} 
          />
        </View>
        <Text style={[styles.tabText, activeTab === 'faq' && styles.activeTabText]}>
          FAQ
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
        onPress={() => setActiveTab('videos')}
      >
        <View style={[styles.tabIconBg, activeTab === 'videos' && styles.activeTabIconBg]}>
          <Ionicons 
            name="play-circle" 
            size={18} 
            color={activeTab === 'videos' ? '#FFFFFF' : '#6B7280'} 
          />
        </View>
        <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
          Videos
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderGuideContent = () => (
    <ScrollView 
      style={styles.contentScroll} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.guideGrid}
    >
      {filteredGuides.map((guide) => (
        <TouchableOpacity
          key={guide.id}
          style={[styles.guideCard, isWeb && styles.guideCardWeb]}
          onPress={() => setExpandedGuide(expandedGuide === guide.id ? null : guide.id)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={guide.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.guideCardHeader}
          >
            <View style={styles.guideIconContainer}>
              <Ionicons name={guide.icon} size={28} color="#FFFFFF" />
            </View>
            <Ionicons 
              name={expandedGuide === guide.id ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color="rgba(255,255,255,0.8)" 
            />
          </LinearGradient>
          
          <View style={styles.guideCardBody}>
            <Text style={styles.guideTitle}>{guide.title}</Text>
            <Text style={styles.guideDescription}>{guide.description}</Text>
            
            {expandedGuide === guide.id && (
              <View style={styles.guideContentExpanded}>
                {guide.content.map((line, index) => (
                  <Text key={index} style={styles.guideContentText}>{line}</Text>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderFaqContent = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqHeaderTitle}>Frequently Asked Questions</Text>
        <Text style={styles.faqHeaderSubtitle}>Quick answers to common questions</Text>
      </View>
      
      {filteredFaqs.map((faq, index) => (
        <TouchableOpacity
          key={faq.id}
          style={styles.faqCard}
          onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
          activeOpacity={0.8}
        >
          <View style={styles.faqQuestionRow}>
            <View style={styles.faqNumber}>
              <Text style={styles.faqNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.faqTextContainer}>
              <Text style={styles.faqCategory}>{faq.category}</Text>
              <Text style={styles.faqQuestion}>{faq.question}</Text>
            </View>
            <Ionicons
              name={expandedFaq === faq.id ? 'chevron-up-circle' : 'chevron-down-circle'}
              size={24}
              color={expandedFaq === faq.id ? '#2563EB' : '#D1D5DB'}
            />
          </View>
          
          {expandedFaq === faq.id && (
            <View style={styles.faqAnswerContainer}>
              <View style={styles.faqAnswerLine} />
              <Text style={styles.faqAnswer}>{faq.answer}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderVideosContent = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.videosHeader}>
        <Text style={styles.videosHeaderTitle}>Video Tutorials</Text>
        <Text style={styles.videosHeaderSubtitle}>Learn by watching step-by-step guides</Text>
      </View>
      
      <View style={styles.videoGrid}>
        {filteredVideos.map((video) => (
          <TouchableOpacity
            key={video.id}
            style={[styles.videoCard, isWeb && styles.videoCardWeb]}
            onPress={() => handleVideoPress(video)}
            activeOpacity={0.8}
          >
            <View style={[styles.videoThumbnail, { backgroundColor: video.color }]}>
              <View style={styles.videoPlayButton}>
                <Ionicons name="play" size={24} color={video.color} />
              </View>
              <Ionicons 
                name={video.icon} 
                size={40} 
                color="rgba(255,255,255,0.3)" 
                style={styles.videoBackgroundIcon}
              />
            </View>
            
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle}>{video.title}</Text>
              <Text style={styles.videoDescription}>{video.description}</Text>
              <View style={styles.videoDuration}>
                <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                <Text style={styles.videoDurationText}>{video.duration}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      {renderTabs()}
      
      <View style={styles.content}>
        {activeTab === 'guide' && renderGuideContent()}
        {activeTab === 'faq' && renderFaqContent()}
        {activeTab === 'videos' && renderVideosContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  // Header
  headerContainer: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  headerIcon: {
    position: 'absolute',
    right: 0,
    top: -10,
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  activeTab: {
    backgroundColor: '#EEF2FF',
  },
  tabIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabIconBg: {
    backgroundColor: '#2563EB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#2563EB',
  },
  // Content
  content: {
    flex: 1,
  },
  contentScroll: {
    flex: 1,
    padding: 16,
  },
  // Guide styles
  guideGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingBottom: 20,
  },
  guideCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  guideCardWeb: {
    width: '48%',
  },
  guideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  guideIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideCardBody: {
    padding: 16,
    paddingTop: 12,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  guideDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  guideContentExpanded: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  guideContentText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 8,
  },
  // FAQ styles
  faqHeader: {
    marginBottom: 20,
  },
  faqHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  faqHeaderSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  faqNumber: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  faqTextContainer: {
    flex: 1,
  },
  faqCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
  },
  faqAnswerContainer: {
    flexDirection: 'row',
    marginTop: 16,
    paddingLeft: 48,
  },
  faqAnswerLine: {
    width: 3,
    backgroundColor: '#2563EB',
    borderRadius: 2,
    marginRight: 12,
  },
  faqAnswer: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  // Video styles
  videosHeader: {
    marginBottom: 20,
  },
  videosHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  videosHeaderSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingBottom: 20,
  },
  videoCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  videoCardWeb: {
    width: '31%',
  },
  videoThumbnail: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  videoPlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  videoBackgroundIcon: {
    position: 'absolute',
    right: 10,
    bottom: 10,
  },
  videoInfo: {
    padding: 14,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 10,
  },
  videoDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoDurationText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
});
