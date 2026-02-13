import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_AREA_SIZE = Math.min(SCREEN_WIDTH * 0.7, 280);

export default function BarcodeScanner({ visible, onClose, onScan }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);

  console.log('BarcodeScanner render - visible:', visible, 'platform:', Platform.OS);

  useEffect(() => {
    console.log('BarcodeScanner useEffect - visible:', visible, 'permission:', permission?.granted);
    if (visible && !permission?.granted) {
      requestPermission();
    }
    // Reset scanned state when modal opens
    if (visible) {
      setScanned(false);
    }
  }, [visible]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    // Vibrate feedback on mobile
    if (Platform.OS !== 'web') {
      try {
        const Haptics = require('expo-haptics');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        // Haptics not available
      }
    }
    
    onScan(data);
    
    // Auto-close after short delay
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const renderContent = () => {
    if (!permission) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.statusText}>Requesting camera permission...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.centerContent}>
          <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
          <Text style={styles.statusTitle}>Camera Permission Required</Text>
          <Text style={styles.statusText}>
            To scan barcodes, please allow camera access
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Web fallback - show manual entry option
    if (Platform.OS === 'web') {
      return (
        <View style={styles.centerContent}>
          <Ionicons name="barcode-outline" size={64} color="#F59E0B" />
          <Text style={styles.statusTitle}>Barcode Scanner</Text>
          <Text style={styles.statusText}>
            Camera scanning works best on mobile devices.
            {'\n'}Use the Expo Go app for the best experience.
          </Text>
          <View style={styles.webTip}>
            <Ionicons name="phone-portrait-outline" size={20} color="#3B82F6" />
            <Text style={styles.webTipText}>
              Scan the QR code with Expo Go on your phone
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{
            barcodeTypes: [
              'ean13',
              'ean8',
              'upc_a',
              'upc_e',
              'code39',
              'code93',
              'code128',
              'codabar',
              'itf14',
              'qr',
            ],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        
        {/* Scan overlay */}
        <View style={styles.overlay}>
          {/* Top overlay */}
          <View style={styles.overlayTop} />
          
          {/* Middle row with scan area */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanArea}>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              
              {/* Scan line animation */}
              {!scanned && (
                <View style={styles.scanLine} />
              )}
            </View>
            <View style={styles.overlaySide} />
          </View>
          
          {/* Bottom overlay */}
          <View style={styles.overlayBottom}>
            <Text style={styles.instructionText}>
              {scanned ? '✓ Barcode detected!' : 'Point camera at barcode'}
            </Text>
          </View>
        </View>
        
        {/* Torch toggle */}
        <TouchableOpacity
          style={[styles.torchBtn, torch && styles.torchBtnActive]}
          onPress={() => setTorch(!torch)}
        >
          <Ionicons 
            name={torch ? "flash" : "flash-outline"} 
            size={24} 
            color={torch ? "#F59E0B" : "#FFFFFF"} 
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={Platform.OS === 'web'}
      presentationStyle={Platform.OS === 'web' ? undefined : "fullScreen"}
      onRequestClose={onClose}
    >
      <View style={[styles.container, Platform.OS === 'web' && styles.webModalContainer]}>
        {Platform.OS === 'web' && (
          <TouchableOpacity style={styles.webBackdrop} onPress={onClose} activeOpacity={1} />
        )}
        <View style={[Platform.OS === 'web' && styles.webModalContent]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan Barcode</Text>
            <View style={styles.closeBtn} />
          </View>
          
          {renderContent()}
          
          {/* Bottom info */}
          <View style={styles.bottomInfo}>
            <View style={styles.supportedTypes}>
              <Text style={styles.supportedTypesTitle}>Supported formats:</Text>
              <Text style={styles.supportedTypesList}>
                EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webModalContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  webModalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionBtn: {
    marginTop: 24,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  webTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  webTipText: {
    color: '#3B82F6',
    fontSize: 14,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#F59E0B',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#F59E0B',
    opacity: 0.8,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    paddingTop: 24,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  torchBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
  },
  bottomInfo: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
  },
  supportedTypes: {
    alignItems: 'center',
  },
  supportedTypesTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  supportedTypesList: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
