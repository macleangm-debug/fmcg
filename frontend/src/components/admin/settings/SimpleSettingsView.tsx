/**
 * SimpleSettingsView - Simplified settings interface for non-technical users
 * 
 * Features:
 * - Visual card-based layout
 * - Progressive disclosure (Essential vs Advanced)
 * - First-time setup wizard
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useBusinessStore } from '../../../store/businessStore';
import { useAuthStore } from '../../../store/authStore';

// Theme colors
const THEME = {
  primary: '#1B4332',
  primaryLight: '#D8F3DC',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

interface SettingsCardProps {
  icon: string;
  iconColor?: string;
  iconBg?: string;
  title: string;
  description: string;
  onPress: () => void;
  badge?: string;
  badgeColor?: string;
  isComplete?: boolean;
}

const SettingsCard: React.FC<SettingsCardProps> = ({
  icon,
  iconColor = THEME.primary,
  iconBg = THEME.primaryLight,
  title,
  description,
  onPress,
  badge,
  badgeColor = THEME.primary,
  isComplete,
}) => (
  <TouchableOpacity 
    style={styles.card} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.cardIcon, { backgroundColor: iconBg }]}>
      <Ionicons name={icon as any} size={24} color={iconColor} />
    </View>
    <View style={styles.cardContent}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle}>{title}</Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: badgeColor + '20' }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
          </View>
        )}
        {isComplete && (
          <Ionicons name="checkmark-circle" size={20} color={THEME.success} />
        )}
      </View>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={THEME.textSecondary} />
  </TouchableOpacity>
);

interface SimpleSettingsViewProps {
  onNavigateToFullSettings: (tab?: string) => void;
  isFirstTimeUser?: boolean;
}

const SimpleSettingsView: React.FC<SimpleSettingsViewProps> = ({
  onNavigateToFullSettings,
  isFirstTimeUser = false,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 1024;
  const router = useRouter();
  
  const { activeBusiness, businessSettings } = useBusinessStore();
  const { user } = useAuthStore();
  
  const [showWizard, setShowWizard] = useState(isFirstTimeUser);
  const [wizardStep, setWizardStep] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Check what's been set up
  const hasBusinessInfo = !!(activeBusiness?.name && activeBusiness?.phone);
  const hasCurrency = !!businessSettings?.currency;
  const hasTaxSetup = businessSettings?.tax_rate !== undefined;
  
  const setupProgress = [hasBusinessInfo, hasCurrency, hasTaxSetup].filter(Boolean).length;
  const totalSetupSteps = 3;

  // Wizard steps
  const wizardSteps = [
    {
      title: 'Welcome to Soko!',
      description: 'Let\'s get your business set up in just a few steps.',
      icon: 'rocket-outline',
    },
    {
      title: 'Business Information',
      description: 'Add your business name, phone, and address so customers can find you.',
      icon: 'business-outline',
      action: () => onNavigateToFullSettings('general'),
    },
    {
      title: 'Currency Settings',
      description: 'Set your currency so prices display correctly.',
      icon: 'cash-outline',
      action: () => onNavigateToFullSettings('app'),
    },
    {
      title: 'You\'re All Set!',
      description: 'Your basic setup is complete. You can always change settings later.',
      icon: 'checkmark-circle-outline',
    },
  ];

  // Essential settings cards
  const essentialSettings = [
    {
      icon: 'business-outline',
      title: 'Business Profile',
      description: 'Name, logo, contact details',
      tab: 'general',
      isComplete: hasBusinessInfo,
    },
    {
      icon: 'cash-outline',
      title: 'Currency & Tax',
      description: 'Set your currency and tax rates',
      tab: 'app',
      isComplete: hasCurrency && hasTaxSetup,
    },
    {
      icon: 'print-outline',
      title: 'Receipts & Printing',
      description: 'Receipt format and printer setup',
      tab: 'pos',
      badge: 'POS',
    },
    {
      icon: 'people-outline',
      title: 'Staff & Access',
      description: 'Manage team members and roles',
      tab: 'general',
    },
  ];

  // Advanced settings cards
  const advancedSettings = [
    {
      icon: 'barcode-outline',
      title: 'SKU & Barcodes',
      description: 'Product code formats',
      tab: 'app',
    },
    {
      icon: 'location-outline',
      title: 'Locations',
      description: 'Manage store locations',
      tab: 'locations',
    },
    {
      icon: 'cloud-offline-outline',
      title: 'Offline Mode',
      description: 'Work without internet',
      tab: 'pos',
    },
    {
      icon: 'gift-outline',
      title: 'Referral Program',
      description: 'Customer referral rewards',
      tab: 'referral',
    },
    {
      icon: 'apps-outline',
      title: 'Connected Apps',
      description: 'Integrations and add-ons',
      tab: 'apps',
    },
    {
      icon: 'card-outline',
      title: 'Subscription',
      description: 'Plan and billing',
      tab: 'subscription',
    },
  ];

  // Wizard Modal
  const renderWizard = () => (
    <Modal
      visible={showWizard}
      animationType="fade"
      transparent
    >
      <View style={styles.wizardOverlay}>
        <View style={styles.wizardContainer}>
          {/* Progress dots */}
          <View style={styles.wizardProgress}>
            {wizardSteps.map((_, idx) => (
              <View 
                key={idx}
                style={[
                  styles.wizardDot,
                  idx === wizardStep && styles.wizardDotActive,
                  idx < wizardStep && styles.wizardDotComplete,
                ]}
              />
            ))}
          </View>

          {/* Content */}
          <View style={styles.wizardContent}>
            <View style={[styles.wizardIcon, { backgroundColor: THEME.primaryLight }]}>
              <Ionicons 
                name={wizardSteps[wizardStep].icon as any} 
                size={48} 
                color={THEME.primary} 
              />
            </View>
            <Text style={styles.wizardTitle}>{wizardSteps[wizardStep].title}</Text>
            <Text style={styles.wizardDescription}>{wizardSteps[wizardStep].description}</Text>
          </View>

          {/* Actions */}
          <View style={styles.wizardActions}>
            {wizardStep > 0 && wizardStep < wizardSteps.length - 1 && (
              <TouchableOpacity 
                style={styles.wizardSecondaryBtn}
                onPress={() => setWizardStep(wizardStep - 1)}
              >
                <Text style={styles.wizardSecondaryBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            
            {wizardStep === 0 && (
              <TouchableOpacity 
                style={styles.wizardPrimaryBtn}
                onPress={() => setWizardStep(1)}
              >
                <Text style={styles.wizardPrimaryBtnText}>Let's Go!</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </TouchableOpacity>
            )}
            
            {wizardStep > 0 && wizardStep < wizardSteps.length - 1 && (
              <>
                <TouchableOpacity 
                  style={styles.wizardSkipBtn}
                  onPress={() => setWizardStep(wizardStep + 1)}
                >
                  <Text style={styles.wizardSkipBtnText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.wizardPrimaryBtn}
                  onPress={() => {
                    wizardSteps[wizardStep].action?.();
                    setShowWizard(false);
                  }}
                >
                  <Text style={styles.wizardPrimaryBtnText}>Set Up Now</Text>
                </TouchableOpacity>
              </>
            )}
            
            {wizardStep === wizardSteps.length - 1 && (
              <TouchableOpacity 
                style={styles.wizardPrimaryBtn}
                onPress={() => setShowWizard(false)}
              >
                <Text style={styles.wizardPrimaryBtnText}>Start Using Soko</Text>
                <Ionicons name="checkmark" size={18} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Setup Progress (if not complete) */}
        {setupProgress < totalSetupSteps && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Complete Your Setup</Text>
              <Text style={styles.progressCount}>{setupProgress}/{totalSetupSteps}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${(setupProgress / totalSetupSteps) * 100}%` }
                ]} 
              />
            </View>
            <TouchableOpacity 
              style={styles.progressBtn}
              onPress={() => setShowWizard(true)}
            >
              <Text style={styles.progressBtnText}>Continue Setup</Text>
              <Ionicons name="arrow-forward" size={16} color={THEME.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Essential Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Essential Settings</Text>
          <Text style={styles.sectionSubtitle}>Get started with these basic settings</Text>
          
          <View style={[styles.cardsGrid, isDesktop && styles.cardsGridDesktop]}>
            {essentialSettings.map((setting, idx) => (
              <SettingsCard
                key={idx}
                icon={setting.icon}
                title={setting.title}
                description={setting.description}
                onPress={() => onNavigateToFullSettings(setting.tab)}
                badge={setting.badge}
                isComplete={setting.isComplete}
              />
            ))}
          </View>
        </View>

        {/* Advanced Settings Toggle */}
        <TouchableOpacity 
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <View style={styles.advancedToggleLeft}>
            <Ionicons 
              name="settings-outline" 
              size={20} 
              color={THEME.textSecondary} 
            />
            <Text style={styles.advancedToggleText}>Advanced Settings</Text>
          </View>
          <Ionicons 
            name={showAdvanced ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={THEME.textSecondary} 
          />
        </TouchableOpacity>

        {/* Advanced Settings Section */}
        {showAdvanced && (
          <View style={styles.section}>
            <View style={[styles.cardsGrid, isDesktop && styles.cardsGridDesktop]}>
              {advancedSettings.map((setting, idx) => (
                <SettingsCard
                  key={idx}
                  icon={setting.icon}
                  title={setting.title}
                  description={setting.description}
                  onPress={() => onNavigateToFullSettings(setting.tab)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Help Section */}
        <View style={styles.helpSection}>
          <View style={styles.helpCard}>
            <Ionicons name="help-circle-outline" size={32} color={THEME.primary} />
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Need Help?</Text>
              <Text style={styles.helpDescription}>
                Our support team is here to help you get set up
              </Text>
            </View>
            <TouchableOpacity style={styles.helpBtn}>
              <Text style={styles.helpBtnText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Wizard Modal */}
      {renderWizard()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollContent: {
    padding: 20,
  },

  // Progress Card
  progressCard: {
    backgroundColor: THEME.primaryLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: THEME.primary + '30',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.primary,
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.primary,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.surface,
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: THEME.primary,
  },
  progressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.surface,
    paddingVertical: 12,
    borderRadius: 10,
  },
  progressBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.primary,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: 16,
  },

  // Cards Grid
  cardsGrid: {
    gap: 12,
  },
  cardsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 12,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
  },
  cardDescription: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Advanced Toggle
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  advancedToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  advancedToggleText: {
    fontSize: 15,
    fontWeight: '500',
    color: THEME.textSecondary,
  },

  // Help Section
  helpSection: {
    marginTop: 8,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 12,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
  },
  helpDescription: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  helpBtn: {
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  helpBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
  },

  // Wizard Modal
  wizardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  wizardContainer: {
    backgroundColor: THEME.surface,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
  },
  wizardProgress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  wizardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.border,
  },
  wizardDotActive: {
    width: 24,
    backgroundColor: THEME.primary,
  },
  wizardDotComplete: {
    backgroundColor: THEME.success,
  },
  wizardContent: {
    alignItems: 'center',
    marginBottom: 32,
  },
  wizardIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  wizardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  wizardDescription: {
    fontSize: 15,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  wizardActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  wizardPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  wizardPrimaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  wizardSecondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  wizardSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.textSecondary,
  },
  wizardSkipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  wizardSkipBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.textSecondary,
  },
});

export default SimpleSettingsView;
