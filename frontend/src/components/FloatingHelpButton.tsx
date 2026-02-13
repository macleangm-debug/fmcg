import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function FloatingHelpButton() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const router = useRouter();

  const handlePress = () => {
    router.push('/help');
  };

  // Position adjustments for different screen sizes
  const buttonPosition = isWeb
    ? { bottom: 24, right: 24 }
    : { bottom: 100, right: 20 }; // Higher on mobile to avoid tab bar

  return (
    <View style={[styles.container, buttonPosition]} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.button, isWeb && styles.buttonWeb]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="help" size={24} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
      
      {/* Pulse ring effect */}
      <View style={[styles.pulseRing, isWeb && styles.pulseRingWeb]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 2,
  },
  buttonWeb: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    opacity: 0.3,
    zIndex: 1,
  },
  pulseRingWeb: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
});
