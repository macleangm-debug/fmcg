import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Animated,
  Pressable,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThermalReceipt, { ReceiptData } from './ThermalReceipt';

interface ReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  receiptData: ReceiptData | null;
  onNewSale?: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({
  visible,
  onClose,
  receiptData,
  onNewSale,
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = Platform.OS !== 'web' || width < 768;
  
  const slideAnim = React.useRef(new Animated.Value(height)).current;
  
  React.useEffect(() => {
    if (visible && isMobile) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(height);
    }
  }, [visible, isMobile, height]);
  
  const handleClose = () => {
    if (isMobile) {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start(() => onClose());
    } else {
      onClose();
    }
  };

  const handlePrint = () => {
    // Web printing
    if (Platform.OS === 'web') {
      window.print();
    } else {
      Alert.alert('Print', 'Connect to a thermal printer to print receipt');
    }
  };

  const handleShareWhatsApp = async () => {
    if (!receiptData) return;
    
    const text = generateReceiptText(receiptData);
    
    if (Platform.OS === 'web') {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      try {
        await Share.share({ message: text });
      } catch (error) {
        Alert.alert('Error', 'Failed to share');
      }
    }
  };

  const generateReceiptText = (data: ReceiptData) => {
    let text = `*${data.businessName}*\n`;
    if (data.businessAddress) text += `${data.businessAddress}\n`;
    if (data.businessPhone) text += `Tel: ${data.businessPhone}\n`;
    text += `\nReceipt: ${data.receiptNumber}\n`;
    text += `Date: ${data.date} ${data.time}\n\n`;
    
    data.items.forEach(item => {
      text += `${item.quantity}x ${item.name} - ${data.currencySymbol}${item.total.toLocaleString()}\n`;
    });
    
    text += `\n*TOTAL: ${data.currencySymbol}${data.grandTotal.toLocaleString()}*\n`;
    text += `\nPaid by: ${data.paymentMethod}\n`;
    if (data.thankYouMessage) text += `\n_${data.thankYouMessage}_`;
    
    return text;
  };

  const handleShare = (type: 'whatsapp' | 'image' | 'pdf') => {
    switch (type) {
      case 'whatsapp':
        handleShareWhatsApp();
        break;
      case 'image':
        Alert.alert('Share as Image', 'Image sharing coming soon');
        break;
      case 'pdf':
        Alert.alert('Share as PDF', 'PDF generation coming soon');
        break;
    }
  };

  if (!visible || !receiptData) return null;

  const content = (
    <>
      {/* Success Header */}
      <View style={styles.successHeader}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={48} color="#10B981" />
        </View>
        <Text style={styles.successTitle}>Sale Complete!</Text>
        <Text style={styles.successSubtitle}>
          {receiptData.currencySymbol}{receiptData.grandTotal.toLocaleString()}
        </Text>
      </View>

      {/* Receipt Preview */}
      <View style={styles.receiptContainer}>
        <ThermalReceipt 
          data={receiptData}
          onPrint={handlePrint}
          onShare={handleShare}
          showActions={false}
        />
      </View>

      {/* Action Buttons */}
      <View style={[styles.actions, { paddingBottom: isMobile ? insets.bottom + 16 : 20 }]}>
        <View style={styles.shareRow}>
          <TouchableOpacity style={styles.shareBtn} onPress={handlePrint}>
            <Ionicons name="print-outline" size={22} color="#374151" />
            <Text style={styles.shareBtnText}>Print</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.shareBtn, styles.whatsappBtn]} onPress={handleShareWhatsApp}>
            <Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" />
            <Text style={[styles.shareBtnText, styles.whatsappBtnText]}>WhatsApp</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare('image')}>
            <Ionicons name="image-outline" size={22} color="#374151" />
            <Text style={styles.shareBtnText}>Image</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mainActions}>
          <TouchableOpacity 
            style={styles.newSaleBtn}
            onPress={() => {
              handleClose();
              setTimeout(() => onNewSale?.(), 300);
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.newSaleBtnText}>New Sale</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  // Mobile: Bottom sheet (fullscreen)
  if (isMobile) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={handleClose} />
          <Animated.View 
            style={[
              styles.mobileSheet,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.handle} />
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            {content}
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // Desktop: Centered modal
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.desktopModal}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          {content}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  mobileSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    flex: 1,
  },
  desktopModal: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -200 }, { translateY: -350 }],
    width: 400,
    maxHeight: 700,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  
  // Success Header
  successHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  successIcon: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#065F46',
  },
  successSubtitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 4,
  },
  
  // Receipt Container
  receiptContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  
  // Actions
  actions: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  shareRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
  },
  whatsappBtnText: {
    color: '#FFFFFF',
  },
  mainActions: {
    flexDirection: 'row',
    gap: 10,
  },
  newSaleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  newSaleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  doneBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ReceiptModal;
