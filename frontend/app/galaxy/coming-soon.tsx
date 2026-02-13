import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const GALAXY_THEME = {
  primary: '#00B4D8',
  primaryDark: '#0077B6',
  secondary: '#023E8A',
  dark: '#03071E',
  light: '#CAF0F8',
  white: '#FFFFFF',
};

export default function ComingSoon() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const [email, setEmail] = React.useState('');
  const [subscribed, setSubscribed] = React.useState(false);

  const handleSubscribe = () => {
    if (email) {
      setSubscribed(true);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[GALAXY_THEME.dark, GALAXY_THEME.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Stars */}
        <View style={styles.starsContainer}>
          {[...Array(30)].map((_, i) => (
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

        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/galaxy')}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          {/* Rocket Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconOrbit}>
              <Ionicons name="rocket" size={48} color={GALAXY_THEME.primary} />
            </View>
          </View>

          <Text style={styles.title}>Coming Soon</Text>
          <Text style={styles.subtitle}>
            We're working hard to bring you this amazing solution.{'\n'}
            Be the first to know when it launches!
          </Text>

          {subscribed ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={styles.successText}>You're on the list!</Text>
              <Text style={styles.successSubtext}>
                We'll notify you as soon as this solution is available.
              </Text>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity 
                style={styles.notifyButton}
                onPress={handleSubscribe}
              >
                <Text style={styles.notifyButtonText}>Notify Me</Text>
                <Ionicons name="notifications-outline" size={20} color={GALAXY_THEME.dark} />
              </TouchableOpacity>
            </View>
          )}

          {/* Back to Solutions */}
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => router.push('/galaxy')}
          >
            <Ionicons name="grid-outline" size={20} color="#FFFFFF" />
            <Text style={styles.exploreButtonText}>Explore Other Solutions</Text>
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    position: 'relative',
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
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconOrbit: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(0,180,216,0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,180,216,0.1)',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 400,
    marginBottom: 40,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#FFFFFF',
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GALAXY_THEME.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  notifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: GALAXY_THEME.dark,
  },
  successContainer: {
    alignItems: 'center',
    gap: 12,
  },
  successText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  successSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 40,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  exploreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOrbit: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: GALAXY_THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GALAXY_THEME.primary,
    position: 'absolute',
    top: -3,
    right: 3,
  },
  logoTextContainer: {
    flexDirection: 'column',
  },
  logoTextSoftware: {
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
  },
  logoTextGalaxy: {
    fontSize: 14,
    fontWeight: '800',
    color: GALAXY_THEME.primary,
    marginTop: -2,
  },
});
