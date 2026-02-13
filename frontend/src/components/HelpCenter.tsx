import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Platform,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '../store/onboardingStore';

type TabType = 'guide' | 'faq' | 'videos';
type UserRole = 'admin' | 'manager' | 'sales_staff';

interface HelpCenterProps {
  visible: boolean;
  onClose: () => void;
  userRole: UserRole;
  onStartTour: () => void;
}

interface GuideSection {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  content: string[];
  roles: UserRole[];
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  roles: UserRole[];
}

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  url: string;
  roles: UserRole[];
}

// Guide content based on roles
const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard Overview',
    icon: 'grid-outline',
    content: [
      "The Dashboard is your home screen showing key business metrics at a glance.",
      "• Today's Sales: Total revenue generated today",
      "• Orders Today: Number of completed transactions",
      "• Total Customers: Your customer base count",
      "• Total Products: Items in your inventory",
      "Use the tabs to switch between Overview, Inventory, and Customers insights.",
      "Low stock alerts appear automatically when products need restocking.",
    ],
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'pos',
    title: 'Making a Sale (POS)',
    icon: 'cart-outline',
    content: [
      "The Cart/POS screen is where you process customer purchases.",
      "1. Browse or search for products in the product grid",
      "2. Tap a product to add it to the cart",
      "3. For products with variants (size, color), select the specific variant",
      "4. Adjust quantities using + and - buttons",
      "5. Apply discounts or promotions if available",
      "6. Select payment method (Cash, Card, Mobile Money)",
      "7. Tap 'Complete Sale' to finish the transaction",
      "A receipt will be generated automatically for each sale.",
    ],
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'products',
    title: 'Managing Products',
    icon: 'cube-outline',
    content: [
      "Access Product Management from the Admin menu.",
      "Adding Products:",
      "• Tap '+' to create a new product",
      "• Fill in name, SKU, price, and category",
      "• Set stock quantity and low stock threshold",
      "• Add product variants (size, color) if needed",
      "Editing Products:",
      "• Tap the edit icon on any product card",
      "• Update details and save changes",
      "Deleting Products:",
      "• Tap the delete icon and confirm",
      "Use the search bar to quickly find products.",
    ],
    roles: ['admin', 'manager'],
  },
  {
    id: 'inventory',
    title: 'Stock & Inventory',
    icon: 'layers-outline',
    content: [
      "Monitor and manage your inventory levels.",
      "Stock Summary:",
      "• View total products, in-stock, and low stock counts",
      "• See items that need immediate attention",
      "Stock Adjustments:",
      "• Record new stock arrivals",
      "• Adjust for damages, returns, or corrections",
      "• Each adjustment is logged with reason and timestamp",
      "Stock Movement History:",
      "• Track all inventory changes over time",
      "• Filter by product, date, or adjustment type",
    ],
    roles: ['admin', 'manager'],
  },
  {
    id: 'customers',
    title: 'Customer Management',
    icon: 'people-outline',
    content: [
      "Build and maintain your customer database.",
      "Adding Customers:",
      "• Tap '+' to add a new customer",
      "• Enter name, phone, and email",
      "Customer Profiles:",
      "• View purchase history and total spending",
      "• Track order count and preferences",
      "Quick Add at Checkout:",
      "• Add new customers directly during a sale",
      "Use customer data for targeted promotions and loyalty programs.",
    ],
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'orders',
    title: 'Orders & Reports',
    icon: 'receipt-outline',
    content: [
      "View and manage all sales transactions.",
      "Order List:",
      "• Filter by date range (Today, Yesterday, This Week, etc.)",
      "• See order status, total, and payment method",
      "Order Details:",
      "• Tap any order to view full receipt",
      "• See items, quantities, prices, and discounts",
      "• View payment breakdown and staff who processed it",
      "Reports (Admin only):",
      "• Access detailed sales analytics",
      "• Export data for accounting purposes",
    ],
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'staff',
    title: 'Staff Management',
    icon: 'person-outline',
    content: [
      "Manage your team and their access levels.",
      "User Roles:",
      "• Admin: Full access to all features",
      "• Manager: Access to most features except some settings",
      "• Sales Staff: POS, orders, and customer management only",
      "Adding Staff:",
      "• Go to Admin > Staff Management",
      "• Tap '+' to invite new team member",
      "• Assign appropriate role",
      "Deactivating Users:",
      "• Deactivate accounts instead of deleting",
      "• Maintains historical data integrity",
    ],
    roles: ['admin'],
  },
  {
    id: 'promotions',
    title: 'Promotions & Discounts',
    icon: 'pricetag-outline',
    content: [
      "Create and manage promotional offers.",
      "Promotion Types:",
      "• Percentage discount (e.g., 10% off)",
      "• Fixed amount discount (e.g., $5 off)",
      "• Buy X Get Y free",
      "Creating Promotions:",
      "• Set promotion name and discount type",
      "• Define start and end dates",
      "• Choose applicable products or categories",
      "• Set minimum purchase requirements if needed",
      "Active promotions automatically apply at checkout.",
    ],
    roles: ['admin', 'manager'],
  },
  {
    id: 'settings',
    title: 'Business Settings',
    icon: 'settings-outline',
    content: [
      "Configure your business preferences.",
      "Business Profile:",
      "• Update business name and contact info",
      "• Set default currency and tax rates",
      "Receipt Settings:",
      "• Customize receipt header and footer",
      "• Add business logo",
      "Notification Preferences:",
      "• Low stock alerts",
      "• Daily sales summary",
      "Security:",
      "• Change password",
      "• Manage active sessions",
    ],
    roles: ['admin'],
  },
];

