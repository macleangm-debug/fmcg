import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../Icon';

interface PromotionalCardProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  onPress?: () => void;
}

const PromotionalCard: React.FC<PromotionalCardProps> = ({
  title = 'Level up your sales managing to the next level.',
  subtitle = 'An any way to manage sales with care and precision.',
  buttonText = 'Update to Siohioma+',
  onPress,
}) => {
  return (
    <View style={styles.container} data-testid="promotional-card">
      <LinearGradient
        colors={['#D8F3DC', '#B7E4C7']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative elements */}
        <View style={styles.decorativeContainer}>
          <View style={[styles.decorativeLine, styles.line1]} />
          <View style={[styles.decorativeLine, styles.line2]} />
          <View style={[styles.decorativeLine, styles.line3]} />
          <View style={styles.decorativeSquare} />
        </View>
        
        {/* Checkmark icon in top right */}
        <View style={styles.checkIcon}>
          <Icon name="checkmark" size={20} color="#40916C" />
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={onPress}
            data-testid="promotional-card-button"
          >
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gradient: {
    padding: 20,
    minHeight: 180,
    position: 'relative',
  },
  decorativeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 120,
    height: 120,
  },
  decorativeLine: {
    position: 'absolute',
    backgroundColor: '#40916C',
    opacity: 0.2,
    borderRadius: 2,
  },
  line1: {
    width: 60,
    height: 4,
    top: 20,
    right: 20,
    transform: [{ rotate: '-45deg' }],
  },
  line2: {
    width: 40,
    height: 3,
    top: 35,
    right: 35,
    transform: [{ rotate: '-45deg' }],
  },
  line3: {
    width: 50,
    height: 3,
    top: 50,
    right: 15,
    transform: [{ rotate: '-45deg' }],
  },
  decorativeSquare: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: '#E9A319',
    borderRadius: 3,
    top: 15,
    right: 50,
    transform: [{ rotate: '45deg' }],
  },
  checkIcon: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginTop: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B4332',
    lineHeight: 24,
    marginBottom: 8,
    maxWidth: '80%',
  },
  subtitle: {
    fontSize: 13,
    color: '#40916C',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: '85%',
  },
  button: {
    backgroundColor: '#1B4332',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default PromotionalCard;
