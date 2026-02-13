import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const isWeb = Platform.OS === 'web';

const COLORS = {
  bg: '#030712',
  card: '#0F172A',
  cardLight: '#1E293B',
  border: '#334155',
  primary: '#10B981',
  primaryDark: '#059669',
  accent: '#06B6D4',
  white: '#FFFFFF',
  gray: '#94A3B8',
  lightGray: '#CBD5E1',
  gold: '#F59E0B',
};

const FEATURES = [
  {
    icon: 'globe-outline',
    title: 'White-Label Gateway',
    description: 'Deploy your own branded payment gateway with full customization of UI, domains, and merchant experience.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Enterprise Security',
    description: 'PCI-DSS Level 1 compliant infrastructure with advanced fraud detection and real-time monitoring.',
  },
  {
    icon: 'layers-outline',
    title: 'Multi-Tenant Architecture',
    description: 'Onboard unlimited merchants with isolated data, separate dashboards, and individual rate configurations.',
  },
  {
    icon: 'analytics-outline',
    title: 'Advanced Analytics',
    description: 'Real-time transaction insights, risk scoring, and comprehensive reporting across all merchants.',
  },
  {
    icon: 'code-slash-outline',
    title: 'Powerful APIs',
    description: 'RESTful APIs with SDKs in 10+ languages. Webhooks, sandbox environments, and detailed documentation.',
  },
  {
    icon: 'cash-outline',
    title: 'Revenue Share',
    description: 'Flexible commission structures. Earn on every transaction processed through your gateway.',
  },
];

const PARTNERS = [
  { type: 'Banks', count: '50+', icon: 'business-outline' },
  { type: 'MNOs', count: '25+', icon: 'phone-portrait-outline' },
  { type: 'Countries', count: '15+', icon: 'earth-outline' },
  { type: 'Transactions', count: '1M+', icon: 'swap-horizontal-outline' },
];

const TESTIMONIALS = [
  {
    quote: "Connect transformed how we serve our SME clients. Onboarding time dropped from weeks to hours.",
    author: "CTO, Regional Bank",
    location: "East Africa",
  },
  {
    quote: "The white-label solution let us launch our own payment brand without the infrastructure overhead.",
    author: "Head of Digital",
    location: "Mobile Network Operator",
  },
];

