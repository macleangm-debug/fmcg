import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
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
  withTiming,
  withSequence,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import axios from 'axios';
import Constants from 'expo-constants';
import Input from '../../src/components/Input';
import { useAuthStore } from '../../src/store/authStore';
import { useOnboardingStore } from '../../src/store/onboardingStore';

WebBrowser.maybeCompleteAuthSession();

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const API_URL = Constants.expoConfig?.extra?.apiUrl || 
              process.env.EXPO_PUBLIC_BACKEND_URL || 
              '/api';

export default function Register() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromApp = params.from as string || 'galaxy';
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 768;
  const isMobile = !isWeb || width < 768;
  const { register, socialLogin, isLoading, error, clearError } = useAuthStore();
  const { setIsNewUser } = useOnboardingStore();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Referral/Promo code
  const [referralCode, setReferralCode] = useState('');
  const [codeValidation, setCodeValidation] = useState<{
    valid?: boolean;
    code_type?: string;
    message?: string;
    benefit?: { type: string; amount?: number; description: string };
  } | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);

  // Form validation state
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [touched, setTouched] = useState<{
    name?: boolean;
    email?: boolean;
    password?: boolean;
    confirmPassword?: boolean;
  }>({});

  // Animation values
  const buttonScale = useSharedValue(1);
  const googleButtonScale = useSharedValue(1);

  // Validate referral/promo code
  const validateCode = useCallback(async (code: string) => {
    if (!code.trim()) {
      setCodeValidation(null);
      return;
    }
    
    setValidatingCode(true);
    try {
      const response = await axios.get(`${API_URL}/api/referrals/validate-code/${code.trim()}`);
      setCodeValidation(response.data);
    } catch (error) {
      setCodeValidation({ valid: false, message: 'Could not validate code' });
    } finally {
      setValidatingCode(false);
    }
  }, []);

  // Check for referral code in URL params
  useEffect(() => {
    const urlCode = params.ref as string || params.code as string || params.promo as string;
    if (urlCode) {
      setReferralCode(urlCode.toUpperCase());
      validateCode(urlCode);
    }
  }, [params, validateCode]);

  // Debounced code validation on input change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (referralCode.length >= 4) {
        validateCode(referralCode);
      } else if (!referralCode) {
        setCodeValidation(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [referralCode, validateCode]);

  // Validation functions
  const validateName = (value: string) => {
    if (!value.trim()) return 'Full name is required';
    if (value.trim().length < 2) return 'Name must be at least 2 characters';
    return undefined;
  };

  const validateEmail = (value: string) => {
    if (!value.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email';
    return undefined;
  };

  const validatePassword = (value: string) => {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return undefined;
  };

  const validateConfirmPassword = (value: string) => {
    if (!value) return 'Please confirm your password';
    if (value !== password) return 'Passwords do not match';
    return undefined;
  };

  const handleBlur = (field: 'name' | 'email' | 'password' | 'confirmPassword') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    switch (field) {
      case 'name':
        setFieldErrors(prev => ({ ...prev, name: validateName(name) }));
        break;
      case 'email':
        setFieldErrors(prev => ({ ...prev, email: validateEmail(email) }));
        break;
      case 'password':
        setFieldErrors(prev => ({ ...prev, password: validatePassword(password) }));
        if (confirmPassword) {
          setFieldErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(confirmPassword) }));
        }
        break;
      case 'confirmPassword':
        setFieldErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(confirmPassword) }));
        break;
    }
  };

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

  const handleGoogleSuccess = async (accessToken: string | undefined) => {
    if (!accessToken) return;
    
    setGoogleLoading(true);
    try {
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/userinfo/v2/me',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const userInfo = await userInfoResponse.json();
      
      // Call backend social login
      const result = await socialLogin('google', {
        email: userInfo.email,
        name: userInfo.name,
        google_id: userInfo.id,
      });
      
      if (result.success) {
        handleSuccessfulAuth();
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

  const handleSuccessfulAuth = () => {
    // Mark as new user for QuickStartWizard
    setIsNewUser(true);
    
    // Web users go back to landing page, mobile users go to mobile home
    if (isWeb) {
      router.replace('/landing');
    } else {
      router.replace('/galaxy/home');
    }
  };

  const handleRegister = async () => {
    // Mark all fields as touched
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    
    // Validate all fields
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword);
    
    setFieldErrors({
      name: nameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    });
    
    if (nameError || emailError || passwordError || confirmPasswordError) {
      return;
    }
    
    // Pass referral code if it's valid
    const validCode = codeValidation?.valid ? referralCode : undefined;
    const success = await register(name, email, password, 'sales_staff', validCode);
    if (success) {
      handleSuccessfulAuth();
    }
  };

  const handleGooglePress = async () => {
    if (isWeb) {
      // For web, show a message since we need proper OAuth setup
      Alert.alert(
        'Google Sign In',
        'Google Sign-In requires OAuth configuration. For now, please use email registration.',
        [{ text: 'OK' }]
      );
    } else {
      await promptAsync();
    }
  };

  // Button press animations
  const handleButtonPressIn = (scaleValue: Animated.SharedValue<number>) => {
    scaleValue.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handleButtonPressOut = (scaleValue: Animated.SharedValue<number>) => {
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
      <AnimatedView entering={FadeInDown.delay(100).duration(400)}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
          <Text style={styles.backButtonText}>
            Back to {fromApp === 'retailpro' ? 'Retail Pro' : 'Software Galaxy'}
          </Text>
        </TouchableOpacity>
      </AnimatedView>

      {/* Header */}
      <AnimatedView style={styles.header} entering={FadeInDown.delay(200).duration(400)}>
        <View style={styles.logoContainer}>
          {fromApp === 'retailpro' ? (
            <View style={styles.logo}>
              <Ionicons name="person-add" size={28} color="#FFFFFF" />
            </View>
          ) : (
            <View style={styles.galaxyLogo}>
              <View style={styles.galaxyOrbit}>
                <View style={styles.galaxyDot} />
              </View>
            </View>
          )}
        </View>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Join {fromApp === 'retailpro' ? 'Retail Pro' : 'Software Galaxy'} today
        </Text>
      </AnimatedView>

      {/* Google Sign In */}
      <AnimatedView entering={FadeInDown.delay(300).duration(400)}>
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
        <Text style={styles.dividerText}>or register with email</Text>
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
            label="Full Name"
            placeholder="Enter your name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (touched.name) setFieldErrors(prev => ({ ...prev, name: validateName(text) }));
            }}
            onBlur={() => handleBlur('name')}
            leftIcon={<Ionicons name="person-outline" size={18} color={touched.name && fieldErrors.name ? '#DC2626' : '#6B7280'} />}
          />
          {touched.name && fieldErrors.name && (
            <View style={styles.fieldError}>
              <Ionicons name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.fieldErrorText}>{fieldErrors.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.inputWrapper}>
          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (touched.email) setFieldErrors(prev => ({ ...prev, email: validateEmail(text) }));
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
            placeholder="Create a password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (touched.password) setFieldErrors(prev => ({ ...prev, password: validatePassword(text) }));
            }}
            onBlur={() => handleBlur('password')}
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

        <View style={styles.inputWrapper}>
          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (touched.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(text) }));
            }}
            onBlur={() => handleBlur('confirmPassword')}
            secureTextEntry={!showPassword}
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={touched.confirmPassword && fieldErrors.confirmPassword ? '#DC2626' : '#6B7280'} />}
          />
          {touched.confirmPassword && fieldErrors.confirmPassword && (
            <View style={styles.fieldError}>
              <Ionicons name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.fieldErrorText}>{fieldErrors.confirmPassword}</Text>
            </View>
          )}
        </View>

        {/* Referral/Promo Code Field */}
        <View style={styles.inputWrapper}>
          <Input
            label="Referral or Promo Code (Optional)"
            placeholder="Enter code"
            value={referralCode}
            onChangeText={(text) => setReferralCode(text.toUpperCase())}
            autoCapitalize="characters"
            leftIcon={<Ionicons name="gift-outline" size={18} color={codeValidation?.valid ? '#10B981' : codeValidation?.valid === false ? '#DC2626' : '#6B7280'} />}
            rightIcon={
              validatingCode ? (
                <ActivityIndicator size="small" color="#6B7280" />
              ) : codeValidation?.valid ? (
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              ) : codeValidation?.valid === false ? (
                <Ionicons name="close-circle" size={18} color="#DC2626" />
              ) : null
            }
          />
          {codeValidation && (
            <View style={[
              styles.codeValidationBox,
              codeValidation.valid ? styles.codeValidationSuccess : styles.codeValidationError
            ]}>
              <Ionicons 
                name={codeValidation.valid ? "checkmark-circle" : "alert-circle"} 
                size={16} 
                color={codeValidation.valid ? "#10B981" : "#DC2626"} 
              />
              <View style={styles.codeValidationText}>
                <Text style={[
                  styles.codeMessage,
                  codeValidation.valid ? styles.codeMessageSuccess : styles.codeMessageError
                ]}>
                  {codeValidation.message}
                </Text>
                {codeValidation.valid && codeValidation.benefit && (
                  <Text style={styles.codeBenefit}>
                    {codeValidation.code_type === 'referral' ? '🎁' : '💰'} {codeValidation.benefit.description}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <AnimatedTouchable
          style={[styles.submitButton, buttonAnimatedStyle]}
          onPress={handleRegister}
          onPressIn={() => handleButtonPressIn(buttonScale)}
          onPressOut={() => handleButtonPressOut(buttonScale)}
          disabled={isLoading}
          activeOpacity={1}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Create Account</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </AnimatedTouchable>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href={{pathname: "/(auth)/login", params: { from: fromApp }}} asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </AnimatedView>
    </>
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
      </View>
    );
  }

  // Mobile layout with enhanced styling
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
    paddingTop: 16,
    paddingBottom: 40,
    justifyContent: 'flex-start',
  },
  // Back button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
    maxWidth: 440,
    maxHeight: '95vh',
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
    marginTop: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
  // Code validation
  codeValidationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 10,
  },
  codeValidationSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  codeValidationError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  codeValidationText: {
    flex: 1,
  },
  codeMessage: {
    fontSize: 13,
    fontWeight: '500',
  },
  codeMessageSuccess: {
    color: '#059669',
  },
  codeMessageError: {
    color: '#DC2626',
  },
  codeBenefit: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
});