// FAQ content
const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq1',
    question: 'How do I process a refund?',
    answer: 'Currently, refunds should be processed manually by adjusting stock quantities and recording an expense. A dedicated refund feature will be added in a future update.',
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'faq2',
    question: 'Can I use the app offline?',
    answer: 'Limited offline support is available. You can view cached data, but transactions require an internet connection to sync with the server.',
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'faq3',
    question: 'How do I add product variants?',
    answer: 'When creating or editing a product, enable "Has Variants" and add variant options like Size (S, M, L) or Color (Red, Blue). Each combination will be tracked separately.',
    roles: ['admin', 'manager'],
  },
  {
    id: 'faq4',
    question: 'Why can\'t I see certain menu options?',
    answer: 'Menu options are based on your user role. Admin users have full access, Managers have partial access, and Sales Staff have limited access to POS and orders.',
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'faq5',
    question: 'How do I change my password?',
    answer: 'Go to Settings > Profile > Change Password. Enter your current password and your new password twice to confirm.',
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'faq6',
    question: 'Can I export sales data?',
    answer: 'Yes, admins can export sales reports from the Reports section. Data can be exported in CSV format for use in spreadsheet applications.',
    roles: ['admin'],
  },
  {
    id: 'faq7',
    question: 'How do low stock alerts work?',
    answer: 'Each product has a "Low Stock Threshold" setting. When stock falls at or below this number, an alert appears on the dashboard and in the stock management section.',
    roles: ['admin', 'manager'],
  },
  {
    id: 'faq8',
    question: 'Can multiple staff use the app simultaneously?',
    answer: 'Yes! Multiple users can be logged in on different devices. All data syncs in real-time across all connected devices.',
    roles: ['admin', 'manager', 'sales_staff'],
  },
];