export default function ConnectLandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleContactRequest = () => {
    if (email) {
      setSubmitted(true);
      // In production, this would send to backend
      console.log('Contact request from:', email);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#030712', '#0F172A', '#030712']} 
        style={styles.gradientBg}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Navigation */}
          <View style={[styles.nav, isMobile && styles.navMobile]}>
            <TouchableOpacity 
              style={styles.logoContainer}
              onPress={() => router.push('/landing')}
            >
              <View style={styles.logoIcon}>
                <Ionicons name="flash" size={20} color={COLORS.white} />
              </View>
              <Text style={styles.logoText}>KwikPay</Text>
              <View style={styles.connectBadge}>
                <Text style={styles.connectBadgeText}>Connect</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.navLinks}>
              <TouchableOpacity onPress={() => router.push('/kwikpay')}>
                <Text style={styles.navLink}>For Merchants</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.navCta}
                onPress={() => router.push('/(auth)/login')}
              >
                <Text style={styles.navCtaText}>Partner Login</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Section */}
          <View style={[styles.heroSection, isMobile && styles.heroSectionMobile]}>
            <View style={styles.heroBadge}>
              <Ionicons name="business" size={14} color={COLORS.primary} />
              <Text style={styles.heroBadgeText}>B2B Payment Infrastructure</Text>
            </View>
            <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
              White-Label Payment{'\n'}Gateway for{' '}
              <Text style={styles.heroTitleAccent}>Financial Institutions</Text>
            </Text>
            <Text style={[styles.heroSubtitle, isMobile && styles.heroSubtitleMobile]}>
              Enable your bank, MNO, or fintech to offer complete payment services. 
              Launch your branded gateway in weeks, not years.
            </Text>
            <View style={[styles.heroActions, isMobile && styles.heroActionsMobile]}>
              <TouchableOpacity 
                style={styles.heroPrimaryBtn}
                onPress={() => {/* Scroll to contact form */}}
              >
                <Text style={styles.heroPrimaryBtnText}>Request Demo</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.bg} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroSecondaryBtn}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.white} />
                <Text style={styles.heroSecondaryBtnText}>Download Brochure</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Bar */}
          <View style={[styles.statsBar, isMobile && styles.statsBarMobile]}>
            {PARTNERS.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <Ionicons name={stat.icon as any} size={24} color={COLORS.primary} />
                <Text style={styles.statValue}>{stat.count}</Text>
                <Text style={styles.statLabel}>{stat.type}</Text>
              </View>
            ))}
          </View>

          {/* Features Section */}
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>CAPABILITIES</Text>
            <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
              Everything You Need to Power Payments
            </Text>
            <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
              {FEATURES.map((feature, index) => (
                <View key={index} style={[styles.featureCard, isMobile && styles.featureCardMobile]}>
                  <View style={styles.featureIconBox}>
                    <Ionicons name={feature.icon as any} size={28} color={COLORS.primary} />
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.description}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* How It Works */}
          <View style={[styles.section, styles.sectionAlt]}>
            <Text style={styles.sectionSubtitle}>PROCESS</Text>
            <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
              Go Live in 4 Simple Steps
            </Text>
            <View style={[styles.stepsContainer, isMobile && styles.stepsContainerMobile]}>
              {[
                { num: '01', title: 'Discovery Call', desc: 'Understand your requirements and customize the solution' },
                { num: '02', title: 'Integration', desc: 'Our team handles the technical setup and configuration' },
                { num: '03', title: 'Testing', desc: 'Thorough sandbox testing with your team' },
                { num: '04', title: 'Launch', desc: 'Go live with full support and monitoring' },
              ].map((step, index) => (
                <View key={index} style={styles.stepCard}>
                  <Text style={styles.stepNum}>{step.num}</Text>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                  {index < 3 && !isMobile && <View style={styles.stepConnector} />}
                </View>
              ))}
            </View>
          </View>

          {/* Testimonials */}
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>TRUSTED BY</Text>
            <Text style={[styles.sectionTitle, isMobile && styles.sectionTitleMobile]}>
              What Our Partners Say
            </Text>
            <View style={[styles.testimonialGrid, isMobile && styles.testimonialGridMobile]}>
              {TESTIMONIALS.map((testimonial, index) => (
                <View key={index} style={styles.testimonialCard}>
                  <Ionicons name="chatbox-ellipses" size={32} color={COLORS.primary} style={{ opacity: 0.5 }} />
                  <Text style={styles.testimonialQuote}>"{testimonial.quote}"</Text>
                  <View style={styles.testimonialAuthor}>
                    <View style={styles.testimonialAvatar}>
                      <Ionicons name="person" size={20} color={COLORS.gray} />
                    </View>
                    <View>
                      <Text style={styles.testimonialName}>{testimonial.author}</Text>
                      <Text style={styles.testimonialLocation}>{testimonial.location}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Contact Form */}
          <View style={[styles.section, styles.contactSection]}>
            <View style={[styles.contactContainer, isMobile && styles.contactContainerMobile]}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Ready to Transform{'\n'}Your Payment Services?</Text>
                <Text style={styles.contactDesc}>
                  Get in touch with our partnerships team. We'll show you how Connect can power your payment infrastructure.
                </Text>
                <View style={styles.contactPoints}>
                  {[
                    'Custom pricing based on volume',
                    'Dedicated integration support',
                    'Revenue sharing models',
                  ].map((point, i) => (
                    <View key={i} style={styles.contactPoint}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                      <Text style={styles.contactPointText}>{point}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.contactForm}>
                {submitted ? (
                  <View style={styles.successMessage}>
                    <View style={styles.successIcon}>
                      <Ionicons name="checkmark-circle" size={48} color={COLORS.primary} />
                    </View>
                    <Text style={styles.successTitle}>Thank You!</Text>
                    <Text style={styles.successText}>
                      Our partnerships team will reach out within 24 hours.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.formTitle}>Request a Demo</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Work email"
                      placeholderTextColor={COLORS.gray}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Company name"
                      placeholderTextColor={COLORS.gray}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Phone number"
                      placeholderTextColor={COLORS.gray}
                      keyboardType="phone-pad"
                    />
                    <TouchableOpacity 
                      style={styles.submitBtn}
                      onPress={handleContactRequest}
                    >
                      <Text style={styles.submitBtnText}>Submit Request</Text>
                      <Ionicons name="send" size={18} color={COLORS.bg} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerTop}>
              <View style={styles.footerBrand}>
                <View style={styles.logoContainer}>
                  <View style={styles.logoIcon}>
                    <Ionicons name="flash" size={18} color={COLORS.white} />
                  </View>
                  <Text style={styles.logoText}>KwikPay</Text>
                  <View style={styles.connectBadge}>
                    <Text style={styles.connectBadgeText}>Connect</Text>
                  </View>
                </View>
                <Text style={styles.footerBrandDesc}>
                  Enterprise payment infrastructure for financial institutions across Africa.
                </Text>
              </View>
              <View style={styles.footerLinks}>
                <View style={styles.footerLinkGroup}>
                  <Text style={styles.footerLinkTitle}>Solutions</Text>
                  <Text style={styles.footerLink}>White-Label Gateway</Text>
                  <Text style={styles.footerLink}>Merchant Management</Text>
                  <Text style={styles.footerLink}>Risk & Compliance</Text>
                </View>
                <View style={styles.footerLinkGroup}>
                  <Text style={styles.footerLinkTitle}>Resources</Text>
                  <Text style={styles.footerLink}>Documentation</Text>
                  <Text style={styles.footerLink}>API Reference</Text>
                  <Text style={styles.footerLink}>Case Studies</Text>
                </View>
              </View>
            </View>
            <View style={styles.footerBottom}>
              <Text style={styles.footerCopy}>© 2025 KwikPay. All rights reserved.</Text>
              <View style={styles.footerSocials}>
                <Ionicons name="logo-linkedin" size={20} color={COLORS.gray} />
                <Ionicons name="logo-twitter" size={20} color={COLORS.gray} />
                <Ionicons name="mail" size={20} color={COLORS.gray} />
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  gradientBg: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 0 },

  // Navigation
  nav: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 32, paddingVertical: 20, maxWidth: 1400, width: '100%', alignSelf: 'center'
  },
  navMobile: { paddingHorizontal: 16, flexWrap: 'wrap', gap: 12 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { 
    width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center'
  },
  logoText: { fontSize: 20, fontWeight: '700', color: COLORS.white },
  connectBadge: { 
    backgroundColor: COLORS.accent + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 
  },
  connectBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.accent, textTransform: 'uppercase' },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  navLink: { fontSize: 14, color: COLORS.gray, fontWeight: '500' },
  navCta: { 
    backgroundColor: COLORS.cardLight, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border
  },
  navCtaText: { fontSize: 14, fontWeight: '600', color: COLORS.white },

  // Hero
  heroSection: { 
    paddingHorizontal: 32, paddingTop: 60, paddingBottom: 48, 
    maxWidth: 1400, width: '100%', alignSelf: 'center'
  },
  heroSectionMobile: { paddingHorizontal: 16, paddingTop: 40 },
  heroBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '15', paddingHorizontal: 14, paddingVertical: 8, 
    borderRadius: 20, marginBottom: 24
  },
  heroBadgeText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  heroTitle: { fontSize: 56, fontWeight: '800', color: COLORS.white, lineHeight: 64 },
  heroTitleMobile: { fontSize: 36, lineHeight: 44 },
  heroTitleAccent: { color: COLORS.primary },
  heroSubtitle: { 
    fontSize: 20, color: COLORS.gray, lineHeight: 32, marginTop: 24, maxWidth: 700 
  },
  heroSubtitleMobile: { fontSize: 16, lineHeight: 26 },
  heroActions: { flexDirection: 'row', gap: 16, marginTop: 36 },
  heroActionsMobile: { flexDirection: 'column' },
  heroPrimaryBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12
  },
  heroPrimaryBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.bg },
  heroSecondaryBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.cardLight, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border
  },
  heroSecondaryBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },

  // Stats
  statsBar: { 
    flexDirection: 'row', justifyContent: 'center', gap: 48,
    paddingVertical: 32, backgroundColor: COLORS.card, borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: COLORS.border
  },
  statsBarMobile: { gap: 24, flexWrap: 'wrap', paddingHorizontal: 16 },
  statItem: { alignItems: 'center', gap: 8 },
  statValue: { fontSize: 28, fontWeight: '700', color: COLORS.white },
  statLabel: { fontSize: 13, color: COLORS.gray, textTransform: 'uppercase' },

  // Sections
  section: { 
    paddingHorizontal: 32, paddingVertical: 80, maxWidth: 1400, width: '100%', alignSelf: 'center' 
  },
  sectionAlt: { backgroundColor: COLORS.card + '50' },
  sectionSubtitle: { 
    fontSize: 12, fontWeight: '700', color: COLORS.primary, 
    textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 
  },
  sectionTitle: { fontSize: 40, fontWeight: '700', color: COLORS.white, marginBottom: 48 },
  sectionTitleMobile: { fontSize: 28 },

  // Features Grid
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  featuresGridMobile: { gap: 16 },
  featureCard: { 
    width: '30%', backgroundColor: COLORS.card, borderRadius: 16, padding: 28,
    borderWidth: 1, borderColor: COLORS.border
  },
  featureCardMobile: { width: '100%' },
  featureIconBox: { 
    width: 56, height: 56, borderRadius: 14, backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20
  },
  featureTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white, marginBottom: 12 },
  featureDesc: { fontSize: 14, color: COLORS.gray, lineHeight: 22 },

  // Steps
  stepsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  stepsContainerMobile: { flexDirection: 'column', gap: 24 },
  stepCard: { flex: 1, alignItems: 'center', position: 'relative' },
  stepNum: { fontSize: 48, fontWeight: '800', color: COLORS.primary + '30' },
  stepTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white, marginTop: 8 },
  stepDesc: { fontSize: 14, color: COLORS.gray, textAlign: 'center', marginTop: 8, maxWidth: 200 },
  stepConnector: { 
    position: 'absolute', top: 24, right: -50, width: 100, height: 2, 
    backgroundColor: COLORS.border 
  },

  // Testimonials
  testimonialGrid: { flexDirection: 'row', gap: 24 },
  testimonialGridMobile: { flexDirection: 'column' },
  testimonialCard: { 
    flex: 1, backgroundColor: COLORS.card, borderRadius: 16, padding: 28,
    borderWidth: 1, borderColor: COLORS.border
  },
  testimonialQuote: { 
    fontSize: 18, color: COLORS.lightGray, lineHeight: 28, marginTop: 16, fontStyle: 'italic' 
  },
  testimonialAuthor: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 },
  testimonialAvatar: { 
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.cardLight,
    justifyContent: 'center', alignItems: 'center'
  },
  testimonialName: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  testimonialLocation: { fontSize: 12, color: COLORS.gray },

  // Contact
  contactSection: { backgroundColor: COLORS.card, paddingVertical: 80 },
  contactContainer: { flexDirection: 'row', gap: 48 },
  contactContainerMobile: { flexDirection: 'column' },
  contactInfo: { flex: 1 },
  contactTitle: { fontSize: 36, fontWeight: '700', color: COLORS.white, lineHeight: 46 },
  contactDesc: { fontSize: 16, color: COLORS.gray, lineHeight: 26, marginTop: 20 },
  contactPoints: { marginTop: 32 },
  contactPoint: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  contactPointText: { fontSize: 15, color: COLORS.lightGray },
  contactForm: { 
    flex: 1, backgroundColor: COLORS.cardLight, borderRadius: 20, padding: 32,
    borderWidth: 1, borderColor: COLORS.border, maxWidth: 450
  },
  formTitle: { fontSize: 20, fontWeight: '700', color: COLORS.white, marginBottom: 24 },
  input: { 
    backgroundColor: COLORS.bg, borderRadius: 12, padding: 16, fontSize: 15, color: COLORS.white,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border
  },
  submitBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, marginTop: 8
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.bg },
  successMessage: { alignItems: 'center', paddingVertical: 24 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  successText: { fontSize: 14, color: COLORS.gray, textAlign: 'center' },

  // Footer
  footer: { 
    backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 32, paddingVertical: 48
  },
  footerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 48 },
  footerBrand: { maxWidth: 300 },
  footerBrandDesc: { fontSize: 14, color: COLORS.gray, lineHeight: 22, marginTop: 16 },
  footerLinks: { flexDirection: 'row', gap: 64 },
  footerLinkGroup: {},
  footerLinkTitle: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 16 },
  footerLink: { fontSize: 14, color: COLORS.gray, marginBottom: 12 },
  footerBottom: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 24
  },
  footerCopy: { fontSize: 13, color: COLORS.gray },
  footerSocials: { flexDirection: 'row', gap: 20 },
});
