import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useModal } from '../context/ModalContext';
import BarcodeScanner from './BarcodeScanner';

// Global Modals Component - renders at app root level
export default function GlobalModals() {
  const {
    barcodeScannerModal,
    closeBarcodeScanner,
    trialModal,
    closeTrialModal,
    confirmModal,
    closeConfirmModal,
  } = useModal();

  const handleBarcodeScan = (barcode: string) => {
    console.log('GlobalModals: Barcode scanned:', barcode);
    if (barcodeScannerModal.onScan) {
      barcodeScannerModal.onScan(barcode);
    }
    closeBarcodeScanner();
  };

  const handleStartTrial = () => {
    console.log('GlobalModals: Starting trial for', trialModal.app?.name);
    if (trialModal.onStartTrial) {
      trialModal.onStartTrial();
    }
    closeTrialModal();
  };

  return (
    <>
      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        visible={barcodeScannerModal.visible}
        onClose={closeBarcodeScanner}
        onScan={handleBarcodeScan}
      />

      {/* Trial Modal */}
      <Modal
        visible={trialModal.visible}
        transparent
        animationType="fade"
        onRequestClose={closeTrialModal}
      >
        <View style={styles.trialOverlay}>
          <View style={styles.trialModal}>
            {trialModal.app && (
              <>
                {/* Gradient Header */}
                <LinearGradient
                  colors={trialModal.app.gradientColors || ['#3B82F6', '#1D4ED8']}
                  style={styles.trialHeader}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.trialAppIcon}>
                    <Ionicons name={trialModal.app.icon as any} size={32} color="#FFFFFF" />
                  </View>
                  <Text style={styles.trialAppName}>{trialModal.app.name}</Text>
                  <Text style={styles.trialTagline}>{trialModal.app.tagline}</Text>
                </LinearGradient>

                {/* Content */}
                <View style={styles.trialContent}>
                  <Text style={styles.trialDescription}>{trialModal.app.description}</Text>
                  
                  <Text style={styles.featuresTitle}>Features included:</Text>
                  <View style={styles.featuresList}>
                    {trialModal.app.features?.slice(0, 4).map((feature, idx) => (
                      <View key={idx} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.trialBadge}>
                    <Ionicons name="gift-outline" size={18} color="#F59E0B" />
                    <Text style={styles.trialBadgeText}>7-day free trial included</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.trialActions}>
                  <TouchableOpacity 
                    style={styles.startTrialButton}
                    onPress={handleStartTrial}
                  >
                    <LinearGradient
                      colors={trialModal.app.gradientColors || ['#3B82F6', '#1D4ED8']}
                      style={styles.startTrialGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.startTrialText}>Start Free Trial</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={closeTrialModal}
                  >
                    <Text style={styles.cancelButtonText}>Maybe Later</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Confirm Modal */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={closeConfirmModal}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={[
              styles.confirmIconContainer,
              confirmModal.variant === 'danger' && styles.confirmIconDanger,
              confirmModal.variant === 'warning' && styles.confirmIconWarning,
            ]}>
              <Ionicons 
                name={
                  confirmModal.variant === 'danger' ? 'warning' :
                  confirmModal.variant === 'warning' ? 'alert-circle' : 'information-circle'
                } 
                size={32} 
                color={
                  confirmModal.variant === 'danger' ? '#DC2626' :
                  confirmModal.variant === 'warning' ? '#F59E0B' : '#3B82F6'
                } 
              />
            </View>
            
            <Text style={styles.confirmTitle}>{confirmModal.title || 'Confirm'}</Text>
            <Text style={styles.confirmMessage}>{confirmModal.message}</Text>
            
            <View style={styles.confirmActions}>
              <TouchableOpacity 
                style={styles.confirmCancelBtn}
                onPress={() => {
                  if (confirmModal.onCancel) confirmModal.onCancel();
                  closeConfirmModal();
                }}
              >
                <Text style={styles.confirmCancelText}>{confirmModal.cancelText || 'Cancel'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.confirmOkBtn,
                  confirmModal.variant === 'danger' && styles.confirmOkBtnDanger,
                ]}
                onPress={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  closeConfirmModal();
                }}
              >
                <Text style={styles.confirmOkText}>{confirmModal.confirmText || 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Trial Modal Styles
  trialOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  trialModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      },
    }),
  },
  trialHeader: {
    padding: 24,
    alignItems: 'center',
  },
  trialAppIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  trialAppName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  trialTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  trialContent: {
    padding: 20,
  },
  trialDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#4B5563',
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  trialBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B45309',
  },
  trialActions: {
    padding: 20,
    paddingTop: 0,
    gap: 10,
  },
  startTrialButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  startTrialGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  startTrialText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Confirm Modal Styles
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  confirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmIconDanger: {
    backgroundColor: '#FEF2F2',
  },
  confirmIconWarning: {
    backgroundColor: '#FFFBEB',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  confirmOkBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  confirmOkBtnDanger: {
    backgroundColor: '#DC2626',
  },
  confirmOkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