// Video tutorials
const VIDEO_TUTORIALS: VideoTutorial[] = [
  {
    id: 'vid1',
    title: 'Getting Started with RetailPro',
    description: 'A complete walkthrough of the app\'s main features and navigation.',
    duration: '5:30',
    thumbnail: '🎬',
    url: 'https://www.youtube.com/watch?v=demo1',
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'vid2',
    title: 'Processing Your First Sale',
    description: 'Learn how to use the POS system to complete transactions quickly.',
    duration: '3:45',
    thumbnail: '🛒',
    url: 'https://www.youtube.com/watch?v=demo2',
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'vid3',
    title: 'Managing Products & Inventory',
    description: 'How to add products, manage stock, and handle variants.',
    duration: '7:20',
    thumbnail: '📦',
    url: 'https://www.youtube.com/watch?v=demo3',
    roles: ['admin', 'manager'],
  },
  {
    id: 'vid4',
    title: 'Setting Up Promotions',
    description: 'Create discounts and promotional offers to boost sales.',
    duration: '4:15',
    thumbnail: '🏷️',
    url: 'https://www.youtube.com/watch?v=demo4',
    roles: ['admin', 'manager'],
  },
  {
    id: 'vid5',
    title: 'Staff Management & Permissions',
    description: 'Add team members and configure their access levels.',
    duration: '4:00',
    thumbnail: '👥',
    url: 'https://www.youtube.com/watch?v=demo5',
    roles: ['admin'],
  },
  {
    id: 'vid6',
    title: 'Understanding Reports & Analytics',
    description: 'Interpret sales data and make informed business decisions.',
    duration: '6:10',
    thumbnail: '📊',
    url: 'https://www.youtube.com/watch?v=demo6',
    roles: ['admin', 'manager'],
  },
  {
    id: 'vid7',
    title: 'Customer Management Tips',
    description: 'Build customer relationships and track purchase history.',
    duration: '3:30',
    thumbnail: '🤝',
    url: 'https://www.youtube.com/watch?v=demo7',
    roles: ['admin', 'manager', 'sales_staff'],
  },
  {
    id: 'vid8',
    title: 'Business Settings Configuration',
    description: 'Customize the app for your specific business needs.',
    duration: '5:00',
    thumbnail: '⚙️',
    url: 'https://www.youtube.com/watch?v=demo8',
    roles: ['admin'],
  },
];

