import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export interface Advert {
  id: string;
  title: string;
  description: string;
  cta_text?: string;
  cta_link?: string;
  background_color: string;
  text_color: string;
  icon?: string;
  image_url?: string;
}

interface AdvertCarouselProps {
  adverts: Advert[];
  autoPlayInterval?: number; // in milliseconds
  showDots?: boolean;
  showArrows?: boolean;
  height?: number;
  style?: any;
  variant?: 'card' | 'banner' | 'compact';
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AdvertCarousel({
  adverts,
  autoPlayInterval = 5000,
  showDots = true,
  showArrows = false,
  height = 120,
  style,
  variant = 'card',
}: AdvertCarouselProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (adverts.length <= 1) return;

    const interval = setInterval(() => {
      goToNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [currentIndex, adverts.length, autoPlayInterval]);

  const animateTransition = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const goToNext = () => {
    animateTransition(() => {
      setCurrentIndex((prev) => (prev + 1) % adverts.length);
    });
  };

  const goToPrev = () => {
    animateTransition(() => {
      setCurrentIndex((prev) => (prev - 1 + adverts.length) % adverts.length);
    });
  };

  const goToIndex = (index: number) => {
    if (index === currentIndex) return;
    animateTransition(() => {
      setCurrentIndex(index);
    });
  };

  const handleCTAPress = (advert: Advert) => {
    if (advert.cta_link) {
      router.push(advert.cta_link as any);
    }
  };

  if (!adverts || adverts.length === 0) {
    return null;
  }

  const currentAdvert = adverts[currentIndex];

  // Determine gradient colors based on background color
  const getGradientColors = (bgColor: string): [string, string] => {
    // Darken the color slightly for gradient effect
    return [bgColor, adjustColorBrightness(bgColor, -20)];
  };

  const adjustColorBrightness = (color: string, amount: number): string => {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const renderCardVariant = () => (
    <LinearGradient
      colors={getGradientColors(currentAdvert.background_color)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.cardContainer, { height }, style]}
    >
      <Animated.View
        style={[
          styles.cardContent,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <View style={styles.cardLeft}>
          {currentAdvert.icon && (
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons
                name={currentAdvert.icon as any}
                size={24}
                color={currentAdvert.text_color}
              />
            </View>
          )}
          <View style={styles.textContainer}>
            <Text style={[styles.cardTitle, { color: currentAdvert.text_color }]} numberOfLines={1}>
              {currentAdvert.title}
            </Text>
            <Text
              style={[styles.cardDescription, { color: currentAdvert.text_color, opacity: 0.9 }]}
              numberOfLines={2}
            >
              {currentAdvert.description}
            </Text>
          </View>
        </View>

        {currentAdvert.cta_text && (
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => handleCTAPress(currentAdvert)}
            activeOpacity={0.7}
          >
            <Text style={[styles.ctaText, { color: currentAdvert.text_color }]}>
              {currentAdvert.cta_text}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={currentAdvert.text_color} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Navigation Dots */}
      {showDots && adverts.length > 1 && (
        <View style={styles.dotsContainer}>
          {adverts.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => goToIndex(index)}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === currentIndex
                      ? currentAdvert.text_color
                      : `${currentAdvert.text_color}40`,
                },
              ]}
            />
          ))}
        </View>
      )}

      {/* Navigation Arrows */}
      {showArrows && adverts.length > 1 && (
        <>
          <TouchableOpacity
            style={[styles.arrowButton, styles.arrowLeft]}
            onPress={goToPrev}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={currentAdvert.text_color} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.arrowButton, styles.arrowRight]}
            onPress={goToNext}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={20} color={currentAdvert.text_color} />
          </TouchableOpacity>
        </>
      )}
    </LinearGradient>
  );

  const renderBannerVariant = () => (
    <View style={[styles.bannerContainer, { backgroundColor: currentAdvert.background_color }, style]}>
      <Animated.View
        style={[
          styles.bannerContent,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {currentAdvert.icon && (
          <Ionicons
            name={currentAdvert.icon as any}
            size={20}
            color={currentAdvert.text_color}
            style={styles.bannerIcon}
          />
        )}
        <Text style={[styles.bannerTitle, { color: currentAdvert.text_color }]} numberOfLines={1}>
          {currentAdvert.title}
        </Text>
        <Text
          style={[styles.bannerDescription, { color: currentAdvert.text_color, opacity: 0.8 }]}
          numberOfLines={1}
        >
          {currentAdvert.description}
        </Text>
        {currentAdvert.cta_text && (
          <TouchableOpacity
            style={styles.bannerCTA}
            onPress={() => handleCTAPress(currentAdvert)}
            activeOpacity={0.7}
          >
            <Text style={[styles.bannerCTAText, { color: currentAdvert.text_color }]}>
              {currentAdvert.cta_text}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {showDots && adverts.length > 1 && (
        <View style={styles.bannerDots}>
          {adverts.map((_, index) => (
            <View
              key={index}
              style={[
                styles.bannerDot,
                {
                  backgroundColor:
                    index === currentIndex
                      ? currentAdvert.text_color
                      : `${currentAdvert.text_color}40`,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );

  const renderCompactVariant = () => (
    <TouchableOpacity
      style={[
        styles.compactContainer,
        { backgroundColor: currentAdvert.background_color },
        style,
      ]}
      onPress={() => handleCTAPress(currentAdvert)}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.compactContent,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {currentAdvert.icon && (
          <View style={[styles.compactIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons
              name={currentAdvert.icon as any}
              size={16}
              color={currentAdvert.text_color}
            />
          </View>
        )}
        <View style={styles.compactText}>
          <Text style={[styles.compactTitle, { color: currentAdvert.text_color }]} numberOfLines={1}>
            {currentAdvert.title}
          </Text>
          <Text
            style={[styles.compactDescription, { color: currentAdvert.text_color, opacity: 0.8 }]}
            numberOfLines={1}
          >
            {currentAdvert.description}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={currentAdvert.text_color} />
      </Animated.View>
    </TouchableOpacity>
  );

  switch (variant) {
    case 'banner':
      return renderBannerVariant();
    case 'compact':
      return renderCompactVariant();
    default:
      return renderCardVariant();
  }
}

const styles = StyleSheet.create({
  // Card Variant Styles
  cardContainer: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: {
    left: 8,
  },
  arrowRight: {
    right: 8,
  },

  // Banner Variant Styles
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerIcon: {
    marginRight: 8,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  bannerDescription: {
    fontSize: 13,
    flex: 1,
  },
  bannerCTA: {
    marginLeft: 12,
  },
  bannerCTAText: {
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  bannerDots: {
    flexDirection: 'row',
    marginLeft: 12,
    gap: 4,
  },
  bannerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Compact Variant Styles
  compactContainer: {
    borderRadius: 12,
    padding: 12,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  compactText: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactDescription: {
    fontSize: 12,
    marginTop: 2,
  },
});
