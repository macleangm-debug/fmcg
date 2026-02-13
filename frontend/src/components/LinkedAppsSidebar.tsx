import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import { retailproApi, businessesApi } from '../api/client';
import ConfirmationModal from './ConfirmationModal';

// Define all Galaxy apps that can be linked to RetailPro
interface AppInfo {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  gradientColors: string[];
  route: string;
  benefits: string[];
}

const ALL_GALAXY_APPS: AppInfo[] = [
  {
    id: 'inventory',
    name: 'Inventory',
    tagline: 'Stock Management',
    description: 'Track stock levels in real-time, get low stock alerts, and manage your suppliers efficiently.',
    icon: 'layers-outline',
    color: '#06B6D4',
    bgColor: '#CFFAFE',
    gradientColors: ['#0891B2', '#06B6D4'],
    route: '/inventory',
    benefits: ['Real-time stock tracking', 'Low stock alerts', 'Sync with POS', 'Barcode scanning'],
  },
  {
    id: 'expenses',
    name: 'Expenses',
    tagline: 'Cost Tracking',
    description: 'Track all your business expenses, scan receipts, and generate detailed expense reports.',
    icon: 'wallet-outline',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    gradientColors: ['#DC2626', '#EF4444'],
    route: '/expenses',
    benefits: ['Track business expenses', 'Receipt scanning', 'Expense reports', 'Tax categories'],
  },
  {
    id: 'loyalty',
    name: 'Loyalty',
    tagline: 'Customer Rewards',
    description: 'Build customer loyalty with points, tiers, and rewards. Increase retention and repeat business.',
    icon: 'heart-outline',
    color: '#EC4899',
    bgColor: '#FCE7F3',
    gradientColors: ['#DB2777', '#EC4899'],
    route: '/loyalty',
    benefits: ['Customer rewards program', 'Points & tiers', 'Retention tracking', 'VIP management'],
  },
  {
    id: 'invoicing',
    name: 'Invoicing',
    tagline: 'Bills & Quotes',
    description: 'Create professional invoices, track payments, and manage your B2B clients seamlessly.',
    icon: 'document-text-outline',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    gradientColors: ['#6D28D9', '#7C3AED'],
    route: '/invoicing',
    benefits: ['Professional invoices', 'Quote generation', 'Payment tracking', 'Multi-currency'],
  },
  {
    id: 'kwikpay',
    name: 'KwikPay',
    tagline: 'Payment Processing',
    description: 'Accept payments via multiple gateways, track transactions, and manage payouts effortlessly.',
    icon: 'card-outline',
    color: '#10B981',
    bgColor: '#D1FAE5',
    gradientColors: ['#10B981', '#059669'],
    route: '/kwikpay',
    benefits: ['Accept payments', 'Multiple gateways', 'Transaction history', 'Payout management'],
  },
];

// Default linked apps
const DEFAULT_LINKED_APPS = ['inventory', 'invoicing', 'kwikpay'];

interface LinkedAppsSidebarProps {
  currentProductId: string;
  themeColor?: string;
  themeBgColor?: string;
}

