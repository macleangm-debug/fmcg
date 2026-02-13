import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface SocialButtonProps {
  provider: 'google' | 'apple' | 'facebook';
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  title?: string;
}

const PROVIDER_CONFIG = {
  google: {
    icon: 'logo-google',
    title: 'Continue with Google',
    backgroundColor: '#FFFFFF',
    textColor: '#374151',
    borderColor: '#E5E7EB',
    iconColor: '#4285F4',
  },
  apple: {
    icon: 'logo-apple',
    title: 'Continue with Apple',
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    borderColor: '#000000',
    iconColor: '#FFFFFF',
  },
  facebook: {
    icon: 'logo-facebook',
    title: 'Continue with Facebook',
    backgroundColor: '#1877F2',
    textColor: '#FFFFFF',
    borderColor: '#1877F2',
    iconColor: '#FFFFFF',
  },
};

export default function SocialAuthButton({
  provider,
  onPress,
  loading = false,
  disabled = false,
  title,
}: SocialButtonProps) {
  const scale = useSharedValue(1);
  const config = PROVIDER_CONFIG[provider];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <AnimatedTouchable
      style={[
        styles.button,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
        disabled && styles.disabled,
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
    >
      {loading ? (
        <ActivityIndicator size="small" color={config.textColor} />
      ) : (
        <>
          {provider === 'google' ? (
            <View style={styles.googleIcon}>
              <GoogleLogo />
            </View>
          ) : (
            <Ionicons
              name={config.icon as any}
              size={20}
              color={config.iconColor}
            />
          )}
          <Text style={[styles.text, { color: config.textColor }]}>
            {title || config.title}
          </Text>
        </>
      )}
    </AnimatedTouchable>
  );
}

// Custom Google logo with correct colors
function GoogleLogo() {
  return (
    <View style={styles.googleLogoContainer}>
      <Text style={styles.googleG}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
  googleIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogoContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
