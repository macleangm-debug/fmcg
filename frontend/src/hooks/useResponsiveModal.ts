import { useRef, useEffect, useCallback } from 'react';
import { Animated, useWindowDimensions, Platform } from 'react-native';

/**
 * Hook to add responsive modal behavior
 * - Mobile (phones < 768px): Bottom sheet with slide animation
 * - Desktop/Tablet: Centered modal
 */
export function useResponsiveModal(visible: boolean, onClose: () => void) {
  const { width, height } = useWindowDimensions();
  
  // Determine if we should use bottom sheet (mobile) or centered modal (desktop/tablet)
  const isMobile = Platform.OS !== 'web' || width < 768;
  const isBottomSheet = isMobile;
  
  // Animation for slide up
  const slideAnim = useRef(new Animated.Value(height)).current;
  
  useEffect(() => {
    if (visible && isBottomSheet) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(height);
    }
  }, [visible, isBottomSheet, height]);
  
  const handleClose = useCallback(() => {
    if (isBottomSheet) {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start(() => onClose());
    } else {
      onClose();
    }
  }, [isBottomSheet, height, onClose, slideAnim]);

  return {
    isBottomSheet,
    isMobile,
    slideAnim,
    handleClose,
    screenWidth: width,
    screenHeight: height,
  };
}

export default useResponsiveModal;
