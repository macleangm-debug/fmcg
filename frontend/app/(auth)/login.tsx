import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Pressable,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import Input from '../../src/components/Input';
import { useAuthStore } from '../../src/store/authStore';

WebBrowser.maybeCompleteAuthSession();

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Theme colors
const THEME = {
  primary: '#00B4D8',
  dark: '#03071E',
  secondary: '#023E8A',
  success: '#10B981',
  error: '#EF4444',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
};

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromApp = String(params.from) || 'galaxy';
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 768;
  const isMobile = !isWeb || width < 768;
  const { login, socialLogin, isLoading, error, clearError } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loginInProgress, setLoginInProgress] = useState(false);
  
  // Form validation state
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Animation values
  const buttonScale = useSharedValue(1);
  const googleButtonScale = useSharedValue(1);

  // Google OAuth
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '123456789-example.apps.googleusercontent.com',
    expoClientId: '123456789-example.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleSuccess(response.authentication?.accessToken);
    }
  }, [response]);

  const handleGoogleSuccess = async (accessToken) => {
    if (!accessToken) return;
    
    setGoogleLoading(true);
    try {
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/userinfo/v2/me',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const userInfo = await userInfoResponse.json();
      
      const result = await socialLogin('google', {
        email: userInfo.email,
        name: userInfo.name,
        google_id: userInfo.id,
      });
      
      if (result.success) {
        handleSuccessfulAuth(result.isSuperadmin);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to sign in with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoBack = () => {
    if (fromApp === 'retailpro') {
      router.push('/products/retail-pro');
    } else {
      router.push('/galaxy');
    }
  };

  const handleSuccessfulAuth = (isSuperadmin) => {
    // All users go to the main dashboard - superadmins can access platform settings from there
    if (isWeb) {
      // Web users go to main dashboard
      router.replace('/(tabs)/dashboard');
    } else {
      // Mobile users go to mobile home
      router.replace('/galaxy/home');
    }
  };

  const validateEmail = (value) => {
    if (!value.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email';
    return undefined;
  };

  const validatePassword = (value) => {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return undefined;
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setFieldErrors(prev => ({ ...prev, email: validateEmail(email) }));
    } else {
      setFieldErrors(prev => ({ ...prev, password: validatePassword(password) }));
    }
  };

  const handleLogin = async () => {
    // Mark all fields as touched
    setTouched({ email: true, password: true });
    
    // Validate all fields
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setFieldErrors({ email: emailError, password: passwordError });
    
    if (emailError || passwordError) {
      return;
    }
    
    setLoginInProgress(true);
    clearError(); // Clear any previous errors
    
    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Show success modal
        setShowSuccessModal(true);
        
        // Navigate after brief delay to show the modal
        setTimeout(() => {
          setShowSuccessModal(false);
          setLoginInProgress(false);
          handleSuccessfulAuth(result.isSuperadmin);
        }, 1500);
      } else {
        // Get error from store or use default
        const storeError = useAuthStore.getState().error;
        setErrorMessage(storeError || 'Login failed. Please check your credentials.');
        setShowErrorModal(true);
        setLoginInProgress(false);
      }
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
      setShowErrorModal(true);
      setLoginInProgress(false);
    }
  };

  const handleGooglePress = async () => {
    if (isWeb) {
      Alert.alert(
        'Google Sign In',
        'Google Sign-In requires OAuth configuration. For now, please use email login.',
        [{ text: 'OK' }]
      );
    } else {
      await promptAsync();
    }
  };

  // Button press animations
  const handleButtonPressIn = (scaleValue) => {
    scaleValue.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handleButtonPressOut = (scaleValue) => {
    scaleValue.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const googleButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: googleButtonScale.value }],
  }));

  const formContent = (
    <>
      {/* Back Button */}
      {/* Header */}
      <AnimatedView style={styles.header} entering={FadeInDown.delay(100).duration(400)}>
        <View style={styles.logoContainer}>
          <View style={styles.galaxyLogo}>
            <View style={styles.galaxyOrbit}>
              <View style={styles.galaxyDot} />
            </View>
          </View>
        </View>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to Software Galaxy</Text>
      </AnimatedView>

      {/* Google Sign In */}
      <AnimatedView entering={FadeInDown.delay(200).duration(400)}>
        <AnimatedTouchable
          style={[styles.googleButton, googleButtonAnimatedStyle]}
          onPress={handleGooglePress}
          onPressIn={() => handleButtonPressIn(googleButtonScale)}
          onPressOut={() => handleButtonPressOut(googleButtonScale)}
          disabled={googleLoading}
          activeOpacity={1}
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color="#374151" />
          ) : (
            <>
              <View style={styles.googleIconWrapper}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </AnimatedTouchable>
      </AnimatedView>

      {/* Divider */}
      <AnimatedView style={styles.divider} entering={FadeInDown.delay(400).duration(400)}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or sign in with email</Text>
        <View style={styles.dividerLine} />
      </AnimatedView>

      {/* Form */}
      <AnimatedView style={styles.form} entering={FadeInDown.delay(500).duration(400)}>
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Ionicons name="close" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputWrapper}>
          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (touched.email) {
                setFieldErrors(prev => ({ ...prev, email: validateEmail(text) }));
              }
            }}
            onBlur={() => handleBlur('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Ionicons name="mail-outline" size={18} color={touched.email && fieldErrors.email ? '#DC2626' : '#6B7280'} />}
          />
          {touched.email && fieldErrors.email && (
            <View style={styles.fieldError}>
              <Ionicons name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
            </View>
          )}
        </View>

        <View style={styles.inputWrapper}>
          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (touched.password) {
                setFieldErrors(prev => ({ ...prev, password: validatePassword(text) }));
              }
            }}
            onBlur={() => handleBlur('password')}
            onSubmitEditing={handleLogin}
            returnKeyType="done"
            secureTextEntry={!showPassword}
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={touched.password && fieldErrors.password ? '#DC2626' : '#6B7280'} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color="#6B7280"
                />
              </TouchableOpacity>
            }
          />
          {touched.password && fieldErrors.password && (
            <View style={styles.fieldError}>
              <Ionicons name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>
            </View>
          )}
        </View>

        {/* Forgot Password */}
        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Submit Button - Web uses native button */}
        {isWeb ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            disabled={isLoading || loginInProgress}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 24px',
              borderRadius: 12,
              backgroundColor: (isLoading || loginInProgress) ? '#93C5FD' : '#2563EB',
              border: 'none',
              gap: 8,
              cursor: (isLoading || loginInProgress) ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 8px rgba(37, 99, 235, 0.3)',
              width: '100%',
            }}
          >
            {(isLoading || loginInProgress) ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </button>
        ) : (
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isLoading || loginInProgress) && { opacity: 0.7 }
            ]}
            onPress={handleLogin}
            disabled={isLoading || loginInProgress}
            activeOpacity={0.8}
          >
            {(isLoading || loginInProgress) ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{"Don't have an account? "}</Text>
          <Link href={{pathname: "/(auth)/register", params: { from: fromApp }}} asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </AnimatedView>
    </>
  );

  // Success Modal Component
  const SuccessModal = () => (
    <Modal visible={showSuccessModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalIconSuccess}>
            <Ionicons name="checkmark-circle" size={48} color={THEME.success} />
          </View>
          <Text style={styles.modalTitle}>Login Successful!</Text>
          <Text style={styles.modalMessage}>
            Welcome back! Redirecting you to your dashboard...
          </Text>
          <ActivityIndicator size="small" color={THEME.primary} style={{ marginTop: 16 }} />
        </View>
      </View>
    </Modal>
  );

  // Error Modal Component
  const ErrorModal = () => (
    <Modal visible={showErrorModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalIconError}>
            <Ionicons name="alert-circle" size={48} color={THEME.error} />
          </View>
          <Text style={styles.modalTitle}>Login Failed</Text>
          <Text style={styles.modalMessage}>{errorMessage}</Text>
          <TouchableOpacity 
            style={styles.modalButton}
            onPress={() => setShowErrorModal(false)}
          >
            <Text style={styles.modalButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Web layout with centered card
  if (isWeb && isLargeScreen) {
    return (
      <View style={styles.webContainer}>
        <AnimatedView 
          style={styles.webCard}
          entering={FadeInUp.duration(500).springify()}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.webCardContent}
            keyboardShouldPersistTaps="handled"
          >
            {formContent}
          </ScrollView>
        </AnimatedView>
        
        {/* Success Modal */}
        <SuccessModal />
        
        {/* Error Modal */}
        <ErrorModal />
      </View>
    );
  }

  // Mobile layout
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isMobile && styles.mobileScrollContent,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {formContent}
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Success Modal */}
      <SuccessModal />
      
      {/* Error Modal */}
      <ErrorModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  mobileScrollContent: {
    paddingTop: 40,
    paddingBottom: 40,
  },
  // Back button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Web styles
  webContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  webCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 36,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  webCardContent: {
    flexGrow: 1,
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Galaxy logo styles
  galaxyLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#03071E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00B4D8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  galaxyOrbit: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#00B4D8',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galaxyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00B4D8',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  // Google button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 12,
    marginBottom: 20,
  },
  googleIconWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  // Form
  form: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 4,
  },
  fieldError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
  },
  // Forgot password
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  // Submit button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonPressed: {
    backgroundColor: '#1D4ED8',
    transform: [{ scale: 0.98 }],
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: '100%',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  modalIconSuccess: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalIconError: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButton: {
    marginTop: 24,
    backgroundColor: '#00B4D8',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