export default function LinkedAppsSidebar({ 
  currentProductId, 
  themeColor = '#2563EB',
  themeBgColor = '#EFF6FF',
}: LinkedAppsSidebarProps) {
  const router = useRouter();
  const [linkedAppIds, setLinkedAppIds] = useState<string[]>(DEFAULT_LINKED_APPS);
  const [appsWithStatus, setAppsWithStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [hoveredAppId, setHoveredAppId] = useState<string | null>(null);
  const [confirmingUnlinkId, setConfirmingUnlinkId] = useState<string | null>(null);
  
  // Multi-state modal phase for linking: 'details' -> 'syncing' -> 'success'
  const [linkModalPhase, setLinkModalPhase] = useState<'details' | 'syncing' | 'success'>('details');
  const [syncProgress, setSyncProgress] = useState(0);
  
  // Multi-state modal phase for unlinking: 'confirm' -> 'processing' -> 'success'
  const [unlinkModalPhase, setUnlinkModalPhase] = useState<'confirm' | 'processing' | 'success'>('confirm');
  
  // Business name for per-business indicator
  const [currentBusinessName, setCurrentBusinessName] = useState<string>('');
  
  // Confetti ref
  const confettiRef = useRef<any>(null);

  // Get linked and available apps
  const linkedApps = ALL_GALAXY_APPS.filter(app => linkedAppIds.includes(app.id));
  const availableApps = ALL_GALAXY_APPS.filter(app => !linkedAppIds.includes(app.id));

  useEffect(() => {
    fetchLinkedApps();
    fetchCurrentBusiness();
  }, []);
  
  const fetchCurrentBusiness = async () => {
    try {
      const response = await businessesApi.getUserBusinesses();
      const currentBiz = response.data?.businesses?.find((b: any) => b.is_current);
      if (currentBiz) {
        setCurrentBusinessName(currentBiz.name);
      }
    } catch (error) {
      console.log('Failed to fetch current business:', error);
    }
  };

  const fetchLinkedApps = async () => {
    try {
      setLoading(true);
      const response = await retailproApi.getLinkedApps();
      if (response.data?.linked_apps) {
        setLinkedAppIds(response.data.linked_apps);
      }
      if (response.data?.apps_with_status) {
        setAppsWithStatus(response.data.apps_with_status);
      }
    } catch (error) {
      console.error('Failed to fetch linked apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppClick = (app: AppInfo) => {
    if (linkedAppIds.includes(app.id)) {
      router.push(app.route as any);
    } else {
      setSelectedApp(app);
      setLinkModalPhase('details');
      setSyncProgress(0);
      setShowLinkModal(true);
    }
  };

  const handleAppLongPress = (app: AppInfo) => {
    if (linkedAppIds.includes(app.id)) {
      setSelectedApp(app);
      setShowUnlinkModal(true);
    }
  };

  // Confirm link - calls backend API with phase transitions
  const handleLinkApp = async () => {
    if (!selectedApp) return;
    
    // Transition to syncing phase
    setLinkModalPhase('syncing');
    setSyncProgress(0);
    
    // Slower animate progress - takes about 3 seconds total
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 3 + 5;
      });
    }, 400);
    
    try {
      const response = await retailproApi.updateLinkedApp(selectedApp.id, 'link');
      
      clearInterval(progressInterval);
      setSyncProgress(95);
      await new Promise(resolve => setTimeout(resolve, 300));
      setSyncProgress(100);
      
      if (response.data?.linked_apps) {
        setLinkedAppIds(response.data.linked_apps);
      }
      if (response.data?.app_status) {
        setAppsWithStatus(prev => {
          const existing = prev.filter(a => a.app_id !== selectedApp.id);
          return [...existing, response.data.app_status];
        });
      }
      
      // Delay before transitioning to success and firing confetti
      setTimeout(() => {
        setLinkModalPhase('success');
        setTimeout(() => {
          confettiRef.current?.start();
        }, 100);
      }, 600);
      
    } catch (error) {
      console.error('Failed to link app:', error);
      clearInterval(progressInterval);
      setSyncProgress(100);
      setLinkedAppIds(prev => [...prev, selectedApp.id]);
      setTimeout(() => {
        setLinkModalPhase('success');
        setTimeout(() => {
          confettiRef.current?.start();
        }, 100);
      }, 600);
    }
  };

  // Handle opening the app from unified modal
  const handleOpenAppFromModal = () => {
    if (selectedApp) {
      const route = selectedApp.route;
      confettiRef.current?.start();
      
      setTimeout(() => {
        setShowLinkModal(false);
        setLinkModalPhase('details');
        setSyncProgress(0);
        router.push(route as any);
        setSelectedApp(null);
      }, 1500);
    }
  };

  // Handle staying on dashboard from unified modal
  const handleStayOnDashboard = () => {
    confettiRef.current?.start();
    
    setTimeout(() => {
      setShowLinkModal(false);
      setLinkModalPhase('details');
      setSyncProgress(0);
      setSelectedApp(null);
    }, 1200);
  };

  // Handle closing the modal (only allowed during details phase)
  const handleCloseLinkModal = () => {
    if (linkModalPhase === 'details') {
      setShowLinkModal(false);
      setSelectedApp(null);
      setLinkModalPhase('details');
      setSyncProgress(0);
    }
  };

  // Inline confirm unlink (for web hover interaction)
  const handleConfirmUnlink = async (app: AppInfo) => {
    setUnlinking(true);
    try {
      const response = await retailproApi.updateLinkedApp(app.id, 'unlink');
      if (response.data?.linked_apps) {
        setLinkedAppIds(response.data.linked_apps);
      }
      setConfirmingUnlinkId(null);
    } catch (error) {
      console.error('Failed to unlink app:', error);
      setLinkedAppIds(prev => prev.filter(id => id !== app.id));
      setConfirmingUnlinkId(null);
    } finally {
      setUnlinking(false);
    }
  };

  const handleUnlinkApp = async () => {
    if (!selectedApp) return;
    
    // Transition to processing phase
    setUnlinkModalPhase('processing');
    setUnlinking(true);
    
    try {
      const response = await retailproApi.updateLinkedApp(selectedApp.id, 'unlink');
      if (response.data?.linked_apps) {
        setLinkedAppIds(response.data.linked_apps);
      }
      
      // Small delay then show success
      await new Promise(resolve => setTimeout(resolve, 800));
      setUnlinkModalPhase('success');
      
      // Auto-close after showing success
      setTimeout(() => {
        setShowUnlinkModal(false);
        setSelectedApp(null);
        setUnlinkModalPhase('confirm');
      }, 1500);
      
    } catch (error) {
      console.error('Failed to unlink app:', error);
      setLinkedAppIds(prev => prev.filter(id => id !== selectedApp.id));
      
      // Still show success on optimistic update
      await new Promise(resolve => setTimeout(resolve, 500));
      setUnlinkModalPhase('success');
      
      setTimeout(() => {
        setShowUnlinkModal(false);
        setSelectedApp(null);
        setUnlinkModalPhase('confirm');
      }, 1500);
    } finally {
      setUnlinking(false);
    }
  };

  const closeUnlinkModal = () => {
    // Only allow closing during confirm phase
    if (unlinkModalPhase === 'confirm') {
      setShowUnlinkModal(false);
      setSelectedApp(null);
      setUnlinkModalPhase('confirm');
    }
  };

  return (
    <View style={styles.container}>
      {/* Business-specific indicator */}
      {currentBusinessName && (
        <View style={styles.businessIndicator}>
          <Ionicons name="business-outline" size={12} color="#6B7280" />
          <Text style={styles.businessIndicatorText} numberOfLines={1}>
            Apps for {currentBusinessName}
          </Text>
        </View>
      )}
      
      {/* Linked Apps Section */}
      {linkedApps.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Ionicons name="link-outline" size={14} color="#059669" />
            <Text style={[styles.sectionTitle, { color: '#059669' }]}>LINKED APPS</Text>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={themeColor} />
            </View>
          ) : (
            linkedApps.map((app) => (
              <View 
                key={app.id} 
                style={styles.appItemContainer}
                // @ts-ignore - Web hover support
                onMouseEnter={() => setHoveredAppId(app.id)}
                onMouseLeave={() => setHoveredAppId(null)}
              >
                <TouchableOpacity
                  style={styles.appItem}
                  onPress={() => handleAppClick(app)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.appIconContainer, { backgroundColor: app.bgColor }]}>
                    <Ionicons name={app.icon} size={18} color={app.color} />
                    <View style={[styles.linkedBadge, { backgroundColor: '#10B981' }]}>
                      <Ionicons name="checkmark" size={8} color="#FFFFFF" />
                    </View>
                  </View>
                  <Text style={styles.appName}>{app.name}</Text>
                </TouchableOpacity>
                
                {/* X Button - Only visible on hover, opens confirmation modal */}
                {hoveredAppId === app.id && (
                  <TouchableOpacity
                    style={styles.unlinkBtn}
                    onPress={() => {
                      setSelectedApp(app);
                      setShowUnlinkModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={14} color="#DC2626" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </>
      )}

      {/* Available Apps Section */}
      {availableApps.length > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: linkedApps.length > 0 ? 16 : 0 }]}>
            <Ionicons name="add-circle-outline" size={14} color="#2563EB" />
            <Text style={[styles.sectionTitle, { color: '#2563EB' }]}>AVAILABLE APPS</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{availableApps.length}</Text>
            </View>
          </View>
          
          {availableApps.map((app) => (
            <TouchableOpacity
              key={app.id}
              style={[styles.appItem, styles.availableAppItem]}
              onPress={() => handleAppClick(app)}
              activeOpacity={0.7}
            >
              <View style={[styles.appIconContainer, { backgroundColor: app.bgColor, opacity: 0.8 }]}>
                <Ionicons name={app.icon} size={18} color={app.color} />
              </View>
              <Text style={[styles.appName, { color: '#6B7280' }]}>{app.name}</Text>
              <View style={styles.linkTag}>
                <Ionicons name="add" size={10} color="#FFFFFF" />
                <Text style={styles.linkTagText}>Link</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Unified Link App Modal - Multi-State (Details → Syncing → Success) */}
      <Modal
        visible={showLinkModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseLinkModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={handleCloseLinkModal}
        >
          <View 
            style={styles.linkCardModal}
            onStartShouldSetResponder={() => true}
          >
            {selectedApp && (
              <>
                {/* Gradient Header - Changes based on phase */}
                <LinearGradient
                  colors={selectedApp.gradientColors as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.linkCardHeader,
                    linkModalPhase === 'success' && styles.successHeaderExpanded
                  ]}
                >
                  {/* Close Button - Only visible in details phase */}
                  {linkModalPhase === 'details' && (
                    <TouchableOpacity 
                      style={styles.linkCardCloseBtn}
                      onPress={handleCloseLinkModal}
                    >
                      <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                  )}

                  {/* App Icon with different states */}
                  {linkModalPhase === 'details' && (
                    <View style={styles.linkCardIconContainer}>
                      <Ionicons name={selectedApp.icon} size={40} color="#FFFFFF" />
                    </View>
                  )}
                  
                  {linkModalPhase === 'syncing' && (
                    <View style={styles.syncingIconContainer}>
                      <View style={styles.syncingIconInner}>
                        <Ionicons name={selectedApp.icon} size={32} color={selectedApp.color} />
                      </View>
                      <ActivityIndicator 
                        size="large" 
                        color="#FFFFFF" 
                        style={styles.syncingSpinner}
                      />
                    </View>
                  )}
                  
                  {linkModalPhase === 'success' && (
                    <View style={styles.successIconWrapper}>
                      <View style={styles.successIconCircle}>
                        <Ionicons name={selectedApp.icon} size={32} color={selectedApp.color} />
                      </View>
                      <View style={styles.successCheckBadge}>
                        <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                      </View>
                    </View>
                  )}

                  {/* Header Text - Changes based on phase */}
                  {linkModalPhase === 'details' && (
                    <>
                      <Text style={styles.linkCardAppName}>{selectedApp.name}</Text>
                      <Text style={styles.linkCardTagline}>{selectedApp.tagline}</Text>
                    </>
                  )}
                  
                  {linkModalPhase === 'syncing' && (
                    <>
                      <Text style={styles.linkCardAppName}>Syncing {selectedApp.name}</Text>
                      <Text style={styles.linkCardTagline}>Please wait...</Text>
                    </>
                  )}
                  
                  {linkModalPhase === 'success' && (
                    <Text style={styles.successTitle}>Successfully Linked!</Text>
                  )}
                </LinearGradient>

                {/* Content - Changes based on phase */}
                <View style={styles.linkCardContent}>
                  
                  {/* DETAILS PHASE */}
                  {linkModalPhase === 'details' && (
                    <>
                      <Text style={styles.linkCardDescription}>
                        {selectedApp.description}
                      </Text>

                      <Text style={styles.linkCardBenefitsTitle}>What you'll get:</Text>
                      <View style={styles.linkCardBenefitsList}>
                        {selectedApp.benefits.map((benefit, index) => (
                          <View key={index} style={styles.linkCardBenefitItem}>
                            <View style={[styles.linkCardCheckCircle, { backgroundColor: selectedApp.bgColor }]}>
                              <Ionicons name="checkmark" size={12} color={selectedApp.color} />
                            </View>
                            <Text style={styles.linkCardBenefitText}>{benefit}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.linkCardActions}>
                        <TouchableOpacity 
                          style={styles.linkCardCancelBtn}
                          onPress={handleCloseLinkModal}
                        >
                          <Text style={styles.linkCardCancelText}>Maybe Later</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.linkCardConfirmBtn, { backgroundColor: selectedApp.color }]}
                          onPress={handleLinkApp}
                        >
                          <Ionicons name="flash" size={16} color="#FFFFFF" />
                          <Text style={styles.linkCardConfirmText}>Start Free Trial</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  
                  {/* SYNCING PHASE */}
                  {linkModalPhase === 'syncing' && (
                    <View style={styles.syncingContent}>
                      <Text style={styles.syncingTitle}>Setting up {selectedApp.name}</Text>
                      <Text style={styles.syncingSubtitle}>
                        Connecting to your RetailPro account...
                      </Text>
                      
                      {/* Progress Bar */}
                      <View style={styles.progressBarContainer}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { 
                              width: `${Math.min(syncProgress, 100)}%`,
                              backgroundColor: selectedApp.color 
                            }
                          ]} 
                        />
                      </View>
                      
                      <View style={styles.syncingSteps}>
                        <View style={styles.syncingStep}>
                          <Ionicons 
                            name={syncProgress > 30 ? "checkmark-circle" : "ellipse-outline"} 
                            size={18} 
                            color={syncProgress > 30 ? "#10B981" : "#9CA3AF"} 
                          />
                          <Text style={[
                            styles.syncingStepText,
                            syncProgress > 30 && styles.syncingStepComplete
                          ]}>
                            Verifying account
                          </Text>
                        </View>
                        <View style={styles.syncingStep}>
                          <Ionicons 
                            name={syncProgress > 60 ? "checkmark-circle" : "ellipse-outline"} 
                            size={18} 
                            color={syncProgress > 60 ? "#10B981" : "#9CA3AF"} 
                          />
                          <Text style={[
                            styles.syncingStepText,
                            syncProgress > 60 && styles.syncingStepComplete
                          ]}>
                            Syncing data
                          </Text>
                        </View>
                        <View style={styles.syncingStep}>
                          <Ionicons 
                            name={syncProgress >= 100 ? "checkmark-circle" : "ellipse-outline"} 
                            size={18} 
                            color={syncProgress >= 100 ? "#10B981" : "#9CA3AF"} 
                          />
                          <Text style={[
                            styles.syncingStepText,
                            syncProgress >= 100 && styles.syncingStepComplete
                          ]}>
                            Activating trial
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                  
                  {/* SUCCESS PHASE */}
                  {linkModalPhase === 'success' && (
                    <View style={styles.successContentInner}>
                      <Text style={styles.successAppName}>{selectedApp.name}</Text>
                      <Text style={styles.successMessage}>
                        is now connected to your RetailPro
                      </Text>

                      {/* Trial Info Card */}
                      <View style={styles.trialInfoCard}>
                        <View style={styles.trialInfoIcon}>
                          <Ionicons name="gift" size={24} color="#F59E0B" />
                        </View>
                        <View style={styles.trialInfoText}>
                          <Text style={styles.trialInfoTitle}>7-Day Free Trial Started</Text>
                          <Text style={styles.trialInfoDesc}>
                            Enjoy all features free for 7 days!
                          </Text>
                        </View>
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.successActionsUnified}>
                        <TouchableOpacity 
                          style={[styles.successPrimaryBtn, { backgroundColor: selectedApp.color }]}
                          onPress={handleOpenAppFromModal}
                        >
                          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                          <Text style={styles.successPrimaryText}>Open {selectedApp.name}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.successSecondaryBtn}
                          onPress={handleStayOnDashboard}
                        >
                          <Text style={styles.successSecondaryText}>Stay on Dashboard</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
          
          {/* Animated Confetti - fires on success */}
          {linkModalPhase === 'success' && (
            <ConfettiCannon
              ref={confettiRef}
              count={150}
              origin={{ x: 200, y: 0 }}
              autoStart={false}
              fadeOut={true}
              fallSpeed={2500}
              explosionSpeed={350}
              colors={selectedApp ? [selectedApp.color, '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'] : ['#FFD700', '#FF6B6B', '#4ECDC4']}
            />
          )}
        </TouchableOpacity>
      </Modal>

      {/* Unlink App Modal - Multi-State (Confirm → Processing → Success) */}
      <Modal
        visible={showUnlinkModal}
        transparent
        animationType="fade"
        onRequestClose={closeUnlinkModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.unlinkModalContainer}>
            {selectedApp && (
              <>
                {/* CONFIRM PHASE */}
                {unlinkModalPhase === 'confirm' && (
                  <>
                    {/* Accent Bar */}
                    <View style={[styles.accentBar, { backgroundColor: '#D97706' }]} />
                    
                    {/* App Icon */}
                    <View style={[styles.unlinkIconContainer, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name={selectedApp.icon} size={36} color={selectedApp.color} />
                      <View style={styles.unlinkBadgeOverlay}>
                        <Ionicons name="remove-circle" size={20} color="#D97706" />
                      </View>
                    </View>

                    <Text style={styles.unlinkTitle}>Unlink {selectedApp.name}?</Text>
                    <Text style={styles.unlinkMessage}>
                      This will disconnect {selectedApp.name} from RetailPro. You can re-link it anytime and your data will be preserved.
                    </Text>

                    {/* Actions */}
                    <View style={styles.unlinkActions}>
                      <TouchableOpacity 
                        style={styles.unlinkCancelButton}
                        onPress={closeUnlinkModal}
                      >
                        <Text style={styles.unlinkCancelText}>Keep Linked</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.unlinkConfirmButton}
                        onPress={handleUnlinkApp}
                      >
                        <Ionicons name="unlink" size={16} color="#FFFFFF" />
                        <Text style={styles.unlinkConfirmText}>Unlink</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* PROCESSING PHASE */}
                {unlinkModalPhase === 'processing' && (
                  <View style={styles.processingContainer}>
                    <View style={[styles.processingIconContainer, { backgroundColor: selectedApp.bgColor }]}>
                      <Ionicons name={selectedApp.icon} size={36} color={selectedApp.color} />
                    </View>
                    <ActivityIndicator size="large" color="#D97706" style={{ marginVertical: 16 }} />
                    <Text style={styles.processingTitle}>Unlinking {selectedApp.name}...</Text>
                    <Text style={styles.processingSubtitle}>Please wait</Text>
                  </View>
                )}

                {/* SUCCESS PHASE */}
                {unlinkModalPhase === 'success' && (
                  <View style={styles.successContainer}>
                    <View style={styles.successIconWrapper}>
                      <View style={[styles.successIconCircle, { backgroundColor: '#D1FAE5' }]}>
                        <Ionicons name="checkmark" size={40} color="#10B981" />
                      </View>
                    </View>
                    <Text style={styles.successTitle}>Successfully Unlinked!</Text>
                    <Text style={styles.successSubtitle}>
                      {selectedApp.name} has been disconnected from RetailPro
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  businessIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginHorizontal: 8,
  },
  businessIndicatorText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: '#2563EB',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  appItemWrapper: {
    position: 'relative',
  },
  appItemHovered: {
    backgroundColor: '#F3F4F6',
  },
  appItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 2,
    borderRadius: 8,
  },
  appItemConfirming: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  inlineConfirmContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  inlineConfirmText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  inlineConfirmButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineConfirmYes: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  inlineConfirmYesText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  inlineConfirmNo: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  inlineConfirmNoText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  unlinkBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    marginLeft: 8,
  },
  unlinkHoverBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  unlinkBtnHovered: {
    backgroundColor: '#FCA5A5',
    borderColor: '#F87171',
    transform: [{ scale: 1.1 }],
  },
  unlinkBtnMobile: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  availableAppItem: {
    opacity: 0.9,
  },
  appIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  linkedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  appName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  linkTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  linkTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  // Link Card Modal Styles
  linkCardModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 20,
  },
  linkCardHeader: {
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
  },
  successHeaderExpanded: {
    paddingTop: 32,
    paddingBottom: 24,
  },
  linkCardCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkCardIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  linkCardAppName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  linkCardTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  linkCardContent: {
    padding: 24,
  },
  linkCardDescription: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  linkCardBenefitsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  linkCardBenefitsList: {
    marginBottom: 24,
  },
  linkCardBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  linkCardCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  linkCardBenefitText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  linkCardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  linkCardCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkCardCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  linkCardConfirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  linkCardConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Syncing Phase Styles
  syncingIconContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  syncingIconInner: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncingSpinner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  syncingContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  syncingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  syncingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  syncingSteps: {
    width: '100%',
    gap: 12,
  },
  syncingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncingStepText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  syncingStepComplete: {
    color: '#10B981',
    fontWeight: '600',
  },
  // Success Phase Styles
  successIconWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  successCheckBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 2,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successContentInner: {
    alignItems: 'center',
  },
  successAppName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  successMessage: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 20,
  },
  trialInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  trialInfoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trialInfoText: {
    flex: 1,
  },
  trialInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  trialInfoDesc: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  successActionsUnified: {
    width: '100%',
    gap: 12,
  },
  successPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  successPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successSecondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  successSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Unlink Modal Styles
  confirmModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 0,
    paddingBottom: 24,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    overflow: 'hidden',
  },
  accentBar: {
    height: 4,
    width: '100%',
    marginBottom: 24,
  },
  confirmIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  linkBadgeOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  benefitText: {
    fontSize: 14,
    color: '#374151',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmLinkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Unlink Modal Styles
  unlinkModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 0,
    paddingBottom: 24,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    overflow: 'hidden',
  },
  accentBar: {
    height: 4,
    width: '100%',
    marginBottom: 24,
  },
  unlinkIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  unlinkBadgeOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },
  unlinkTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  unlinkMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  unlinkActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  unlinkCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlinkCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  unlinkConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#D97706',
  },
  unlinkConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Processing Phase Styles
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingTop: 32,
  },
  processingIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  processingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Success Phase Styles
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingTop: 32,
  },
  successIconWrapper: {
    marginBottom: 16,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