export default function HelpCenter({ visible, onClose, userRole, onStartTour }: HelpCenterProps) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const [activeTab, setActiveTab] = useState<TabType>('guide');
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const { setLastViewedHelp } = useOnboardingStore();

  const filteredGuides = GUIDE_SECTIONS.filter(g => g.roles.includes(userRole));
  const filteredFaqs = FAQ_ITEMS.filter(f => f.roles.includes(userRole));
  const filteredVideos = VIDEO_TUTORIALS.filter(v => v.roles.includes(userRole));

  const handleVideoPress = (video: VideoTutorial) => {
    setLastViewedHelp(video.id);
    Linking.openURL(video.url);
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'guide' && styles.activeTab]}
        onPress={() => setActiveTab('guide')}
      >
        <Ionicons 
          name="book-outline" 
          size={18} 
          color={activeTab === 'guide' ? '#2563EB' : '#6B7280'} 
        />
        <Text style={[styles.tabText, activeTab === 'guide' && styles.activeTabText]}>
          User Guide
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'faq' && styles.activeTab]}
        onPress={() => setActiveTab('faq')}
      >
        <Ionicons 
          name="help-circle-outline" 
          size={18} 
          color={activeTab === 'faq' ? '#2563EB' : '#6B7280'} 
        />
        <Text style={[styles.tabText, activeTab === 'faq' && styles.activeTabText]}>
          FAQ
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
        onPress={() => setActiveTab('videos')}
      >
        <Ionicons 
          name="play-circle-outline" 
          size={18} 
          color={activeTab === 'videos' ? '#2563EB' : '#6B7280'} 
        />
        <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
          Videos
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderGuideContent = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      {/* Start Tour Button */}
      <TouchableOpacity style={styles.tourButton} onPress={onStartTour}>
        <View style={styles.tourIconContainer}>
          <Ionicons name="walk-outline" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.tourTextContainer}>
          <Text style={styles.tourTitle}>Take Interactive Tour</Text>
          <Text style={styles.tourSubtitle}>Step-by-step guide through the app</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#2563EB" />
      </TouchableOpacity>

      {/* Guide Sections */}
      {filteredGuides.map((guide) => (
        <View key={guide.id} style={styles.guideSection}>
          <TouchableOpacity
            style={styles.guideSectionHeader}
            onPress={() => setExpandedGuide(expandedGuide === guide.id ? null : guide.id)}
          >
            <View style={styles.guideTitleRow}>
              <View style={[styles.guideIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name={guide.icon} size={20} color="#2563EB" />
              </View>
              <Text style={styles.guideTitle}>{guide.title}</Text>
            </View>
            <Ionicons
              name={expandedGuide === guide.id ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
          {expandedGuide === guide.id && (
            <View style={styles.guideContent}>
              {guide.content.map((line, index) => (
                <Text key={index} style={styles.guideText}>{line}</Text>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );

  const renderFaqContent = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      {filteredFaqs.map((faq) => (
        <View key={faq.id} style={styles.faqItem}>
          <TouchableOpacity
            style={styles.faqQuestion}
            onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
          >
            <View style={styles.faqQuestionRow}>
              <View style={styles.faqIconContainer}>
                <Text style={styles.faqIcon}>Q</Text>
              </View>
              <Text style={styles.faqQuestionText}>{faq.question}</Text>
            </View>
            <Ionicons
              name={expandedFaq === faq.id ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#6B7280"
            />
          </TouchableOpacity>
          {expandedFaq === faq.id && (
            <View style={styles.faqAnswer}>
              <Text style={styles.faqAnswerText}>{faq.answer}</Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );

  const renderVideosContent = () => (
    <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.videoGrid}>
        {filteredVideos.map((video) => (
          <TouchableOpacity
            key={video.id}
            style={[styles.videoCard, isWeb && styles.videoCardWeb]}
            onPress={() => handleVideoPress(video)}
          >
            <View style={styles.videoThumbnail}>
              <Text style={styles.videoThumbnailEmoji}>{video.thumbnail}</Text>
              <View style={styles.playOverlay}>
                <Ionicons name="play-circle" size={40} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
              <Text style={styles.videoDescription} numberOfLines={2}>{video.description}</Text>
              <View style={styles.videoDuration}>
                <Ionicons name="time-outline" size={14} color="#6B7280" />
                <Text style={styles.videoDurationText}>{video.duration}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType={isWeb ? 'fade' : 'slide'}
      transparent={isWeb}
      onRequestClose={onClose}
    >
      {isWeb ? (
        <Pressable style={styles.webOverlay} onPress={onClose}>
          <Pressable style={styles.webContainer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="help-buoy" size={24} color="#2563EB" />
                <Text style={styles.headerTitle}>Help Center</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>
            {renderTabs()}
            <View style={styles.content}>
              {activeTab === 'guide' && renderGuideContent()}
              {activeTab === 'faq' && renderFaqContent()}
              {activeTab === 'videos' && renderVideosContent()}
            </View>
          </Pressable>
        </Pressable>
      ) : (
        <View style={styles.mobileContainer}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="help-buoy" size={24} color="#2563EB" />
              <Text style={styles.headerTitle}>Help Center</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </Pressable>
          </View>
          {renderTabs()}
          <View style={styles.content}>
            {activeTab === 'guide' && renderGuideContent()}
            {activeTab === 'faq' && renderFaqContent()}
            {activeTab === 'videos' && renderVideosContent()}
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  webOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 700,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  mobileContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    padding: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#2563EB',
  },
  content: {
    flex: 1,
  },
  contentScroll: {
    flex: 1,
    padding: 16,
  },
  // Tour button
  tourButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  tourIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  tourTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  tourSubtitle: {
    fontSize: 13,
    color: '#3B82F6',
    marginTop: 2,
  },
  // Guide sections
  guideSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  guideSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  guideTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guideIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  guideContent: {
    padding: 14,
    paddingTop: 0,
    backgroundColor: '#F9FAFB',
  },
  guideText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 6,
  },
  // FAQ
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  faqIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  faqAnswer: {
    padding: 14,
    paddingTop: 0,
    backgroundColor: '#F9FAFB',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  // Videos
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  videoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    width: '100%',
  },
  videoCardWeb: {
    width: '48%',
  },
  videoThumbnail: {
    height: 120,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  videoThumbnailEmoji: {
    fontSize: 48,
  },
  playOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  videoDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoDurationText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
