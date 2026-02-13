import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { LinearGradient } from 'expo-linear-gradient';

// Software Galaxy Theme Colors
const GALAXY_THEME = {
  primary: '#00B4D8',
  dark: '#03071E',
  secondary: '#023E8A',
};

const isWeb = Platform.OS === 'web';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // Wait for auth loading to complete
    if (isLoading) return;

    // Different behavior for web vs mobile
    const timer = setTimeout(() => {
      if (isWeb) {
        // Web users → Show the landing page
        router.replace('/landing');
      } else {
        // Mobile users
        if (isAuthenticated) {
          router.replace('/galaxy/home');
        } else {
          router.replace('/(auth)/login');
        }
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated]);

  return (
    <LinearGradient
      colors={[GALAXY_THEME.dark, GALAXY_THEME.secondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Stars */}
      <View style={styles.starsContainer}>
        {[...Array(20)].map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.star, 
              { 
                left: `${Math.random() * 100}%`, 
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.3,
              }
            ]} 
          />
        ))}
      </View>
      
      <View style={styles.logoContainer}>
        {/* Software Galaxy Logo */}
        <View style={styles.logoIcon}>
          <View style={styles.logoOrbit}>
            <View style={styles.logoDot} />
          </View>
        </View>
        <View style={styles.logoTextContainer}>
          <Text style={styles.logoTextSoftware}>SOFTWARE</Text>
          <Text style={styles.logoTextGalaxy}>GALAXY</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoIcon: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoOrbit: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: GALAXY_THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: GALAXY_THEME.primary,
    position: 'absolute',
    top: -7,
    right: 8,
  },
  logoTextContainer: {
    alignItems: 'center',
  },
  logoTextSoftware: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 4,
  },
  logoTextGalaxy: {
    fontSize: 36,
    fontWeight: '800',
    color: GALAXY_THEME.primary,
    marginTop: -4,
  },
});
